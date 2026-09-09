import { useEffect, useRef, useState } from "react";
import { WHEEL_SECTIONS, type WheelSpin } from "@/services/gameService";

const PANELS = 20;
const ANGLE = 360 / PANELS; // 18 degrees
const PANEL_W = 52;
const PANEL_H = 88;
const RADIUS = PANEL_W / (2 * Math.sin(Math.PI / PANELS)); // ~166px
const SCENE_W = PANEL_H + 80; // width of drum face + padding
const SCENE_H = Math.ceil(2 * (RADIUS + PANEL_W / 2 + 30)); // height = circumference diameter + padding

function panelBg(v: number): string {
  if (v === 100) return "#c41e3a";
  if (v === 5 || v === 15) return "#228b22";
  return "#1a1a1a";
}

function panelTextColor(_v: number): string {
  return "#f5e6c8";
}

function panelBorder(v: number): string {
  if (v === 100) return "#fbbf24";
  if (v === 5 || v === 15) return "#f5e6c8";
  return "#c9a227";
}

export function formatWheelLabel(v: number): string {
  return v === 100 ? "100" : `${v}`;
}

// ---- Ratchet tick sound (Web Audio, no assets) ----
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

interface WheelDisplayProps {
  size: number;
  baseRotation: number;
  spin: WheelSpin | null;
  onSpinEnd?: () => void;
  className?: string;
  tilt?: number;
  sound?: boolean;
}

export function WheelDisplay({
  size,
  baseRotation,
  spin,
  onSpinEnd,
  className,
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

  const scale = size / SCENE_W;

  return (
    <div
      className={className}
      style={{
        perspective: 1200,
        width: size,
        height: size * (SCENE_H / SCENE_W),
        overflow: "hidden",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: SCENE_W,
          height: SCENE_H,
          position: "relative",
        }}
      >
        {/* End caps (left and right rings for vertical wheel) */}
        <div
          style={{
            position: "absolute",
            left: (SCENE_W - PANEL_H) / 2 - 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 10,
            height: PANEL_W + 16,
            background: "#0c1440",
            borderRadius: "50%",
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: (SCENE_W + PANEL_H) / 2,
            top: "50%",
            transform: "translateY(-50%)",
            width: 10,
            height: PANEL_W + 16,
            background: "#0c1440",
            borderRadius: "50%",
            zIndex: 2,
          }}
        />

        {/* Central hub (static, overlaid on front) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#0c1440",
            border: "3px solid #fbbf24",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 900,
            color: "#fbbf24",
            fontFamily: "Arial, Helvetica, sans-serif",
            zIndex: 10,
          }}
        >
          $
        </div>

        {/* The drum - vertical wheel spinning around horizontal axis */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 0,
            height: 0,
            transformStyle: "preserve-3d",
            transform: `rotateX(${-rotation}deg)`,
          }}
        >
          {WHEEL_SECTIONS.map((v, i) => {
            const angle = i * ANGLE;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: -PANEL_W / 2,
                  top: -PANEL_H / 2,
                  width: PANEL_W,
                  height: PANEL_H,
                  background: panelBg(v),
                  border: `3px solid ${panelBorder(v)}`,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backfaceVisibility: "visible",
                  transform: `rotateX(${angle}deg) translateZ(${RADIUS}px) rotateZ(0deg)`,
                }}
              >
                <span
                  style={{
                    fontSize: v === 100 ? 20 : 18,
                    fontWeight: 900,
                    color: panelTextColor(v),
                    fontFamily: "Arial, Helvetica, sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatWheelLabel(v)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Pointer at the top */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 8,
            transform: "translateX(-50%)",
            zIndex: 20,
            filter: "drop-shadow(2px 2px 2px rgba(0,0,0,0.5))",
          }}
        >
          <svg width="40" height="32" viewBox="0 0 40 32">
            <polygon points="20,0 0,32 40,32" fill="#f97316" stroke="#0c1440" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </div>
  );
}
