interface WorkflowConnectionProps {
  fromStepId: string
  toStepId: string
  fromPosition: { x: number; y: number }
  toPosition: { x: number; y: number }
}

export function WorkflowConnection({
  fromPosition,
  toPosition
}: WorkflowConnectionProps) {
  const startX = fromPosition.x + 128 // 노드 너비의 절반
  const startY = fromPosition.y + 32 // 노드 높이의 절반
  const endX = toPosition.x + 128
  const endY = toPosition.y + 32

  // 베지어 곡선 제어점 계산
  const controlPoint1X = startX + (endX - startX) / 2
  const controlPoint1Y = startY
  const controlPoint2X = startX + (endX - startX) / 2
  const controlPoint2Y = endY

  const path = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground"
      />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-primary/20"
      />
    </svg>
  )
} 