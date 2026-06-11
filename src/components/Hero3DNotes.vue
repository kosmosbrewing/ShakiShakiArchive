<script setup lang="ts">
// src/components/Hero3DNotes.vue
// 홈 전용 3D 음표 히어로
import { onBeforeUnmount, onMounted, ref } from "vue";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

const canvasRef = ref<HTMLCanvasElement | null>(null);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let animationFrame = 0;
let resizeObserver: ResizeObserver | null = null;
let noteGroups: THREE.Group[] = [];
let staffLines: THREE.Line[] = [];
let noteMaterial: THREE.MeshStandardMaterial | null = null;
let nearNoteMaterial: THREE.MeshStandardMaterial | null = null;
let iconFillMaterial: THREE.MeshBasicMaterial | null = null;
let staffLineMaterial: THREE.LineBasicMaterial | null = null;

const pointer = new THREE.Vector2(0, 0);
const targetPointer = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();

const initializeNoteMaterials = () => {
  // 깊이별 색상 계층: 중경(별·스월·도트)은 참조 시안 색 #574C46
  noteMaterial = new THREE.MeshStandardMaterial({
    color: 0x574c46,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  // 전경(음표)은 웜 블랙 — 검정 대비 포인트이자 공기원근의 기준점
  nearNoteMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a241e,
    roughness: 0.82,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  // 아이콘 내부 컷아웃은 배경색과 동일하게 → 뚫린 것처럼 보이도록
  iconFillMaterial = new THREE.MeshBasicMaterial({
    color: 0xf8f8f6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // 공기원근 fog에 더 잠기는 만큼(z -1.35) 불투명도를 올려 가시성 보정
  staffLineMaterial = new THREE.LineBasicMaterial({
    color: 0x574c46,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
};

const svgLoader = new SVGLoader();
const staffLineBases = [-0.3, -0.15, 0, 0.15, 0.3];

const noteSvgs = {
  beamed: `
    <svg viewBox="0 0 100 100">
      <ellipse fill="#1A1714" cx="23" cy="79" rx="13" ry="9.2" transform="rotate(-20 23 79)" />
      <ellipse fill="#1A1714" cx="73" cy="85" rx="13" ry="9.2" transform="rotate(-20 73 85)" />
      <rect fill="#1A1714" x="30.5" y="16" width="5.5" height="61" rx="2.6" />
      <rect fill="#1A1714" x="80.5" y="23" width="5.5" height="60" rx="2.6" />
      <path fill="#1A1714" d="M30.5 13.5 L86 20.5 L86 31 L30.5 24 Z" />
    </svg>
  `,
  quarter: `
    <svg viewBox="0 0 100 100">
      <path fill="#1A1714" d="M55 16 C59.4 16 62.4 18.8 62.4 22.8 L62.4 68.8 C65 75.6 58.4 84.2 45.2 88.1 C31.4 92.2 18.9 89 16.6 80.6 C14.4 72.7 22.8 65.7 35.4 62.8 C43.2 61 51.1 62.9 55 67.4 Z" />
    </svg>
  `,
  eighth: `
    <svg viewBox="0 0 100 100">
      <path fill="#1A1714" d="M54.2 16 C58.5 16 61.4 18.8 61.4 22.7 L61.4 69.1 C64.1 75.7 57.8 84 44.8 88 C31.2 92.2 19 89 16.7 80.7 C14.5 72.9 22.6 65.8 34.8 62.9 C42.3 61.2 50.2 63 54.2 67.4 Z" />
      <path fill="#1A1714" d="M58.2 17.4 C69.3 20.9 77.2 28.6 79.1 37.8 C80.3 44.4 76.6 50.6 69.9 54 C67.8 55 65.8 53 66.9 50.9 C70.9 43.7 67.8 36.2 57.4 31.7 C55.6 30.9 54.8 28.9 55.6 27.1 C56.7 24.5 57.8 20.8 58.2 17.4 Z" />
      <circle fill="#1A1714" cx="57.2" cy="25.4" r="4.2" />
      <circle fill="#1A1714" cx="69.3" cy="52.2" r="3.1" />
    </svg>
  `,
  sixteenth: `
    <svg viewBox="0 0 100 100">
      <path fill="#1A1714" d="M54 15 C58.3 15 61.2 17.8 61.2 21.7 L61.2 69.5 C63.8 76 57.4 84.1 44.8 88 C31.4 92.1 19.2 89 16.9 80.8 C14.7 73 22.7 66 34.8 63 C42.3 61.2 50 63 54 67.3 Z" />
      <path fill="#1A1714" d="M58.2 17.3 C68.7 20.6 76.4 27.5 78.1 35.6 C79.2 41.3 76 47.1 70.7 50.4 C68.6 51.7 66.2 49.7 67.4 47.5 C70.8 41.2 67.8 34.3 57.4 30.2 C55.6 29.5 54.8 27.5 55.5 25.8 C56.6 23.2 57.8 20 58.2 17.3 Z" />
      <path fill="#1A1714" d="M58 34.7 C67.4 37.9 74.1 44.4 75.4 51.8 C76.3 57.8 73 63.7 66.7 66.7 C64.4 67.8 62.4 65.4 63.7 63.2 C67.3 57.2 64.8 49.8 56.7 46.2 C54.9 45.4 54.2 43.3 55.1 41.5 C56.3 39 57.4 36.5 58 34.7 Z" />
      <circle fill="#1A1714" cx="57.1" cy="25" r="4.1" />
      <circle fill="#1A1714" cx="57" cy="42" r="3.9" />
      <circle fill="#1A1714" cx="69.4" cy="48.8" r="3" />
      <circle fill="#1A1714" cx="66.4" cy="64.2" r="3" />
    </svg>
  `,
  doubleSixteenth: `
    <svg viewBox="0 0 100 100">
      <ellipse fill="#1A1714" cx="23" cy="80" rx="12.5" ry="8.8" transform="rotate(-20 23 80)" />
      <ellipse fill="#1A1714" cx="73" cy="86" rx="12.5" ry="8.8" transform="rotate(-20 73 86)" />
      <rect fill="#1A1714" x="30" y="15" width="5.2" height="63" rx="2.5" />
      <rect fill="#1A1714" x="80" y="22" width="5.2" height="62" rx="2.5" />
      <path fill="#1A1714" d="M30 12.5 L85.2 19.5 L85.2 27 L30 20 Z" />
      <path fill="#1A1714" d="M30 25.5 L85.2 32.5 L85.2 40 L30 33 Z" />
    </svg>
  `,
  sparkle: `
    <svg viewBox="0 0 100 100">
      <path fill="#1A1714" d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z" />
    </svg>
  `,
  smallSparkle: `
    <svg viewBox="0 0 100 100">
      <path fill="#1A1714" d="M50 18 L56 44 L82 50 L56 56 L50 82 L44 56 L18 50 L44 44 Z" />
    </svg>
  `,
  star: `
    <svg viewBox="0 0 100 100">
      <path fill="#1A1714" d="M50 10 L61 36 L89 38 L68 56 L75 84 L50 69 L25 84 L32 56 L11 38 L39 36 Z" />
    </svg>
  `,
  starOutline: `
    <svg viewBox="0 0 100 100">
      <path fill="#1A1714" d="M50 9 L61 36 L90 38 L68 56 L75 85 L50 70 L25 85 L32 56 L10 38 L39 36 Z" />
      <path fill="#FFFFFF" d="M50 26 L56.5 42 L74 44 L60.5 55 L65 72 L50 62.5 L35 72 L39.5 55 L26 44 L43.5 42 Z" />
    </svg>
  `,
  ring: `
    <svg viewBox="0 0 100 100">
      <circle fill="#1A1714" cx="50" cy="50" r="27" />
      <circle fill="#FFFFFF" cx="50" cy="50" r="15" />
    </svg>
  `,
  dot: `
    <svg viewBox="0 0 100 100">
      <circle fill="#1A1714" cx="50" cy="50" r="22" />
    </svg>
  `,
  smallDot: `
    <svg viewBox="0 0 100 100">
      <circle fill="#1A1714" cx="50" cy="50" r="12" />
    </svg>
  `,
  plus: `
    <svg viewBox="0 0 100 100">
      <rect fill="#1A1714" x="44" y="16" width="12" height="68" rx="6" />
      <rect fill="#1A1714" x="16" y="44" width="68" height="12" rx="6" />
    </svg>
  `,
};

type NoteVariant = keyof typeof noteSvgs | "swirl";

// 참조 시안(image.png)의 나선 장식: SVG path 대신 아르키메데스 나선 띠를 직접 생성
const createSwirlGeometry = () => {
  const segments = 110;
  const turns = 2.5;
  const outer: THREE.Vector2[] = [];
  const inner: THREE.Vector2[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const theta = t * turns * Math.PI * 2;
    const radius = 0.07 + t * 0.43;
    // 바깥으로 갈수록 선이 살짝 두꺼워져 손그림 느낌
    const half = 0.028 + t * 0.022;
    outer.push(
      new THREE.Vector2(
        Math.cos(theta) * (radius + half),
        Math.sin(theta) * (radius + half),
      ),
    );
    inner.push(
      new THREE.Vector2(
        Math.cos(theta) * (radius - half),
        Math.sin(theta) * (radius - half),
      ),
    );
  }

  const shape = new THREE.Shape();
  shape.setFromPoints([...outer, ...inner.reverse()]);
  return new THREE.ShapeGeometry(shape, 4);
};

// 모바일도 화면 가로를 꽉 채우도록 흐름 범위 확장 (뷰포트 절반폭 ≈ 1.7 기준)
const getFlowRange = (isMobile: boolean) => (isMobile ? 4.3 : 12.35);
const getCompositionYOffset = (isMobile: boolean) => (isMobile ? 0.34 : 0.82);
const getArcRise = (isMobile: boolean) => (isMobile ? 0.66 : 1.15);

// 참조 시안(image.png)의 흐름 제어점: (progress, 높이, 접선 기울기)
// 좌측 낮게 시작(초반 살짝 가라앉음) → 75% 지점 크레스트 → 우측 완만한 하강
// 양 끝/크레스트 접선을 0으로 두어 오선이 꺾임(팔꿈치) 없이 수평으로 풀리도록 함
const TREND_POINTS = [
  { p: 0, y: -0.44, m: 0 },
  { p: 0.1, y: -0.48, m: 1.05 },
  { p: 0.45, y: 0.04, m: 1.6 },
  { p: 0.75, y: 0.56, m: 0 },
  { p: 1, y: -0.24, m: 0 },
];

const getTrendY = (progress: number, isMobile: boolean) => {
  // 오선이 화면 밖까지 연장되므로 범위 밖은 양끝 값으로 고정 (끝 접선이 0이라 C1 연속)
  const clamped = Math.min(Math.max(progress, 0), 1);

  let index = 0;
  while (index < TREND_POINTS.length - 2 && clamped > TREND_POINTS[index + 1].p) {
    index += 1;
  }
  const from = TREND_POINTS[index];
  const to = TREND_POINTS[index + 1];
  const span = to.p - from.p;
  const t = (clamped - from.p) / span;
  const t2 = t * t;
  const t3 = t2 * t;

  // 큐빅 Hermite 보간
  const y =
    (2 * t3 - 3 * t2 + 1) * from.y +
    (t3 - 2 * t2 + t) * span * from.m +
    (-2 * t3 + 3 * t2) * to.y +
    (t3 - t2) * span * to.m;

  return getArcRise(isMobile) * y;
};

const getWaveY = (
  x: number,
  laneIndex: number,
  elapsed: number,
  isMobile: boolean,
) => {
  const flowRange = getFlowRange(isMobile);
  const progress = x / flowRange + 0.5;
  const baseY = staffLineBases[laneIndex] * (isMobile ? 0.82 : 1);
  const amplitude = isMobile ? 0.055 : 0.052;
  const phase = laneIndex * 0.72;
  const primaryWave = Math.sin(progress * Math.PI * 2.25 + phase + elapsed * 0.48);
  const secondaryWave = Math.sin(progress * Math.PI * 4.5 - elapsed * 0.24);

  return (
    baseY +
    getCompositionYOffset(isMobile) +
    getTrendY(progress, isMobile) +
    primaryWave * amplitude +
    secondaryWave * amplitude * 0.35
  );
};

const updateStaffLines = (elapsed: number, isMobile: boolean) => {
  const pointCount = 96;
  // 1.5배 연장: 오선 끝점이 화면 안에서 끊겨 보이지 않도록 뷰포트 밖까지 그림
  const extent = (getFlowRange(isMobile) / 2) * 1.5;

  staffLines.forEach((line, lineIndex) => {
    const geometry = line.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;

    for (let index = 0; index < pointCount; index += 1) {
      const progress = index / (pointCount - 1);
      const x = (progress - 0.5) * extent * 2;
      const y = getWaveY(x, lineIndex, elapsed, isMobile);

      position.setXYZ(index, x, y, -1.35 - lineIndex * 0.02);
    }

    position.needsUpdate = true;
  });
};

const addStaffLines = () => {
  if (!scene || !staffLineMaterial) return;

  const pointCount = 96;
  staffLines = staffLineBases.map((baseY) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(pointCount * 3), 3),
    );

    const line = new THREE.Line(geometry, staffLineMaterial!);
    line.userData = {
      baseY,
    };
    scene?.add(line);
    return line;
  });

  updateStaffLines(0, (canvasRef.value?.clientWidth ?? 0) < 768);
};

const createSvgNote = (
  variant: NoteVariant,
  bodyMaterial: THREE.MeshStandardMaterial,
) => {
  const group = new THREE.Group();

  if (variant === "swirl") {
    group.add(new THREE.Mesh(createSwirlGeometry(), bodyMaterial));
    return normalizeNoteGroup(group);
  }

  const parsedSvg = svgLoader.parse(noteSvgs[variant]);

  parsedSvg.paths.forEach((path) => {
    const fill = String(
      (path.userData as { style?: { fill?: string } } | undefined)?.style?.fill ??
        "",
    ).toLowerCase();
    const isFill = fill.includes("ffffff");

    const material = isFill ? iconFillMaterial! : bodyMaterial;
    const shapes = SVGLoader.createShapes(path);

    shapes.forEach((shape) => {
      const geometry = new THREE.ShapeGeometry(shape, 48);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.z = isFill ? 0.035 : 0;
      group.add(mesh);
    });
  });

  return normalizeNoteGroup(group);
};

// 그룹 중심 정렬 + 최대 변 기준 1.12로 정규화 (SVG 좌표계 → Y 반전 포함)
const normalizeNoteGroup = (group: THREE.Group) => {
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const normalize = 1.12 / Math.max(size.x, size.y);

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.translate(-center.x, -center.y, -center.z);
      child.geometry.scale(normalize, -normalize, normalize);
    }
  });

  return group;
};

