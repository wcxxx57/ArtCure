const screenMeta = {
  home: {
    title: '疗愈小屋',
    desc: '用 IP 和三种主入口把多模态能力收束成一个温和、可执行的起点。',
    notes: [
      '首屏不做营销页，直接进入“今天想怎么被陪伴”。',
      'IP 作为陪伴者，承担提示、反馈和情绪缓冲。',
      '按钮对应比赛高光能力：语音、影像、位置、计划。'
    ]
  },
  voice: {
    title: '语音疗愈',
    desc: '把“对手机说心情”设计成一条完整链路：ASR 识别、AI 回应、TTS 引导。',
    notes: [
      '大圆形录音控件降低操作成本，适合移动端单手使用。',
      '识别文本可编辑，避免 ASR 错误造成心理表达偏差。',
      'TTS 文案短、慢、可执行，避免泛泛聊天。'
    ]
  },
  artwork: {
    title: '创造分析',
    desc: '用画布和分析卡把“影像能力”转译成艺术疗愈场景。',
    notes: [
      '支持现场画几笔，也可以迁移到上传手账/涂鸦照片。',
      '输出结构为观察、可能有关、下一笔建议，不做心理诊断。',
      '色彩工具和纸感画布强化艺术疗愈，而不是医疗检测。'
    ]
  },
  resources: {
    title: '附近疗愈',
    desc: '从资源列表升级为可线下到达、可预约、可比较的生活服务体验。',
    notes: [
      '搜索字段同时表达城市、预算、疗愈方式，适合口语化查询。',
      '地图预览只是入口，重点是资源卡上的决策信息。',
      '按钮围绕实际行动：路线、预约、复制微信。'
    ]
  },
  plan: {
    title: '个性化计划',
    desc: '把一次语音或绘画体验沉淀为可编辑、可打卡的多天计划。',
    notes: [
      '计划生成参数与现有小程序计划模块一致：名称、主题、天数、时长、需求。',
      '任务以 D1/D2 时间线呈现，适合评审快速理解连续陪伴。',
      '任务可点击完成，演示“计划执行”而非只生成文案。'
    ]
  },
  profile: {
    title: '我的疗愈',
    desc: '个人页强调疗愈轨迹、偏好和合规授权，是产品可信度的一部分。',
    notes: [
      '心情曲线只描述趋势，不输出疾病判断。',
      '偏好标签连接推荐系统：媒介、提醒时间、预算、空间偏好。',
      '语音、绘画、位置都以开关显式授权。'
    ]
  },
  ip: {
    title: 'IP 设定',
    desc: '艺呦不只是装饰图，而是贯穿等待、分析、引导和安全提醒的陪伴者。',
    notes: [
      '保留现有水滴/花瓣耳朵/桃粉蓝眼识别特征。',
      '语气设定为低压、非评判、可执行。',
      '视觉系统避免医院感，用纸感、水彩、工具按钮和 IP 气泡形成品牌记忆。'
    ]
  },
  story: {
    title: '答辩故事线',
    desc: '用一个用户场景串联 vivo AIGC 能力，避免散点式功能罗列。',
    notes: [
      '3 分钟脚本按照语音、绘画、位置、计划四段推进。',
      '每段都有明确 vivo 能力映射和用户价值。',
      '最后落到合规边界与长期疗愈记录。'
    ]
  }
}

const resources = [
  {
    name: '拾光绘画疗愈工作坊',
    type: '绘画疗愈',
    distance: '1.2km',
    price: '¥168/次',
    fit: '新手友好',
    address: '上海市静安区南京西路',
    tags: ['曼陀罗', '情绪表达', '周末可约']
  },
  {
    name: '一隅流体画体验',
    type: '流体画',
    distance: '2.4km',
    price: '¥198/次',
    fit: '压力释放',
    address: '上海市静安区愚园路',
    tags: ['无需基础', '色彩探索', '小班']
  },
  {
    name: '晚风正念与书写空间',
    type: '正念书写',
    distance: '3.1km',
    price: '¥99/次',
    fit: '睡前放松',
    address: '上海市静安区江宁路',
    tags: ['安静', '下班后', '女性友好']
  }
]

