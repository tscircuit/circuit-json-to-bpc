import { test, expect } from "bun:test"
import { runTscircuitCode } from "tscircuit"
import { getGraphicsForBpcGraph } from "bpc-graph"
import { convertCircuitJsonToBpc } from "../lib"

test("example01", async () => {
  const circuitJson = await runTscircuitCode(`
    export default () => (
      <board routingDisabled>
        <resistor schX={4} name="R1" resistance="1k" />
        <chip name="U1" footprint="soic8" connections={{
          pin1: "R1.1",
          pin2: "net.TESTNET",
          pin6: "R1.2",
          pin5: "net.OTHERNET"
        }} />
      </board>
    )
  `)

  const bpcGraph = convertCircuitJsonToBpc(circuitJson)
  const graphics = getGraphicsForBpcGraph(bpcGraph)
  expect(graphics).toMatchGraphicsSvg(import.meta.path, {
    backgroundColor: "white",
  })
})
