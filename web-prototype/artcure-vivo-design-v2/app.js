const ASSET_IP = "../../miniprogram/images/index/ip.png";

const routes = [
  {
    id: "home",
    label: "小屋",
    icon: "🏠",
    source: "pages/page1/index",
    status: "主 Tab",
    title: "AI艺术疗愈小屋",
    capability: "心情打卡、艺哟入口、创造分析、每日心理能量",
    note: "首页保持现有水彩背景与 IP 主视觉，把创造分析和 AI 陪伴变成首屏强入口。"
  },
  {
    id: "chat",
    label: "AI陪伴",
    icon: "💬",
    source: "pages/ai-chat/index",
    status: "多模态",
    title: "愈见·艺呦",
    capability: "树洞、疗愈师、日常陪伴、短语音识别、TTS 引导",
    note: "强化 vivo 手机 AI 助手感：按住说心情、三分钟语音疗愈、知识库回应。"
  },
  {
    id: "create",
    label: "创造分析",
    icon: "🎨",
    source: "pages/create-analysis/index",
    status: "影像场景",
    title: "创造分析",
    capability: "在线白板、上传作品、OCR/图片理解、非诊断式观察",
    note: "把画布做成疗愈纸面，分析结果只描述颜色、线条、留白与下一笔建议。"
  },
  {
    id: "hall",
    label: "疗愈馆",
    icon: "🧭",
    source: "pages/healing-hall/index",
    status: "主 Tab",
    title: "疗愈馆",
    capability: "搜索、POI 附近探索、分类筛选、机构/活动切换",
    note: "结合大众点评式资源卡片和艺术疗愈语义筛选，突出上海线下资源库。"
  },
  {
    id: "advisor",
    label: "资源顾问",
    icon: "✨",
    source: "pages/healing-hall-ai-advisor/index",
    status: "智能体",
    title: "愈见 · AI资源顾问",
    capability: "需求对话、资源推荐卡、复制微信、电话预约、详情跳转",
    note: "把资源顾问做成艺哟的专业状态，不只是聊天，而是给出可执行预约信息。"
  },
  {
    id: "resource",
    label: "资源详情",
    icon: "🏡",
    source: "pages/resource-detail/index",
    status: "交易转化",
    title: "资源详情",
    capability: "套餐价格、疗愈师信息、特色亮点、适合心情、联系方式",
    note: "详情页用真实样例资源结构，帮助评委看到它不是空列表。"
  },
  {
    id: "activity",
    label: "活动预约",
    icon: "📅",
    source: "pages/healing-activities / activity-detail / activity-booking",
    status: "闭环",
    title: "疗愈活动",
    capability: "活动列表、活动详情、预约支付、活动反馈",
    note: "活动链路承接疗愈馆，让线下体验有完整预约和反馈路径。"
  },
  {
    id: "plan",
    label: "疗愈计划",
    icon: "📋",
    source: "pages/healing-plan/index",
    status: "主 Tab",
    title: "疗愈计划",
    capability: "心情推荐、我的计划、经典方案、AI 定制入口",
    note: "计划页要体现坚持感和 AI 个性化，而不是普通任务列表。"
  },
  {
    id: "custom",
    label: "定制计划",
    icon: "🪄",
    source: "pages/plan-custom/index",
    status: "生成式",
    title: "AI定制专属计划",
    capability: "计划名称、天数、每日时长、疗愈主题、需求描述、计划生成",
    note: "让用户输入压力、睡眠、焦虑等需求，生成可编辑的多日疗愈任务。"
  },
  {
    id: "detail",
    label: "计划详情",
    icon: "🔥",
    source: "pages/plan-detail/index",
    status: "执行",
    title: "计划详情",
    capability: "进度环、今日任务、完整计划、打卡、日历、调整计划",
    note: "用打卡、连续天数和日历沉淀疗愈行为。"
  },
  {
    id: "profile",
    label: "我的",
    icon: "👤",
    source: "pages/profile/index",
    status: "主 Tab",
    title: "我的疗愈轨迹",
    capability: "用户信息、心情曲线、智能分析、累计疗愈、菜单入口",
    note: "个人页展示数据沉淀：心情趋势、疗愈天数、金币、偏好完善。"
  },
  {
    id: "survey",
    label: "偏好问卷",
    icon: "📝",
    source: "pages/onboarding-survey/index",
    status: "个性化",
    title: "个人偏好",
    capability: "艺术偏好、期望帮助、活动形式",
    note: "偏好问卷为资源推荐和计划生成提供冷启动信息。"
  }
];

const pageMap = [
  ["page1", "主 Tab", "covered"],
  ["healing-hall", "主 Tab", "covered"],
  ["healing-plan", "主 Tab", "covered"],
  ["profile", "主 Tab", "covered"],
  ["onboarding-survey", "偏好", "covered"],
  ["ai-chat", "AI陪伴", "covered"],
  ["create-analysis", "创造分析", "covered"],
  ["healing-hall-ai-advisor", "资源顾问", "covered"],
  ["resource-detail", "详情", "covered"],
  ["healing-activities", "活动", "covered"],
  ["activity-detail", "活动", "covered"],
  ["activity-booking", "活动", "covered"],
  ["activity-feedback", "活动", "covered"],
  ["my-activities", "个人", "partial"],
  ["therapist-chat", "咨询", "partial"],
  ["my-consultations", "咨询", "partial"],
  ["my-plans", "计划", "covered"],
  ["plan-detail", "计划", "covered"],
  ["plan-template", "计划模板", "partial"],
  ["plan-edit", "计划编辑", "covered"],
  ["plan-custom", "计划生成", "covered"],
  ["user_login", "账号", "partial"],
  ["user_register", "账号", "partial"],
  ["user-info", "账号", "partial"],
  ["example", "示例", "partial"],
  ["location-resources", "未注册", "partial"],
  ["voice-healing", "目录不完整", "partial"]
];

const moodList = [
  { value: 5, emoji: "😄", label: "开心", insight: "适合记录快乐色卡，生成周末轻创作计划。" },
  { value: 4, emoji: "😊", label: "平静", insight: "可以继续正念涂鸦，保持今天的柔和节奏。" },
  { value: 3, emoji: "😐", label: "一般", insight: "建议做 8 分钟自由线条，把说不出的感受先画出来。" },
  { value: 2, emoji: "😔", label: "低落", insight: "艺哟会推荐睡前情绪清理和温和陪伴模式。" },
  { value: 1, emoji: "😰", label: "焦虑", insight: "优先进入三分钟语音引导，并推荐 7 天焦虑缓解计划。" }
];

