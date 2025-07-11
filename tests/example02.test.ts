import { test, expect } from "bun:test"
import { runTscircuitCode } from "tscircuit"
import { getGraphicsForBpcGraph } from "bpc-graph"
import { convertCircuitJsonToBpc } from "../lib"

test("example02", async () => {
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

  const bpcGraph = convertCircuitJsonToBpc(circuitJson)
  const graphics = getGraphicsForBpcGraph(bpcGraph)
  expect(graphics).toMatchGraphicsSvg(import.meta.path, {
    backgroundColor: "white",
  })
})
