import type { CSSProperties } from "react";
import styles from "./confetti-burst.module.css";

type ConfettiPiece = {
  color: string;
  delay: number;
  duration: number;
  endX: number;
  endY: number;
  endTurn: number;
  height: number;
  left: number;
  midX: number;
  midY: number;
  midTurn: number;
  shape: "dot" | "star" | "strip";
  startY: number;
  width: number;
};

type ConfettiStyle = CSSProperties & {
  "--confetti-color": string;
  "--confetti-delay": string;
  "--confetti-duration": string;
  "--confetti-end-x": string;
  "--confetti-end-y": string;
  "--confetti-end-turn": string;
  "--confetti-height": string;
  "--confetti-left": string;
  "--confetti-mid-x": string;
  "--confetti-mid-y": string;
  "--confetti-mid-turn": string;
  "--confetti-sway-duration": string;
  "--confetti-sway-end-x": string;
  "--confetti-sway-start-x": string;
  "--confetti-sway-turn": string;
  "--confetti-start-y": string;
  "--confetti-width": string;
};

type ConfettiBurstProps = {
  variant?: "default" | "ending";
};

const CONFETTI_PIECES: ConfettiPiece[] = [
  { left: 5, startY: -80, midX: -8, midY: 22, endX: 12, endY: 72, midTurn: -58, endTurn: 176, delay: 0, duration: 2140, width: 10, height: 15, color: "#fa907b", shape: "strip" },
  { left: 11, startY: -160, midX: 11, midY: 26, endX: -15, endY: 86, midTurn: 42, endTurn: -154, delay: 240, duration: 1880, width: 12, height: 12, color: "#ffbe3d", shape: "dot" },
  { left: 17, startY: -46, midX: -13, midY: 18, endX: 9, endY: 64, midTurn: -72, endTurn: 208, delay: 80, duration: 2360, width: 11, height: 17, color: "#7ed9c8", shape: "strip" },
  { left: 23, startY: -198, midX: 9, midY: 28, endX: -18, endY: 90, midTurn: 54, endTurn: -228, delay: 520, duration: 2020, width: 13, height: 16, color: "#a8d8ff", shape: "strip" },
  { left: 30, startY: -112, midX: -10, midY: 23, endX: 16, endY: 76, midTurn: -44, endTurn: 162, delay: 160, duration: 2480, width: 13, height: 13, color: "#c7b1ff", shape: "dot" },
  { left: 36, startY: -64, midX: 14, midY: 27, endX: -11, endY: 82, midTurn: 68, endTurn: -196, delay: 400, duration: 2200, width: 12, height: 16, color: "#fa907b", shape: "strip" },
  { left: 42, startY: -142, midX: -9, midY: 20, endX: 18, endY: 68, midTurn: -38, endTurn: 138, delay: 600, duration: 1920, width: 18, height: 18, color: "#ffbe3d", shape: "star" },
  { left: 48, startY: -184, midX: 12, midY: 30, endX: -20, endY: 88, midTurn: 76, endTurn: -244, delay: 40, duration: 2420, width: 10, height: 17, color: "#7ed9c8", shape: "strip" },
  { left: 54, startY: -94, midX: -11, midY: 24, endX: 14, endY: 74, midTurn: -52, endTurn: 188, delay: 320, duration: 2050, width: 11, height: 11, color: "#a8d8ff", shape: "dot" },
  { left: 60, startY: -40, midX: 8, midY: 25, endX: -16, endY: 84, midTurn: 48, endTurn: -212, delay: 120, duration: 2310, width: 13, height: 16, color: "#c7b1ff", shape: "strip" },
  { left: 66, startY: -176, midX: -14, midY: 18, endX: 10, endY: 60, midTurn: -64, endTurn: 198, delay: 560, duration: 1840, width: 10, height: 14, color: "#fa907b", shape: "strip" },
  { left: 72, startY: -126, midX: 10, midY: 29, endX: -19, endY: 90, midTurn: 58, endTurn: -236, delay: 200, duration: 2500, width: 12, height: 17, color: "#ffbe3d", shape: "strip" },
  { left: 78, startY: -72, midX: -8, midY: 24, endX: 15, endY: 78, midTurn: -36, endTurn: 148, delay: 460, duration: 2180, width: 14, height: 14, color: "#7ed9c8", shape: "dot" },
  { left: 83, startY: -200, midX: 13, midY: 21, endX: -12, endY: 70, midTurn: 72, endTurn: -184, delay: 280, duration: 1980, width: 11, height: 16, color: "#a8d8ff", shape: "strip" },
  { left: 87, startY: -104, midX: -10, midY: 28, endX: 20, endY: 87, midTurn: -46, endTurn: 172, delay: 640, duration: 2390, width: 19, height: 19, color: "#c7b1ff", shape: "star" },
  { left: 90, startY: -54, midX: 9, midY: 19, endX: -14, endY: 66, midTurn: 52, endTurn: -202, delay: 360, duration: 2100, width: 12, height: 15, color: "#fa907b", shape: "strip" },
  { left: 93, startY: -152, midX: -12, midY: 30, endX: 17, endY: 89, midTurn: -62, endTurn: 224, delay: 500, duration: 2460, width: 12, height: 12, color: "#ffbe3d", shape: "dot" },
  { left: 95, startY: -88, midX: 8, midY: 25, endX: -13, endY: 80, midTurn: 44, endTurn: -168, delay: 620, duration: 2260, width: 10, height: 16, color: "#7ed9c8", shape: "strip" },
];