const resources = [
  {
    id: "res_001",
    name: "Thanks绘画心理艺术工作室",
    type: "绘画疗愈",
    district: "静安区",
    address: "上海市静安区愚园路309号3楼",
    price: "¥198-688/次",
    perPerson: "¥298",
    rating: "4.9",
    tags: ["曼陀罗", "情绪表达", "适合新手", "提供画材"],
    source: ["大众点评", "独家合作"],
    image: "https://artcure-1369706839.cos.ap-shanghai.myqcloud.com/pic/shops/1.png",
    emoji: "🎨",
    therapist: "林心怡",
    therapistIntro: "国际认证表达性艺术治疗师，8年绘画疗愈经验。",
    contact: "bindraw_studio",
    packages: [
      ["体验工作坊", "2小时绘画疗愈，含全套画材", "¥198"],
      ["1v1定制课", "90分钟个性化疗愈方案", "¥688"],
      ["企业团建", "20人起，含课程定制", "¥168/人"]
    ],
    mood: ["减压", "焦虑缓解", "自我探索"]
  },
  {
    id: "res_002",
    name: "共振岛Echo Isle·手碟艺术疗愈",
    type: "颂钵音疗",
    district: "徐汇区",
    address: "上海市徐汇区武康路118号B1",
    price: "¥128-388/次",
    perPerson: "¥188",
    rating: "4.8",
    tags: ["音乐疗愈", "颂钵", "冥想", "改善睡眠"],
    source: ["大众点评"],
    image: "https://artcure-1369706839.cos.ap-shanghai.myqcloud.com/pic/shops/3.png",
    emoji: "🔔",
    therapist: "陈雨薇",
    therapistIntro: "5年音疗经验，美国音乐治疗协会认证。",
    contact: "wanting_sound",
    packages: [
      ["沙龙音疗", "90分钟集体声音浴体验", "¥128"],
      ["1v1私人音疗", "60分钟定制颂钵+手碟疗愈", "¥388"]
    ],
    mood: ["失眠", "减压", "情绪低落"]
  },
  {
    id: "res_010",
    name: "拾光·流体画艺术体验",
    type: "绘画疗愈",
    district: "杨浦区",
    address: "上海市杨浦区大学路120号",
    price: "¥88-188/次",
    perPerson: "¥128",
    rating: "4.6",
    tags: ["流体画", "零基础", "周末开放", "可带走作品"],
    source: ["小红书", "大众点评"],
    image: "",
    emoji: "🌈",
    therapist: "何小橙",
    therapistIntro: "青年艺术家，艺术教育背景。",
    contact: "shiguang_art",
    packages: [
      ["流体画体验", "90分钟创作+作品带走", "¥88"],
      ["精品沙龙", "2小时小班，限10人", "¥138"],
      ["亲子同乐", "亲子双人，一大一小", "¥188"]
    ],
    mood: ["放松", "减压", "寻找乐趣"]
  }
];

const activities = [
  {
    id: "activity_001",
    title: "艺术疗愈工作坊 · 绘画与情绪表达",
    time: "4月5日 14:00",
    location: "上海市徐汇区艺术空间",
    price: "¥298",
    people: "7/12人",
    cover: "https://artcure-1369706839.cos.ap-shanghai.myqcloud.com/pic/activity/1.png",
    desc: "通过绘画探索内心情绪，在专业艺术疗愈师引导下，用色彩和线条表达自我。"
  },
  {
    id: "activity_002",
    title: "颂钵音疗体验 · 声音的疗愈之旅",
    time: "4月8日 19:00",
    location: "上海市静安区禅修中心",
    price: "¥188",
    people: "15/20人",
    cover: "https://artcure-1369706839.cos.ap-shanghai.myqcloud.com/pic/activity/2.jpg",
    desc: "在颂钵共鸣声中放松身心，体验声音振动带来的深度疗愈。"
  }
];

const state = {
  route: "home",
  mood: 4,
  chatMode: "comfort",
  isRecording: false,
  brushColor: "#4A90E2",
  analysisVisible: false,
  hallCategory: "all",
  hallType: "resources",
  advisorAsked: false,
  selectedResource: "res_001",
  generatedPlan: false,
  selectedThemes: ["焦虑缓解", "睡眠改善"],
  planChecked: false,
  profilePeriod: "week",
  surveyStep: 1,
  selectedSurvey: ["painting", "anxiety", "offline"],
  chatMessages: [
    { type: "bot", text: "你好呀，我是艺哟。我会陪你把情绪变成可以被看见的颜色、声音和练习。" }
  ],
  advisorMessages: []
};

const routeNav = document.getElementById("routeNav");
const phoneScreen = document.getElementById("phoneScreen");
const screenTitle = document.getElementById("screenTitle");
const screenKicker = document.getElementById("screenKicker");
const screenMeta = document.getElementById("screenMeta");
const interactionNotes = document.getElementById("interactionNotes");
const currentStatus = document.getElementById("currentStatus");
const screenStrip = document.getElementById("screenStrip");
const pageMapEl = document.getElementById("pageMap");

function routeById(id) {
  return routes.find((route) => route.id === id) || routes[0];
}

function activeMood() {
  return moodList.find((mood) => mood.value === state.mood) || moodList[1];
}

function selectedResource() {
  return resources.find((resource) => resource.id === state.selectedResource) || resources[0];
}

function setRoute(id) {
  state.route = id;
  render();
}

function render() {
  const route = routeById(state.route);
  screenTitle.textContent = route.title;
  screenKicker.textContent = route.source;
  currentStatus.textContent = route.status;
  routeNav.innerHTML = routes.map(renderRouteButton).join("");
  screenStrip.innerHTML = routes.map(renderScreenTile).join("");
  pageMapEl.innerHTML = pageMap.map(renderPageMapItem).join("");
  screenMeta.innerHTML = renderMeta(route);
  interactionNotes.innerHTML = renderNotes(route);
  phoneScreen.innerHTML = renderPhone(route.id);

  requestAnimationFrame(() => {
    if (state.route === "create") {
      setupCanvas();
    }
  });
}

function renderRouteButton(route) {
  const active = route.id === state.route ? "active" : "";
  return `
    <button class="route-btn ${active}" data-route="${route.id}">
      <span class="route-icon">${route.icon}</span>
      <span>
        <span class="route-label">${route.label}</span>
        <span class="route-src">${route.source}</span>
      </span>
      <span class="route-tag">${route.status}</span>
    </button>
  `;
}

function renderScreenTile(route) {
  const active = route.id === state.route ? "active" : "";
  return `
    <button class="screen-tile ${active}" data-route="${route.id}">
      <div class="tile-preview">
        <div class="tile-preview-inner">${tileGlyph(route.id)}</div>
      </div>
      <div class="tile-label">
        <strong>${route.label}</strong>
        <span>${route.source}</span>
      </div>
    </button>
  `;
}