const addNotes = () => {
  if (!scene) return;

  // m: 모바일 표시 여부. 모바일은 가로 범위가 데스크톱의 1/3이라
  // 전부 표시하면 밀도가 3배가 되므로 절반(20개)만 고르게 선별
  const specs = [
    { type: "beamed", lane: 1, offset: 0.015, s: 0.19, r: -0.12, d: 0.1, speed: 0.032, z: -0.28, m: true },
    { type: "ring", lane: 0, offset: 0.04, s: 0.14, r: 0.08, d: 0.3, speed: 0.028, z: -0.48, m: false },
    { type: "smallDot", lane: 4, offset: 0.065, s: 0.05, r: 0, d: 0.35, speed: 0.043, z: -0.62, m: false },
    { type: "starOutline", lane: 3, offset: 0.09, s: 0.26, r: 0.16, d: 0.4, speed: 0.036, z: -0.38, m: true },
    { type: "swirl", lane: 1, offset: 0.105, s: 0.13, r: 0.05, d: 0.5, speed: 0.038, z: -0.4, m: true },
    { type: "quarter", lane: 4, offset: 0.12, s: 0.19, r: 0.08, d: 0.6, speed: 0.03, z: -0.08, m: false },
    { type: "plus", lane: 1, offset: 0.145, s: 0.09, r: -0.08, d: 0.75, speed: 0.041, z: -0.56, m: false },
    { type: "smallSparkle", lane: 2, offset: 0.17, s: 0.1, r: -0.12, d: 0.9, speed: 0.04, z: -0.52, m: true },
    { type: "dot", lane: 1, offset: 0.195, s: 0.12, r: 0, d: 1.1, speed: 0.034, z: -0.44, m: false },
    { type: "smallDot", lane: 3, offset: 0.215, s: 0.035, r: 0, d: 1.15, speed: 0.046, z: -0.62, m: false },
    { type: "eighth", lane: 0, offset: 0.24, s: 0.18, r: 0.13, d: 1.2, speed: 0.031, z: 0.02, m: true },
    { type: "plus", lane: 3, offset: 0.265, s: 0.16, r: 0.04, d: 1.4, speed: 0.039, z: -0.56, m: false },
    { type: "star", lane: 4, offset: 0.295, s: 0.22, r: -0.08, d: 1.6, speed: 0.029, z: -0.34, m: true },
    { type: "smallDot", lane: 2, offset: 0.325, s: 0.06, r: 0, d: 1.7, speed: 0.042, z: -0.6, m: false },
    { type: "sixteenth", lane: 1, offset: 0.35, s: 0.16, r: -0.08, d: 1.9, speed: 0.033, z: -0.02, m: true },
    { type: "ring", lane: 3, offset: 0.375, s: 0.08, r: 0.04, d: 2.0, speed: 0.043, z: -0.48, m: false },
    { type: "sparkle", lane: 0, offset: 0.405, s: 0.19, r: 0.12, d: 2.1, speed: 0.037, z: -0.5, m: true },
    { type: "doubleSixteenth", lane: 3, offset: 0.43, s: 0.22, r: -0.13, d: 2.2, speed: 0.03, z: -0.16, m: true },
    { type: "smallSparkle", lane: 1, offset: 0.455, s: 0.075, r: 0.18, d: 2.3, speed: 0.042, z: -0.54, m: false },
    { type: "ring", lane: 4, offset: 0.48, s: 0.11, r: -0.06, d: 2.4, speed: 0.04, z: -0.48, m: true },
    { type: "beamed", lane: 2, offset: 0.515, s: 0.24, r: 0.16, d: 2.6, speed: 0.032, z: -0.22, m: true },
    { type: "smallSparkle", lane: 1, offset: 0.54, s: 0.13, r: 0.22, d: 2.8, speed: 0.041, z: -0.58, m: false },
    { type: "quarter", lane: 0, offset: 0.565, s: 0.15, r: -0.03, d: 3.0, speed: 0.03, z: -0.2, m: true },
    { type: "smallDot", lane: 2, offset: 0.585, s: 0.04, r: 0, d: 3.08, speed: 0.047, z: -0.62, m: false },
    { type: "starOutline", lane: 4, offset: 0.61, s: 0.24, r: 0.12, d: 3.2, speed: 0.035, z: -0.4, m: true },
    { type: "plus", lane: 2, offset: 0.635, s: 0.08, r: 0.08, d: 3.4, speed: 0.043, z: -0.56, m: false },
    { type: "swirl", lane: 0, offset: 0.648, s: 0.15, r: -0.05, d: 3.45, speed: 0.037, z: -0.36, m: true },
    { type: "eighth", lane: 3, offset: 0.665, s: 0.21, r: -0.1, d: 3.5, speed: 0.031, z: 0, m: false },
    { type: "dot", lane: 1, offset: 0.69, s: 0.1, r: 0, d: 3.7, speed: 0.038, z: -0.44, m: true },
    { type: "sixteenth", lane: 4, offset: 0.715, s: 0.2, r: 0.09, d: 3.9, speed: 0.033, z: -0.1, m: true },
    { type: "smallSparkle", lane: 2, offset: 0.74, s: 0.055, r: -0.04, d: 4.0, speed: 0.045, z: -0.56, m: false },
    { type: "sparkle", lane: 0, offset: 0.765, s: 0.12, r: -0.1, d: 4.1, speed: 0.04, z: -0.5, m: false },
    { type: "ring", lane: 2, offset: 0.79, s: 0.1, r: 0.04, d: 4.2, speed: 0.044, z: -0.48, m: true },
    { type: "star", lane: 4, offset: 0.82, s: 0.33, r: -0.16, d: 4.4, speed: 0.03, z: -0.38, m: true },
    { type: "smallDot", lane: 0, offset: 0.845, s: 0.055, r: 0, d: 4.5, speed: 0.044, z: -0.62, m: false },
    { type: "doubleSixteenth", lane: 1, offset: 0.875, s: 0.19, r: 0.1, d: 4.7, speed: 0.032, z: -0.12, m: true },
    { type: "plus", lane: 4, offset: 0.9, s: 0.11, r: 0.02, d: 4.8, speed: 0.042, z: -0.56, m: false },
    { type: "smallSparkle", lane: 4, offset: 0.925, s: 0.12, r: 0.16, d: 4.9, speed: 0.039, z: -0.54, m: true },
    { type: "starOutline", lane: 2, offset: 0.955, s: 0.17, r: -0.04, d: 5.1, speed: 0.037, z: -0.42, m: false },
    { type: "plus", lane: 3, offset: 0.985, s: 0.1, r: -0.12, d: 5.3, speed: 0.042, z: -0.56, m: false },
  ];

  noteGroups = specs.map((spec) => {
    // z ≥ -0.3 = 전경(음표 전부) → 웜 블랙, 그 뒤(별·스월·장식) → 토프 브라운
    const bodyMaterial = spec.z >= -0.3 ? nearNoteMaterial! : noteMaterial!;
    const group = createSvgNote(spec.type as NoteVariant, bodyMaterial);
    group.position.set(0, 0, spec.z);
    group.rotation.set(0.08, spec.r, spec.r);
    group.scale.setScalar(spec.s);
    group.userData = {
      lane: spec.lane,
      offset: spec.offset,
      baseZ: spec.z,
      baseScale: spec.s,
      delay: spec.d,
      rotationBase: spec.r,
      flowSpeed: spec.speed,
      showOnMobile: spec.m,
    };
    scene?.add(group);
    return group;
  });
};

