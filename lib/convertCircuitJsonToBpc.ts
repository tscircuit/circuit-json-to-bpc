import type { CircuitJson } from "circuit-json"
import type {
  BpcFixedBox,
  BpcFloatingBox,
  BpcGraph,
  BpcPin,
  FloatingBpcGraph,
} from "box-pin-color-graph"
import { cju } from "@tscircuit/circuit-json-util"
import type { Color } from "./colors"

export const convertCircuitJsonToBpc = (circuitJson: CircuitJson): BpcGraph => {
  const g: FloatingBpcGraph = {
    boxes: [],
    pins: [],
  }
  const schComps = cju(circuitJson).schematic_component.list()

  let disconnectedCounter = 0
  for (const schComp of schComps) {
    const box: BpcFloatingBox = {
      boxId: schComp.schematic_component_id,
      kind: "floating",
      center: schComp.center,
    }

    g.boxes.push(box)

    // Add center pin for the component
    const centerPin: BpcPin = {
      pinId: `${schComp.schematic_component_id}_center`,
      color: "component_center",
      networkId: `center_${schComp.schematic_component_id}`,
      offset: { x: 0, y: 0 },
      boxId: schComp.schematic_component_id,
    }
    g.pins.push(centerPin)

    const schPorts = cju(circuitJson).schematic_port.list({
      schematic_component_id: schComp.schematic_component_id,
    })

    for (const schPort of schPorts) {
      const srcPort = cju(circuitJson).source_port.get(schPort.source_port_id)
      let networkId = srcPort?.subcircuit_connectivity_map_key
      let color: Color = "normal"
      if (networkId) {
        const srcNet = cju(circuitJson).source_net.getWhere({
          subcircuit_connectivity_map_key:
            srcPort?.subcircuit_connectivity_map_key,
        })
        if (srcNet && (srcNet.is_power || srcNet.name.startsWith("V"))) {
          color = "vcc"
        }
        if (srcNet && (srcNet.is_ground || srcNet.name.startsWith("GND"))) {
          color = "gnd"
        }
      } else {
        // if (!networkId) {
        networkId = `disconnected-${disconnectedCounter++}`
        color = "not_connected"
      }
      const pin: BpcPin = {
        pinId: schPort.schematic_port_id,
        color,
        networkId,
        offset: {
          x: schPort.center.x - box.center!.x,
          y: schPort.center.y - box.center!.y,
        },
        boxId: schComp.schematic_component_id,
      }

      g.pins.push(pin)
    }
  }

  return g
}
