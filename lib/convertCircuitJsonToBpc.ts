import type { CircuitJson } from "circuit-json"
import type { BpcFixedBox, BpcFloatingBox, BpcGraph, BpcPin, FloatingBpcGraph } from "box-pin-color-graph"
import { cju } from "@tscircuit/circuit-json-util"

export const convertCircuitJsonToBpc = (circuitJson: CircuitJson): BpcGraph => {
  const g : FloatingBpcGraph = {
    boxes: [],
    pins: []
  }
  const schComps = cju(circuitJson).schematic_component.list()

  for (const schComp of schComps) {
    const box: BpcFloatingBox = {
      boxId: schComp.schematic_component_id,
      kind: "floating",
      center: schComp.center
    }

    g.boxes.push(box)

    const schPorts = cju(circuitJson).schematic_port.list({
      schematic_component_id: schComp.schematic_component_id
    })

    for (const schPort of schPorts) {
      const srcPort = cju(circuitJson).source_port.get(schPort.source_port_id)
      const networkId = srcPort?.subcircuit_connectivity_map_key
      if (!networkId) {
        throw new Error(`Source port "${schPort.source_port_id}" has no subcircuit_connectivity_map_key`)
      }
      const pin: BpcPin = {
        pinId: schPort.schematic_port_id,
        color: "blue",
        networkId: srcPort?.subcircuit_connectivity_map_key!,
        offset: {
          x: schPort.center.x - box.center!.x,
          y: schPort.center.y - box.center!.y
        },
        boxId: schComp.schematic_component_id
      }

      g.pins.push(pin)
    }

  }

  return g
}
