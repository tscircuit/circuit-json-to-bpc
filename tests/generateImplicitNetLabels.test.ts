import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { generateImplicitNetLabels } from "../lib"

test("generate implicit net labels", () => {
  const circuitJson: CircuitJson = [
    {
      type: "source_port",
      source_port_id: "p1",
      name: "1",
      source_component_id: "sc1",
      subcircuit_connectivity_map_key: "net1",
    },
    {
      type: "source_port",
      source_port_id: "p2",
      name: "2",
      source_component_id: "sc1",
    },
    {
      type: "source_port",
      source_port_id: "p3",
      name: "3",
      source_component_id: "sc1",
      subcircuit_connectivity_map_key: "net2",
    },
    {
      type: "source_net",
      source_net_id: "net1",
      name: "NET1",
      member_source_group_ids: [],
      subcircuit_connectivity_map_key: "net1",
    },
    {
      type: "source_net",
      source_net_id: "net2",
      name: "NET2",
      member_source_group_ids: [],
      subcircuit_connectivity_map_key: "net2",
    },
    {
      type: "source_trace",
      source_trace_id: "t1",
      connected_source_port_ids: ["p3"],
      connected_source_net_ids: ["net2"],
      subcircuit_connectivity_map_key: "net2",
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
      type: "schematic_port",
      schematic_port_id: "sp2",
      source_port_id: "p2",
      schematic_component_id: "sch1",
      center: { x: 2, y: 0 },
      facing_direction: "right",
    },
    {
      type: "schematic_port",
      schematic_port_id: "sp3",
      source_port_id: "p3",
      schematic_component_id: "sch1",
      center: { x: 3, y: 0 },
      facing_direction: "right",
    },
  ]

  const labels = generateImplicitNetLabels(circuitJson)
  expect(labels.length).toBe(2)
  const label1 = labels.find(
    (l) => l.schematic_net_label_id === "netlabel_for_sp1",
  )!
  expect(label1.text).toBe("NET1")
  expect(label1.anchor_side).toBe("left")
  const label2 = labels.find(
    (l) => l.schematic_net_label_id === "netlabel_for_sp3",
  )!
  expect(label2.text).toBe("NET2")
  expect(label2.anchor_side).toBe("left")
})
