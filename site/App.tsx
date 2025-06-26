import { useCallback, useState } from "react"
import { InteractiveGraphics } from "graphics-debug/react"
import { convertCircuitJsonToBpc } from "../lib/convertCircuitJsonToBpc"
import type { CircuitJson } from "circuit-json"
import { getGraphicsForBpcGraph, type BpcGraph } from "box-pin-color-graph"

export default () => {
  const [circuitJson, setCircuitJson] = useState<CircuitJson | null>(null)
  const [bpcGraph, setBpcGraph] = useState<BpcGraph | null>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        const reader = new FileReader()
        reader.onload = (e: ProgressEvent<FileReader>) => {
          try {
            const json = JSON.parse(e.target?.result as string)
            setCircuitJson(json)
            const bpc = convertCircuitJsonToBpc(json)
            setBpcGraph(bpc)
          } catch (err) {
            console.error("Failed to parse JSON:", err)
          }
        }
        reader.readAsText(file)
      })
    }
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const json = JSON.parse(e.target?.result as string)
          setCircuitJson(json)
          const bpc = convertCircuitJsonToBpc(json)
          setBpcGraph(bpc)
        } catch (err) {
          console.error("Failed to parse JSON:", err)
        }
      }
      reader.readAsText(file!)
    },
    [],
  )

  const downloadBpcJson = useCallback(() => {
    if (!bpcGraph) return
    const dataStr = JSON.stringify(bpcGraph, null, 2)
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = "bpc-graph.json"

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }, [bpcGraph])

  const reset = useCallback(() => {
    setCircuitJson(null)
    setBpcGraph(null)
  }, [])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {!circuitJson ? (
        <div className="flex flex-col text-center">
          <h1 className="text-3xl font-bold mb-8 text-white">
            Circuit JSON to BPC Converter
          </h1>
          <div className="border-2 border-dashed border-gray-500 rounded-lg p-12">
            <p className="text-gray-400 mb-4">
              Drag and drop a circuit JSON file here
            </p>
            <p className="text-gray-400">or</p>
            <label className="mt-4 cursor-pointer inline-block">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-white">
                Choose File
              </span>
            </label>
          </div>
        </div>
      ) : (
        <div className="w-full h-full">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">BPC Graph Viewer</h1>
            <div className="flex gap-2">
              <button
                onClick={downloadBpcJson}
                className="bg-blue-700 px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                type="button"
              >
                Download BPC JSON
              </button>
              <button
                onClick={reset}
                className="bg-gray-700 px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-md">
            {bpcGraph && (
              <InteractiveGraphics
                graphics={getGraphicsForBpcGraph(bpcGraph)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
