import { test, expect } from "bun:test"
import { runTscircuitCode } from "tscircuit"
import { getGraphicsForBpcGraph } from "bpc-graph"
import { convertCircuitJsonToBpc } from "../lib"
import { getSvgFromGraphicsObject } from "graphics-debug"

test("example04", async () => {
  const circuitJson = await runTscircuitCode(`
  export default () => (
    <board width="10mm" height="10mm">
      <resistor
        resistance="1k"
        footprint="0402"
        name="R1"
        schX={3}
        pcbX={3}
      />
      <capacitor
        capacitance="1000pF"
        footprint="0402"
        name="C1"
        schX={-3}
        pcbX={-3}
      />
      <trace from=".R1 > .pin1" to=".C1 > .pin2" />
    </board>
  )
  `)

  const bpc = convertCircuitJsonToBpc(circuitJson)

  const graphics = getGraphicsForBpcGraph(bpc)

  expect(bpc).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "boxId": "schematic_component_0",
          "center": {
            "x": 3,
            "y": 0,
          },
          "kind": "floating",
        },
        {
          "boxId": "schematic_component_1",
          "center": {
            "x": -3,
            "y": 0,
          },
          "kind": "floating",
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
          "pinId": "schematic_component_0_center",
        },
        {
          "boxId": "schematic_component_0",
          "color": "normal",
          "networkId": "unnamedsubcircuit31_connectivity_net0",
          "offset": {
            "x": -0.5512907,
            "y": 0.0002732499999993365,
          },
          "pinId": "schematic_port_0",
        },
        {
          "boxId": "schematic_component_0",
          "color": "not_connected",
          "networkId": "disconnected-0",
          "offset": {
            "x": 0.5512907000000005,
            "y": -0.0002732499999993365,
          },
          "pinId": "schematic_port_1",
        },
        {
          "boxId": "schematic_component_1",
          "color": "component_center",
          "networkId": "center_schematic_component_1",
          "offset": {
            "x": 0,
            "y": 0,
          },
          "pinId": "schematic_component_1_center",
        },
        {
          "boxId": "schematic_component_1",
          "color": "not_connected",
          "networkId": "disconnected-1",
          "offset": {
            "x": -0.5512093000000005,
            "y": -0.00027334999999961695,
          },
          "pinId": "schematic_port_2",
        },
        {
          "boxId": "schematic_component_1",
          "color": "normal",
          "networkId": "unnamedsubcircuit31_connectivity_net0",
          "offset": {
            "x": 0.5512093,
            "y": 0.00027334999999961695,
          },
          "pinId": "schematic_port_3",
        },
      ],
    }
  `)

  expect(
    getSvgFromGraphicsObject(graphics, {
      backgroundColor: "white",
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
