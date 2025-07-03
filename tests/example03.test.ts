import { test, expect } from "bun:test"
import { runTscircuitCode } from "tscircuit"
import { getGraphicsForBpcGraph } from "bpc-graph"
import { convertCircuitJsonToBpc } from "../lib"

test("example03", async () => {
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

  expect(bpcGraph.boxes.map((b) => b.boxId)).toMatchInlineSnapshot(`
    [
      "U1",
      "NL_GND0",
      "NL_VCC0",
      "NL_EN0",
      "NL_MISO0",
      "NL_MOSI0",
    ]
  `)
  expect(bpcGraph.pins.map((p) => [p.boxId, p.pinId])).toMatchInlineSnapshot(`
    [
      [
        "U1",
        "U1_center",
      ],
      [
        "U1",
        "U1_pin1",
      ],
      [
        "U1",
        "U1_pin2",
      ],
      [
        "U1",
        "U1_pin3",
      ],
      [
        "U1",
        "U1_pin4",
      ],
      [
        "U1",
        "U1_pin5",
      ],
      [
        "NL_GND0",
        "NL_GND0_pin",
      ],
      [
        "NL_GND0",
        "NL_GND0_center",
      ],
      [
        "NL_VCC0",
        "NL_VCC0_pin",
      ],
      [
        "NL_VCC0",
        "NL_VCC0_center",
      ],
      [
        "NL_EN0",
        "NL_EN0_pin",
      ],
      [
        "NL_EN0",
        "NL_EN0_center",
      ],
      [
        "NL_MISO0",
        "NL_MISO0_pin",
      ],
      [
        "NL_MISO0",
        "NL_MISO0_center",
      ],
      [
        "NL_MOSI0",
        "NL_MOSI0_pin",
      ],
      [
        "NL_MOSI0",
        "NL_MOSI0_center",
      ],
    ]
  `)
})
