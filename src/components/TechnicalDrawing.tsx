"use client";

import { useId } from "react";
import { springProfile } from "@/lib/springProfile";
import { springMetrics } from "@/lib/springMetrics";
import { springLimits, dieLoadClass } from "@/lib/springLimits";
import { boreDiameter } from "@/lib/springSpecs";
import { SPRING_TYPE_LABEL, type SpringComponent } from "@/data/types";

/**
 * Dimensioned drawing sheet, generated from the catalogue numbers.
 *
 * Laid out the way a real datasheet is: a framed sheet, a side elevation with its
 * dimensions carried out on extension lines, an end view giving the two diameters,
 * and a title block. The geometry comes from `springProfile` in millimetres and is
 * scaled into the sheet, so what is drawn is a true projection of the part rather
 * than an illustration of it.
 *
 * Reference symbols on the dimensions — L0, Lk, Do, Di, Sn — are the same symbols
 * the specification table lists, so the two can be read against each other.
 */

const SHEET_W = 760;
const SHEET_H = 460;

/** The side elevation is drawn inside this band; everything else is placed around it. */
const BAND = { x: 72, y: 54, w: 408, h: 198 };

const END_VIEW = { cx: 612, cy: 152 };
const BLOCK = { x: 470, y: 352, w: 280, h: 98 };
const NOTES = { x: 12, y: 352 };

const INK = "#0b2e5e";
const DIM = "#0e6fd6";
const THIN = "#6b7c93";
const FRAME = "#cadbec";

const fmt = (value: number, places = 1) => value.toFixed(places);

interface Dimension {
  axis: "h" | "v";
  /** Start and end of the dimension, in profile millimetres. */
  from: number;
  to: number;
  label: string;
  /** Which stacked row below the view the dimension sits on. */
  row?: 0 | 1;
}

