import { expect, test } from "bun:test"
import { convertCircuitJsonToBpc } from "../lib"
import type { CircuitJson } from "circuit-json"

test("netlabel box and pin", () => {
  const circuitJson: CircuitJson = [
    {
      type: "schematic_net_label",
      schematic_net_label_id: "nl1",
      source_net_id: "net1",
      center: { x: 0, y: 0 },
      anchor_position: { x: 1, y: 0 },
      anchor_side: "right",
      text: "VCC",
    },
    {
      type: "source_net",
      source_net_id: "net1",
      name: "VCC",
      subcircuit_connectivity_map_key: "net1",
      member_source_group_ids: [],
    },
  ]

  const g = convertCircuitJsonToBpc(circuitJson)
  const labelBox = g.boxes.find((b) => b.boxId === "nl1")
  expect(labelBox).toBeDefined()
  const pin = g.pins.find((p) => p.boxId === "nl1")
  expect(pin).toBeDefined()
  expect(pin!.offset.x).toBeLessThan(1)
  expect(pin!.offset.y).toBe(0)
})

test("netlabel without an anchor position uses its center", () => {
  const circuitJson: CircuitJson = [
    {
      type: "schematic_net_label",
      schematic_net_label_id: "nl_without_anchor",
      source_net_id: "net1",
      center: { x: 2, y: 3 },
      anchor_side: "right",
      text: "VCC",
    },
    {
      type: "source_net",
      source_net_id: "net1",
      name: "VCC",
      subcircuit_connectivity_map_key: "net1",
      member_source_group_ids: [],
    },
  ]

  const g = convertCircuitJsonToBpc(circuitJson)
  const labelBox = g.boxes.find((b) => b.boxId === "nl_without_anchor")
  expect(labelBox?.center).toEqual({ x: 2, y: 3 })
  const pin = g.pins.find(
    (p) => p.boxId === "nl_without_anchor" && p.pinId.endsWith("_pin"),
  )
  expect(pin?.offset).toEqual({ x: 0, y: 0 })
})
