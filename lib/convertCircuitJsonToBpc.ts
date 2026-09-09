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
import { getReadableIdMap } from "./getReadableIdMap"
import { generateImplicitNetLabels } from "./generateImplicitNetLabels"

export const convertCircuitJsonToBpc = (
  circuitJson: CircuitJson,
  opts: {
    inferNetLabels?: boolean
    useReadableIds?: boolean
  } = {},
): BpcGraph => {
  const g: MixedBpcGraph = {
    boxes: [],
    pins: [],
  }
  const db = cju(circuitJson)
  const schComps = db.schematic_component!.list()
  let schLabels = db.schematic_net_label!.list()
  if (opts.inferNetLabels) {
    schLabels = schLabels.concat(generateImplicitNetLabels(circuitJson))
  }

  const readableIdMap: Record<string, string | undefined> = opts.useReadableIds
    ? getReadableIdMap(circuitJson)
    : {}

  const maybeMakeIdReadable = (id: string) => {
    if (!opts.useReadableIds) return id
    if (readableIdMap[id]) return readableIdMap[id]
    return id
  }

  let disconnectedCounter = 0
  for (const schComp of schComps) {
    const box: BpcFloatingBox = {
      boxId: maybeMakeIdReadable(schComp.schematic_component_id),
      kind: "floating",
      center: schComp.center,
    }

    g.boxes.push(box)

    // Add center pin for the component
    const centerPin: BpcPin = {
      pinId: `${maybeMakeIdReadable(schComp.schematic_component_id)}_center`,
      color: "component_center",
      networkId: `center_${schComp.schematic_component_id}`,
      offset: { x: 0, y: 0 },
      boxId: maybeMakeIdReadable(schComp.schematic_component_id),
    }
    g.pins.push(centerPin)

    const schPorts = db.schematic_port!.list({
      schematic_component_id: schComp.schematic_component_id,
    })

    for (const schPort of schPorts) {
      const srcPort = db.source_port!.get(schPort.source_port_id)
      let networkId = srcPort?.subcircuit_connectivity_map_key
      let color: Color = "normal"
      if (networkId) {
        const srcNet = db.source_net!.getWhere({
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
        pinId: maybeMakeIdReadable(schPort.schematic_port_id),
        color,
        networkId,
        offset: {
          x: schPort.center.x - box.center!.x,
          y: schPort.center.y - box.center!.y,
        },
        boxId: maybeMakeIdReadable(schComp.schematic_component_id),
      }

      g.pins.push(pin)
    }
  }

  // Convert schematic net labels into boxes with a single pin
  for (const schLabel of schLabels) {
    const srcNet = db.source_net!.get(schLabel.source_net_id)
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

    // Core still emits a center that is not the visual box center when
    // `anchor_position` is present, so reconstruct from the pin. When the
    // optional `anchor_position` is omitted, `center` is the only geometry.
    const anchorPosition = schLabel.anchor_position
    const netLabelDir = getUnitVecFromAnchorSide(schLabel.anchor_side)

    const netLabelCenter = anchorPosition
      ? {
          x:
            anchorPosition.x -
            netLabelDir.x * schLabel.text.length * 0.18 * 0.5,
          y: anchorPosition.y - netLabelDir.y * 0.18,
        }
      : schLabel.center

    const offset = anchorPosition
      ? {
          x: anchorPosition.x - netLabelCenter.x,
          y: anchorPosition.y - netLabelCenter.y,
        }
      : { x: 0, y: 0 }

    const box: BpcFixedBox = {
      boxId: maybeMakeIdReadable(schLabel.schematic_net_label_id),
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
      pinId: `${maybeMakeIdReadable(schLabel.schematic_net_label_id)}_pin`,
      boxId: maybeMakeIdReadable(schLabel.schematic_net_label_id),
      networkId,
      color,
      offset,
    }
    g.pins.push(pin)
    g.pins.push({
      pinId: `${maybeMakeIdReadable(schLabel.schematic_net_label_id)}_center`,
      boxId: maybeMakeIdReadable(schLabel.schematic_net_label_id),
      networkId: `${maybeMakeIdReadable(schLabel.schematic_net_label_id)}_center`,
      color: "netlabel_center",
      offset: { x: 0, y: 0 },
    })
  }

  return g
}
