import type { MixedBpcGraph } from "bpc-graph"
import type { CircuitJson } from "circuit-json"
import { getReadableIdMap } from "./getReadableIdMap"

function allocateIds(candidates: { original: string; preferred: string }[]) {
  const reserved = new Set(candidates.map(({ preferred }) => preferred))
  const used = new Set<string>()
  const ids: string[] = []

  // Keep fallback IDs first, and do not let suffixes steal another name.
  for (const fallback of [true, false]) {
    for (const [index, { original, preferred }] of candidates.entries()) {
      if ((original === preferred) !== fallback) continue
      let id = preferred
      let suffix = 1
      while (used.has(id)) {
        do {
          id = `${preferred}_${suffix++}`
        } while (reserved.has(id))
      }
      used.add(id)
      ids[index] = id
    }
  }
  return ids
}

/** Apply readable names after constructing the graph with original identities. */
export function applyReadableIds(
  graph: MixedBpcGraph,
  circuitJson: CircuitJson,
) {
  const preferredIds = getReadableIdMap(circuitJson)
  const boxIds = allocateIds(
    graph.boxes.map(({ boxId }) => ({
      original: boxId,
      preferred: preferredIds[boxId] || boxId,
    })),
  )
  const boxIdMap = new Map(
    graph.boxes.map((box, index) => [box.boxId, boxIds[index]!]),
  )
  const labelBoxes = new Set(
    graph.boxes
      .filter((box) => box.kind === "fixed" && box.boxAttributes?.is_net_label)
      .map((box) => box.boxId),
  )
  const pinIds = allocateIds(
    graph.pins.map((pin) => {
      const boxId = boxIdMap.get(pin.boxId)!
      let preferred = preferredIds[pin.pinId] || pin.pinId
      if (pin.color === "component_center" || pin.color === "netlabel_center") {
        preferred = `${boxId}_center`
      } else if (labelBoxes.has(pin.boxId)) {
        preferred = `${boxId}_pin`
      }
      return { original: pin.pinId, preferred }
    }),
  )

  // Networks have their own identity: a pin suffix must not create an edge.
  const fixedNetworks = new Set(
    graph.pins
      .filter((pin) => pin.color !== "netlabel_center")
      .map((pin) => pin.networkId),
  )
  const networkNames = new Map(
    graph.pins.map((pin) => [
      pin.networkId,
      pin.color === "netlabel_center" && !fixedNetworks.has(pin.networkId)
        ? `${boxIdMap.get(pin.boxId)!}_center`
        : pin.networkId,
    ]),
  )
  const networkCandidates = [...networkNames].map(([original, preferred]) => ({
    original,
    preferred,
  }))
  const networkIds = allocateIds(networkCandidates)
  const networkIdMap = new Map(
    networkCandidates.map(({ original }, index) => [
      original,
      networkIds[index]!,
    ]),
  )

  for (const box of graph.boxes) {
    box.boxId = boxIdMap.get(box.boxId)!
  }
  for (const [index, pin] of graph.pins.entries()) {
    pin.boxId = boxIdMap.get(pin.boxId)!
    pin.pinId = pinIds[index]!
    pin.networkId = networkIdMap.get(pin.networkId)!
  }
  return graph
}