export function TechnicalDrawing({ spring }: { spring: SpringComponent }) {
  const uid = useId().replace(/:/g, "");
  const arrow = `arrow-${uid}`;

  const profile = springProfile(spring);
  const metrics = springMetrics(spring);
  const limits = springLimits(
    {
      type: spring.type,
      wire: spring.wireDiameter,
      outer: spring.outerDiameter,
      len: spring.freeLength,
      coils: spring.coils,
      rectHeight: spring.rectSection?.height,
      dieClass: spring.type === "die" ? dieLoadClass(spring.endType) : undefined,
    },
    spring.springRate,
  );

  const [boxX, boxY, boxW, boxH] = profile.viewBox.split(" ").map(Number);

  // Fit the profile into the band, keeping it square so the projection stays true.
  const scale = Math.min(BAND.w / boxW, BAND.h / boxH);
  const originX = BAND.x + (BAND.w - boxW * scale) / 2 - boxX * scale;
  const originY = BAND.y + (BAND.h - boxH * scale) / 2 - boxY * scale;
  const X = (mm: number) => originX + mm * scale;
  const Y = (mm: number) => originY + mm * scale;

  const wire = spring.wireDiameter;
  const outer = spring.outerDiameter;
  const isDisc = spring.type === "disc";

  // The helix is drawn on the mean diameter, so the outer envelope runs half a wire
  // diameter beyond it at each side.
  const topMM = isDisc ? 0 : -wire / 2;
  const bottomMM = isDisc ? spring.freeLength : outer - wire / 2;
  const axisY = Y(profile.axisY);

  const dimensions = dimensionsFor(spring, profile.width, metrics, topMM, bottomMM);

  // A long spring is drawn small; the end view is enlarged so the two diameters stay
  // readable, and the label says so.
  const endScale = Math.min(Math.max(scale, 90 / outer), 120 / outer);
  const endOuter = (outer / 2) * endScale;
  const endInner = Math.max((boreDiameter(spring) / 2) * endScale, 2);
  const enlarged = endScale > scale * 1.15;

  const rowY = (row: 0 | 1) => BAND.y + BAND.h + 36 + row * 30;
  const travel =
    spring.type === "torsion"
      ? `${fmt(limits.travel, 0)}°`
      : `${fmt(limits.travel)} mm`;

  return (
    <svg
      viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
      className="w-full"
      role="img"
      aria-label={`Dimensioned drawing of ${spring.code}, ${SPRING_TYPE_LABEL[spring.type].toLowerCase()}, outside diameter ${outer} mm`}
      fontFamily="inherit"
    >
      <defs>
        <marker
          id={arrow}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" fill={DIM} />
        </marker>
      </defs>

      {/* Sheet frame */}
      <rect x="10" y="10" width={SHEET_W - 20} height={SHEET_H - 20} fill="none" stroke={FRAME} strokeWidth="1.2" />

      <SheetLabel x={(BAND.x + BAND.x + BAND.w) / 2} y={32} text="Side view" />
      <SheetLabel
        x={END_VIEW.cx}
        y={32}
        text={enlarged ? "End view (enlarged)" : "End view"}
      />

      {/* The part itself */}
      <g transform={`translate(${originX} ${originY}) scale(${scale})`}>
        <g fill="none" stroke={INK} strokeWidth={profile.strokeWidth} strokeLinecap="round">
          <path d={profile.body} />
          {profile.features.map((d, index) => (
            <path key={index} d={d} />
          ))}
        </g>
      </g>

      {/* Axis of revolution */}
      <CentreLine x1={X(boxX) - 14} y1={axisY} x2={X(boxX + boxW) + 14} y2={axisY} />

      {dimensions.map((dimension, index) =>
        dimension.axis === "h" ? (
          <HorizontalDim
            key={index}
            marker={arrow}
            x1={X(dimension.from)}
            x2={X(dimension.to)}
            y={rowY(dimension.row ?? 0)}
            witnessFrom={Y(boxY + boxH)}
            label={dimension.label}
          />
        ) : (
          <VerticalDim
            key={index}
            marker={arrow}
            x={Math.max(X(boxX) - 34, 26)}
            y1={Y(dimension.from)}
            y2={Y(dimension.to)}
            witnessFrom={X(boxX)}
            label={dimension.label}
          />
        ),
      )}

      {/* Wire gauge callout, pointing at the top of the coil body */}
      <WireCallout
        x={X(isDisc ? spring.outerDiameter * 0.3 : profile.width * 0.3)}
        y={Y(topMM)}
        label={
          spring.rectSection
            ? `${fmt(spring.rectSection.width, 1)} × ${fmt(spring.rectSection.height, 1)} section`
            : `${isDisc ? "t" : "d"} ${fmt(wire, 2)}`
        }
      />

      {/* End view: the coil seen along its axis, as an annulus */}
      <g>
        <CentreLine
          x1={END_VIEW.cx - endOuter - 14}
          y1={END_VIEW.cy}
          x2={END_VIEW.cx + endOuter + 14}
          y2={END_VIEW.cy}
        />
        <CentreLine
          x1={END_VIEW.cx}
          y1={END_VIEW.cy - endOuter - 14}
          x2={END_VIEW.cx}
          y2={END_VIEW.cy + endOuter + 14}
        />
        <circle cx={END_VIEW.cx} cy={END_VIEW.cy} r={endOuter} fill="none" stroke={INK} strokeWidth="1.4" />
        <circle cx={END_VIEW.cx} cy={END_VIEW.cy} r={endInner} fill="none" stroke={INK} strokeWidth="1.4" />
        <HorizontalDim
          marker={arrow}
          x1={END_VIEW.cx - endOuter}
          x2={END_VIEW.cx + endOuter}
          y={END_VIEW.cy + endOuter + 34}
          witnessFrom={END_VIEW.cy + endOuter}
          label={`${isDisc ? "De" : "Do"} ${fmt(outer, 2)}`}
        />
        <HorizontalDim
          marker={arrow}
          x1={END_VIEW.cx - endInner}
          x2={END_VIEW.cx + endInner}
          y={END_VIEW.cy + endOuter + 64}
          witnessFrom={END_VIEW.cy + endInner}
          label={`Di ${fmt(boreDiameter(spring), 2)}`}
        />
      </g>

      {/* Notes block, bottom left */}
      <g fontSize="11.5" fill={THIN}>
        <text x={NOTES.x + 8} y={NOTES.y + 18}>
          1. All dimensions in millimetres. Do not scale drawing.
        </text>
        <text x={NOTES.x + 8} y={NOTES.y + 38}>
          2. Tolerances to EN 15800 unless otherwise stated.
        </text>
        <text x={NOTES.x + 8} y={NOTES.y + 58}>
          3. Spring rate c = {spring.springRate} {spring.rateUnit}; working load{" "}
          {spring.loadRange[0]}–{spring.loadRange[1]} {spring.loadUnit}.
        </text>
        <text x={NOTES.x + 8} y={NOTES.y + 78}>
          4. Rated travel {travel}
          {limits.solidLength !== undefined
            ? `; solid length Lc ${fmt(limits.solidLength)} mm.`
            : limits.loadedLength !== undefined && spring.type === "extension"
              ? `; maximum length L1 ${fmt(limits.loadedLength)} mm.`
              : "."}
        </text>
      </g>

      {/* Title block, bottom right */}
      <g>
        <rect x={BLOCK.x} y={BLOCK.y} width={BLOCK.w} height={BLOCK.h} fill="none" stroke={THIN} strokeWidth="1" />
        {[1, 2, 3].map((row) => (
          <line
            key={row}
            x1={BLOCK.x}
            y1={BLOCK.y + (BLOCK.h / 4) * row}
            x2={BLOCK.x + BLOCK.w}
            y2={BLOCK.y + (BLOCK.h / 4) * row}
            stroke={THIN}
            strokeWidth="0.7"
          />
        ))}
        <text x={BLOCK.x + 10} y={BLOCK.y + 17} fontSize="12.5" fontWeight="700" fill={INK}>
          Meconet Oy
        </text>
        <text x={BLOCK.x + BLOCK.w - 10} y={BLOCK.y + 17} fontSize="11.5" textAnchor="end" fill={THIN}>
          {SPRING_TYPE_LABEL[spring.type]}
        </text>
        <text x={BLOCK.x + 10} y={BLOCK.y + 42} fontSize="12" fontWeight="600" fill={INK}>
          Part no. {spring.code}
        </text>
        <text x={BLOCK.x + 10} y={BLOCK.y + 66} fontSize="11.5" fill={THIN}>
          {spring.material}, {spring.finish.toLowerCase()}
        </text>
        <text x={BLOCK.x + 10} y={BLOCK.y + 90} fontSize="11.5" fill={THIN}>
          {spring.endType} · third angle projection
        </text>
      </g>
    </svg>
  );
}

