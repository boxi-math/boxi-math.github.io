import episodesJson from "./episodes.json";

export type Lang = "en" | "zh";
export const LANGS: Lang[] = ["en", "zh"];
type T = { en: string; zh: string };

export interface Episode {
  id: number;
  slug: string;
  title: T;
  aha: T;
  misconception: T;
  insight: T;
  non_example: T;
  stage: number;
  seeds: string[];
  grade: Record<string, string>;
  series: string | null;
  callbacks: number[];
  phase: "ready" | "coming" | "planned";
  youtube: string | null;
}

export const episodes = episodesJson as Episode[];
export const byId = new Map(episodes.map((e) => [e.id, e]));

export const STAGES: { n: number; name: T; age: T; question: T; blurb: T }[] = [
  {
    n: 0,
    name: { en: "Early Start", zh: "启蒙" },
    age: { en: "about 3–6", zh: "约 3–6 岁" },
    question: { en: "How many?", zh: "有多少？" },
    blurb: {
      en: "Counting, seeing small amounts at a glance, splitting numbers, building with shapes. These are games for parents to play with children — no screen for the child.",
      zh: "点数、一眼看出几个、数的分合、形状拼搭。这一段是给家长的亲子游戏，孩子不看屏幕。",
    },
  },
  {
    n: 1,
    name: { en: "The World of Numbers", zh: "数的世界" },
    age: { en: "about 6–9", zh: "约 6–9 岁" },
    question: { en: "Why is this way of computing right?", zh: "为什么这样算是对的？" },
    blurb: {
      en: "Place value, making ten, what the equals sign means, what multiplication is, area by counting squares. Each video ends with something to try at home.",
      zh: "位值、凑十、等号的意思、乘法的意义、数格子算面积。每集结尾有一个在家能做的「试一试」。",
    },
  },
  {
    n: 2,
    name: { en: "New Numbers", zh: "新的数" },
    age: { en: "about 9–12", zh: "约 9–12 岁" },
    question: { en: "When the unit changes, what happens to the number?", zh: "单位变了，数怎么办？" },
    blurb: {
      en: "Fractions on the number line, decimals, ratio, area by cutting and moving, volume, the mean. Most children who fall behind fall behind here, at fractions.",
      zh: "数轴上的分数、小数、比例、切拼求面积、体积、平均数。掉队的孩子多数掉在这里，掉在分数。",
    },
  },
  {
    n: 3,
    name: { en: "Structure", zh: "结构" },
    age: { en: "about 12–15", zh: "约 12–15 岁" },
    question: { en: "Can we say it in general?", zh: "能不能一般地说？" },
    blurb: {
      en: "Negative numbers, algebra, equations, functions, geometric proof, probability.",
      zh: "负数、代数式、方程、函数、几何证明、概率。",
    },
  },
  {
    n: 4,
    name: { en: "Change and Relations", zh: "变化与关系" },
    age: { en: "about 15–18", zh: "约 15–18 岁" },
    question: { en: "How does it change? Why must it be so?", zh: "它怎么变？为什么一定？" },
    blurb: {
      en: "Families of functions, derivatives, sequences and differences, vectors and complex numbers, probability distributions.",
      zh: "函数族、导数、数列与差分、向量与复数、概率分布。",
    },
  },
];

