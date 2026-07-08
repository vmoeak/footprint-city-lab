<template>
  <FateSectionCard v-bind="sectionProps" class="footprint-section">
    <div class="city-map" :style="{ backgroundImage: `url(${bgImage})` }">
      <span
        v-for="(c, i) in cloud.left"
        :key="`l-${i}-${c.text}`"
        class="city city--left"
        :style="cityStyle(c)"
        >{{ c.text }}</span
      >
      <span
        v-for="(c, i) in cloud.right"
        :key="`r-${i}-${c.text}`"
        class="city city--right"
        :style="cityStyle(c)"
        >{{ c.text }}</span
      >
      <div v-if="sharedDisplay" class="shared-grid" :style="sharedStyle">
        <span
          v-for="(it, i) in sharedDisplay.items"
          :key="`s-${i}`"
          :class="{ 'shared-span': it.full }"
          >{{ it.text }}</span
        >
      </div>
      <div class="count-wrap count-wrap--left">
        <img class="count-avatar" :src="users[0].avatar" />
        <span class="count">{{ inviterCityCount }}</span>
      </div>
      <div class="count-wrap count-wrap--right">
        <img class="count-avatar" :src="users[1].avatar" />
        <span class="count">{{ inviteeCityCount }}</span>
      </div>
    </div>
    <div v-if="displayScenery.length" class="scenery-section">
      <h3>{{ sceneryTitle }}</h3>
      <div class="scenery-tabs">
        <img
          v-for="scenery in displayScenery"
          :key="scenery"
          :src="sceneryImages[scenery]"
          :alt="scenery"
        />
      </div>
    </div>
    <div v-else class="scenery-placeholder"></div>
  </FateSectionCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FateSectionCard from './FateSectionCard.vue';
import {
  buildVennCloud,
  lensCenter,
  FOOTPRINT_GEO,
  FOOTPRINT_GEO_WIDE,
  FOOTPRINT_GEO_APART,
  type CloudLabel,
} from '../useVennCloud';
import type { UserProfile } from '../types';
import footprintBg from '@/assets/images/home/footprint-bg.png';
import circlesBg from '@/assets/images/home/footprint-circles.png';
import wideBg from '@/assets/images/home/footprint-wide.png';
import apartBg from '@/assets/images/home/footprint-apart.png';
import sceneryAurora from '@/assets/images/home/scenery/aurora.png';
import sceneryMountain from '@/assets/images/home/scenery/mountain.png';
import sceneryOcean from '@/assets/images/home/scenery/ocean.png';
import scenerySunrise from '@/assets/images/home/scenery/sunrise.png';
import sceneryMoon from '@/assets/images/home/scenery/moon.png';
import scenerySunset from '@/assets/images/home/scenery/sunset.png';
import sceneryDesert from '@/assets/images/home/scenery/desert.png';
import sceneryEclipse from '@/assets/images/home/scenery/eclipse.png';
import sceneryMeteor from '@/assets/images/home/scenery/meteor.png';

interface OverlapCityDetail {
  inviterCities?: string[];
  inviteeCities?: string[];
  commonCities?: string[];
}

interface InflightScenery {
  commonScenery?: string[];
}

interface FootprintDetail {
  overlapCity?: OverlapCityDetail;
  inflightScenery?: InflightScenery;
  sceneryText?: string;
  scenery?: string[] | string;
  categoryScore?: number;
  categoryDesc?: string;
}

// 9 种风景类型各自的底图(文字已烘焙进图内)
const sceneryImages = {
  极光: sceneryAurora,
  山: sceneryMountain,
  海洋: sceneryOcean,
  日出: scenerySunrise,
  赏月: sceneryMoon,
  日落: scenerySunset,
  沙漠: sceneryDesert,
  月全食: sceneryEclipse,
  流星雨: sceneryMeteor,
};
type SceneryLabel = keyof typeof sceneryImages;

const props = defineProps<{
  data: FootprintDetail;
  users: [UserProfile, UserProfile];
}>();

const isSceneryLabel = (value: string): value is SceneryLabel => value in sceneryImages;

const getScore = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const inviterCities = computed(() => props.data.overlapCity?.inviterCities || []);
const inviteeCities = computed(() => props.data.overlapCity?.inviteeCities || []);
const commonCities = computed(() => props.data.overlapCity?.commonCities || []);
const inviterUniqueCities = computed(() => {
  const commonCitySet = new Set(commonCities.value);
  return inviterCities.value.filter((city) => !commonCitySet.has(city));
});
const inviteeUniqueCities = computed(() => {
  const commonCitySet = new Set(commonCities.value);
  return inviteeCities.value.filter((city) => !commonCitySet.has(city));
});
const commonScenery = computed(() =>
  (props.data.inflightScenery?.commonScenery || []).filter(isSceneryLabel),
);
const normalizeScenery = (scenery: string[] | string | undefined) => {
  if (Array.isArray(scenery)) return scenery;
  if (!scenery) return [];
  return scenery
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
};
const scenery = computed(() => normalizeScenery(props.data.scenery).filter(isSceneryLabel));
const displayScenery = computed(() =>
  commonScenery.value.length ? commonScenery.value : scenery.value,
);
const sceneryTitle = computed(() => props.data.sceneryText || '');
const inviterCityCount = computed(() => `${inviterCities.value.length}座`);
const inviteeCityCount = computed(() => `${inviteeCities.value.length}座`);

const sectionProps = computed(() => ({
  title: '足迹缘',
  icon: '',
  subtitle: `你们的足迹缘分值为${getScore(props.data.categoryScore)}%`,
  description: props.data.categoryDesc || '',
  bgImage: footprintBg,
  headerMarginTop: '0.74rem',
  descWidth: '6.5rem',
}));