/** Which dimensions a given spring type is drawn with, in profile millimetres. */
function dimensionsFor(
  spring: SpringComponent,
  profileWidth: number,
  metrics: ReturnType<typeof springMetrics>,
  topMM: number,
  bottomMM: number,
): Dimension[] {
  const diameter: Dimension = {
    axis: "v",
    from: topMM,
    to: bottomMM,
    label: `Ø${fmt(spring.outerDiameter, 2)}`,
  };

  if (spring.type === "extension") {
    return [
      { axis: "h", from: 0, to: profileWidth, label: `L0 ${fmt(spring.freeLength)}`, row: 0 },
      {
        axis: "h",
        from: metrics.hook,
        to: metrics.hook + metrics.bodyLength,
        label: `Lk ${fmt(metrics.bodyLength)}`,
        row: 1,
      },
      diameter,
    ];
  }

  if (spring.type === "torsion") {
    return [
      { axis: "h", from: 0, to: metrics.bodyLength, label: `Lk ${fmt(metrics.bodyLength)}`, row: 0 },
      { axis: "h", from: -metrics.leg, to: 0, label: `a ${fmt(metrics.leg)}`, row: 1 },
      diameter,
    ];
  }

  if (spring.type === "disc") {
    return [
      { axis: "h", from: 0, to: spring.outerDiameter, label: `De ${fmt(spring.outerDiameter, 2)}`, row: 0 },
      { axis: "v", from: 0, to: spring.freeLength, label: `l0 ${fmt(spring.freeLength, 2)}` },
    ];
  }

  return [
    { axis: "h", from: 0, to: profileWidth, label: `L0 ${fmt(spring.freeLength)}`, row: 0 },
    diameter,
  ];
}

function SheetLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} fontSize="13" fontWeight="700" textAnchor="middle" fill={THIN} letterSpacing="0.04em">
      {text.toUpperCase()}
    </text>
  );
}

function CentreLine(props: { x1: number; y1: number; x2: number; y2: number }) {
  return <line {...props} stroke={THIN} strokeWidth="0.8" strokeDasharray="12 3 2 3" opacity="0.8" />;
}

/** A dimension carried below the view on witness lines, arrowed at both ends. */
function HorizontalDim({
  marker,
  x1,
  x2,
  y,
  witnessFrom,
  label,
}: {
  marker: string;
  x1: number;
  x2: number;
  y: number;
  witnessFrom: number;
  label: string;
}) {
  return (
    <g>
      <line x1={x1} y1={witnessFrom + 3} x2={x1} y2={y + 6} stroke={THIN} strokeWidth="0.7" />
      <line x1={x2} y1={witnessFrom + 3} x2={x2} y2={y + 6} stroke={THIN} strokeWidth="0.7" />
      <line
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
        stroke={DIM}
        strokeWidth="1"
        markerStart={`url(#${marker})`}
        markerEnd={`url(#${marker})`}
      />
      <text
        x={(x1 + x2) / 2}
        y={y - 6}
        fontSize="12.5"
        fontWeight="600"
        textAnchor="middle"
        fill={DIM}
      >
        {label}
      </text>
    </g>
  );
}

/** The same, carried out to the left of the view and lettered along the line. */
function VerticalDim({
  marker,
  x,
  y1,
  y2,
  witnessFrom,
  label,
}: {
  marker: string;
  x: number;
  y1: number;
  y2: number;
  witnessFrom: number;
  label: string;
}) {
  return (
    <g>
      <line x1={witnessFrom - 3} y1={y1} x2={x - 6} y2={y1} stroke={THIN} strokeWidth="0.7" />
      <line x1={witnessFrom - 3} y1={y2} x2={x - 6} y2={y2} stroke={THIN} strokeWidth="0.7" />
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke={DIM}
        strokeWidth="1"
        markerStart={`url(#${marker})`}
        markerEnd={`url(#${marker})`}
      />
      <text
        x={x - 7}
        y={(y1 + y2) / 2}
        fontSize="12.5"
        fontWeight="600"
        textAnchor="middle"
        fill={DIM}
        transform={`rotate(-90 ${x - 7} ${(y1 + y2) / 2})`}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Leader line to the wire, with the gauge on the end of it. The leader is clamped
 * so that a part sitting high in the band cannot push its label into the view titles.
 */
function WireCallout({ x, y, label }: { x: number; y: number; label: string }) {
  const endY = Math.max(y - 26, 50);
  const endX = x - 26;
  return (
    <g>
      <line x1={x} y1={y} x2={endX} y2={endY} stroke={THIN} strokeWidth="0.7" />
      <circle cx={x} cy={y} r="1.6" fill={DIM} />
      <text x={endX - 5} y={endY - 3} fontSize="12.5" fontWeight="600" textAnchor="end" fill={DIM}>
        {label}
      </text>
    </g>
  );
}
