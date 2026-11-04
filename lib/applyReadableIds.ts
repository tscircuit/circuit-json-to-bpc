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

  for (const box of graph.boxes) {
    box.boxId = boxIdMap.get(box.boxId)!
  }
  for (const [index, pin] of graph.pins.entries()) {
    pin.boxId = boxIdMap.get(pin.boxId)!
    pin.pinId = pinIds[index]!
    if (pin.color === "netlabel_center") {
      pin.networkId = pin.pinId
    }
  }
  return graph
}
