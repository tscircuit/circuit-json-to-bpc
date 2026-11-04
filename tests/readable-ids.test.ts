import { describe, expect, test } from "bun:test"
import { getPinPosition } from "bpc-graph"
import {
  type CircuitJson,
  schematic_component,
  schematic_net_label,
  schematic_port,
  source_group,
  source_net,
  source_port,
  source_simple_resistor,
} from "circuit-json"
import { convertCircuitJsonToBpc } from "../lib"

function components(
  entries: {
    name: string
    id?: string
    ports?: string[]
    portIds?: string[]
  }[],
): CircuitJson {
  return entries.flatMap(
    ({ name, id, ports = ["pin1", "pin2"], portIds }, i) => {
      const schematicId = id ?? `sch_${i}`
      const subcircuitId = `subcircuit_${i}`
      const center = { x: i * 10, y: i * 3 }
      return [
        source_group.parse({
          type: "source_group",
          source_group_id: `group_${i}`,
          is_subcircuit: true,
          subcircuit_id: subcircuitId,
        }),
        source_simple_resistor.parse({
          type: "source_component",
          source_component_id: `src_${i}`,
          ftype: "simple_resistor",
          name,
          resistance: 1000,
          source_group_id: `group_${i}`,
          subcircuit_id: subcircuitId,
        }),
        schematic_component.parse({
          type: "schematic_component",
          schematic_component_id: schematicId,
          source_component_id: `src_${i}`,
          center,
          size: { width: 2, height: 1 },
          subcircuit_id: subcircuitId,
        }),
        ...ports.flatMap((portName, p) => [
          source_port.parse({
            type: "source_port",
            source_port_id: `src_${i}_port_${p + 1}`,
            source_component_id: `src_${i}`,
            name: portName,
            pin_number: p + 1,
            subcircuit_id: subcircuitId,
            subcircuit_connectivity_map_key: `network_${i}_${p + 1}`,
          }),
          schematic_port.parse({
            type: "schematic_port",
            schematic_port_id: portIds?.[p] ?? `${schematicId}_port_${p + 1}`,
            schematic_component_id: schematicId,
            source_port_id: `src_${i}_port_${p + 1}`,
            center: { x: center.x + p * 2 - 1, y: center.y },
            facing_direction: p === 0 ? "left" : "right",
          }),
        ]),
      ]
    },
  )
}

function addNet(circuit: CircuitJson, explicitLabel = true) {
  circuit.push(
    source_net.parse({
      type: "source_net",
      source_net_id: "net_0",
      name: "GND",
      member_source_group_ids: [],
      subcircuit_connectivity_map_key: "network_0_1",
    }),
  )
  if (explicitLabel) {
    circuit.push(
      schematic_net_label.parse({
        type: "schematic_net_label",
        schematic_net_label_id: "label_0",
        source_net_id: "net_0",
        center: { x: 5, y: 2 },
        anchor_position: { x: 5, y: 2 },
        anchor_side: "right",
        text: "GND",
      }),
    )
  }
}

function expectPreservedGraph(circuit: CircuitJson, inferNetLabels = false) {
  const before = JSON.stringify(circuit)
  const raw = convertCircuitJsonToBpc(circuit, { inferNetLabels })
  const readable = convertCircuitJsonToBpc(circuit, {
    inferNetLabels,
    useReadableIds: true,
  })
  expect(readable.boxes).toHaveLength(raw.boxes.length)
  expect(readable.pins).toHaveLength(raw.pins.length)
  expect(new Set(readable.boxes.map((box) => box.boxId)).size).toBe(
    raw.boxes.length,
  )
  expect(new Set(readable.pins.map((pin) => pin.pinId)).size).toBe(
    raw.pins.length,
  )
  const networkGroups = (graph: typeof raw) =>
    graph.pins.map((pin) =>
      graph.pins.findIndex((other) => other.networkId === pin.networkId),
    )
  expect(networkGroups(readable)).toEqual(networkGroups(raw))
  for (const [i, box] of raw.boxes.entries()) {
    expect(readable.boxes[i]).toEqual({
      ...box,
      boxId: readable.boxes[i]!.boxId,
    })
  }
  for (const [i, pin] of raw.pins.entries()) {
    const renamed = readable.pins[i]!
    const boxIndex = raw.boxes.findIndex((box) => box.boxId === pin.boxId)
    expect(renamed).toEqual({
      ...pin,
      pinId: renamed.pinId,
      boxId: readable.boxes[boxIndex]!.boxId,
      networkId:
        pin.color === "netlabel_center" ? renamed.networkId : pin.networkId,
    })
    // The actual BPC consumer resolves pins by ID and then follows their box ID.
    expect(getPinPosition(readable, renamed.pinId)).toEqual(
      getPinPosition(raw, pin.pinId),
    )
  }
  expect(JSON.stringify(circuit)).toBe(before)
  expect(
    convertCircuitJsonToBpc(circuit, { inferNetLabels, useReadableIds: true }),
  ).toEqual(readable)
  return readable
}