const resize = () => {
  const canvas = canvasRef.value;
  if (!canvas || !renderer || !camera) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  camera.aspect = width / height;
  // 모바일은 카메라를 가까이 → 구성이 화면을 더 채워 상하 여백 축소
  camera.position.z = width < 768 ? 4.4 : 6.65;
  camera.fov = width < 768 ? 43 : 41;
  camera.updateProjectionMatrix();

  // 공기원근: fog 범위를 카메라 거리 기준으로 좁게 잡아
  // 깊이(z)가 깊은 아이콘일수록 배경에 잠기며 원근감이 또렷해짐
  if (scene && scene.fog instanceof THREE.Fog) {
    scene.fog.near = camera.position.z - 0.2;
    scene.fog.far = camera.position.z + 2.6;
  }
};

const animate = () => {
  if (!renderer || !scene || !camera) return;

  const elapsed = clock.getElapsedTime();
  const isMobile = (canvasRef.value?.clientWidth ?? 0) < 768;
  const xSpread = isMobile ? 0.8 : 1.1;
  const ySpread = isMobile ? 0.96 : 1;
  // 모바일은 카메라 줌인(z 4.4)으로 이미 커 보이므로 스케일은 낮춰서 보정
  const scaleFactor = isMobile ? 0.7 : 1.2;
  pointer.lerp(targetPointer, 0.05);
  updateStaffLines(elapsed, isMobile);

  camera.position.x = pointer.x * 0.18;
  camera.position.y = -pointer.y * 0.12;
  camera.lookAt(0, 0, 0);

  for (const group of noteGroups) {
    // 모바일은 선별된 아이콘만 표시해 밀도를 낮춤
    group.visible = !isMobile || (group.userData.showOnMobile as boolean);
    if (!group.visible) continue;

    const lane = group.userData.lane as number;
    const offset = group.userData.offset as number;
    const baseZ = group.userData.baseZ as number;
    const baseScale = group.userData.baseScale as number;
    const delay = group.userData.delay as number;
    const flowSpeed = group.userData.flowSpeed as number;
    const rotationBase = group.userData.rotationBase as number;
    const flowRange = getFlowRange(isMobile);
    const progress = (offset + elapsed * flowSpeed) % 1;
    const x = (progress - 0.5) * flowRange;
    const nextX = (progress + 0.015 - 0.5) * flowRange;
    const y = getWaveY(x, lane, elapsed, isMobile);
    const nextY = getWaveY(nextX, lane, elapsed, isMobile);
    const slope = Math.atan2(nextY - y, nextX - x);

    // 루프 경계(양끝)에서 잘린 채 등장/퇴장하지 않도록 스케일 페이드 (image2.png 문제 방지)
    const edgeT = Math.min(progress / 0.06, (1 - progress) / 0.06, 1);
    const edgeScale = edgeT * edgeT * (3 - 2 * edgeT);

    group.position.x = x * xSpread + Math.sin(elapsed * 0.5 + delay) * 0.025;
    group.position.y = y * ySpread + Math.cos(elapsed * 0.62 + delay) * 0.035;
    group.position.z = baseZ + Math.sin(elapsed * 0.35 + delay) * 0.08;
    group.scale.setScalar(baseScale * scaleFactor * edgeScale);
    group.rotation.x = 0.04 + Math.sin(elapsed * 0.28 + delay) * 0.04;
    group.rotation.y = rotationBase * 0.15 + Math.sin(elapsed * 0.22 + delay) * 0.045;
    group.rotation.z = rotationBase + slope * 0.55 + Math.cos(elapsed * 0.3 + delay) * 0.045;
  }

  renderer.render(scene, camera);
  animationFrame = requestAnimationFrame(animate);
};

