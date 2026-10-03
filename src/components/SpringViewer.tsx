"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildSpringGeometry, springAppearance } from "@/lib/springGeometry";
import { springMetrics } from "@/lib/springMetrics";
import type { SpringComponent } from "@/data/types";
import { GridIcon, RotateIcon, RulerIcon } from "./icons";

const FIT_SIZE = 1.95;
const GRID_MM = 5;
const GROUP_Y = 0.22;
const ACCENT = "#0e6fd6";

type LabelKey = "length" | "diameter" | "wire";
type Anchors = Record<LabelKey, [number, number, number]>;
type LabelRefs = Record<LabelKey, React.RefObject<HTMLSpanElement | null>>;

/** Studio reflections generated in-process — no HDR download, works offline. */
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = target.texture;
    return () => {
      target.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  return null;
}

/**
 * Drives the dimension labels, which live in plain DOM above the canvas rather
 * than inside the scene graph. Projecting onto refs each frame keeps them crisp
 * without React re-renders, and without portals that fight the canvas unmounting.
 */
function LabelProjector({
  anchors,
  refs,
  visible,
}: {
  anchors: Anchors;
  refs: LabelRefs;
  visible: boolean;
}) {
  const { camera, size } = useThree();
  const vector = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    (Object.keys(anchors) as LabelKey[]).forEach((key) => {
      const element = refs[key].current;
      if (!element) return;
      const [x, y, z] = anchors[key];
      vector.set(x, y, z).project(camera);
      const screenX = (vector.x * 0.5 + 0.5) * size.width;
      const screenY = (-vector.y * 0.5 + 0.5) * size.height;
      element.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -50%)`;
      element.style.opacity = visible && vector.z < 1 ? "1" : "0";
    });
  });

  return null;
}

/**
 * Where each callout sits, in scaled model space.
 *
 * Geometry is centred on its bounding box, which for a torsion spring includes the
 * legs — so the coil axis sits below the origin and the dimensions have to follow it.
 * Torsion springs are dimensioned by leg length rather than an overall span, matching
 * how the spec table describes them.
 */
function dimensionLayout(spring: SpringComponent, unit: number) {
  const metrics = springMetrics(spring);
  const { size } = buildSpringGeometry(spring);
  const radius = (spring.outerDiameter / 2) * unit;
  const isTorsion = spring.type === "torsion";

  const axisY = isTorsion ? -(metrics.leg * unit) / 2 : 0;
  const halfSpan = ((isTorsion ? metrics.bodyLength : metrics.overallLength) / 2) * unit;
  const leader = (isTorsion ? -1 : 1) * (0.3 + unit * spring.outerDiameter * 0.1);

  return {
    axisY,
    halfSpan,
    radius,
    leader,
    isTorsion,
    legTop: axisY + radius + metrics.leg * unit,
    drop: axisY - radius - 0.4,
    diameterX: -halfSpan - 0.4,
    legX: halfSpan + 0.45,
    boxHeight: size.y * unit,
  };
}

function DimensionLines({ spring, unit, visible }: { spring: SpringComponent; unit: number; visible: boolean }) {
  const l = dimensionLayout(spring, unit);
  const tick = 0.09;

  return (
    <group visible={visible}>
      {l.isTorsion ? (
        /* Leg length, run alongside the legs */
        <>
          <Line points={[[l.legX, l.axisY + l.radius, 0], [l.legX, l.legTop, 0]]} color={ACCENT} lineWidth={1.6} />
          <Line points={[[l.legX - tick, l.axisY + l.radius, 0], [l.legX + tick, l.axisY + l.radius, 0]]} color={ACCENT} lineWidth={1.6} />
          <Line points={[[l.legX - tick, l.legTop, 0], [l.legX + tick, l.legTop, 0]]} color={ACCENT} lineWidth={1.6} />
        </>
      ) : (
        /* Overall length, under the part */
        <>
          <Line points={[[-l.halfSpan, l.drop, 0], [l.halfSpan, l.drop, 0]]} color={ACCENT} lineWidth={1.6} />
          <Line points={[[-l.halfSpan, l.drop + tick, 0], [-l.halfSpan, l.drop - tick, 0]]} color={ACCENT} lineWidth={1.6} />
          <Line points={[[l.halfSpan, l.drop + tick, 0], [l.halfSpan, l.drop - tick, 0]]} color={ACCENT} lineWidth={1.6} />
          <Line points={[[-l.halfSpan, l.axisY - l.radius, 0], [-l.halfSpan, l.drop, 0]]} color={ACCENT} lineWidth={0.8} dashed dashSize={0.05} gapSize={0.05} />
          <Line points={[[l.halfSpan, l.axisY - l.radius, 0], [l.halfSpan, l.drop, 0]]} color={ACCENT} lineWidth={0.8} dashed dashSize={0.05} gapSize={0.05} />
        </>
      )}

      {/* Outside diameter, off the left end */}
      <Line points={[[l.diameterX, l.axisY - l.radius, 0], [l.diameterX, l.axisY + l.radius, 0]]} color={ACCENT} lineWidth={1.6} />
      <Line points={[[l.diameterX - tick, l.axisY + l.radius, 0], [l.diameterX + tick, l.axisY + l.radius, 0]]} color={ACCENT} lineWidth={1.6} />
      <Line points={[[l.diameterX - tick, l.axisY - l.radius, 0], [l.diameterX + tick, l.axisY - l.radius, 0]]} color={ACCENT} lineWidth={1.6} />

      {/* Wire gauge, led off the top of the coil */}
      <Line points={[[0, l.axisY + l.radius, 0], [l.leader, l.axisY + l.radius + 0.42, 0]]} color={ACCENT} lineWidth={1.2} />
    </group>
  );
}

function SpringMesh({ spring, unit }: { spring: SpringComponent; unit: number }) {
  const { geometry } = useMemo(() => buildSpringGeometry(spring), [spring]);
  const appearance = springAppearance(spring);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} scale={unit}>
      <meshStandardMaterial
        color={appearance.color}
        metalness={appearance.metalness}
        roughness={appearance.roughness}
        envMapIntensity={1.15}
      />
    </mesh>
  );
}

function Scene({
  spring,
  unit,
  anchors,
  labelRefs,
  showDimensions,
  showGrid,
  autoRotate,
  controlsRef,
}: {
  spring: SpringComponent;
  unit: number;
  anchors: Anchors;
  labelRefs: LabelRefs;
  showDimensions: boolean;
  showGrid: boolean;
  autoRotate: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { size } = useMemo(() => buildSpringGeometry(spring), [spring]);
  const radius = (spring.outerDiameter / 2) * unit;
  const cell = GRID_MM * unit;
  const divisions = Math.max(Math.ceil((size.x * unit) / cell) + 4, 4);

  return (
    <>
      <StudioEnvironment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} />
      <directionalLight position={[-5, -2, -4]} intensity={0.5} />

      <group position={[0, GROUP_Y, 0]}>
        <SpringMesh spring={spring} unit={unit} />
        <DimensionLines spring={spring} unit={unit} visible={showDimensions} />
      </group>

      <gridHelper
        args={[divisions * cell, divisions, "#9bb6d2", "#d7e4f0"]}
        position={[0, GROUP_Y - radius - 0.5, 0]}
        visible={showGrid}
      />

      <LabelProjector anchors={anchors} refs={labelRefs} visible={showDimensions} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        autoRotate={autoRotate}
        autoRotateSpeed={1.6}
        enablePan
        minDistance={1.6}
        maxDistance={12}
        target={[0, GROUP_Y * 0.7, 0]}
      />
    </>
  );
}

export default function SpringViewer({ spring }: { spring: SpringComponent }) {
  const [showDimensions, setShowDimensions] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const labelRefs: LabelRefs = {
    length: useRef<HTMLSpanElement>(null),
    diameter: useRef<HTMLSpanElement>(null),
    wire: useRef<HTMLSpanElement>(null),
  };

  const { unit, anchors } = useMemo(() => {
    const { size } = buildSpringGeometry(spring);
    const scale = FIT_SIZE / Math.max(size.x, size.y, size.z, 0.001);
    const l = dimensionLayout(spring, scale);
    return {
      unit: scale,
      anchors: {
        length: l.isTorsion
          ? [GROUP_Y * 0 + l.legX + 0.42, GROUP_Y + (l.axisY + l.radius + l.legTop) / 2, 0]
          : [0, GROUP_Y + l.drop - 0.2, 0],
        diameter: [l.diameterX - 0.3, GROUP_Y + l.axisY, 0],
        wire: [l.leader + (l.isTorsion ? -0.42 : 0.34), GROUP_Y + l.axisY + l.radius + 0.5, 0],
      } as Anchors,
    };
  }, [spring]);

  // A new component should always open from the same angle.
  useEffect(() => {
    controlsRef.current?.reset();
    setAutoRotate(true);
  }, [spring.id]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0.95, 5.1], fov: 34 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onPointerDown={() => setAutoRotate(false)}
      >
        <Suspense fallback={null}>
          <Scene
            spring={spring}
            unit={unit}
            anchors={anchors}
            labelRefs={labelRefs}
            showDimensions={showDimensions}
            showGrid={showGrid}
            autoRotate={autoRotate}
            controlsRef={controlsRef}
          />
        </Suspense>
      </Canvas>

      {/* Dimension callouts: plain DOM, positioned by the projector above. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Callout refObject={labelRefs.length}>
          {spring.type === "torsion" ? "legs " : ""}
          {spring.freeLength} mm
        </Callout>
        <Callout refObject={labelRefs.diameter}>Ø{spring.outerDiameter} mm</Callout>
        <Callout refObject={labelRefs.wire}>{sectionLabel(spring)}</Callout>
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex gap-1.5 rounded-full border border-line bg-surface/92 p-1 shadow-card backdrop-blur">
          <ViewerToggle active={showDimensions} onClick={() => setShowDimensions((v) => !v)} label="Dimensions">
            <RulerIcon width={16} height={16} />
          </ViewerToggle>
          <ViewerToggle active={showGrid} onClick={() => setShowGrid((v) => !v)} label="5 mm grid">
            <GridIcon width={16} height={16} />
          </ViewerToggle>
          <ViewerToggle active={autoRotate} onClick={() => setAutoRotate((v) => !v)} label="Spin">
            <RotateIcon width={16} height={16} />
          </ViewerToggle>
        </div>
        <button
          onClick={() => {
            controlsRef.current?.reset();
            setAutoRotate(false);
          }}
          className="pointer-events-auto rounded-full border border-line bg-surface/92 px-3.5 py-2 text-[12.5px] font-semibold text-ink shadow-card backdrop-blur transition hover:text-brand-600"
        >
          Reset view
        </button>
      </div>

      <p className="pointer-events-none absolute left-4 top-4 text-[12px] font-medium text-muted">
        Drag to rotate · scroll to zoom
      </p>
    </div>
  );
}

function sectionLabel(spring: SpringComponent) {
  if (spring.rectSection) {
    return `section ${spring.rectSection.width} × ${spring.rectSection.height} mm`;
  }
  if (spring.type === "disc") return `${spring.wireDiameter} mm thick`;
  return `wire Ø${spring.wireDiameter} mm`;
}

function Callout({
  refObject,
  children,
}: {
  refObject: React.RefObject<HTMLSpanElement | null>;
  children: React.ReactNode;
}) {
  return (
    <span
      ref={refObject}
      className="absolute left-0 top-0 whitespace-nowrap rounded bg-navy-900/90 px-2 py-[3px] text-[11px] font-semibold text-white opacity-0 transition-opacity will-change-transform"
    >
      {children}
    </span>
  );
}

function ViewerToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${
        active ? "bg-brand-500 text-white" : "text-ink hover:bg-brand-50"
      }`}
    >
      {children}
      {label}
    </button>
  );
}