function tileGlyph(id) {
  const glyphs = {
    home: "🏠<br><span>IP + 心情</span>",
    chat: "💬<br><span>语音疗愈</span>",
    create: "🎨<br><span>画布分析</span>",
    hall: "🧭<br><span>资源筛选</span>",
    advisor: "✨<br><span>AI顾问</span>",
    resource: "🏡<br><span>详情预约</span>",
    activity: "📅<br><span>活动闭环</span>",
    plan: "📋<br><span>推荐计划</span>",
    custom: "🪄<br><span>AI生成</span>",
    detail: "🔥<br><span>打卡执行</span>",
    profile: "👤<br><span>疗愈轨迹</span>",
    survey: "📝<br><span>偏好采集</span>"
  };
  return `<div style="display:grid;place-items:center;height:100%;font-size:28px;color:#e8747d;font-weight:900;text-align:center">${glyphs[id] || "✨"}</div>`;
}

function renderPageMapItem(item) {
  const [name, tag, status] = item;
  return `
    <div class="page-map-item ${status}">
      <strong>${name}</strong>
      <span>${tag}</span>
    </div>
  `;
}

function renderMeta(route) {
  return `
    <div class="meta-item"><span>对应目录</span><p>${route.source}</p></div>
    <div class="meta-item"><span>真实功能</span><p>${route.capability}</p></div>
    <div class="meta-item"><span>v2 设计修正</span><p>${route.note}</p></div>
  `;
}

function renderNotes(route) {
  const notes = {
    home: ["点击心情会更新今日推荐语", "点击创造分析卡进入画布分析", "底部 Tab 对齐现有 app.json 主入口"],
    chat: ["切换三种对话模式", "点击说心情切换录音态", "快捷问题会追加用户与艺哟回复"],
    create: ["画布支持鼠标或触控涂画", "切换画笔颜色会改变下一笔", "开始创造分析后展示非诊断式结果"],
    hall: ["分类与资源数据来自 sampleResources", "机构/活动 Tab 可切换", "资源卡可进入详情"],
    advisor: ["快捷问题会生成推荐卡", "卡片保留查看详情、复制微信、电话预约动作", "回应文案来自当前顾问页样例"],
    resource: ["套餐、疗愈师、来源、适合心情都来自资源 schema", "底部预约栏保持强转化", "独家合作显示在线咨询入口"],
    activity: ["包含活动列表、活动详情、预约表单、反馈评分四段", "活动数据来自 sampleActivities"],
    plan: ["心情推荐联动首页 mood", "经典方案保留现有四个模板", "定制入口跳转到生成页"],
    custom: ["主题可多选", "生成后出现可编辑计划预览", "对应 planGenerator 云函数流程"],
    detail: ["点击完成打卡会改变进度状态", "保留完整任务列表和月历", "对应 planManagement checkIn"],
    profile: ["本周/本月切换曲线", "展示智能心情分析与偏好入口", "沉淀疗愈小时和金币"],
    survey: ["三步偏好问卷可切换", "选项覆盖艺术形式、帮助需求、活动形式", "为个性化计划与资源推荐提供冷启动"]
  };
  return (notes[route.id] || []).map((note, index) => `<div class="note-row"><i>${index + 1}</i><span>${note}</span></div>`).join("");
}

function renderPhone(routeId) {
  const renderers = {
    home: renderHome,
    chat: renderChat,
    create: renderCreate,
    hall: renderHall,
    advisor: renderAdvisor,
    resource: renderResource,
    activity: renderActivity,
    plan: renderPlan,
    custom: renderCustom,
    detail: renderPlanDetail,
    profile: renderProfile,
    survey: renderSurvey
  };
  return (renderers[routeId] || renderHome)();
}

function renderAppHeader(title, subtitle = "", options = {}) {
  const back = options.back ? `<button class="round-btn" data-route="${options.back}">‹</button>` : "";
  const action = options.action || "";
  return `
    <div class="${options.chat ? "chat-header" : "sub-header"}">
      ${back || `<div></div>`}
      <div style="flex:1;min-width:0;text-align:${back ? "center" : "left"}">
        <span class="header-title">${title}</span>
        ${subtitle ? `<span class="header-subtitle">${subtitle}</span>` : ""}
      </div>
      ${action || `<div style="width:38px"></div>`}
    </div>
  `;
}