const handlePointerMove = (event: PointerEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  targetPointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  targetPointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
};

const handlePointerLeave = () => {
  targetPointer.set(0, 0);
};

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8f8f6);
  scene.fog = new THREE.Fog(0xf8f8f6, 6.5, 10.5);

  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 4.4);

  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const ambient = new THREE.AmbientLight(0xffffff, 2.2);
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(3.5, 4, 5);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.9);
  fillLight.position.set(-4, -2, 2);
  scene.add(ambient, keyLight, fillLight);

  initializeNoteMaterials();
  addStaffLines();
  addNotes();
  resize();
  animate();

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerleave", handlePointerLeave);
});

onBeforeUnmount(() => {
  const canvas = canvasRef.value;
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  resizeObserver = null;
  canvas?.removeEventListener("pointermove", handlePointerMove);
  canvas?.removeEventListener("pointerleave", handlePointerLeave);

  const disposedGeometries = new Set<THREE.BufferGeometry>();
  noteGroups.forEach((group) => {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && !disposedGeometries.has(child.geometry)) {
        disposedGeometries.add(child.geometry);
        child.geometry.dispose();
      }
    });
  });
  noteGroups = [];
  staffLines.forEach((line) => {
    line.geometry.dispose();
  });
  staffLines = [];
  noteMaterial?.dispose();
  noteMaterial = null;
  nearNoteMaterial?.dispose();
  nearNoteMaterial = null;
  iconFillMaterial?.dispose();
  iconFillMaterial = null;
  staffLineMaterial?.dispose();
  staffLineMaterial = null;
  renderer?.dispose();
  renderer = null;
  scene = null;
  camera = null;
});
</script>

<template>
  <section
    class="relative mx-0 flex min-h-0 w-full max-w-none flex-1 flex-col overflow-hidden bg-[#f8f8f6]"
    aria-label="ShakiShaki Archive 3D musical note hero"
  >
    <div class="relative min-h-[56svh] flex-1 md:min-h-[500px]">
      <canvas
        ref="canvasRef"
        class="absolute inset-0 h-full w-full touch-pan-y"
        aria-hidden="true"
      />

      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background/95 via-background/50 to-transparent"
        aria-hidden="true"
      />
    </div>
  </section>
</template>
