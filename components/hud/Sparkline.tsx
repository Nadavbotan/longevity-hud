interface SparklineProps {
  values: number[];
  accent?: string;
  width?: number;
  height?: number;
}

/**
 * Minimal trend sparkline. Pure SVG polyline scaled to the value range, no
 * dependency. Renders nothing useful below 2 points (shows a flat baseline).
 */
export default function Sparkline({
  values,
  accent = "#2fd4ff",
  width = 88,
  height = 28,
}: SparklineProps) {
  if (values.length === 0) {
    return <svg width={width} height={height} aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastX = (values.length - 1) * stepX;
  const lastY = height - ((values[values.length - 1] - min) / span) * height;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${accent})` }}
      />
      <circle cx={lastX} cy={lastY} r="2" fill={accent} />
    </svg>
  );
}