function renderTabbar(active) {
  const tabs = [
    ["home", "🏠", "小屋"],
    ["hall", "🧭", "疗愈馆"],
    ["plan", "📋", "计划"],
    ["profile", "👤", "我的"]
  ];
  return `
    <div class="tabbar">
      ${tabs.map(([id, icon, label]) => `
        <button class="${active === id ? "active" : ""}" data-route="${id}">
          <span class="tab-ico">${icon}</span>
          <span>${label}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderHome() {
  const mood = activeMood();
  return `
    <section class="phone-page home-page">
      <div class="app-header">
        <div>
          <span class="mini-label">你好呀，欢迎来到</span>
          <span class="header-title">AI艺术疗愈小屋</span>
        </div>
        <button class="round-btn" data-route="profile">👤</button>
      </div>

      <div class="hero-copy">
        <p class="eyebrow">YIYOU ART THERAPY</p>
        <h2>把今天的心情<br>画成可以被抱住的颜色</h2>
        <p>让我们一起在艺术疗愈的体验与陪伴中，遇见更好的自己。</p>
      </div>

      <div class="ip-stage">
        <img class="home-ip" src="${ASSET_IP}" alt="艺哟" />
        <button class="speech-card" data-route="chat">
          <span class="speech-title">今天怎么样？来和我说说吧！</span>
          <span class="speech-desc">点击和“艺呦”一起体验专业的陪伴式艺术疗愈指导</span>
        </button>
        <button class="hero-card" data-route="create">
          <span>
            <span class="tagline">图片理解 / OCR</span>
            <strong>创造分析</strong>
            <p>画一画或上传作品，让艺哟做非诊断式艺术疗愈观察</p>
          </span>
          <span class="arrow-chip">开始创作</span>
        </button>
      </div>

      <section class="mood-card">
        <div class="section-row">
          <span class="section-title">今日心情打卡</span>
          <span class="streak">已连续 3 天</span>
        </div>
        <div class="mood-list">
          ${moodList.map((item) => `
            <button class="mood-item ${state.mood === item.value ? "active" : ""}" data-mood="${item.value}">
              <span class="mood-emoji">${item.emoji}</span>
              <span class="mood-label">${item.label}</span>
            </button>
          `).join("")}
        </div>
      </section>

      <section class="quote-card">
        <span class="quote-icon">🪶</span>
        <div>
          <span class="tagline">每日心理能量</span>
          <p>${mood.insight}</p>
        </div>
      </section>

      <section class="soft-card" style="margin-top:12px;padding:14px;background:linear-gradient(135deg,#fff,#edf6ed)">
        <div class="section-row">
          <div>
            <span class="card-title">艺哟为你准备</span>
            <p>${state.mood <= 2 ? "睡前情绪清理 · 7天焦虑缓解 · 三分钟语音引导" : "曼陀罗涂色 · 流体画工作坊 · 本周心情曲线"}</p>
          </div>
          <button class="small-action" data-route="${state.mood <= 2 ? "plan" : "hall"}">${state.mood <= 2 ? "看计划" : "去探索"}</button>
        </div>
      </section>
      ${renderTabbar("home")}
    </section>
  `;
}

function renderChat() {
  const modes = {
    comfort: ["🌙", "树洞", "倾听你的心声"],
    therapist: ["🩺", "疗愈师", "专业陪伴"],
    companion: ["☕", "日常陪伴", "轻松聊天"]
  };
  const quicks = {
    comfort: ["今天有点难过...", "感觉很累，想休息", "最近压力好大"],
    therapist: ["什么是艺术疗愈？", "如何缓解焦虑？", "推荐一些疗愈方法"],
    companion: ["今天发生了一件趣事", "周末有什么计划？", "聊聊最近的生活"]
  };
  return `
    <section class="phone-page sub-page">
      ${renderAppHeader("愈见·艺呦", `${modes[state.chatMode][1]}模式 · ${modes[state.chatMode][2]}`, { back: "home", chat: true, action: `<button class="round-btn" data-action="play-guide">引导</button>` })}
      <div class="mode-selector">
        ${Object.entries(modes).map(([id, mode]) => `<button class="mode-pill ${state.chatMode === id ? "active" : ""}" data-mode="${id}">${mode[0]} ${mode[1]}</button>`).join("")}
      </div>
      <section class="voice-strip">
        <div>
          <span class="voice-title">语音疗愈</span>
          <span class="voice-state">${state.isRecording ? "正在听你说，艺哟会整理成文字" : "点麦克风说心情"}</span>
        </div>
        <div class="voice-actions">
          <button class="voice-btn ${state.isRecording ? "recording" : ""}" data-action="record">${state.isRecording ? "结束" : "说心情"}</button>
          <button class="voice-btn" data-question="请带我做一次三分钟的艺术疗愈语音引导，步骤要简单，可以边听边画。">三分钟引导</button>
        </div>
      </section>
      <div class="message-list">
        ${state.chatMessages.map(renderMessage).join("")}
      </div>
      <div class="quick-row" style="margin-top:12px">
        ${quicks[state.chatMode].map((q) => `<button class="quick-chip" data-question="${q}">${q}</button>`).join("")}
      </div>
      <div class="chat-input">
        <button class="icon-btn" data-action="record">麦</button>
        <input id="chatInput" placeholder="在这里倾诉..." />
        <button class="send-button" data-send="chat">➤</button>
      </div>
    </section>
  `;
}

function renderMessage(message) {
  if (message.type === "user") {
    return `<div class="message user"><div class="bubble">${message.text}</div></div>`;
  }
  return `
    <div class="message bot">
      <img class="bot-avatar" src="${ASSET_IP}" alt="艺哟" />
      <div class="bubble">${message.text}</div>
    </div>
  `;
}

function renderCreate() {
  return `
    <section class="phone-page sub-page">
      ${renderAppHeader("创造分析", "在线白板 · 图片上传 · AI 艺术疗愈观察", { back: "home" })}
      <section class="plan-hero" style="margin-bottom:12px">
        <span class="tagline">vivo 图片理解 / OCR 接入位</span>
        <h2>画一点，AI 帮你看见一点</h2>
        <p>分析只用于自我觉察和艺术疗愈练习，不做心理诊断。</p>
      </section>

      <section class="soft-card canvas-panel">
        <div class="section-row">
          <span class="section-title">在线白板</span>
          <button class="small-action" data-action="reset-canvas">清空</button>
        </div>
        <canvas id="healingCanvas" class="healing-canvas"></canvas>
        <div class="tool-row">
          <div class="swatches">
            ${["#4A90E2", "#F28C8C", "#7BC6A4", "#F2C94C", "#7E57C2", "#263238"].map((color) => `<button class="swatch ${state.brushColor === color ? "active" : ""}" style="background:${color}" data-brush="${color}"></button>`).join("")}
          </div>
          <span class="mini-label">6px 圆头笔刷</span>
        </div>
      </section>

      <section class="upload-box">
        <div>
          <strong style="display:block;color:#2f3337">选择图片或拍照</strong>
          <span>支持手账、涂鸦、绘画作品、情绪便签</span>
        </div>
      </section>

      <section class="soft-card" style="margin-top:12px;padding:13px">
        <span class="card-title">给 AI 的补充</span>
        <textarea class="textarea" placeholder="例如：这是我今天压力最大的时候画的">我想让 AI 给我下一笔建议</textarea>
        <div class="chip-row" style="margin-top:10px">
          ${["今天的压力", "说不出的难过", "随手涂鸦", "下一笔建议"].map((item) => `<button class="chip">${item}</button>`).join("")}
        </div>
      </section>

      <button class="primary-wide" data-analyze="true">${state.analysisVisible ? "重新创造分析" : "开始创造分析"}</button>
      <section class="analysis-card ${state.analysisVisible ? "visible" : ""}">
        <span class="section-title">AI 观察结果</span>
        <p><strong>画面观察：</strong>线条从左下向右上延展，像是在给情绪找出口；蓝色与粉色交替出现，说明你可能同时需要安定和被照顾。</p>
        <p><strong>下一步创作建议：</strong>给最紧张的位置加一种安心色；在边缘写一句“我现在允许自己……”；用圆形给画面加一个临时保护边界。</p>
        <p><strong>安全说明：</strong>本分析仅用于艺术疗愈和自我觉察，不构成心理诊断。</p>
      </section>
    </section>
  `;
}

function renderHall() {
  const filtered = resources.filter((resource) => state.hallCategory === "all" || resource.type.includes(state.hallCategory) || resource.tags.some((tag) => tag.includes(state.hallCategory)));
  return `
    <section class="phone-page">
      ${renderAppHeader("疗愈馆", "找到适合你的疗愈方式", { action: `<button class="round-btn" data-route="advisor">✨</button>` })}
      <section class="search-card">
        <div class="search-bar">
          <span>🔍</span>
          <input class="search-input" value="${state.hallCategory === "all" ? "" : state.hallCategory}" placeholder="搜索名称、疗愈师、地址..." />
          <span>×</span>
        </div>
        <div class="poi-card">
          <div class="section-row">
            <div>
              <span class="section-title">附近疗愈探索</span>
              <span class="mini-label">像逛疗愈版大众点评一样筛选线下资源</span>
            </div>
            <button class="small-action">定位</button>
          </div>
          <div class="poi-row">
            <input class="poi-input" value="上海市" />
            <input class="poi-input" value="${state.hallCategory === "all" ? "艺术疗愈" : state.hallCategory}" />
            <button class="mini-btn">搜</button>
          </div>
          <div class="chip-row" style="margin-top:10px">
            ${["绘画疗愈", "颂钵音疗", "冥想正念", "舞动疗愈", "200元以内"].map((item) => `<button class="chip ${state.hallCategory === item ? "active" : ""}" data-category="${item}">${item}</button>`).join("")}
          </div>
        </div>
      </section>
      <div class="category-row">
        ${["all", "绘画疗愈", "音乐疗愈", "颂钵音疗", "舞动疗愈", "冥想正念", "心理咨询"].map((item) => `<button class="category-pill ${state.hallCategory === item ? "active" : ""}" data-category="${item}">${item === "all" ? "全部" : item}</button>`).join("")}
      </div>
      <div class="filter-row">
        ${["价格", "形式", "等级", "来源", "综合推荐"].map((item) => `<button class="filter-pill">${item}</button>`).join("")}
      </div>
      <button class="hero-card" data-route="advisor" style="position:static;width:100%;margin-top:12px;text-align:left">
        <span>
          <span class="tagline">愈见 · AI资源顾问</span>
          <strong>不知道选什么？AI 帮你精准匹配</strong>
          <p>输入预算、位置、疗愈方式，得到可预约资源。</p>
        </span>
        <span class="arrow-chip">咨询</span>
      </button>
      <div class="resource-tabs">
        <button class="${state.hallType === "resources" ? "active" : ""}" data-hall-type="resources">疗愈机构</button>
        <button class="${state.hallType === "activities" ? "active" : ""}" data-hall-type="activities">疗愈活动</button>
      </div>
      <div class="section-row" style="margin-top:12px">
        <span class="mini-label">共 ${state.hallType === "resources" ? filtered.length : activities.length} 个${state.hallType === "resources" ? "疗愈资源" : "疗愈活动"}</span>
      </div>
      ${state.hallType === "resources" ? `<div class="shops-list">${filtered.map(renderShopCard).join("")}</div>` : `<div class="activities-list">${activities.map(renderActivityCard).join("")}</div>`}
      ${renderTabbar("hall")}
    </section>
  `;
}

function renderShopCard(resource) {
  return `
    <button class="shop-card" data-resource-id="${resource.id}">
      <div class="shop-cover">
        ${resource.image ? `<img src="${resource.image}" alt="${resource.name}" onerror="this.style.display='none'" />` : ""}
        <div class="cover-fallback">${resource.emoji}</div>
        ${resource.source.includes("独家合作") ? `<span class="badge">🤝 独家合作</span>` : ""}
        <span class="rating">★ ${resource.rating}</span>
      </div>
      <div class="shop-body">
        <span class="shop-name">${resource.name}</span>
        <div class="pill-row">${resource.tags.slice(0, 4).map((tag) => `<span class="mini-pill">${tag}</span>`).join("")}</div>
        <div class="price-row">
          <span class="price">${resource.price}</span>
          <span>📍 ${resource.district} · 同城资源</span>
        </div>
      </div>
    </button>
  `;
}

function renderActivityCard(activity) {
  return `
    <button class="activity-card" data-route="activity">
      <div class="activity-cover" style="background-image:url('${activity.cover}');background-size:cover;background-position:center"></div>
      <div class="activity-body">
        <span class="activity-title">${activity.title}</span>
        <p>📅 ${activity.time} · 📍 ${activity.location}</p>
        <div class="price-row"><span class="price">${activity.price}</span><span>👥 ${activity.people}</span></div>
      </div>
    </button>
  `;
}

function renderAdvisor() {
  const recs = state.advisorAsked ? [resources[0], resources[1], resources[2]] : [];
  return `
    <section class="phone-page sub-page">
      ${renderAppHeader("愈见 · AI资源顾问", "专业、高效、精准推荐", { back: "hall", action: `<button class="round-btn" data-action="clear-advisor">🗑</button>` })}
      <section class="advisor-welcome">
        <div class="message bot" style="margin-bottom:0">
          <img class="bot-avatar" src="${ASSET_IP}" alt="艺哟" />
          <div class="bubble" style="max-width:100%">
            你好，我是艺哟。告诉我疗愈类型、预算、地点偏好，我会为你推荐最合适的选项，并整理预约信息。
          </div>
        </div>
      </section>
      <div class="quick-row" style="margin-top:12px">
        ${["绘画疗愈去哪体验比较好？", "推荐性价比较高的疗愈活动", "静安区有哪些颂钵疗愈工作室？", "适合周末体验的艺术疗愈活动"].map((q) => `<button class="quick-chip" data-advisor-question="${q}">${q}</button>`).join("")}
      </div>
      <div class="message-list">
        ${state.advisorAsked ? `
          <div class="message user"><div class="bubble">绘画疗愈去哪体验比较好？预算 200-300，最好在静安附近。</div></div>
          <div class="message bot"><img class="bot-avatar" src="${ASSET_IP}" alt="艺哟" /><div class="bubble">我先按“绘画疗愈、初次体验、好上手、静安优先”筛了 3 个选择。你可以看下面的资源卡片，我把价格、区域和可预约信息也整理好了。</div></div>
        ` : ""}
      </div>
      <div class="resource-stack">
        ${recs.map((resource) => `
          <section class="recommendation-card">
            <strong>${resource.name}</strong>
            <div class="pill-row">
              <span class="mini-pill">${resource.type}</span>
              <span class="mini-pill">${resource.district}</span>
              <span class="mini-pill">${resource.price}</span>
            </div>
            <p>${resource.tags.join(" · ")}</p>
            <div class="action-row">
              <button class="small-action" data-resource-id="${resource.id}">查看详情</button>
              <button class="small-action">复制微信</button>
              <button class="small-action">电话预约</button>
            </div>
          </section>
        `).join("")}
      </div>
      <div class="chat-input">
        <span></span>
        <input id="advisorInput" placeholder="告诉我你的需求..." />
        <button class="send-button" data-send="advisor">➤</button>
      </div>
    </section>
  `;
}

function renderResource() {
  const resource = selectedResource();
  return `
    <section class="phone-page sub-page">
      ${renderAppHeader("资源详情", "", { back: "hall" })}
      <div class="resource-hero">
        ${resource.image ? `<img src="${resource.image}" alt="${resource.name}" onerror="this.style.display='none'" />` : `<div class="cover-fallback">${resource.emoji}</div>`}
        ${resource.source.includes("独家合作") ? `<span class="badge" style="position:absolute;left:14px;top:14px">🤝 独家合作</span>` : ""}
      </div>
      <div class="resource-title-block">
        <span class="resource-title">${resource.name}</span>
        <div class="pill-row">
          <span class="mini-pill">⭐ ${resource.rating} · 56条评价</span>
          <span class="mini-pill">${resource.type}</span>
          <span class="mini-pill">${resource.source.join(" / ")}</span>
        </div>
      </div>
      <div class="quick-info">
        <div class="quick-info-item"><span>人均</span><strong>${resource.perPerson}</strong></div>
        <div class="quick-info-item"><span>区域</span><strong>${resource.district}</strong></div>
        <div class="quick-info-item"><span>形式</span><strong>工作坊</strong></div>
      </div>
      <div class="resource-stack">
        <section class="resource-section">
          <div class="section-row"><span class="section-title">套餐价格</span><span class="price">${resource.perPerson}</span></div>
          ${resource.packages.map((pkg) => `<div class="package-item"><div><strong>${pkg[0]}</strong><p>${pkg[1]}</p></div><span class="package-price">${pkg[2]}</span></div>`).join("")}
        </section>
        <section class="resource-section">
          <span class="section-title">疗愈师</span>
          <div class="therapist-item"><div><strong>${resource.therapist}</strong><p>${resource.therapistIntro}</p></div><span class="mini-pill">认证</span></div>
        </section>
        <section class="resource-section">
          <span class="section-title">特色亮点</span>
          <div class="pill-row">${resource.tags.map((tag) => `<span class="mini-pill">${tag}</span>`).join("")}</div>
        </section>
        <section class="resource-section">
          <span class="section-title">适合心情</span>
          <div class="pill-row">${resource.mood.map((tag) => `<span class="mini-pill">${tag}</span>`).join("")}</div>
        </section>
        <section class="resource-section">
          <span class="section-title">📍 地址</span>
          <p>${resource.address}</p>
          <p>💬 微信：${resource.contact}</p>
        </section>
      </div>
      <div class="bottom-cta">
        <button>收藏</button>
        <button class="main">立即预约</button>
      </div>
    </section>
  `;
}

function renderActivity() {
  const activity = activities[0];
  return `
    <section class="phone-page sub-page">
      ${renderAppHeader("疗愈活动", "活动列表 · 详情 · 预约 · 反馈", { back: "hall" })}
      <div class="resource-tabs" style="margin-bottom:12px">
        <button class="active">全部</button>
        <button>艺术疗愈</button>
      </div>
      ${activities.map(renderActivityCard).join("")}
      <section class="resource-section" style="margin-top:12px">
        <span class="section-title">${activity.title}</span>
        <p>📅 ${activity.time}</p>
        <p>📍 ${activity.location}</p>
        <p>👥 ${activity.people} · 疗愈师：李心怡</p>
        <p>${activity.desc}</p>
      </section>
      <section class="form-card" style="margin-top:12px">
        <span class="section-title">预约活动</span>
        <div class="form-group"><label>参与人数</label><input class="form-input" value="1" /></div>
        <div class="form-group"><label>联系电话</label><input class="form-input" value="138 1234 5678" /></div>
        <div class="form-group"><label>备注</label><textarea class="textarea">希望靠近老师，第一次参加绘画疗愈。</textarea></div>
        <div class="price-row"><span>总计</span><span class="price">¥298</span></div>
        <button class="primary-wide">确认预约并支付</button>
      </section>
      <section class="resource-section" style="margin-top:12px">
        <span class="section-title">活动反馈</span>
        <p style="font-size:22px;color:#f4b84f">★★★★★</p>
        <p>我在颜色流动里慢慢放松下来，结束后更能描述自己的情绪。</p>
      </section>
    </section>
  `;
}

function renderPlan() {
  const mood = activeMood();
  return `
    <section class="phone-page">
      ${renderAppHeader("疗愈计划", "坚持练习，看见改变的发生")}
      <section class="plan-hero">
        <span class="tagline">🤖 AI专属推荐</span>
        <h2>${state.mood <= 2 ? "7天焦虑缓解计划" : "睡前情绪清理"}</h2>
        <p>${mood.insight}</p>
        <div class="price-row"><span>📅 7天计划</span><span>⏱️ 15分钟/天</span></div>
        <button class="secondary-wide" data-route="custom">查看并调整</button>
      </section>
      <button class="hero-card" data-route="detail" style="position:static;width:100%;margin-top:12px;text-align:left">
        <span>
          <span class="tagline">我的计划</span>
          <strong>情绪清理 · 进行中</strong>
          <p>已完成 3 天 / 共 7 天，今天还差一次画笔呼吸练习。</p>
        </span>
        <span class="arrow-chip">继续</span>
      </button>
      <div class="section-row" style="margin-top:16px"><span class="section-title">经典方案</span></div>
      <div class="plan-list">
        ${[
          ["🌊", "7天焦虑缓解计划", "#绘画 #冥想", "custom"],
          ["🌙", "睡前情绪清理", "#白噪音 #书写", "detail"],
          ["🍃", "14天正念入门", "#呼吸 #冥想", "detail"],
          ["🎵", "音乐疗愈之旅", "#音乐 #放松", "detail"]
        ].map(([emoji, title, tags, route]) => `
          <button class="plan-card" data-route="${route}">
            <span class="plan-icon">${emoji}</span>
            <span><strong>${title}</strong><span class="mini-label">${tags}</span></span>
            <span>›</span>
          </button>
        `).join("")}
      </div>
      <button class="primary-wide" data-route="custom">🪄 定制专属计划</button>
      ${renderTabbar("plan")}
    </section>
  `;
}

function renderCustom() {
  const themes = ["焦虑缓解", "睡眠改善", "情绪管理", "压力释放", "正念冥想", "自我成长"];
  return `
    <section class="phone-page sub-page">
      ${renderAppHeader("AI定制专属计划", "让AI为你量身打造疗愈方案", { back: "plan" })}
      <section class="custom-hero">
        <span class="tagline">Plan Generator</span>
        <h2>把模糊需求变成每天可做的一件小事</h2>
        <p>结合偏好问卷、近期心情和艺术疗愈知识库生成计划。</p>
      </section>
      <section class="form-card" style="margin-top:12px">
        <div class="form-group"><label>计划名称</label><input class="form-input" value="睡前安心计划" /></div>
        <div class="form-group"><label>计划天数</label><div class="chip-row">${[7, 14, 21, 30].map((d) => `<button class="chip ${d === 7 ? "active" : ""}">${d}天</button>`).join("")}</div></div>
        <div class="form-group"><label>每日时长</label><div class="chip-row">${[10, 15, 20, 30].map((d) => `<button class="chip ${d === 15 ? "active" : ""}">${d}分钟</button>`).join("")}</div></div>
        <div class="form-group">
          <label>疗愈主题</label>
          <div class="theme-grid">
            ${themes.map((theme) => `<button class="theme-chip ${state.selectedThemes.includes(theme) ? "active" : ""}" data-theme="${theme}">${theme}</button>`).join("")}
          </div>
        </div>
        <div class="form-group"><label>详细需求</label><textarea class="textarea">我最近工作压力大，经常失眠，希望通过冥想、书写和简单绘画改善睡眠质量。</textarea></div>
        <button class="primary-wide" data-generate-plan="true">${state.generatedPlan ? "重新生成专属计划" : "生成专属计划"}</button>
      </section>
      <section class="generated-plan ${state.generatedPlan ? "visible" : ""}">
        <div class="plan-card" data-route="detail">
          <span class="plan-icon">🌙</span>
          <span><strong>睡前安心计划</strong><span class="mini-label">7天 · 每天15分钟 · 绘画+书写+呼吸</span></span>
          <span>›</span>
        </div>
        <section class="analysis-card visible">
          <span class="section-title">AI 生成的前 3 天</span>
          <p>第1天：画出今天最重的一块云，再给它起一个名字。</p>
          <p>第2天：睡前 4-7-8 呼吸，写一句身体最想听的话。</p>
          <p>第3天：用一种安全色给自己画一个边界。</p>
        </section>
      </section>
    </section>
  `;
}

function renderPlanDetail() {
  const progress = state.planChecked ? 57 : 42;
  return `
    <section class="phone-page sub-page">
      ${renderAppHeader("计划详情", "睡前安心计划", { back: "plan" })}
      <section class="plan-hero" style="text-align:center">
        <div class="plan-icon" style="margin:0 auto;background:#f3e5f5">🌙</div>
        <h2>睡前安心计划</h2>
        <div class="progress-ring" style="--progress:${progress}">
          <div class="ring-inner"><strong>${state.planChecked ? 4 : 3}</strong><span>/7天</span></div>
        </div>
        <p>🔥 连续打卡 ${state.planChecked ? 4 : 3} 天</p>
      </section>
      <section class="task-card" style="margin-top:12px;padding:14px">
        <span class="tagline">今日任务 · 第${state.planChecked ? 5 : 4}天</span>
        <span class="section-title" style="margin-top:8px">画一个安心边界</span>
        <p>拿起一种让你觉得安全的颜色，在纸面上画一个可以容纳自己的边界。完成后写下：我现在允许自己休息。</p>
        <button class="primary-wide" data-checkin="true">${state.planChecked ? "✓ 今日已打卡" : "完成打卡"}</button>
      </section>
      <section class="resource-section" style="margin-top:12px">
        <div class="section-row"><span class="section-title">完整计划</span><span class="mini-label">共7天</span></div>
        ${[
          ["✓", "学习基础呼吸法", "10分钟"],
          ["✓", "睡前情绪书写", "15分钟"],
          ["✓", "安全色涂鸦", "15分钟"],
          [state.planChecked ? "✓" : "●", "画一个安心边界", "15分钟"],
          ["", "身体扫描", "12分钟"]
        ].map(([mark, title, duration]) => `<div class="task-line"><span>${mark} ${title}</span><span class="mini-pill">${duration}</span></div>`).join("")}
      </section>
      <section class="resource-section" style="margin-top:12px">
        <span class="section-title">本月打卡</span>
        <div class="calendar">
          ${Array.from({ length: 28 }, (_, i) => `<span class="day ${[2, 3, 4, 8, 12, 16, 17].includes(i) || (state.planChecked && i === 18) ? "checked" : ""} ${i === 18 ? "today" : ""}">${i + 1}</span>`).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderProfile() {
  const path = state.profilePeriod === "week"
    ? "M18 96 C 60 64, 84 82, 124 54 S 195 58, 232 38 S 280 62, 322 28"
    : "M18 102 C 52 84, 82 88, 112 68 S 174 74, 210 48 S 270 58, 322 34";
  return `
    <section class="phone-page">
      <section class="profile-hero">
        <img class="avatar-lg" src="${ASSET_IP}" alt="头像" />
        <div>
          <h2>疗愈用户</h2>
          <p>心情平稳 · 已完成偏好问卷</p>
        </div>
        <span class="coin">🪙 128</span>
      </section>
      <section class="chart-card" style="margin-top:12px">
        <div class="section-row">
          <span class="section-title">心情曲线</span>
          <div class="chip-row">
            <button class="chip ${state.profilePeriod === "week" ? "active" : ""}" data-period="week">本周</button>
            <button class="chip ${state.profilePeriod === "month" ? "active" : ""}" data-period="month">本月</button>
          </div>
        </div>
        <div class="chart">
          <svg viewBox="0 0 340 132" preserveAspectRatio="none">
            <path d="${path}" fill="none" stroke="#e8747d" stroke-width="5" stroke-linecap="round" />
            <path d="${path} L322 132 L18 132 Z" fill="rgba(232,116,125,0.12)" />
          </svg>
        </div>
        <section class="analysis-card visible">
          <span class="section-title">智能心情分析</span>
          <p>心情较为稳定，平均心情 4.1 分。最近 3 次记录中，“平静”和“开心”占比更高，可以继续保持睡前练习。</p>
        </section>
      </section>
      <div class="profile-stats">
        <div class="stat-tile"><strong>12h</strong><span>累计疗愈</span></div>
        <div class="stat-tile"><strong>18</strong><span>疗愈天数</span></div>
      </div>
      <section class="resource-section" style="margin-top:12px">
        <div class="menu-list">
          ${[
            ["📋", "我的订单"],
            ["📆", "预约记录"],
            ["💬", "我的咨询"],
            ["🎉", "我的活动"],
            ["📝", "完善个人偏好"],
            ["⚙️", "账户设置"]
          ].map(([icon, label]) => `<button class="menu-item" data-route="${label.includes("偏好") ? "survey" : "profile"}"><span>${icon} ${label}</span><span>›</span></button>`).join("")}
        </div>
      </section>
      ${renderTabbar("profile")}
    </section>
  `;
}

function renderSurvey() {
  const stepContent = {
    1: {
      title: "你对哪些艺术形式感兴趣？",
      options: [
        ["painting", "🎨", "绘画创作", "涂鸦、水彩、曼陀罗等"],
        ["music", "🎵", "音乐疗愈", "聆听、演奏、唱歌"],
        ["writing", "📖", "文字表达", "写作、诗歌、日记"],
        ["dance", "💃", "舞蹈律动", "自由舞动、身体表达"]
      ]
    },
    2: {
      title: "你希望获得什么帮助？",
      options: [
        ["relaxation", "😌", "纯粹放松", "想要放松身心"],
        ["anxiety", "😰", "缓解焦虑", "减轻紧张、不安情绪"],
        ["sleep", "🌙", "改善睡眠", "提升睡眠质量"],
        ["expression", "💭", "情绪表达", "识别和表达情绪"]
      ]
    },
    3: {
      title: "你更喜欢哪种参与方式？",
      options: [
        ["home", "🏠", "独自在家体验", "按指引自己完成"],
        ["online", "📱", "线上课程/视频", "观看教学并练习"],
        ["offline", "👥", "线下沙龙/工作坊", "专业指导和陪伴"],
        ["oneOnOne", "💬", "一对一指导", "个性化专业支持"]
      ]
    }
  };
  const current = stepContent[state.surveyStep];
  return `
    <section class="phone-page sub-page">
      ${renderAppHeader("个人偏好", "帮助艺哟更懂你的疗愈方式", { back: "profile" })}
      <div class="survey-stepper">
        ${[1, 2, 3].map((step) => `<button class="step-pill ${state.surveyStep === step ? "active" : ""}" data-survey-step="${step}">${step} ${["艺术偏好", "期望帮助", "活动形式"][step - 1]}</button>`).join("")}
      </div>
      <section class="custom-hero" style="margin-bottom:12px">
        <h2>${current.title}</h2>
        <p>可以选择多个，后续用于资源推荐、计划生成和首页推荐。</p>
      </section>
      <div class="option-grid">
        ${current.options.map(([id, icon, title, desc]) => `
          <button class="survey-option ${state.selectedSurvey.includes(id) ? "active" : ""}" data-survey-option="${id}">
            <span style="font-size:24px">${icon}</span>
            <strong>${title}</strong>
            <span>${desc}</span>
          </button>
        `).join("")}
      </div>
      <div class="bottom-cta" style="grid-template-columns:1fr 1fr;bottom:12px">
        <button data-survey-step="${Math.max(1, state.surveyStep - 1)}">上一步</button>
        <button class="main" data-survey-step="${Math.min(3, state.surveyStep + 1)}">${state.surveyStep === 3 ? "完成" : "下一步"}</button>
      </div>
    </section>
  `;
}

function setupCanvas() {
  const canvas = document.getElementById("healingCanvas");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, rect.width, rect.height);
  drawSeedSketch(ctx, rect.width, rect.height);

  let drawing = false;
  let last = null;

  const point = (event) => {
    const box = canvas.getBoundingClientRect();
    const pointer = event.touches ? event.touches[0] : event;
    return { x: pointer.clientX - box.left, y: pointer.clientY - box.top };
  };

  const start = (event) => {
    event.preventDefault();
    drawing = true;
    last = point(event);
  };

  const move = (event) => {
    if (!drawing || !last) return;
    event.preventDefault();
    const next = point(event);
    ctx.strokeStyle = state.brushColor;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    last = next;
  };

  const stop = () => {
    drawing = false;
    last = null;
  };

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerleave", stop);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function drawSeedSketch(ctx, width, height) {
  const strokes = [
    ["#F28C8C", [[34, 168], [70, 128], [112, 150], [152, 104], [194, 125], [246, 82]]],
    ["#4A90E2", [[62, 82], [96, 64], [130, 76], [168, 58], [220, 72], [270, 52]]],
    ["#7BC6A4", [[90, 192], [132, 170], [178, 188], [226, 160], [292, 174]]],
    ["#F2C94C", [[260, 142], [280, 132], [298, 142], [288, 160], [266, 158], [260, 142]]]
  ];
  strokes.forEach(([color, points]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      const px = x / 330 * width;
      const py = y / 238 * height;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  });
}

function sendChat(text) {
  if (!text.trim()) return;
  state.chatMessages.push({ type: "user", text });
  const reply = text.includes("三分钟")
    ? "好的。先把笔放在纸面上，慢慢吸气 4 秒，呼气时画一条柔软的线。接下来三分钟，我们只关注线条，不评价它。"
    : "我听到了。我们可以先不急着解决问题，用一种颜色把它画出来，再给这份感受一个安全的边界。";
  state.chatMessages.push({ type: "bot", text: reply });
  render();
}

function runDemoFlow() {
  const flow = ["home", "chat", "create", "hall", "advisor", "resource", "plan", "custom", "detail", "profile"];
  let index = 0;
  setRoute(flow[index]);
  const timer = setInterval(() => {
    index += 1;
    if (index >= flow.length) {
      clearInterval(timer);
      return;
    }
    setRoute(flow[index]);
  }, 900);
}

document.addEventListener("click", (event) => {
  const flow = event.target.closest("[data-flow]");
  if (flow) {
    runDemoFlow();
    return;
  }

  const route = event.target.closest("[data-route]");
  if (route) {
    setRoute(route.dataset.route);
    return;
  }

  const resource = event.target.closest("[data-resource-id]");
  if (resource) {
    state.selectedResource = resource.dataset.resourceId;
    setRoute("resource");
    return;
  }

  const mood = event.target.closest("[data-mood]");
  if (mood) {
    state.mood = Number(mood.dataset.mood);
    render();
    return;
  }

  const mode = event.target.closest("[data-mode]");
  if (mode) {
    state.chatMode = mode.dataset.mode;
    render();
    return;
  }

  const action = event.target.closest("[data-action]");
  if (action) {
    if (action.dataset.action === "record") {
      state.isRecording = !state.isRecording;
      if (!state.isRecording) {
        sendChat("我刚录了一段心情语音，想先被听见，也想做一个简单的艺术疗愈练习。");
      } else {
        render();
      }
    }
    if (action.dataset.action === "reset-canvas") {
      state.analysisVisible = false;
      render();
    }
    if (action.dataset.action === "clear-advisor") {
      state.advisorAsked = false;
      render();
    }
    return;
  }

  const question = event.target.closest("[data-question]");
  if (question) {
    sendChat(question.dataset.question);
    return;
  }

  const brush = event.target.closest("[data-brush]");
  if (brush) {
    state.brushColor = brush.dataset.brush;
    render();
    return;
  }

  const analyze = event.target.closest("[data-analyze]");
  if (analyze) {
    state.analysisVisible = true;
    render();
    return;
  }

  const category = event.target.closest("[data-category]");
  if (category) {
    state.hallCategory = category.dataset.category;
    render();
    return;
  }

  const hallType = event.target.closest("[data-hall-type]");
  if (hallType) {
    state.hallType = hallType.dataset.hallType;
    render();
    return;
  }

  const advisorQuestion = event.target.closest("[data-advisor-question]");
  if (advisorQuestion) {
    state.advisorAsked = true;
    render();
    return;
  }

  const send = event.target.closest("[data-send]");
  if (send) {
    if (send.dataset.send === "chat") {
      const input = document.getElementById("chatInput");
      sendChat(input ? input.value : "");
    }
    if (send.dataset.send === "advisor") {
      state.advisorAsked = true;
      render();
    }
    return;
  }

  const theme = event.target.closest("[data-theme]");
  if (theme) {
    const value = theme.dataset.theme;
    if (state.selectedThemes.includes(value)) {
      state.selectedThemes = state.selectedThemes.filter((item) => item !== value);
    } else {
      state.selectedThemes.push(value);
    }
    render();
    return;
  }

  const generated = event.target.closest("[data-generate-plan]");
  if (generated) {
    state.generatedPlan = true;
    render();
    return;
  }

  const checkin = event.target.closest("[data-checkin]");
  if (checkin) {
    state.planChecked = true;
    render();
    return;
  }

  const period = event.target.closest("[data-period]");
  if (period) {
    state.profilePeriod = period.dataset.period;
    render();
    return;
  }

  const surveyStep = event.target.closest("[data-survey-step]");
  if (surveyStep) {
    state.surveyStep = Number(surveyStep.dataset.surveyStep);
    render();
    return;
  }

  const surveyOption = event.target.closest("[data-survey-option]");
  if (surveyOption) {
    const value = surveyOption.dataset.surveyOption;
    if (state.selectedSurvey.includes(value)) {
      state.selectedSurvey = state.selectedSurvey.filter((item) => item !== value);
    } else {
      state.selectedSurvey.push(value);
    }
    render();
  }
});

document.getElementById("routeCount").textContent = `${routes.length} 页`;
document.getElementById("pageCount").textContent = `${pageMap.length}`;
render();