const planTemplates = {
  '焦虑缓解': [
    ['画出今天的压力线', '绘画觉察', '用三条线表示压力、边界和出口。'],
    ['选择一个安全色', '色彩练习', '找一种让身体放松的颜色，涂满一小块区域。'],
    ['三分钟语音引导', '呼吸练习', '跟随艺呦语音，把注意力放回呼吸。'],
    ['给画面加边界', '边界练习', '用柔软线条给画面加一个临时保护边界。']
  ],
  '睡眠改善': [
    ['睡前卸下颜色', '色彩放松', '选一种暗一点的颜色，把今天最重的部分画下来。'],
    ['慢速呼吸涂色', '呼吸练习', '吸气停笔，呼气涂一小块颜色。'],
    ['写给身体的话', '书写练习', '写下身体现在最想听到的一句话。'],
    ['睡前留白', '整理练习', '在纸上留出一块空白，提醒自己今天可以结束。']
  ],
  '压力释放': [
    ['压力从哪里来', '线条练习', '画出压力从哪里来、往哪里去。'],
    ['快速涂鸦释放', '涂鸦练习', '不评价画面，只连续画满三分钟。'],
    ['把压力变成容器', '视觉转化', '为压力画一个可以暂时放进去的容器。'],
    ['收尾仪式', '整理练习', '给画面加一个小小结束标记。']
  ],
  '创作表达': [
    ['今日情绪色卡', '色彩练习', '选择三种颜色分别代表当下、需要、期待。'],
    ['自由线条', '绘画表达', '让线条随手移动，不追求好看。'],
    ['给作品命名', '文字练习', '给今天的作品写一个 8 字以内标题。'],
    ['保存一张疗愈卡', '记录沉淀', '把画面、心情和一句总结保存下来。']
  ]
}

let currentScreen = 'home'
let selectedTheme = '焦虑缓解'
let selectedDays = 7
let selectedDuration = 15
let recording = false
let canvasColor = '#2E83AD'
let drawing = false
let lastPoint = null

document.addEventListener('DOMContentLoaded', () => {
  bindNavigation()
  bindHomeMood()
  bindVoice()
  bindCanvas()
  bindArtwork()
  bindResources()
  bindPlan()
  bindProfileChart()
  renderResources(resources)
  renderPlan()
  renderMoodChart('week')
  switchScreen('home')
})

function bindNavigation() {
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-screen]')
    if (!target) return
    const screen = target.dataset.screen
    if (screen && screenMeta[screen]) {
      switchScreen(screen)
    }
  })
}

function switchScreen(screen) {
  currentScreen = screen
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.toggle('active', el.id === `screen-${screen}`)
  })
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.screen === screen)
  })
  document.querySelectorAll('.bottom-tabs button').forEach(el => {
    el.classList.toggle('active', el.dataset.screen === screen)
  })

  const meta = screenMeta[screen]
  document.getElementById('inspectorTitle').textContent = meta.title
  document.getElementById('inspectorDesc').textContent = meta.desc
  document.getElementById('designNotes').innerHTML = meta.notes.map(note => `<li>${note}</li>`).join('')
}

function bindHomeMood() {
  const grid = document.getElementById('moodGrid')
  grid.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button) return
    grid.querySelectorAll('button').forEach(item => item.classList.remove('selected'))
    button.classList.add('selected')
    document.getElementById('moodHint').textContent = `当前选择：${button.dataset.mood}，${button.dataset.hint}`
    showToast(`已记录：${button.dataset.mood}`)
  })
}

function bindVoice() {
  const recordControl = document.getElementById('recordControl')
  const recordTitle = document.getElementById('recordTitle')
  const recordStatus = document.getElementById('recordStatus')
  const voiceText = document.getElementById('voiceText')
  const transcript = document.querySelector('#transcriptBubble p')
  const reply = document.getElementById('voiceReply')
  const guideTitle = document.getElementById('guideTitle')
  const guideText = document.getElementById('guideText')

  recordControl.addEventListener('click', () => {
    recording = !recording
    recordControl.classList.toggle('recording', recording)

    if (recording) {
      recordTitle.textContent = '正在听你说'
      recordStatus.textContent = '再次点击结束录音并生成引导'
      transcript.textContent = '录音中...'
      return
    }

    const text = voiceText.value.trim() || '我想做一次简单的艺术疗愈练习。'
    recordTitle.textContent = '识别完成'
    recordStatus.textContent = '已生成文字回复和 TTS 引导文案'
    transcript.textContent = text
    reply.textContent = `我听见你说：“${text}” 先不用急着解决它，我们把它看成一团颜色。现在画三条线：压力、边界和一个小出口。`
    guideTitle.textContent = text.includes('睡') ? '睡前留白练习' : '颜色呼吸'
    guideText.textContent = text.includes('睡')
      ? '把今天还没放下的事情画在纸的一角，剩下的空白留给身体休息。'
      : '吸气时想象纸上留下一点颜色，呼气时把暂时不处理的事放到画面之外。'
    showToast('语音识别与引导已生成')
  })

  document.querySelectorAll('[data-voice]').forEach(button => {
    button.addEventListener('click', () => {
      voiceText.value = button.dataset.voice
    })
  })

  document.getElementById('playGuide').addEventListener('click', () => {
    showToast('模拟播放 3 分钟 TTS 引导')
  })
}

