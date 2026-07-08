# footprint-city-lab

「足迹缘」城市展示模块的独立调试台,从 flight-fate 项目中抽出,用于单独调布局效果。

## 模块构成

- `src/components/FootprintSection.vue` — 足迹缘区块(维恩图城市云 + 透镜共同城市 + 风景区)
- `src/components/FateSectionCard.vue` — 缘分卡片外壳
- `src/useVennCloud.ts` — 维恩图点云布局算法(带种子伪随机,同样输入布局稳定)
- `src/assets/js/umeH5Flexible.ts` — 750 设计稿 rem 适配(1rem = 100px)

以上文件与原项目保持一致,调好效果后可直接 diff / 拷回。

## 本地开发

```bash
npm install
npm run dev
```

页面左侧为组件预览,右侧面板可实时调整:城市列表(左独有 / 右独有 / 共同)、
缘分值、文案、共同风景。内置 5 个预设覆盖全部形态:

| 预设 | 共同城市数 | 形态 |
| --- | --- | --- |
| 分离 | 0 | 两圆分离,无透镜 |
| 窄透镜 | 1–4 | 透镜内单列 |
| 宽透镜 | 5+ | 透镜内双列 |
| 溢出 | >8 | 截断为 8 个 + … |
| 城市很多 | — | 放不下的城市降为水印层 |

## 在线预览

push 到 `main` 后 GitHub Actions 自动构建并部署到 GitHub Pages。