describe("readable IDs", () => {
  test("preserves repeated component names in separate schema-valid subcircuits", () => {
    const circuit = components([{ name: "R1" }, { name: "R1" }])
    const groups = circuit.filter((item) => item.type === "source_group")
    expect(new Set(groups.map((group) => group.subcircuit_id)).size).toBe(2)
    const graph = expectPreservedGraph(circuit)
    expect(graph.boxes.map((box) => box.boxId)).toEqual(["R1", "R1_1"])
  })

  test("reserves existing names before adding component suffixes", () => {
    const graph = expectPreservedGraph(
      components([{ name: "R1" }, { name: "R1" }, { name: "R1_1" }]),
    )
    expect(graph.boxes.map((box) => box.boxId)).toEqual(["R1", "R1_2", "R1_1"])
  })

  test.each([false, true])(
    "preserves unnamed fallback box IDs, reversed=%s",
    (reverse) => {
      const entries = [
        { name: "fallback", id: "named" },
        { name: "", id: "fallback" },
      ]
      const graph = expectPreservedGraph(
        components(reverse ? entries.toReversed() : entries),
      )
      expect(graph.boxes.map((box) => box.boxId).sort()).toEqual([
        "fallback",
        "fallback_1",
      ])
      expect(graph.boxes[reverse ? 0 : 1]!.boxId).toBe("fallback")
    },
  )

  test("reserves real port suffixes when port names repeat", () => {
    const graph = expectPreservedGraph(
      components([{ name: "R1", ports: ["pin1", "pin1", "pin1_1"] }]),
    )
    expect(graph.pins.map((pin) => pin.pinId)).toEqual([
      "R1_center",
      "R1_pin1",
      "R1_pin1_2",
      "R1_pin1_1",
    ])
  })

  test("includes generated center pins in the same pin allocation", () => {
    const graph = expectPreservedGraph(
      components([{ name: "R1", ports: ["center", "center_1"] }]),
    )
    expect(graph.pins.map((pin) => pin.pinId)).toEqual([
      "R1_center",
      "R1_center_2",
      "R1_center_1",
    ])
  })

  test("preserves fallback port IDs before assigning readable port names", () => {
    const graph = expectPreservedGraph(
      components([
        { name: "R1" },
        { name: "", portIds: ["R1_pin1", "fallback_pin2"] },
      ]),
    )
    expect(graph.pins[1]!.pinId).toBe("R1_pin1_1")
    expect(graph.pins[4]!.pinId).toBe("R1_pin1")
  })

  test("keeps explicit label pin and center identities separate from named ports", () => {
    const circuit = components([
      { name: "NL", ports: ["GND0_pin", "GND0_center"] },
    ])
    addNet(circuit)
    const graph = expectPreservedGraph(circuit)
    const labelPins = graph.pins.filter((pin) => pin.boxId === "NL_GND0")
    expect(labelPins.map((pin) => pin.pinId)).toEqual([
      "NL_GND0_pin_1",
      "NL_GND0_center_1",
    ])
    expect(labelPins[1]!.networkId).toBe("NL_GND0_center")
  })

  test.each(["NL_GND0_center_1", "NL_GND0_center", "label_0_center"])(
    "preserves network groups when a source network is named %s",
    (networkId) => {
      const circuit = components([{ name: "NL", ports: ["GND0_center"] }])
      addNet(circuit)
      for (const item of circuit) {
        if (item.type === "source_port") {
          item.subcircuit_connectivity_map_key = networkId
          source_port.parse(item)
        }
        if (item.type === "source_net") {
          item.subcircuit_connectivity_map_key = "ground_network"
          source_net.parse(item)
        }
      }
      const graph = expectPreservedGraph(circuit)
      expect(graph.pins[1]!.networkId).toBe(networkId)
      const center = graph.pins.find((pin) => pin.color === "netlabel_center")!
      if (networkId === "label_0_center") {
        expect(center.networkId).toBe(networkId)
      } else {
        expect(center.networkId).not.toBe(networkId)
      }
    },
  )

  test("reserves inferred labels' existing fallback IDs", () => {
    const circuit = components([{ name: "netlabel_for_sch_0_port_1" }])
    addNet(circuit, false)
    const graph = expectPreservedGraph(circuit, true)
    expect(graph.boxes.map((box) => box.boxId)).toEqual([
      "netlabel_for_sch_0_port_1_1",
      "netlabel_for_sch_0_port_1",
    ])
  })

  test("preserves ordinary readable names and the default raw-ID output", () => {
    const circuit = components([{ name: "R1" }, { name: "R2" }])
    addNet(circuit)
    const graph = expectPreservedGraph(circuit)
    expect(graph.boxes.map((box) => box.boxId)).toEqual(["R1", "R2", "NL_GND0"])
    expect(graph.pins.map((pin) => pin.pinId)).toEqual([
      "R1_center",
      "R1_pin1",
      "R1_pin2",
      "R2_center",
      "R2_pin1",
      "R2_pin2",
      "NL_GND0_pin",
      "NL_GND0_center",
    ])
    expect(convertCircuitJsonToBpc(circuit, { useReadableIds: false })).toEqual(
      convertCircuitJsonToBpc(circuit),
    )
    expect(
      convertCircuitJsonToBpc(circuit).boxes.map((box) => box.boxId),
    ).toEqual(["sch_0", "sch_1", "label_0"])
  })
})
