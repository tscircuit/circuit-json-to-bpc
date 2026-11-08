import { expect, test } from "bun:test"
import { getGraphicsForBpcGraph, getPinPosition } from "bpc-graph"
import { any_circuit_element, type CircuitJson, source_net } from "circuit-json"
import { createElement } from "react"
import { Circuit } from "tscircuit"
import { convertCircuitJsonToBpc } from "../lib"

async function renderDisplayLabels(pairCount = 1, usePath = false) {
  const circuit = new Circuit({ platform: { pcbDisabled: true } })
  const elements = []
  for (let i = 0; i < pairCount; i++) {
    const left = `R${2 * i + 1}`
    const right = `R${2 * i + 2}`
    elements.push(
      createElement("resistor", {
        name: left,
        resistance: "1k",
        schX: -3,
        schY: i * 3,
      }),
      createElement("resistor", {
        name: right,
        resistance: "1k",
        schX: 3,
        schY: i * 3,
      }),
      createElement("trace", {
        ...(usePath
          ? { path: [`.${left} > .pin2`, `.${right} > .pin1`] }
          : { from: `.${left} > .pin2`, to: `.${right} > .pin1` }),
        schDisplayLabel: "SIGNAL",
      }),
    )
  }
  circuit.add(createElement("board", {}, ...elements))
  await circuit.renderUntilSettled()
  const json = circuit.getCircuitJson()
  for (const element of json) {
    expect(any_circuit_element.safeParse(element).success).toBe(true)
  }
  return json
}

test.each([false, true])(
  "connects actual schDisplayLabel output to its ports (path=%s)",
  async (usePath) => {
    const json = await renderDisplayLabels(1, usePath)
    const before = JSON.stringify(json)
    const labels = json.filter((e) => e.type === "schematic_net_label")
    expect(labels).toHaveLength(2)
    const graph = convertCircuitJsonToBpc(json)
    const graphics = getGraphicsForBpcGraph(graph)
    expect(graphics.lines).toHaveLength(6)
    for (const label of labels) {
      // Core uses the endpoint's source_port_id for port-to-port trace labels.
      const sourcePort = json.find(
        (e) =>
          e.type === "source_port" && e.source_port_id === label.source_net_id,
      )!
      expect(sourcePort.type).toBe("source_port")
      if (sourcePort.type !== "source_port") throw new Error("Expected port")
      const port = json.find(
        (e) =>
          e.type === "schematic_port" &&
          e.source_port_id === sourcePort.source_port_id,
      )!
      if (port.type !== "schematic_port")
        throw new Error("Expected schematic port")
      const labelPin = graph.pins.find(
        (p) => p.pinId === `${label.schematic_net_label_id}_pin`,
      )!
      expect(labelPin.networkId).toBe(
        sourcePort.subcircuit_connectivity_map_key!,
      )
      expect(labelPin.color).toBe("normal")
      expect(
        graph.pins.filter((p) => p.networkId === labelPin.networkId),
      ).toHaveLength(4)
      expect(getPinPosition(graph, labelPin.pinId)).toEqual(
        label.anchor_position!,
      )
      const portPin = graph.pins.find(
        (p) => p.pinId === port.schematic_port_id,
      )!
      expect(portPin.networkId).toBe(labelPin.networkId)
      expect(
        graphics.lines?.some((line) =>
          line.points.some(
            (point) =>
              point.x === label.anchor_position!.x &&
              point.y === label.anchor_position!.y,
          ),
        ),
      ).toBe(true)
    }
    const disconnected = graph.pins.filter((p) => p.color === "not_connected")
    expect(disconnected).toHaveLength(2)
    expect(new Set(disconnected.map((p) => p.networkId)).size).toBe(2)
    expect(JSON.stringify(json)).toBe(before)
  },
)

