import type { CircuitJson } from "circuit-json"
import type {
  BpcFixedBox,
  BpcFloatingBox,
  BpcGraph,
  BpcPin,
  MixedBpcGraph,
} from "bpc-graph"
import { cju } from "@tscircuit/circuit-json-util"
import type { Color } from "./colors"
import { getUnitVecFromAnchorSide } from "./getUnitVecFromAnchorSide"

export const convertCircuitJsonToBpc = (
  circuitJson: CircuitJson,
  opts: {
    inferNetLabels?: boolean
  } = {},
): BpcGraph => {
  const g: MixedBpcGraph = {
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

  // Convert schematic net labels into boxes with a single pin
  const schLabels = cju(circuitJson).schematic_net_label.list()
  for (const schLabel of schLabels) {
    const srcNet = cju(circuitJson).source_net.get(schLabel.source_net_id)
    let networkId = srcNet?.subcircuit_connectivity_map_key
    let color: Color = "normal"
    if (networkId) {
      if (srcNet && (srcNet.is_power || srcNet.name.startsWith("V"))) {
        color = "vcc"
      }
      if (srcNet && (srcNet.is_ground || srcNet.name.startsWith("GND"))) {
        color = "gnd"
      }
    } else {
      networkId = `disconnected-${disconnectedCounter++}`
      color = "not_connected"
    }

    // TODO use schLabel.center when core fixes the calculation
    // const netLabelCenter = schLabel.center

    const netLabelDir = getUnitVecFromAnchorSide(schLabel.anchor_side)

    const netLabelCenter = {
      x:
        schLabel.anchor_position!.x -
        netLabelDir.x * schLabel.text.length * 0.18 * 0.5,
      y: schLabel.anchor_position!.y - netLabelDir.y * 0.18,
    }

    let offset = { x: 0, y: 0 }
    if (schLabel.anchor_position) {
      offset = {
        x: schLabel.anchor_position.x - netLabelCenter.x,
        y: schLabel.anchor_position.y - netLabelCenter.y,
      }
    }

    const box: BpcFixedBox = {
      boxId: schLabel.schematic_net_label_id,
      kind: "fixed",
      center: netLabelCenter,
      boxAttributes: {
        is_net_label: true,
        source_net_id: schLabel.source_net_id,
        source_trace_id: schLabel.source_trace_id,
      },
    }
    g.boxes.push(box)

    const pin: BpcPin = {
      pinId: `${schLabel.schematic_net_label_id}_pin`,
      boxId: schLabel.schematic_net_label_id,
      networkId,
      color,
      offset,
    }
    g.pins.push(pin)
    g.pins.push({
      pinId: `${schLabel.schematic_net_label_id}_center`,
      boxId: schLabel.schematic_net_label_id,
      networkId: `${schLabel.schematic_net_label_id}_center`,
      color: "netlabel_center",
      offset: { x: 0, y: 0 },
    })
  }

  return g
}
