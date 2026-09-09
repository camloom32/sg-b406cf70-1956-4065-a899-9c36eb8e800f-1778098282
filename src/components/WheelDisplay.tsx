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

// ---- Ratchet tick sound (Web Audio, no assets) ----
// One click per section boundary crossing, so the tick rate follows wheel speed.
let audioCtx: AudioContext | null = null;

function playTick(intensity: number) {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 1500 + Math.min(1, Math.max(0, intensity)) * 900;
    gain.gain.setValueAtTime(0.05 + Math.min(1, Math.max(0, intensity)) * 0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  } catch {
    // audio blocked until user gesture; stay silent
  }
}

const TREAD_LAYERS = 12;
const TREAD_DEPTH = 6;

interface WheelDisplayProps {
  size: number;
  baseRotation: number;
  spin: WheelSpin | null;
  onSpinEnd?: () => void;
  className?: string;
  tilt?: number;
  sound?: boolean;
}

// Show-style view: the wheel stands up and the camera looks across the tread,
// so you see the rim edge more than the face. Tilt is rotateX on a 3D stack.
export function WheelDisplay({
  size,
  baseRotation,
  spin,
  onSpinEnd,
  className,
  tilt = 62,
  sound = false,
}: WheelDisplayProps) {
  const [rotation, setRotation] = useState(baseRotation);
  const onEndRef = useRef(onSpinEnd);
  onEndRef.current = onSpinEnd;
  const lastBoundaryRef = useRef(Math.floor(baseRotation / 18));

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
      const rot = spin.fromRotation + (spin.toRotation - spin.fromRotation) * eased;
      setRotation(rot);
      if (sound) {
        const boundary = Math.floor(rot / 18);
        if (boundary !== lastBoundaryRef.current) {
          const peak = (4 * (spin.toRotation - spin.fromRotation)) / spin.durationMs;
          playTick((peak * Math.pow(1 - t, 3)) / 2.5);
          lastBoundaryRef.current = boundary;
        }
      }
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
  }, [spin, baseRotation, sound]);

  const projectedHeight = size * Math.cos((tilt * Math.PI) / 180) + TREAD_LAYERS * TREAD_DEPTH + 40;

  return (
    <div className={className} style={{ perspective: 1200, width: size, height: projectedHeight }}>
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt}deg)`,
        }}
      >
        {[...Array(TREAD_LAYERS)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: i === TREAD_LAYERS - 1 ? "#081540" : "#0c1e52",
              transform: `translateZ(${-(i + 1) * TREAD_DEPTH}px)`,
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
            }}
          />
        ))}
        <svg width={size} height={size} viewBox="0 0 400 400" style={{ position: "relative", display: "block" }}>
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
      </div>
    </div>
  );
}
