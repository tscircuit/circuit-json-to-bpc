import { expect, test } from "bun:test"
import { convertCircuitJsonToBpc } from "../lib"
import type { CircuitJson } from "circuit-json"

test("net labels without optional anchor_position still convert", () => {
  const circuitJson: CircuitJson = [
    {
      type: "schematic_net_label",
      schematic_net_label_id: "nl1",
      source_net_id: "net1",
      center: { x: 2, y: 3 },
      anchor_side: "left",
      text: "GND",
    },
    {
      type: "source_net",
      source_net_id: "net1",
      name: "GND",
      subcircuit_connectivity_map_key: "net1",
      member_source_group_ids: [],
    },
  ]

  const g = convertCircuitJsonToBpc(circuitJson)
  const labelBox = g.boxes.find((b) => b.boxId === "nl1")
  expect(labelBox).toBeDefined()
  expect(labelBox!.center).toEqual({ x: 2, y: 3 })

  const pin = g.pins.find((p) => p.pinId === "nl1_pin")
  expect(pin).toBeDefined()
  expect(pin!.offset).toEqual({ x: 0, y: 0 })
  expect(pin!.color).toBe("gnd")
})
