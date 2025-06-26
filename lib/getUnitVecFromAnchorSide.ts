type AnchorSide = "left" | "right" | "top" | "bottom"

export const getUnitVecFromAnchorSide = (anchorSide: AnchorSide): Vec2 => {
  switch (anchorSide) {
    case "left":
      return { x: -1, y: 0 }
    case "right":
      return { x: 1, y: 0 }
    case "top":
      return { x: 0, y: 1 }
    case "bottom":
      return { x: 0, y: -1 }
  }
}