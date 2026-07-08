/**
 * 维恩图「点云」布局算法。
 *
 * 背景图(footprint-circles.png)已画好两圆 + 中间透镜,这里只负责把城市名
 * 散点到左/右两瓣里(不落进中间透镜),并按权重分大小/透明度做出层次感。
 *
 * 几何参数实测自 footprint-circles.png(1035×525px,150px = 1rem):
 *   半径 R = 231px、圆心纵坐标 = 236.5px、左圆心 x = 366px、右圆心 x = 671px。
 * 全部换算成 rem 后即下方 FOOTPRINT_GEO。改背景图时,只需重新量这 5 个数。
 */

export interface VennGeometry {
  width: number; // 容器宽 rem
  height: number; // 容器高 rem
  radius: number; // 圆半径 rem
  cy: number; // 两圆圆心纵坐标 rem
  leftCx: number; // 左圆圆心 x rem
  rightCx: number; // 右圆圆心 x rem
}

export interface CloudLabel {
  text: string;
  x: number; // 中心 x,rem
  y: number; // 中心 y,rem
  size: number; // 字号 rem
  opacity: number;
}

// 三套几何均实测自 1035×525px 背景图(150px = 1rem),按「相同城市数」切换:

// 1–4 个相同城市:窄透镜(footprint-circles.png)
export const FOOTPRINT_GEO: VennGeometry = {
  width: 6.9,
  height: 3.5,
  radius: 1.555,
  cy: 1.57,
  leftCx: 2.425,
  rightCx: 4.488,
};

// 5 个及以上:宽透镜,两圆更靠近(footprint-wide.png)
export const FOOTPRINT_GEO_WIDE: VennGeometry = {
  width: 6.9,
  height: 3.5,
  radius: 1.56,
  cy: 1.57,
  leftCx: 2.62,
  rightCx: 4.293,
};

// 0 个:两圆分离,无透镜(footprint-apart.png)
export const FOOTPRINT_GEO_APART: VennGeometry = {
  width: 6.9,
  height: 3.5,
  radius: 1.343,
  cy: 1.663,
  leftCx: 2.203,
  rightCx: 4.71,
};

// 透镜(交集)中心 = 容器横向正中,纵向与两圆同高
export const lensCenter = (geo: VennGeometry) => ({ x: geo.width / 2, y: geo.cy });

// 字号统一;放得下的城市 opacity 1 且互不重叠,放不下的降为淡色水印层垫底
const DEFAULT_SIZE = 0.24;

export interface VennCloudOptions {
  geo?: VennGeometry;
  size?: number; // 统一字号 rem
  max?: number; // 每侧最多展示数量,超出丢弃(应对城市过多)
  gap?: number; // 判定「重叠」的间距阈值 rem(框间小于它即算重叠)
  edgeMargin?: number; // 距圆边的安全内缩 rem
  padX?: number; // 左右两端为「计数」预留的横向空白 rem
  lineHeight?: number;
  letterSpacing?: number; // 字间距(em),并入估宽以免碰撞偏窄
  avoidOther?: boolean; // 是否避开对方圆(重叠态避开透镜;分离态设 false 填满整圆)
  attempts?: number; // 每个标签的候选采样次数
  dimOpacity?: number; // 放不下的城市降为背景水印层时的透明度
}

type ResolvedOptions = Required<VennCloudOptions>;

