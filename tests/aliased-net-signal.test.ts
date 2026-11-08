import { expect, test } from "bun:test"
import { getGraphicsForBpcGraph, getPinPosition } from "bpc-graph"
import {
  any_circuit_element,
  type CircuitJson,
  type SourceNet,
} from "circuit-json"
import { createElement } from "react"
import { Circuit } from "tscircuit"
import { convertCircuitJsonToBpc } from "../lib"

function circuitWithAliases(signal: Partial<SourceNet>): CircuitJson {
  return [
    {
      type: "source_component",
      source_component_id: "r1",
      ftype: "simple_resistor",
      name: "R1",
      resistance: 1000,
    },
    {
      type: "schematic_component",
      schematic_component_id: "sch_r1",
      source_component_id: "r1",
      center: { x: 2, y: 3 },
      size: { width: 2, height: 1 },
    },
    ...[1, 2].flatMap((number) => [
      {
        type: "source_port" as const,
        source_port_id: `p${number}`,
        source_component_id: "r1",
        name: `pin${number}`,
        pin_number: number,
        subcircuit_connectivity_map_key: "shared",
      },
      {
        type: "schematic_port" as const,
        schematic_port_id: `sp${number}`,
        schematic_component_id: "sch_r1",
        source_port_id: `p${number}`,
        center: { x: number === 1 ? 1 : 3, y: 3 },
        facing_direction: number === 1 ? ("left" as const) : ("right" as const),
      },
    ]),
    {
      type: "source_net",
      source_net_id: "alias",
      name: "RETURN",
      member_source_group_ids: [],
      subcircuit_connectivity_map_key: "shared",
    },
    {
      type: "source_net",
      source_net_id: "signal",
      name: "SUPPLY",
      member_source_group_ids: [],
      subcircuit_connectivity_map_key: "shared",
      ...signal,
    },
    {
      type: "source_net",
      source_net_id: "unrelated",
      name: "GND_UNRELATED",
      member_source_group_ids: [],
      subcircuit_connectivity_map_key: "other",
      is_ground: true,
    },
  ]
}

const cases: [Partial<SourceNet>, string][] = [
  [{ name: "GND" }, "gnd"],
  [{ name: "VCC" }, "vcc"],
  [{ name: "RETURN_SIGNAL", is_ground: true }, "gnd"],
  [{ name: "SUPPLY", is_power: true }, "vcc"],
  [{ name: "DATA" }, "normal"],
]

for (const [net, color] of cases) {
  test(`preserves the signal type of a connected net alias: ${JSON.stringify(net)}`, () => {
    const circuit = circuitWithAliases(net)
    for (const element of circuit) any_circuit_element.parse(element)
    const before = structuredClone(circuit)
    for (const input of [circuit, circuit.toReversed()]) {
      for (const useReadableIds of [false, true]) {
        const graph = convertCircuitJsonToBpc(input, { useReadableIds })
        const pins = graph.pins.filter(
          (pin) => pin.color !== "component_center",
        )
        expect(pins).toHaveLength(2)
        expect(pins.map((pin) => [pin.networkId, pin.color])).toEqual([
          ["shared", color],
          ["shared", color],
        ])
        expect(
          pins
            .map((pin) => getPinPosition(graph, pin.pinId))
            .sort((a, b) => a.x - b.x),
        ).toEqual([
          { x: 1, y: 3 },
          { x: 3, y: 3 },
        ])
        expect(getGraphicsForBpcGraph(graph).lines).toHaveLength(1)
      }
    }
    expect(circuit).toEqual(before)
  })
}

test("keeps ground precedence across connected power and ground aliases", () => {
  const circuit = circuitWithAliases({ is_ground: true })
  const alias = circuit.find(
    (item) => item.type === "source_net" && item.source_net_id === "alias",
  )!
  if (alias.type === "source_net") alias.is_power = true
  for (const input of [circuit, circuit.toReversed()]) {
    for (const item of input) any_circuit_element.parse(item)
    expect(
      convertCircuitJsonToBpc(input)
        .pins.filter((pin) => pin.networkId === "shared")
        .map((pin) => pin.color),
    ).toEqual(["gnd", "gnd"])
  }
})

test("preserves connected ports without source nets and disconnected ports", () => {
  const circuit = circuitWithAliases({}).filter(
    (item) => item.type !== "source_net",
  )
  const sourcePort = circuit.find(
    (item) => item.type === "source_port" && item.source_port_id === "p2",
  )!
  if (sourcePort.type === "source_port")
    delete sourcePort.subcircuit_connectivity_map_key
  for (const item of circuit) any_circuit_element.parse(item)
  const graph = convertCircuitJsonToBpc(circuit)
  expect(
    graph.pins
      .filter((pin) => pin.color !== "component_center")
      .map((pin) => [pin.networkId, pin.color]),
  ).toEqual([
    ["shared", "normal"],
    ["disconnected-0", "not_connected"],
  ])
})

test("preserves a real producer's GND signal when the network also has an alias", async () => {
  const circuit = new Circuit({ platform: { pcbDisabled: true } })
  circuit.add(
    createElement(
      "board",
      { pcbDisabled: true },
      createElement("resistor", { name: "R1", resistance: "1k", schX: -3 }),
      createElement("resistor", { name: "R2", resistance: "1k", schX: 3 }),
      createElement("net", { name: "RETURN" }),
      createElement("net", { name: "GND" }),
      createElement("trace", { from: ".R1 > .pin1", to: "net.RETURN" }),
      createElement("trace", { from: ".R1 > .pin1", to: "net.GND" }),
      createElement("trace", { from: ".R2 > .pin1", to: "net.GND" }),
    ),
  )
  await circuit.renderUntilSettled()
  const json = circuit.getCircuitJson()
  for (const item of json) any_circuit_element.parse(item)
  const nets = json.filter((item) => item.type === "source_net")
  expect(nets.map((net) => net.name)).toEqual(["RETURN", "GND"])
  expect(
    new Set(nets.map((net) => net.subcircuit_connectivity_map_key)).size,
  ).toBe(1)
  const before = structuredClone(json)
  for (const input of [json, json.toReversed()]) {
    const graph = convertCircuitJsonToBpc(input)
    const schematicPorts = input.filter(
      (item) => item.type === "schematic_port",
    )
    const portIds = new Set(
      schematicPorts.map((port) => port.schematic_port_id),
    )
    const connectedPins = graph.pins.filter(
      (pin) =>
        portIds.has(pin.pinId) &&
        pin.networkId === nets[0]!.subcircuit_connectivity_map_key,
    )
    expect(connectedPins).toHaveLength(2)
    expect(connectedPins.map((pin) => pin.color)).toEqual(["gnd", "gnd"])
    const graphics = getGraphicsForBpcGraph(graph)
    for (const pin of connectedPins) {
      expect(
        graphics.points.find(
          (point) => point.label?.split("\n")[0] === pin.pinId,
        )?.color,
      ).toBe("purple")
    }
  }
  expect(json).toEqual(before)
})
