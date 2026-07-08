<template>
  <div class="lab">
    <header class="lab-header">
      <h1>足迹缘 · 城市展示调试台</h1>
      <p>改动右侧参数实时预览;布局由城市列表派生种子,同样输入永远得到同样布局</p>
    </header>

    <div class="lab-body">
      <div class="stage">
        <FootprintSection :key="renderKey" :data="footprintData" :users="users" />
      </div>

      <aside class="panel">
        <section class="panel-group">
          <h2>预设场景</h2>
          <div class="preset-row">
            <button
              v-for="p in presets"
              :key="p.name"
              :class="{ active: activePreset === p.name }"
              @click="applyPreset(p)"
            >
              {{ p.name }}
            </button>
          </div>
        </section>

        <section class="panel-group">
          <h2>城市(逗号 / 换行分隔)</h2>
          <label>左侧独有城市({{ leftList.length }})</label>
          <textarea v-model="leftText" rows="2"></textarea>
          <label>右侧独有城市({{ rightList.length }})</label>
          <textarea v-model="rightText" rows="2"></textarea>
          <label>
            共同城市({{ sharedList.length }})
            <span class="hint">0=分离 · 1–4=窄透镜单列 · 5+=宽透镜双列 · &gt;8 截断为 8+…</span>
          </label>
          <textarea v-model="sharedText" rows="2"></textarea>
        </section>

        <section class="panel-group">
          <h2>文案与分值</h2>
          <div class="field-row">
            <label>缘分值 {{ score }}%</label>
            <input v-model.number="score" type="range" min="0" max="100" />
          </div>
          <label>描述文案</label>
          <textarea v-model="desc" rows="2"></textarea>
          <label>风景标题</label>
          <input v-model="sceneryTitle" type="text" />
        </section>

        <section class="panel-group">
          <h2>共同风景(0 个则隐藏该区块)</h2>
          <div class="scenery-row">
            <label v-for="s in ALL_SCENERY" :key="s" class="scenery-check">
              <input v-model="scenery" type="checkbox" :value="s" />
              {{ s }}
            </label>
          </div>
        </section>

        <section class="panel-group">
          <h2>用户</h2>
          <div class="field-row">
            <label>左侧昵称</label>
            <input v-model="leftName" type="text" />
            <label>右侧昵称</label>
            <input v-model="rightName" type="text" />
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import FootprintSection from './components/FootprintSection.vue';
import type { UserProfile } from './types';

const ALL_SCENERY = ['极光', '山', '海洋', '日出', '赏月', '日落', '沙漠', '月全食', '流星雨'];

interface Preset {
  name: string;
  left: string;
  right: string;
  shared: string;
  scenery: string[];
}

// 覆盖三种几何形态 + 溢出/水印两个极端
const presets: Preset[] = [
  {
    name: '分离(0 共同)',
    left: '杭州, 苏州, 成都, 巴黎, 阿布扎比, 西安, 罗马',
    right: '上海, 新疆, 贵州, 丽江, 重庆, 广州, 大阪',
    shared: '',
    scenery: [],
  },
  {
    name: '窄透镜(3 共同)',
    left: '杭州, 苏州, 巴黎, 西安, 罗马',
    right: '上海, 丽江, 重庆, 广州, 大阪',
    shared: '成都, 北京, 深圳',
    scenery: ['极光', '山', '海洋', '日出'],
  },
  {
    name: '宽透镜(6 共同)',
    left: '杭州, 苏州, 巴黎, 罗马',
    right: '上海, 丽江, 大阪, 广州',
    shared: '成都, 北京, 深圳, 西安, 重庆, 昆明',
    scenery: ['赏月', '日落', '沙漠'],
  },
  {
    name: '溢出(10 共同)',
    left: '杭州, 苏州',
    right: '上海, 丽江',
    shared: '成都, 北京, 深圳, 西安, 重庆, 昆明, 长沙, 武汉, 南京, 青岛',
    scenery: ['月全食', '流星雨'],
  },
  {
    name: '城市很多(水印层)',
    left: '杭州, 苏州, 成都, 巴黎, 阿布扎比, 西安, 罗马, 长沙, 武汉, 南京, 青岛, 哈尔滨, 乌鲁木齐, 拉萨',
    right: '上海, 新疆, 贵州, 丽江, 重庆, 广州, 大阪, 东京, 首尔, 曼谷, 新加坡, 吉隆坡, 悉尼, 奥克兰',
    shared: '北京, 深圳',
    scenery: ALL_SCENERY,
  },
];