function bindCanvas() {
  const canvas = document.getElementById('artCanvas')
  const ctx = canvas.getContext('2d')

  resetCanvas(ctx, canvas)

  canvas.addEventListener('pointerdown', event => {
    drawing = true
    lastPoint = getCanvasPoint(canvas, event)
    canvas.setPointerCapture(event.pointerId)
  })

  canvas.addEventListener('pointermove', event => {
    if (!drawing || !lastPoint) return
    const point = getCanvasPoint(canvas, event)
    ctx.strokeStyle = canvasColor
    ctx.lineWidth = 12
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPoint.x, lastPoint.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPoint = point
  })

  window.addEventListener('pointerup', () => {
    drawing = false
    lastPoint = null
  })

  document.getElementById('clearCanvas').addEventListener('click', () => {
    resetCanvas(ctx, canvas)
    showToast('画布已清空')
  })

  document.getElementById('colorPicker').addEventListener('click', event => {
    const button = event.target.closest('button[data-color]')
    if (!button) return
    canvasColor = button.dataset.color
    document.querySelectorAll('#colorPicker button').forEach(item => item.classList.remove('active'))
    button.classList.add('active')
  })
}

function resetCanvas(ctx, canvas) {
  ctx.fillStyle = '#fffdf8'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  drawDefaultStrokes(ctx)
}

function drawDefaultStrokes(ctx) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 16
  ctx.strokeStyle = '#2E83AD'
  ctx.globalAlpha = 0.7
  ctx.beginPath()
  ctx.moveTo(130, 130)
  ctx.bezierCurveTo(220, 70, 280, 210, 380, 130)
  ctx.stroke()

  ctx.strokeStyle = '#F36E88'
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  ctx.moveTo(150, 230)
  ctx.bezierCurveTo(250, 170, 340, 310, 470, 220)
  ctx.stroke()

  ctx.fillStyle = 'rgba(112, 211, 202, 0.25)'
  ctx.globalAlpha = 1
  roundRect(ctx, 410, 260, 110, 92, 24)
  ctx.fill()
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  }
}

function bindArtwork() {
  const button = document.getElementById('analyzeArtwork')
  const note = document.getElementById('artNote')
  const result = document.getElementById('analysisResult')

  button.addEventListener('click', () => {
    button.classList.add('loading')
    button.textContent = 'AI 正在观察...'
    setTimeout(() => {
      const userNote = note.value.trim()
      result.innerHTML = `
        <div class="result-block">
          <span>画面观察</span>
          <p>${userNote ? `结合你补充的“${escapeHtml(userNote)}”，` : ''}画面里有重复线条、弧形和一块柔和色块，可以先理解为“有内容想表达”和“想给自己留出安全空间”。</p>
        </div>
        <div class="result-block">
          <span>下一笔建议</span>
          <ul>
            <li>给最紧张的位置加一个让你安心的颜色</li>
            <li>在空白处写一句“我现在需要……”开头的话</li>
            <li>用圆形或柔软线条给画面加一个临时保护边界</li>
          </ul>
        </div>
        <em>仅作自我觉察，不构成诊断</em>
      `
      button.classList.remove('loading')
      button.textContent = '生成创造分析'
      showToast('创造分析已更新')
    }, 520)
  })
}

function bindResources() {
  const filters = document.getElementById('resourceFilters')
  const input = document.getElementById('resourceInput')

  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-filter]')
    if (!button) return
    filters.querySelectorAll('button').forEach(item => item.classList.remove('active'))
    button.classList.add('active')
    input.value = button.dataset.filter
    updateResourceSummary(button.dataset.filter)
  })

  document.getElementById('resourceSearch').addEventListener('click', () => {
    updateResourceSummary(input.value)
  })
}

function updateResourceSummary(query) {
  const summary = document.getElementById('resourceSummary')
  summary.textContent = `已按“${query || '艺术疗愈'}”重新排序，优先展示距离近、预算合适、适合新手的资源。`
  const sorted = [...resources]
  if ((query || '').includes('流体')) {
    sorted.sort((a, b) => (b.type.includes('流体') ? 1 : 0) - (a.type.includes('流体') ? 1 : 0))
  } else if ((query || '').includes('下班')) {
    sorted.sort((a, b) => (b.tags.includes('下班后') ? 1 : 0) - (a.tags.includes('下班后') ? 1 : 0))
  }
  renderResources(sorted)
  showToast('资源推荐已更新')
}

