import { useEffect, useRef, useState } from "react";
import { WHEEL_SECTIONS, type WheelSpin } from "@/services/gameService";

const CX = 200;
const CY = 200;
const R = 186;
const LABEL_RADIUS = 138;

function polar(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.sin(rad), CY - radius * Math.cos(rad)];
}

function wedgePath(i: number): string {
  const [x1, y1] = polar(i * 18 - 9, R);
  const [x2, y2] = polar(i * 18 + 9, R);
  return `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

function wedgeFill(i: number): string {
  const v = WHEEL_SECTIONS[i];
  if (v === 100) return "#fbbf24";
  if (v === 5 || v === 15) return "#16a34a";
  return i % 2 === 0 ? "#dc2626" : "#fde9c8";
}

function wedgeLabelFill(i: number): string {
  const v = WHEEL_SECTIONS[i];
  if (v === 100) return "#422006";
  if (v === 5 || v === 15) return "#ffffff";
  return i % 2 === 0 ? "#ffffff" : "#7c2d12";
}

export function formatWheelLabel(v: number): string {
  return v === 100 ? "$1.00" : `${v}¢`;
}

const WEDGES = WHEEL_SECTIONS.map((v, i) => ({
  path: wedgePath(i),
  fill: wedgeFill(i),
  labelFill: wedgeLabelFill(i),
  label: formatWheelLabel(v),
  rotation: i * 18,
  fontSize: v === 100 ? 15 : 19,
}));

interface WheelDisplayProps {
  size: number;
  baseRotation: number;
  spin: WheelSpin | null;
  onSpinEnd?: () => void;
  className?: string;
}

export function WheelDisplay({ size, baseRotation, spin, onSpinEnd, className }: WheelDisplayProps) {
  const [rotation, setRotation] = useState(baseRotation);
  const onEndRef = useRef(onSpinEnd);
  onEndRef.current = onSpinEnd;

  useEffect(() => {
    if (!spin) {
      setRotation(baseRotation);
      return;
    }
    let raf = 0;
    let done = false;
    const tick = () => {
      const elapsed = Date.now() - spin.at;
      const t = Math.min(1, Math.max(0, elapsed / spin.durationMs));
      const eased = 1 - Math.pow(1 - t, 4);
      setRotation(spin.fromRotation + (spin.toRotation - spin.fromRotation) * eased);
      if (t >= 1) {
        if (!done) {
          done = true;
          onEndRef.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spin, baseRotation]);

  return (
    <svg width={size} height={size} viewBox="0 0 400 400" className={className}>
      <circle cx={CX} cy={CY} r={198} fill="#0c1440" />
      <circle cx={CX} cy={CY} r={192} fill="#1e3a8a" />
      <g transform={`rotate(${rotation} ${CX} ${CY})`}>
        {WEDGES.map((w, i) => (
          <path key={i} d={w.path} fill={w.fill} stroke="#0c1440" strokeWidth={2} />
        ))}
        {WEDGES.map((w, i) => (
          <text
            key={`l${i}`}
            x={CX}
            y={CY - LABEL_RADIUS}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={w.fontSize}
            fontWeight={900}
            fill={w.labelFill}
            fontFamily="Arial, Helvetica, sans-serif"
            transform={`rotate(${w.rotation} ${CX} ${CY})`}
          >
            {w.label}
          </text>
        ))}
      </g>
      <circle cx={CX} cy={CY} r={32} fill="#0c1440" stroke="#fbbf24" strokeWidth={4} />
      <text
        x={CX}
        y={CY + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={32}
        fontWeight={900}
        fill="#fbbf24"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        $
      </text>
      <polygon points={`${CX},64 ${CX - 16},20 ${CX + 16},20`} fill="#fbbf24" stroke="#0c1440" strokeWidth={3} />
    </svg>
  );
}