const leftText = ref(presets[1].left);
const rightText = ref(presets[1].right);
const sharedText = ref(presets[1].shared);
const scenery = ref<string[]>([...presets[1].scenery]);
const score = ref(60);
const desc = ref(
  '你们的航迹尚未重叠,不同的风景也各有浪漫。世界那么大,天空从不设限,下次一起去看看吧!',
);
const sceneryTitle = ref('你们都想在飞行途中看');
const leftName = ref('B for BY');
const rightName = ref('嘤嘤怪');

const activePreset = computed(() => {
  const match = presets.find(
    (p) =>
      p.left === leftText.value &&
      p.right === rightText.value &&
      p.shared === sharedText.value,
  );
  return match?.name ?? '';
});

const applyPreset = (p: Preset) => {
  leftText.value = p.left;
  rightText.value = p.right;
  sharedText.value = p.shared;
  scenery.value = [...p.scenery];
};

const parse = (text: string) =>
  text
    .split(/[,,、\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

const leftList = computed(() => parse(leftText.value));
const rightList = computed(() => parse(rightText.value));
const sharedList = computed(() => parse(sharedText.value));

// 接口语义:inviterCities / inviteeCities 是全量列表(含共同城市)
const footprintData = computed(() => ({
  overlapCity: {
    inviterCities: [...leftList.value, ...sharedList.value],
    inviteeCities: [...rightList.value, ...sharedList.value],
    commonCities: sharedList.value,
  },
  inflightScenery: { commonScenery: [...scenery.value] },
  sceneryText: sceneryTitle.value,
  categoryScore: score.value,
  categoryDesc: desc.value,
}));

// 内嵌 SVG 头像,预览不依赖外网图片
const avatar = (initial: string, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="${color}"/><text x="48" y="62" font-size="40" text-anchor="middle" fill="#fff" font-family="PingFang SC, sans-serif">${initial}</text></svg>`,
  )}`;

const users = computed<[UserProfile, UserProfile]>(() => [
  {
    id: 'left',
    name: leftName.value,
    avatar: avatar(leftName.value.slice(0, 1) || 'A', '#0aa06e'),
    accentColor: 'linear-gradient(94deg, #6ff380 -17%, #009964 101%)',
  },
  {
    id: 'right',
    name: rightName.value,
    avatar: avatar(rightName.value.slice(0, 1) || 'B', '#4a5cf0'),
    accentColor: 'linear-gradient(119deg, #6295ee 10%, #332dff 103%)',
  },
]);

// 输入变化即整体重建,避免组件内缓存干扰调参
const renderKey = computed(() => JSON.stringify(footprintData.value));
</script>

<style lang="less" scoped>
/* 控制面板用 px,不随 rem 适配缩放;预览区(组件本体)用 rem 还原 750 设计稿 */
.lab {
  min-height: 100vh;
  padding: 24px 16px 60px;
  color: #e7e9ff;
}

.lab-header {
  max-width: 1100px;
  margin: 0 auto 24px;

  h1 {
    font-size: 20px;
    font-weight: 600;
  }

  p {
    margin-top: 6px;
    font-size: 13px;
    color: rgba(231, 233, 255, 0.55);
  }
}

.lab-body {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  gap: 28px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.stage {
  flex: 0 0 auto;
  width: 7.12rem;
  border-radius: 0.2rem;
  /* 卡片背景图带透明区,垫一层接近线上首页的深色底 */
  background: linear-gradient(180deg, #171a3d 0%, #10122b 100%);
}

.panel {
  flex: 1 1 320px;
  min-width: 300px;
  max-width: 520px;
}

.panel-group {
  margin-bottom: 22px;

  h2 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
    color: #aab0ff;
  }

  label {
    display: block;
    font-size: 12px;
    color: rgba(231, 233, 255, 0.7);
    margin: 10px 0 4px;
  }

  .hint {
    color: rgba(231, 233, 255, 0.4);
    margin-left: 6px;
  }

  textarea,
  input[type='text'] {
    width: 100%;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    color: #fff;
    font-size: 13px;
    padding: 8px 10px;
    font-family: inherit;
    resize: vertical;

    &:focus {
      outline: none;
      border-color: #6d7cff;
    }
  }

  input[type='range'] {
    width: 100%;
  }
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.16);
    color: #dfe3ff;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 999px;
    cursor: pointer;

    &:hover {
      border-color: #6d7cff;
    }

    &.active {
      background: #4a5cf0;
      border-color: #4a5cf0;
      color: #fff;
    }
  }
}

.scenery-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
}

.scenery-check {
  display: flex !important;
  align-items: center;
  gap: 4px;
  margin: 0 !important;
  font-size: 13px !important;
  cursor: pointer;
}
</style>