function renderResources(list) {
  const root = document.getElementById('resourceList')
  root.innerHTML = list.map((item, index) => `
    <article class="resource-card ${index === 0 ? 'active' : ''}">
      <div class="resource-card-head">
        <div>
          <h3>${item.name}</h3>
          <p>${item.type} · ${item.distance} · ${item.price}</p>
        </div>
        <span class="fit">${item.fit}</span>
      </div>
      <p>${item.address}</p>
      <p>${item.tags.map(tag => `#${tag}`).join(' ')}</p>
      <div class="resource-actions">
        <button data-action="route">路线</button>
        <button data-action="book">预约</button>
        <button data-action="copy" data-copy="ArtCure-${item.name}">复制微信</button>
      </div>
    </article>
  `).join('')

  root.querySelectorAll('article').forEach(card => {
    card.addEventListener('click', () => {
      root.querySelectorAll('article').forEach(item => item.classList.remove('active'))
      card.classList.add('active')
    })
  })

  root.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation()
      const action = button.dataset.action
      if (action === 'copy') {
        copyText(button.dataset.copy)
        return
      }
      showToast(action === 'route' ? '模拟打开路线' : '模拟进入预约')
    })
  })
}

function bindPlan() {
  document.getElementById('planThemes').addEventListener('click', event => {
    const button = event.target.closest('button[data-theme]')
    if (!button) return
    selectedTheme = button.dataset.theme
    setActive(button)
    renderPlan()
  })

  document.querySelectorAll('.segmented').forEach(group => {
    group.addEventListener('click', event => {
      const button = event.target.closest('button')
      if (!button) return
      if (button.dataset.days) selectedDays = Number(button.dataset.days)
      if (button.dataset.duration) selectedDuration = Number(button.dataset.duration)
      setActive(button)
      renderPlan()
    })
  })

  document.getElementById('generatePlan').addEventListener('click', () => {
    const button = document.getElementById('generatePlan')
    button.classList.add('loading')
    button.textContent = '生成中...'
    setTimeout(() => {
      renderPlan(true)
      button.classList.remove('loading')
      button.textContent = '生成专属计划'
      showToast('专属计划已生成')
    }, 560)
  })
}

function setActive(button) {
  button.parentElement.querySelectorAll('button').forEach(item => item.classList.remove('active'))
  button.classList.add('active')
}

function renderPlan(generated = false) {
  const name = document.getElementById('planName')?.value || '颜色呼吸计划'
  const need = document.getElementById('planNeed')?.value || ''
  const tasks = planTemplates[selectedTheme] || planTemplates['焦虑缓解']
  const root = document.getElementById('planPreview')
  if (!root) return

  root.innerHTML = `
    <h3>${escapeHtml(name)}</h3>
    <p>${generated ? 'AI 已根据你的描述生成计划草案：' : ''}${selectedTheme}优先，${selectedDays} 天周期，每天 ${selectedDuration} 分钟。${need ? `需求摘要：${escapeHtml(need).slice(0, 38)}...` : ''}</p>
    <div class="task-timeline">
      ${tasks.map((task, index) => `
        <div class="task-row" role="button" tabindex="0">
          <span class="task-day">D${index + 1}</span>
          <div>
            <strong>${task[0]}</strong>
            <span>${task[1]} · ${selectedDuration}分钟 · ${task[2]}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `

  root.querySelectorAll('.task-row').forEach(row => {
    row.addEventListener('click', () => {
      row.classList.toggle('done')
      showToast(row.classList.contains('done') ? '任务已标记完成' : '任务已恢复待完成')
    })
  })
}

function bindProfileChart() {
  document.querySelectorAll('.chart-switch button').forEach(button => {
    button.addEventListener('click', () => {
      setActive(button)
      renderMoodChart(button.dataset.chart)
    })
  })
}

function renderMoodChart(type) {
  const root = document.getElementById('moodChart')
  if (!root) return
  const points = type === 'month'
    ? [
      [8, 42, '😐'], [24, 35, '😔'], [40, 45, '😐'], [56, 54, '😊'], [72, 62, '😊'], [88, 72, '😄']
    ]
    : [
      [8, 32, '😰'], [24, 42, '😐'], [40, 50, '😊'], [56, 38, '😔'], [72, 58, '😊'], [88, 72, '😄']
    ]
  root.innerHTML = points.map(point => `<span class="chart-point" style="left:${point[0]}%;bottom:${point[1]}%">${point[2]}</span>`).join('')
  document.getElementById('trendText').textContent = type === 'month'
    ? '本月整体波动变小，低落记录减少，适合逐步加入线下资源体验。'
    : '近几天从低落逐渐回到平静，建议继续短时绘画和睡前语音引导。'
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).finally(() => showToast('微信号已复制'))
    return
  }
  showToast('微信号已复制')
}

function showToast(message) {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.classList.add('show')
  clearTimeout(showToast.timer)
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