export const SEEDS: { id: string; name: T; what: T; grows: T }[] = [
  {
    id: "S-1",
    name: { en: "Numbers are amounts", zh: "数是量" },
    what: {
      en: "See three without counting; five can be two and three; 7 sits a little to the left of 10 on the number line.",
      zh: "看一眼知道 3 个不用数；5 可以拆成 2 和 3；数轴上 7 在 10 左边不远。",
    },
    grows: { en: "Estimation, fractions, negatives, limits", zh: "估算、分数、负数、极限的直觉" },
  },
  {
    id: "S-2",
    name: { en: "The equals sign is a balance", zh: "等号是天平" },
    what: {
      en: "In 3 + 4 = □ + 5 the box is 2, not 7. “=” means both sides are the same amount, not “here comes the answer”.",
      zh: "3+4 = □+5 填 2 不填 7；等号读作「两边一样多」，不是「得出」。",
    },
    grows: { en: "Solving equations", zh: "解方程" },
  },
  {
    id: "S-3",
    name: { en: "Units can be redefined", zh: "单位可以重新定义" },
    what: {
      en: "Ten ones make one ten; cut a bar into three and one piece is a new unit; 1/2 and 2/4 are the same point.",
      zh: "10 个一是 1 个十；一块切 3 份，一份是新单位；1/2 和 2/4 是同一个点。",
    },
    grows: { en: "Fractions, decimals, ratio, number bases, substitution", zh: "分数、小数、比例、进制、换元" },
  },
  {
    id: "S-4",
    name: { en: "Shapes can move", zh: "形状可以动" },
    what: {
      en: "Cut, slide, turn or flip a shape and its area stays the same; two equal triangles make a parallelogram.",
      zh: "拼、切、转、翻之后面积不变；两个一样的三角形拼成平行四边形。",
    },
    grows: { en: "Area formulas, Pythagoras, proof, transformations", zh: "面积公式、勾股、几何证明、变换思想" },
  },
  {
    id: "S-5",
    name: { en: "Patterns can be put into words", zh: "规律可以说出来" },
    what: {
      en: "What comes after 2, 4, 6? Say the rule in your own words — then ask: must it be so?",
      zh: "2、4、6 下一个是什么？用自己的话说规则；再问「一定吗？」",
    },
    grows: { en: "Algebra, induction, sequences, proof", zh: "代数、归纳、数列、证明" },
  },
  {
    id: "S-6",
    name: { en: "Mistakes are fine — try it", zh: "错了没关系，试试看" },
    what: {
      en: "Guess, check, fix. “I don't know yet, but I can try n = 1.”",
      zh: "猜一个、验一下、改一改；「我不知道，但我可以试 n=1」。",
    },
    grows: { en: "Problem solving, and immunity to maths anxiety", zh: "解题策略、对数学焦虑的免疫、愿意碰难题" },
  },
];

export const UI: Record<string, T> = {
  site: { en: "Boxi Math", zh: "Boxi Math" },
  tagline: {
    en: "Maths you can see, from counting to calculus.",
    zh: "看得见的数学，从数数到微积分。",
  },
  heroLead: {
    en: "Short videos that show why maths works — one idea each, drawn so you can see it. Free, in English and Chinese.",
    zh: "每集一个「为什么」，画出来让你看见。免费，中英双语。",
  },
  heroRule: {
    en: "Watch by stage, not by age. Move on when it makes sense, not when the calendar says so.",
    zh: "按阶段看，不按年龄。懂了再往前，不看日历。",
  },
  stages: { en: "Stages", zh: "阶段" },
  seeds: { en: "Six seeds", zh: "六颗种子" },
  seedsLead: {
    en: "Before any topic, six ideas worth planting early. Every video says which seeds it grows.",
    zh: "比知识点更早要种下的六样东西。每集视频都标出它在种哪颗种子。",
  },
  about: { en: "About", zh: "关于" },
  stage: { en: "Stage", zh: "阶段" },
  episodes: { en: "videos", zh: "集" },
  noEpisodes: {
    en: "Nothing here yet. This stage is planned as short guides for parents.",
    zh: "这一段还没有内容，计划做成给家长的短指南。",
  },
  ready: { en: "Watch", zh: "可以看" },
  coming: { en: "Coming soon", zh: "即将上线" },
  planned: { en: "Planned", zh: "计划中" },
  question: { en: "The question", zh: "要回答的问题" },
  insight: { en: "The idea", zh: "洞察" },
  misconception: { en: "A common mix-up", zh: "常见误会" },
  nonExample: { en: "Where it stops working", zh: "什么时候不灵" },
  grows: { en: "Grows into", zh: "将来长成" },
  grade: { en: "School year", zh: "对应年级" },
  related: { en: "Connects to", zh: "相关的几集" },
  videoSoon: {
    en: "The video is in production. Follow along on GitHub to hear when it is out.",
    zh: "视频制作中。在 GitHub 上关注，上线时就知道。",
  },
  allEpisodes: { en: "All videos in this stage", zh: "本阶段全部视频" },
  license: {
    en: "Videos and text: CC BY 4.0, by Boxi Yu. Site code: MIT.",
    zh: "视频和文字：CC BY 4.0，作者 Boxi Yu。网站代码：MIT。",
  },
  switchLang: { en: "中文", zh: "English" },
};

export const GRADE_LABEL: Record<string, T> = {
  cn: { en: "China", zh: "中国" },
  us: { en: "US", zh: "美国" },
  uk: { en: "UK", zh: "英国" },
  sg: { en: "Singapore", zh: "新加坡" },
};

export const t = (key: string, lang: Lang) => UI[key][lang];

/** Text in the requested language, falling back to the other one. */
export const pickText = (v: T, lang: Lang) => v[lang] || "";

export const other = (lang: Lang): Lang => (lang === "en" ? "zh" : "en");
export const base = (lang: Lang) => `/${lang}/`;
