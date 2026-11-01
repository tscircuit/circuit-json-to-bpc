import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToBpc, generateImplicitNetLabels } from "../lib"

const makeCircuit = (
  connectivityKey?: string,
  netKey = "connected-net",
): CircuitJson => [
  {
    type: "source_port",
    source_port_id: "p1",
    source_component_id: "sc1",
    name: "1",
    subcircuit_connectivity_map_key: connectivityKey,
  },
  {
    type: "schematic_port",
    schematic_port_id: "sp1",
    source_port_id: "p1",
    schematic_component_id: "sch1",
    center: { x: 1, y: 0 },
    facing_direction: "right",
  },
  {
    type: "source_net",
    source_net_id: "unrelated-net",
    name: "UNRELATED",
    member_source_group_ids: [],
  },
  {
    type: "source_net",
    source_net_id: "net1",
    name: "VCC",
    member_source_group_ids: [],
    subcircuit_connectivity_map_key: netKey,
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "unrelated-trace",
    source_trace_id: "unrelated-source-trace",
    edges: [],
    junctions: [],
  },
]

test("does not infer a net from an absent connectivity key", () => {
  expect(generateImplicitNetLabels(makeCircuit())).toEqual([])
})

test("graph conversion does not infer labels for an absent key", () => {
  expect(
    convertCircuitJsonToBpc(makeCircuit(), { inferNetLabels: true }).boxes,
  ).toEqual([])
})

test("preserves a matched empty-string connectivity key", () => {
  const circuit = makeCircuit("", "")
  const labels = generateImplicitNetLabels(circuit)
  expect(labels).toHaveLength(1)
  expect(labels[0]!.source_net_id).toBe("net1")
  expect(
    convertCircuitJsonToBpc(circuit, { inferNetLabels: true }).boxes,
  ).toHaveLength(1)
})

test("does not match an empty key with a different nonempty key", () => {
  expect(generateImplicitNetLabels(makeCircuit(""))).toEqual([])
})

test("does not match an empty key with a missing net key", () => {
  const circuit = makeCircuit("").filter(
    (element) =>
      element.type !== "source_net" || element.source_net_id !== "net1",
  )
  expect(generateImplicitNetLabels(circuit)).toEqual([])
})

test("preserves a truthy connectivity key containing zero", () => {
  const circuit = makeCircuit("0", "0")
  const labels = generateImplicitNetLabels(circuit)
  expect(labels).toHaveLength(1)
  expect(labels[0]!.source_net_id).toBe("net1")
  expect(
    convertCircuitJsonToBpc(circuit, { inferNetLabels: true }).boxes,
  ).toHaveLength(1)
})

test("does not infer a label for an unmatched nonempty key", () => {
  expect(generateImplicitNetLabels(makeCircuit("unmatched-net"))).toEqual([])
})

test("a port without a source trace has no schematic trace binding", () => {
  const labels = generateImplicitNetLabels(makeCircuit("connected-net"))
  expect(labels).toHaveLength(1)
  expect(labels[0]).toMatchObject({
    source_net_id: "net1",
    text: "VCC",
    anchor_position: { x: 1, y: 0 },
    anchor_side: "left",
  })
  expect(labels[0]!.source_trace_id).toBeUndefined()
  expect(labels[0]!.schematic_trace_id).toBeUndefined()
})

test("preserves matched source and schematic trace bindings", () => {
  const circuit = makeCircuit("connected-net")
  circuit.push(
    {
      type: "source_trace",
      source_trace_id: "t1",
      connected_source_port_ids: ["p1"],
      connected_source_net_ids: ["net1"],
    },
    {
      type: "schematic_trace",
      schematic_trace_id: "st1",
      source_trace_id: "t1",
      edges: [],
      junctions: [],
    },
  )
  const labels = generateImplicitNetLabels(circuit)
  expect(labels).toHaveLength(1)
  expect(labels[0]).toMatchObject({
    source_net_id: "net1",
    source_trace_id: "t1",
    schematic_trace_id: "st1",
  })
})

test("retains a source trace when no matching schematic trace exists", () => {
  const circuit = makeCircuit("connected-net")
  circuit.push({
    type: "source_trace",
    source_trace_id: "t1",
    connected_source_port_ids: ["p1"],
    connected_source_net_ids: ["net1"],
  })
  const labels = generateImplicitNetLabels(circuit)
  expect(labels).toHaveLength(1)
  expect(labels[0]!.source_trace_id).toBe("t1")
  expect(labels[0]!.schematic_trace_id).toBeUndefined()
})

test("still avoids duplicating a label at the port anchor", () => {
  const circuit = makeCircuit("connected-net")
  circuit.push({
    type: "schematic_net_label",
    schematic_net_label_id: "existing",
    source_net_id: "net1",
    text: "VCC",
    center: { x: 0.8, y: 0 },
    anchor_position: { x: 1, y: 0 },
    anchor_side: "left",
  })
  expect(generateImplicitNetLabels(circuit)).toEqual([])
})
