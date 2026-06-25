import { forwardRef, useMemo } from "react";
import type { ActivityDiagram } from "@/lib/analyzer";

/**
 * Deterministic, production-safe UML Activity Diagram renderer.
 *
 * Rationale: Mermaid is unreliable for AI-generated labels (unescaped parens,
 * colons, slashes, quotes, emoji) and has known issues with render-ID collisions
 * and bundler tree-shaking in production builds. Since the AI already returns
 * fully structured ActivityDiagram data (start / activities / decisions /
 * endNodes / actor & system actions), we render the diagram directly as SVG
 * with no parser involved. This cannot fail to render.
 */

const WIDTH = 880;
const PAD_X = 40;
const CENTER = WIDTH / 2;

// vertical step sizes
const STEP = 90;
const DECISION_STEP = 170;

// node sizes
const START_R = 22;
const ACT_W = 320;
const ACT_H = 54;
const DEC_W = 240;
const DEC_H = 110;
const BRANCH_W = 220;
const BRANCH_H = 48;

function wrap(label: string, max = 38): string[] {
  const words = (label || "").split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function TextLines({
  x,
  y,
  lines,
  fill = "#0f172a",
  weight = 500,
  size = 12,
}: {
  x: number;
  y: number;
  lines: string[];
  fill?: string;
  weight?: number;
  size?: number;
}) {
  const lh = size + 3;
  const total = lines.length * lh;
  const startY = y - total / 2 + lh / 2 + 1;
  return (
    <text
      x={x}
      y={startY}
      textAnchor="middle"
      fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
      fontSize={size}
      fontWeight={weight}
      fill={fill}
    >
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lh}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  label,
  color = "#475569",
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  color?: string;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} markerEnd="url(#ad-arrow)" />
      {label ? (
        <g>
          <rect x={mx - 18} y={my - 10} width={36} height={18} rx={4} fill="#ffffff" stroke={color} strokeWidth={1} />
          <text x={mx} y={my + 3} textAnchor="middle" fontSize={10} fontWeight={700} fill={color} fontFamily="ui-sans-serif, system-ui">
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
}

type Node =
  | { kind: "start"; y: number; label: string }
  | { kind: "end"; y: number; label: string }
  | { kind: "activity"; y: number; label: string; tone?: "actor" | "system" | "integration" }
  | { kind: "decision"; y: number; question: string; yesPath: string; noPath: string };

function buildNodes(ad: ActivityDiagram): { nodes: Node[]; height: number } {
  const nodes: Node[] = [];
  let y = 60;

  nodes.push({ kind: "start", y, label: ad.startNode || "Start" });
  y += STEP;

  const activities = (ad.activities || []).filter(Boolean);
  for (const a of activities) {
    nodes.push({ kind: "activity", y, label: a, tone: "actor" });
    y += STEP;
  }

  const systemActions = (ad.systemActions || []).filter(Boolean);
  for (const a of systemActions) {
    nodes.push({ kind: "activity", y, label: a, tone: "system" });
    y += STEP;
  }

  const integrations = (ad.integrationPoints || []).filter(Boolean);
  for (const a of integrations) {
    nodes.push({ kind: "activity", y, label: a, tone: "integration" });
    y += STEP;
  }

  const decisions = (ad.decisions || []).filter((d) => d && d.question);
  for (const d of decisions) {
    nodes.push({ kind: "decision", y, question: d.question, yesPath: d.yesPath || "Proceed", noPath: d.noPath || "Reject" });
    y += DECISION_STEP;
  }

  const ends = (ad.endNodes && ad.endNodes.length ? ad.endNodes : ["End"]).filter(Boolean);
  for (const e of ends) {
    nodes.push({ kind: "end", y, label: e });
    y += STEP;
  }

  return { nodes, height: y + 20 };
}

interface Props {
  diagram: ActivityDiagram;
  /** When true, sets explicit width/height attrs for export to PNG. */
  forExport?: boolean;
}

export const ActivityDiagramSvg = forwardRef<SVGSVGElement, Props>(function ActivityDiagramSvg(
  { diagram, forExport },
  ref,
) {
  const { nodes, height } = useMemo(() => buildNodes(diagram), [diagram]);

  const sizeProps = forExport
    ? { width: WIDTH, height }
    : { width: "100%", height: "auto", style: { maxWidth: "100%", height: "auto" } as React.CSSProperties };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${WIDTH} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      {...sizeProps}
    >
      <defs>
        <marker id="ad-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
        </marker>
      </defs>
      <rect x={0} y={0} width={WIDTH} height={height} fill="#ffffff" />

      {/* connectors between sequential nodes */}
      {nodes.map((n, i) => {
        if (i === nodes.length - 1) return null;
        const next = nodes[i + 1];
        const fromY =
          n.kind === "start"
            ? n.y + START_R
            : n.kind === "activity"
            ? n.y + ACT_H / 2
            : n.kind === "decision"
            ? n.y + DEC_H / 2 + BRANCH_H + 8 // join below branches
            : n.y + START_R;
        const toY =
          next.kind === "start"
            ? next.y - START_R
            : next.kind === "activity"
            ? next.y - ACT_H / 2
            : next.kind === "decision"
            ? next.y - DEC_H / 2
            : next.y - START_R;
        return <Arrow key={`conn-${i}`} x1={CENTER} y1={fromY} x2={CENTER} y2={toY} />;
      })}

      {/* nodes */}
      {nodes.map((n, i) => {
        if (n.kind === "start") {
          return (
            <g key={i}>
              <circle cx={CENTER} cy={n.y} r={START_R} fill="#1e40af" stroke="#1e3a8a" strokeWidth={2} />
              <text x={CENTER} y={n.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#ffffff" fontFamily="ui-sans-serif, system-ui">
                START
              </text>
              {n.label && n.label.toLowerCase() !== "start" ? (
                <text x={CENTER} y={n.y + START_R + 16} textAnchor="middle" fontSize={11} fill="#475569" fontFamily="ui-sans-serif, system-ui">
                  {n.label}
                </text>
              ) : null}
            </g>
          );
        }
        if (n.kind === "end") {
          return (
            <g key={i}>
              <circle cx={CENTER} cy={n.y} r={START_R + 3} fill="#ffffff" stroke="#16a34a" strokeWidth={2} />
              <circle cx={CENTER} cy={n.y} r={START_R - 6} fill="#16a34a" />
              <text x={CENTER} y={n.y + START_R + 16} textAnchor="middle" fontSize={11} fontWeight={600} fill="#15803d" fontFamily="ui-sans-serif, system-ui">
                END — {n.label}
              </text>
            </g>
          );
        }
        if (n.kind === "activity") {
          const fill =
            n.tone === "system" ? "#eff6ff" : n.tone === "integration" ? "#ecfeff" : "#f8fafc";
          const stroke =
            n.tone === "system" ? "#1e40af" : n.tone === "integration" ? "#0e7490" : "#475569";
          const tag = n.tone === "system" ? "SYSTEM" : n.tone === "integration" ? "INTEGRATION" : "ACTOR";
          const lines = wrap(n.label);
          return (
            <g key={i}>
              <rect
                x={CENTER - ACT_W / 2}
                y={n.y - ACT_H / 2}
                width={ACT_W}
                height={ACT_H}
                rx={10}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.5}
              />
              <rect x={CENTER - ACT_W / 2 + 8} y={n.y - ACT_H / 2 - 9} width={tag.length * 6.5 + 10} height={16} rx={4} fill={stroke} />
              <text
                x={CENTER - ACT_W / 2 + 13}
                y={n.y - ACT_H / 2 + 3}
                fontSize={9}
                fontWeight={700}
                fill="#ffffff"
                fontFamily="ui-sans-serif, system-ui"
              >
                {tag}
              </text>
              <TextLines x={CENTER} y={n.y} lines={lines} />
            </g>
          );
        }
        // decision
        const cx = CENTER;
        const cy = n.y;
        const pts = `${cx},${cy - DEC_H / 2} ${cx + DEC_W / 2},${cy} ${cx},${cy + DEC_H / 2} ${cx - DEC_W / 2},${cy}`;
        const qLines = wrap(n.question, 28);
        const yesX = cx + 230;
        const noX = cx - 230;
        const branchY = cy + DEC_H / 2 + 30;
        const joinY = branchY + BRANCH_H / 2 + 18;
        return (
          <g key={i}>
            <polygon points={pts} fill="#fef3c7" stroke="#b45309" strokeWidth={1.5} />
            <TextLines x={cx} y={cy} lines={qLines} fill="#78350f" size={11} weight={600} />

            {/* Yes branch */}
            <Arrow x1={cx + DEC_W / 2} y1={cy} x2={yesX - BRANCH_W / 2} y2={branchY} label="Yes" color="#15803d" />
            <rect x={yesX - BRANCH_W / 2} y={branchY - BRANCH_H / 2} width={BRANCH_W} height={BRANCH_H} rx={8} fill="#f0fdf4" stroke="#15803d" strokeWidth={1.5} />
            <TextLines x={yesX} y={branchY} lines={wrap(n.yesPath, 30)} fill="#14532d" size={11} />

            {/* No branch */}
            <Arrow x1={cx - DEC_W / 2} y1={cy} x2={noX + BRANCH_W / 2} y2={branchY} label="No" color="#b91c1c" />
            <rect x={noX - BRANCH_W / 2} y={branchY - BRANCH_H / 2} width={BRANCH_W} height={BRANCH_H} rx={8} fill="#fef2f2" stroke="#b91c1c" strokeWidth={1.5} />
            <TextLines x={noX} y={branchY} lines={wrap(n.noPath, 30)} fill="#7f1d1d" size={11} />

            {/* rejoin */}
            <Arrow x1={yesX} y1={branchY + BRANCH_H / 2} x2={cx + 1} y2={joinY} color="#15803d" />
            <Arrow x1={noX} y1={branchY + BRANCH_H / 2} x2={cx - 1} y2={joinY} color="#b91c1c" />
          </g>
        );
      })}

      {/* legend */}
      <g transform={`translate(${PAD_X}, ${height - 28})`}>
        <rect x={0} y={-12} width={14} height={14} rx={3} fill="#f8fafc" stroke="#475569" />
        <text x={20} y={0} fontSize={10} fill="#475569" fontFamily="ui-sans-serif, system-ui">Actor</text>
        <rect x={70} y={-12} width={14} height={14} rx={3} fill="#eff6ff" stroke="#1e40af" />
        <text x={90} y={0} fontSize={10} fill="#1e40af" fontFamily="ui-sans-serif, system-ui">System</text>
        <rect x={150} y={-12} width={14} height={14} rx={3} fill="#ecfeff" stroke="#0e7490" />
        <text x={170} y={0} fontSize={10} fill="#0e7490" fontFamily="ui-sans-serif, system-ui">Integration</text>
        <polygon points="240,-5 250,-12 260,-5 250,2" fill="#fef3c7" stroke="#b45309" />
        <text x={268} y={0} fontSize={10} fill="#b45309" fontFamily="ui-sans-serif, system-ui">Decision</text>
      </g>
    </svg>
  );
});
