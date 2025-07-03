import { cju } from "@tscircuit/circuit-json-util"
import type { CircuitJson } from "circuit-json"

export const getReadableIdMap = (circuitJson: CircuitJson) => {
  const schComps = cju(circuitJson).schematic_component.list()
  const schLabels = cju(circuitJson).schematic_net_label.list()
  const schPorts = cju(circuitJson).schematic_port.list()

  const readableIdMap: Record<string, string | undefined> = {}
  for (const schComp of schComps) {
    const srcComp = cju(circuitJson).source_component.get(
      schComp.source_component_id,
    )
    readableIdMap[schComp.schematic_component_id] = srcComp?.name
  }
  for (const schLabel of schLabels) {
    const srcNet = cju(circuitJson).source_net.get(schLabel.source_net_id)
    if (!srcNet?.name) continue
    let index = 0
    while (Object.values(readableIdMap).includes(`NL_${srcNet.name}${index}`)) {
      index++
    }
    readableIdMap[schLabel.schematic_net_label_id] = `NL_${srcNet.name}${index}`
  }
  for (const schPort of schPorts) {
    const srcPort = cju(circuitJson).source_port.get(schPort.source_port_id)
    if (!srcPort) continue
    const srcComp = cju(circuitJson).source_component.get(
      srcPort.source_component_id,
    )
    if (!srcComp?.name) continue
    const readableName = `${srcComp.name}_${srcPort?.name ?? srcPort?.pin_number ?? ""}`
    readableIdMap[schPort.schematic_port_id] = readableName
  }

  return readableIdMap
}
