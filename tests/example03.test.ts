import { test, expect } from "bun:test"
import { runTscircuitCode } from "tscircuit"
import { getGraphicsForBpcGraph } from "bpc-graph"
import { convertCircuitJsonToBpc } from "../lib"

test("example01", async () => {
  const circuitJson = await runTscircuitCode(`
import { sel } from "tscircuit"

export default () => (
  <board routingDisabled>
    <jumper
      name="U1"
      manufacturerPartNumber="I2C_SENSOR"
      footprint="soic5"
      connections={{
        pin1: sel.net.VCC,
        pin2: sel.net.EN,
        pin3: sel.net.MISO,
        pin4: sel.net.MOSI,
        pin5: sel.net.GND,
      }}
    />
    <netlabel
      schX={2}
      schY={-1}
      anchorSide="top"
      net="GND"
      connectsTo={sel.U1.pin5}
    />
    <netlabel
      schX={1.4}
      schY={0.8}
      net="VCC"
      connection={sel.U1.pin1}
      anchorSide="bottom"
    />
  </board>
)
  `)

  const bpcGraph = convertCircuitJsonToBpc(circuitJson, {
    useReadableIds: true,
  })

  expect(bpcGraph).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "boxId": "U1",
          "center": {
            "x": 0,
            "y": 0,
          },
          "kind": "floating",
        },
        {
          "boxAttributes": {
            "is_net_label": true,
            "source_net_id": "source_net_4",
            "source_trace_id": undefined,
          },
          "boxId": "NL_GND0",
          "center": {
            "x": 2,
            "y": -1.18,
          },
          "kind": "fixed",
        },
        {
          "boxAttributes": {
            "is_net_label": true,
            "source_net_id": "source_net_0",
            "source_trace_id": undefined,
          },
          "boxId": "NL_VCC0",
          "center": {
            "x": 1.4,
            "y": 0.98,
          },
          "kind": "fixed",
        },
        {
          "boxAttributes": {
            "is_net_label": true,
            "source_net_id": "source_net_1",
            "source_trace_id": undefined,
          },
          "boxId": "NL_EN0",
          "center": {
            "x": 0.78,
            "y": -0.2,
          },
          "kind": "fixed",
        },
        {
          "boxAttributes": {
            "is_net_label": true,
            "source_net_id": "source_net_2",
            "source_trace_id": undefined,
          },
          "boxId": "NL_MISO0",
          "center": {
            "x": 0.9600000000000001,
            "y": 0,
          },
          "kind": "fixed",
        },
        {
          "boxAttributes": {
            "is_net_label": true,
            "source_net_id": "source_net_3",
            "source_trace_id": undefined,
          },
          "boxId": "NL_MOSI0",
          "center": {
            "x": 0.9600000000000001,
            "y": 0.20000000000000007,
          },
          "kind": "fixed",
        },
      ],
      "pins": [
        {
          "boxId": "schematic_component_0",
          "color": "component_center",
          "networkId": "center_schematic_component_0",
          "offset": {
            "x": 0,
            "y": 0,
          },
          "pinId": "U1_center",
        },
        {
          "boxId": "U1",
          "color": "vcc",
          "networkId": "unnamedsubcircuit85_connectivity_net0",
          "offset": {
            "x": 0.6000000000000001,
            "y": -0.4,
          },
          "pinId": "U1_pin1",
        },
        {
          "boxId": "U1",
          "color": "normal",
          "networkId": "unnamedsubcircuit85_connectivity_net1",
          "offset": {
            "x": 0.6000000000000001,
            "y": -0.2,
          },
          "pinId": "U1_pin2",
        },
        {
          "boxId": "U1",
          "color": "normal",
          "networkId": "unnamedsubcircuit85_connectivity_net2",
          "offset": {
            "x": 0.6000000000000001,
            "y": 0,
          },
          "pinId": "U1_pin3",
        },
        {
          "boxId": "U1",
          "color": "normal",
          "networkId": "unnamedsubcircuit85_connectivity_net3",
          "offset": {
            "x": 0.6000000000000001,
            "y": 0.20000000000000007,
          },
          "pinId": "U1_pin4",
        },
        {
          "boxId": "U1",
          "color": "gnd",
          "networkId": "unnamedsubcircuit85_connectivity_net4",
          "offset": {
            "x": 0.6000000000000001,
            "y": 0.4,
          },
          "pinId": "U1_pin5",
        },
        {
          "boxId": "NL_GND0",
          "color": "gnd",
          "networkId": "unnamedsubcircuit85_connectivity_net4",
          "offset": {
            "x": 0,
            "y": 0.17999999999999994,
          },
          "pinId": "NL_GND0_pin",
        },
        {
          "boxId": "NL_GND0",
          "color": "netlabel_center",
          "networkId": "NL_GND0_center",
          "offset": {
            "x": 0,
            "y": 0,
          },
          "pinId": "NL_GND0_center",
        },
        {
          "boxId": "NL_VCC0",
          "color": "vcc",
          "networkId": "unnamedsubcircuit85_connectivity_net0",
          "offset": {
            "x": 0,
            "y": -0.17999999999999994,
          },
          "pinId": "NL_VCC0_pin",
        },
        {
          "boxId": "NL_VCC0",
          "color": "netlabel_center",
          "networkId": "NL_VCC0_center",
          "offset": {
            "x": 0,
            "y": 0,
          },
          "pinId": "NL_VCC0_center",
        },
        {
          "boxId": "NL_EN0",
          "color": "normal",
          "networkId": "unnamedsubcircuit85_connectivity_net1",
          "offset": {
            "x": -0.17999999999999994,
            "y": 0,
          },
          "pinId": "NL_EN0_pin",
        },
        {
          "boxId": "NL_EN0",
          "color": "netlabel_center",
          "networkId": "NL_EN0_center",
          "offset": {
            "x": 0,
            "y": 0,
          },
          "pinId": "NL_EN0_center",
        },
        {
          "boxId": "NL_MISO0",
          "color": "normal",
          "networkId": "unnamedsubcircuit85_connectivity_net2",
          "offset": {
            "x": -0.36,
            "y": 0,
          },
          "pinId": "NL_MISO0_pin",
        },
        {
          "boxId": "NL_MISO0",
          "color": "netlabel_center",
          "networkId": "NL_MISO0_center",
          "offset": {
            "x": 0,
            "y": 0,
          },
          "pinId": "NL_MISO0_center",
        },
        {
          "boxId": "NL_MOSI0",
          "color": "normal",
          "networkId": "unnamedsubcircuit85_connectivity_net3",
          "offset": {
            "x": -0.36,
            "y": 0,
          },
          "pinId": "NL_MOSI0_pin",
        },
        {
          "boxId": "NL_MOSI0",
          "color": "netlabel_center",
          "networkId": "NL_MOSI0_center",
          "offset": {
            "x": 0,
            "y": 0,
          },
          "pinId": "NL_MOSI0_center",
        },
      ],
    }
  `)
})
