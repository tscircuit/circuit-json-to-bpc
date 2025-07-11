import type { CircuitJson, SchematicNetLabel } from "circuit-json"
import { cju, oppositeSide } from "@tscircuit/circuit-json-util"

/**
 * Generate implicit net labels for schematic ports that belong to a net but
 * are not connected via a trace. Existing labels are not duplicated.
 */
export const generateImplicitNetLabels = (
  circuitJson: CircuitJson,
): SchematicNetLabel[] => {
  const db = cju(circuitJson)
  const existingLabels = new Set(
    db.schematic_net_label
      .list()
      .map(
        (nl) =>
          `${nl.anchor_position?.x ?? nl.center.x},${nl.anchor_position?.y ?? nl.center.y}`,
      ),
  )

  const newLabels: SchematicNetLabel[] = []

  for (const sp of db.schematic_port.list()) {
    const key = `${sp.center.x},${sp.center.y}`
    if (existingLabels.has(key)) continue

    const srcPort = db.source_port.get(sp.source_port_id)
    if (!srcPort) continue

    const srcNet = db.source_net.getWhere({
      subcircuit_connectivity_map_key: srcPort.subcircuit_connectivity_map_key,
    })
    if (!srcNet) continue

    const srcTrace = db.source_trace
      .list()
      .find((st) => st.connected_source_port_ids?.includes(sp.source_port_id))
    const schTrace = db.schematic_trace.getWhere({
      source_trace_id: srcTrace?.source_trace_id,
    })

    const schematic_net_label_id = `netlabel_for_${sp.schematic_port_id}`

    const schematic_net_label: SchematicNetLabel = {
      type: "schematic_net_label",
      schematic_net_label_id,

      // @ts-ignore - extra field to help with binding inside tscircuit/core
      schematic_port_id: sp.schematic_port_id,

      text: srcNet.name,
      source_net_id: srcNet.source_net_id,
      source_trace_id: srcTrace?.source_trace_id,
      schematic_trace_id: schTrace?.schematic_trace_id,
      anchor_position: { ...sp.center },
      center: { ...sp.center },
      anchor_side: oppositeSide(sp.facing_direction ?? "right"),
    }

    newLabels.push(schematic_net_label)
  }

  return newLabels
}