// 带种子的伪随机(mulberry32):同样的城市列表 → 同样的布局,刷新不乱跳
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 由城市列表派生稳定种子(FNV-1a)
function seedFrom(list: string[]): number {
  let h = 2166136261;
  for (const word of list) {
    for (let i = 0; i < word.length; i++) {
      h ^= word.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x7c; // 词与词之间加分隔,避免顺序无关
  }
  return h >>> 0;
}

interface Box {
  x: number;
  y: number;
  hw: number; // 半宽
  hh: number; // 半高
}

function placeSide(
  cities: string[],
  side: 'left' | 'right',
  rnd: () => number,
  opt: ResolvedOptions,
): CloudLabel[] {
  const { geo } = opt;
  const R = geo.radius;
  const ownCx = side === 'left' ? geo.leftCx : geo.rightCx;
  const otherCx = side === 'left' ? geo.rightCx : geo.leftCx;

  const list = cities.slice(0, opt.max);
  const placed: Box[] = [];
  const size = opt.size; // 统一字号

  const measure = (text: string) => {
    const hw = (text.length * size * (1 + opt.letterSpacing)) / 2; // 中文按 1em/字 估宽 + 字间距
    const hh = (size * opt.lineHeight) / 2;
    return { hw, hh, halfDiag: Math.hypot(hw, hh) };
  };

  // 采样一个满足几何约束的候选点:落在自己圆内、不侵透镜、给两端计数留白
  const sample = (hw: number, halfDiag: number): { x: number; y: number } | null => {
    // 圆内均匀取点(sqrt 保证面积均匀,不向圆心聚集)
    const rr = R * Math.sqrt(rnd());
    const th = 2 * Math.PI * rnd();
    const x = ownCx + rr * Math.cos(th);
    const y = geo.cy + rr * Math.sin(th);

    // 1) 整个文字框落在「自己的圆」内
    if (Math.hypot(x - ownCx, y - geo.cy) + halfDiag > R - opt.edgeMargin) return null;
    // 2) 整个文字框在「对方圆」之外 → 不侵入中间透镜(分离态跳过此约束)
    if (opt.avoidOther && Math.hypot(x - otherCx, y - geo.cy) - halfDiag < R + opt.gap) return null;
    // 3) 横向给两端计数留白
    if (x - hw < opt.padX || x + hw > geo.width - opt.padX) return null;
    return { x, y };
  };

  // 统计候选点与一组已放置框的重叠个数(框间距小于 gap 即算重叠)
  const countOverlap = (x: number, y: number, hw: number, hh: number, boxes: Box[]) => {
    let overlap = 0;
    for (const b of boxes) {
      if (Math.abs(x - b.x) < hw + b.hw + opt.gap && Math.abs(y - b.y) < hh + b.hh + opt.gap) {
        overlap++;
      }
    }
    return overlap;
  };

  // 第一轮:只接受「完全无重叠」的位置,铺出清晰可读的前景层;
  // 放不下的城市转入第二轮,降为淡色水印垫在底下(对齐设计稿的双层效果)
  const foreground: CloudLabel[] = [];
  const deferred: { text: string; hw: number; hh: number; halfDiag: number }[] = [];

  list.forEach((text) => {
    const { hw, hh, halfDiag } = measure(text);
    let found: { x: number; y: number } | null = null;

    for (let attempt = 0; attempt < opt.attempts; attempt++) {
      const p = sample(hw, halfDiag);
      if (!p) continue;
      if (countOverlap(p.x, p.y, hw, hh, placed) === 0) {
        found = p;
        break;
      }
    }

    if (found) {
      placed.push({ x: found.x, y: found.y, hw, hh });
      foreground.push({ text, x: found.x, y: found.y, size, opacity: 1 });
    } else {
      deferred.push({ text, hw, hh, halfDiag });
    }
  });

  // 第二轮:背景水印层。允许压在前景下面,但尽量选重叠最少的位置摊开
  const background: CloudLabel[] = [];
  const bgBoxes: Box[] = [];

  deferred.forEach(({ text, hw, hh, halfDiag }) => {
    let best: { x: number; y: number; overlap: number } | null = null;

    for (let attempt = 0; attempt < opt.attempts; attempt++) {
      const p = sample(hw, halfDiag);
      if (!p) continue;
      const overlap =
        countOverlap(p.x, p.y, hw, hh, placed) + countOverlap(p.x, p.y, hw, hh, bgBoxes);
      if (overlap === 0) {
        best = { x: p.x, y: p.y, overlap: 0 };
        break;
      }
      if (!best || overlap < best.overlap) best = { x: p.x, y: p.y, overlap };
    }

    if (!best) return; // 区域太小连候选点都没有(极端情况),跳过

    bgBoxes.push({ x: best.x, y: best.y, hw, hh });
    background.push({ text, x: best.x, y: best.y, size, opacity: opt.dimOpacity });
  });

  // 背景层排在前,DOM 顺序即绘制顺序,前景清晰文字压在水印之上
  return [...background, ...foreground];
}

export function buildVennCloud(
  leftCities: string[],
  rightCities: string[],
  options: VennCloudOptions = {},
): { left: CloudLabel[]; right: CloudLabel[] } {
  const opt: ResolvedOptions = {
    geo: options.geo ?? FOOTPRINT_GEO,
    size: options.size ?? DEFAULT_SIZE,
    max: options.max ?? 18,
    gap: options.gap ?? 0.06,
    edgeMargin: options.edgeMargin ?? 0.06,
    padX: options.padX ?? 0.95,
    lineHeight: options.lineHeight ?? 1,
    letterSpacing: options.letterSpacing ?? 0,
    attempts: options.attempts ?? 400,
    dimOpacity: options.dimOpacity ?? 0.22,
    avoidOther: options.avoidOther ?? true,
  };

  const rnd = mulberry32(seedFrom([...leftCities, '|', ...rightCities]));
  return {
    left: placeSide(leftCities, 'left', rnd, opt),
    right: placeSide(rightCities, 'right', rnd, opt),
  };
}