function getConfettiStyle(piece: ConfettiPiece, variant: ConfettiBurstProps["variant"]): ConfettiStyle {
  const isEnding = variant === "ending";
  const sizeScale = isEnding ? 0.72 : 1;
  const timeScale = isEnding ? 0.82 : 1;
  const delayScale = isEnding ? 0.8 : 1;
  const driftScale = isEnding ? 1.55 : 1;
  const turnScale = isEnding ? 1.25 : 1;

  return {
    "--confetti-color": piece.color,
    "--confetti-delay": `${Math.round(piece.delay * delayScale)}ms`,
    "--confetti-duration": `${Math.round(piece.duration * timeScale)}ms`,
    "--confetti-end-x": `${Math.round(piece.endX * driftScale)}px`,
    "--confetti-end-y": `${piece.endY}vh`,
    "--confetti-end-turn": `${Math.round(piece.endTurn * turnScale)}deg`,
    "--confetti-height": `${Math.round(piece.height * sizeScale * 10) / 10}px`,
    "--confetti-left": `${piece.left}%`,
    "--confetti-mid-x": `${Math.round(piece.midX * driftScale)}px`,
    "--confetti-mid-y": `${piece.midY}vh`,
    "--confetti-mid-turn": `${Math.round(piece.midTurn * turnScale)}deg`,
    "--confetti-sway-duration": `${440 + (piece.left % 7) * 45}ms`,
    "--confetti-sway-end-x": `${Math.round(piece.endX * driftScale)}px`,
    "--confetti-sway-start-x": `${Math.round(piece.midX * driftScale)}px`,
    "--confetti-sway-turn": `${Math.round(piece.endTurn * 0.72)}deg`,
    "--confetti-start-y": `${piece.startY}px`,
    "--confetti-width": `${Math.round(piece.width * sizeScale * 10) / 10}px`,
  };
}

export function ConfettiBurst({ variant = "default" }: ConfettiBurstProps) {
  return (
    <div className={styles.confettiBurst} data-variant={variant} aria-hidden="true">
      {CONFETTI_PIECES.map((piece) => (
        <span
          key={`${piece.left}-${piece.delay}`}
          className={styles.confettiPiece}
          data-shape={piece.shape}
          style={getConfettiStyle(piece, variant)}
        >
          <span className={styles.confettiShape} />
        </span>
      ))}
    </div>
  );
}