// 相同城市数量决定:背景图 / 几何 / 透镜布局
const sharedCount = computed(() => commonCities.value.length);
const mode = computed<'apart' | 'narrow' | 'wide'>(() =>
  sharedCount.value === 0 ? 'apart' : sharedCount.value <= 4 ? 'narrow' : 'wide',
);

const activeGeo = computed(() =>
  mode.value === 'apart'
    ? FOOTPRINT_GEO_APART
    : mode.value === 'wide'
      ? FOOTPRINT_GEO_WIDE
      : FOOTPRINT_GEO,
);

const bgImage = computed(() =>
  mode.value === 'apart' ? apartBg : mode.value === 'wide' ? wideBg : circlesBg,
);

const cloud = computed(() =>
  buildVennCloud(inviterUniqueCities.value, inviteeUniqueCities.value, {
    geo: activeGeo.value,
    avoidOther: mode.value !== 'apart', // 分离态填满整圆,不避让对方
    // 分离态两圆中间有透明缝,多内缩一点避免文字飘进缝里
    edgeMargin: mode.value === 'apart' ? 0.16 : 0.06,
    letterSpacing: 0.1, // 与 CSS letter-spacing: 0.1em 对齐
  }),
);

const cityStyle = (c: CloudLabel) => ({
  left: `${c.x}rem`,
  top: `${c.y}rem`,
  fontSize: `${c.size}rem`,
  opacity: c.opacity,
});

// 透镜内共同城市:0 不展示;1–4 单列;5+ 双列;满 8 为极限,>8 时显示 8 个 +「…」(独占一行居中)
const SHARED_LIMIT = 8;
const sharedDisplay = computed(() => {
  const all = commonCities.value;
  const n = all.length;
  if (n === 0) return null;

  const overflow = n > SHARED_LIMIT;
  const cityCount = overflow ? SHARED_LIMIT : n;
  const cols = n <= 4 ? 1 : 2;

  const items: { text: string; full: boolean }[] = all.slice(0, cityCount).map((text, i) => ({
    text,
    // 双列时落单的最后一个城市横跨整行居中
    full: cols === 2 && cityCount % 2 === 1 && i === cityCount - 1,
  }));
  if (overflow) items.push({ text: '…', full: true }); // 省略号独占一行居中

  // 字号统一 0.24rem;行高 145.13% 已带 ~0.1rem 行间留白,故 rowGap 取 0;双列(>4)左右间距 0.08rem
  return { items, cols, overflow, fontSize: 0.24, rowGap: 0.1, colGap: 0.08 };
});

const sharedStyle = computed(() => {
  const s = sharedDisplay.value;
  if (!s) return {};
  const center = lensCenter(activeGeo.value);
  // 溢出时底部多一行「…」(行高 145.13%),把城市块(而非含…的整体)在透镜内居中,…垂在下方
  // 注:1.4513 与 .shared-grid 的 line-height 耦合,改行高时同步
  const shiftY = s.overflow ? (s.fontSize * 1.4513 + s.rowGap) / 2 : 0;
  return {
    left: `${center.x}rem`,
    top: `${center.y}rem`,
    transform: `translate(-50%, calc(-50% + ${shiftY}rem))`,
    gridTemplateColumns: `repeat(${s.cols}, auto)`,
    columnGap: `${s.colGap}rem`,
    rowGap: `${s.rowGap}rem`,
    fontSize: `${s.fontSize}rem`,
  };
});
</script>

<style lang="less" scoped>
.footprint-section {
  margin-top: 0.3rem;
}

.city-map {
  position: relative;
  width: 6.9rem;
  height: 3.5rem;
  margin: 0.17rem auto 0;
  background-repeat: no-repeat;
  background-position: center;
  background-size: 6.9rem 3.5rem;
}

.city {
  position: absolute;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  line-height: 145.13%;
  letter-spacing: 0.1em;
  font-weight: 500;
  pointer-events: none;
}

.city--left {
  color: #dffbff;
}

.city--right {
  color: #d4e9ff;
}

/* 中间透镜:共同城市,单/双列居中,深色压在青色块上 */
.shared-grid {
  position: absolute;
  display: grid;
  place-items: center;
  color: #000000;
  font-weight: 500;
  line-height: 145.13%; /* 自带约 0.108rem 行间留白,故 rowGap 取 0 即得 ~0.1rem 视觉行距 */
  letter-spacing: 0.1em;
  white-space: nowrap;
}

/* 落单城市 / 省略号:横跨整行居中 */
.shared-span {
  grid-column: 1 / -1;
  margin-top: -0.1rem;
}

/* 两端计数,落在圆外的留白区 */
.count-wrap {
  position: absolute;
  margin-top: 1.08rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.count-wrap--left {
  left: 0.19rem;
  margin-top: 1.12rem;
}

.count-wrap--right {
  right: 0.19rem;
  margin-top: 1.12rem;
}

.count {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.24rem;
  font-weight: 400;
  line-height: 0.5rem;
}

.count-avatar {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  border: 0.01rem solid #ffffff;
  object-fit: cover;
}

h3 {
  margin-left: 0.31rem;
  margin-top: 0.15rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.3rem;
  line-height: 145.13%;
  font-weight: 500;
}

.scenery-tabs {
  margin-left: 0.31rem;
  margin-right: 0.31rem;
  margin-bottom: 0.3rem;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.1rem;
}

.scenery-tabs img {
  width: 100%;
  height: 0.74rem;
  object-fit: cover;
}

.scenery-placeholder {
  height: 0.3rem;
}
</style>
