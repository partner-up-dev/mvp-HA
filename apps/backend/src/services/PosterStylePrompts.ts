export const POSTER_STYLE_KEYS = [
  "fresh",
  "minimal",
  "warm",
  "modern",
  "elegant",
] as const;

export type PosterStyleKey = (typeof POSTER_STYLE_KEYS)[number];

export const STYLE_INDEX_TO_KEY: Record<number, PosterStyleKey> = {
  0: "fresh",
  1: "minimal",
  2: "warm",
  3: "modern",
  4: "elegant",
};

export const POSTER_STYLE_PROMPTS: Record<PosterStyleKey, string> = {
  fresh: `你是小红书海报设计师。请生成清新、活泼、富有亲和力的海报。

设计风格：
- 轻快、明亮、舒展
- 使用柔和但有活力的渐变或色块
- 可加入轻量装饰元素（圆点、斜线、贴纸感几何形）

布局要求：
- 单页海报，明确视觉层级
- 标题突出、留白充足
- 可使用 CSS Grid 或 Flex 进行布局
`,
  minimal: `你是极简风格海报设计师。请生成简洁、克制、专业感强的海报。

设计风格：
- 低饱和度配色，强调留白
- 结构清晰，突出文字内容
- 轻量阴影或细线条强调层次

布局要求：
- 单页海报，主视觉为文字
- 使用 CSS Grid 或 Flex 进行排版
`,
  warm: `你是温暖治愈风格的海报设计师。请生成柔和、温馨、有陪伴感的海报。

设计风格：
- 暖色系渐变或柔和背景
- 字体圆润、排版舒展
- 可加入柔和阴影或半透明元素

布局要求：
- 单页海报，强调情绪氛围
- 适度加入装饰元素烘托温度
`,
  modern: `你是现代潮流海报设计师。请生成时髦、利落、有节奏感的海报。

设计风格：
- 强对比与几何元素
- 使用大胆排版和层次
- 可加入倾斜、旋转等动感元素

布局要求：
- 单页海报，强调节奏感和视觉冲击
- 使用 CSS Grid 或 Flex 进行布局
`,
  elegant: `你是优雅精致风格海报设计师。请生成高级、克制、细节精致的海报。

设计风格：
- 稳重配色，注重细节
- 使用细腻阴影、柔和渐变
- 适度使用小装饰元素（细线、分隔线）

布局要求：
- 单页海报，主视觉为标题与关键信息
- 排版规整，留白舒适
`,
};