test.each([{}, { useReadableIds: true }, { inferNetLabels: true }])(
  "keeps identically named labels on separate real networks: %j",
  async (opts) => {
    const json = await renderDisplayLabels(2)
    const graph = convertCircuitJsonToBpc(json, opts)
    const traces = json.filter((e) => e.type === "source_trace")
    expect(traces).toHaveLength(2)
    const keys = traces.map((t) => t.subcircuit_connectivity_map_key!)
    expect(new Set(keys).size).toBe(2)
    for (const key of keys) {
      const pins = graph.pins.filter((p) => p.networkId === key)
      expect(pins).toHaveLength(4)
      expect(pins.every((p) => p.color === "normal")).toBe(true)
    }
  },
)

test.each([
  { name: "GND", color: "gnd" },
  { name: "VCC", color: "vcc" },
  { name: "RETURN", is_ground: true, color: "gnd" },
  { name: "SUPPLY", is_power: true, color: "vcc" },
])(
  "preserves source network signal type for port-backed labels: %j",
  async ({ color, ...net }) => {
    const json = await renderDisplayLabels()
    const trace = json.find((e) => e.type === "source_trace")!
    if (trace.type !== "source_trace") throw new Error("Expected trace")
    json.push(
      source_net.parse({
        type: "source_net",
        source_net_id: "source_net_0",
        member_source_group_ids: [],
        subcircuit_connectivity_map_key: trace.subcircuit_connectivity_map_key,
        ...net,
      }),
    )
    const graph = convertCircuitJsonToBpc(json)
    const pins = graph.pins.filter(
      (p) => p.networkId === trace.subcircuit_connectivity_map_key,
    )
    expect(pins).toHaveLength(4)
    expect(pins.every((p) => p.color === color)).toBe(true)
  },
)

test("keeps direct source-net labels and unresolved labels unchanged", () => {
  const json: CircuitJson = [
    source_net.parse({
      type: "source_net",
      source_net_id: "net1",
      name: "GND",
      member_source_group_ids: [],
      subcircuit_connectivity_map_key: "ground",
    }),
    {
      type: "source_port",
      source_port_id: "unconnected-port",
      source_component_id: "source1",
      name: "pin1",
    },
    ...["net1", "unknown", "unconnected-port"].map((id, i) => ({
      type: "schematic_net_label" as const,
      schematic_net_label_id: `label${i}`,
      source_net_id: id,
      text: "GND",
      anchor_position: { x: i * 2, y: 0 },
      center: { x: i * 2, y: 0 },
      anchor_side: "right" as const,
    })),
  ]
  const graph = convertCircuitJsonToBpc(json)
  expect(
    graph.pins
      .filter((p) => p.color !== "netlabel_center")
      .map((p) => [p.networkId, p.color]),
  ).toEqual([
    ["ground", "gnd"],
    ["disconnected-0", "not_connected"],
    ["disconnected-1", "not_connected"],
  ])
})

test.each([
  {
    key: undefined,
    expected: [["disconnected-0", "not_connected"]],
  },
  { key: "NET", expected: [["NET", "gnd"]] },
])(
  "prefers a direct source net over a same-ID port: %j",
  ({ key, expected }) => {
    const json: CircuitJson = [
      {
        type: "source_port",
        source_port_id: "ambiguous",
        source_component_id: "c",
        name: "pin1",
        subcircuit_connectivity_map_key: "PORT",
      },
      source_net.parse({
        type: "source_net",
        source_net_id: "ambiguous",
        name: "GND",
        member_source_group_ids: [],
        subcircuit_connectivity_map_key: key,
      }),
      {
        type: "schematic_net_label",
        schematic_net_label_id: "label-0",
        source_net_id: "ambiguous",
        text: "VCC",
        center: { x: 0, y: 0 },
        anchor_position: { x: 0, y: 0 },
        anchor_side: "right",
      },
    ]
    for (const element of json) {
      expect(any_circuit_element.safeParse(element).success).toBe(true)
    }
    const graph = convertCircuitJsonToBpc(json)
    expect(
      graph.pins
        .filter((p) => p.color !== "netlabel_center")
        .map((p) => [p.networkId, p.color]),
    ).toEqual(expected)
  },
)
