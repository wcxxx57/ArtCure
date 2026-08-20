// Cloud-function local knowledge base for lightweight RAG.
// Keep each chunk under the vivo rerank text limit after compaction.

module.exports = [
  {
    id: 'color-emotion',
    title: '色彩与情绪表达',
    keywords: ['色彩', '颜色', '焦虑', '低落', '愤怒', '情绪', '涂鸦'],
    content: '色彩可以作为非语言情绪入口，但不存在对所有人都适用的固定颜色含义。引导时应关注“这个颜色让你感觉舒服还是不舒服”“它让你想到什么”，把意义交还给创作者，避免根据色彩诊断情绪或判断作品好坏。',
    evidenceLevel: 'practice-informed',
    sourceUrls: ['https://doi.org/10.3389/fpsyg.2021.678397']
  },
  {
    id: 'mandala-grounding',
    title: '曼陀罗绘画与秩序感',
    keywords: ['曼陀罗', '失眠', '焦虑', '秩序', '重复', '填色', '圆'],
    content: '曼陀罗可以提供一个有边界、可重复的创作结构。它不代表固定的心理状态，适合把注意力放在重复动作、节奏和创作选择上。引导可以从“选一个你愿意靠近的颜色，从中心慢慢向外画”开始，强调过程比结果重要，画完后可问：如果这幅画会说话，它想说什么。',
    evidenceLevel: 'evidence-informed',
    sourceUrls: ['https://doi.org/10.1371/journal.pone.0208716']
  },
  {
    id: 'expressive-art',
    title: '表达性艺术治疗原则',
    keywords: ['表达性艺术', '绘画', '音乐', '舞动', '黏土', '拼贴', '创造力'],
    content: '表达性艺术疗愈把创造过程作为自我表达和觉察的入口，非语言表达有时能帮助人接近难以直接说出的感受。可使用自由涂鸦、情绪画作、身体轮廓画、黏土捏塑、拼贴、音乐敲击或哼唱。引导应鼓励探索和觉察，而不是解释、诊断或评价作品。',
    evidenceLevel: 'evidence-informed',
    sourceUrls: ['https://doi.org/10.3389/fpsyg.2021.678397', 'https://doi.org/10.1016/j.aip.2015.09.003']
  },
  {
    id: 'anxiety-practice',
    title: '焦虑时的艺术疗愈练习',
    keywords: ['焦虑', '紧张', '不安', '担心', '慌', '压力', '接地'],
    content: '焦虑时可先做接地：感受双脚与地面的接触，回到自然呼吸。艺术练习适合选择有节奏、可重复、低难度的动作，例如重复线条、圆点、格子、曼陀罗填色或缓慢描边。目标不是保证消除焦虑，而是把注意力从失控的想法温和地带回手部动作、颜色和呼吸。',
    evidenceLevel: 'evidence-informed',
    sourceUrls: ['https://doi.org/10.1371/journal.pone.0208716', 'https://doi.org/10.3389/fpsyg.2021.678397']
  },
  {
    id: 'low-mood-practice',
    title: '低落时的自我关怀创作',
    keywords: ['低落', '难过', '抑郁', '没劲', '疲惫', '空', '自我关怀'],
    content: '低落时不要强迫自己开心起来。可以先允许休息，再做很小的照顾动作：在纸上画一个容器或安全角落，把今天需要被照顾的部分放进去。也可以做拼贴，选择对你来说代表一点点希望、支持或温度的图片。重点是“我愿意照顾自己一点点”，不预设某种颜色必须代表希望。',
    evidenceLevel: 'practice-informed',
    sourceUrls: ['https://doi.org/10.3389/fpsyg.2021.678397']
  },
  {
    id: 'anger-release',
    title: '愤怒与烦躁的安全表达',
    keywords: ['愤怒', '烦躁', '委屈', '压抑', '生气', '想发火'],
    content: '愤怒代表边界和需要被看见。安全表达可以包括快走、拍打枕头、用红色或黑色大力涂鸦、写下愤怒的话再撕掉。艺术引导要强调安全边界：不伤害自己、不伤害别人、不破坏重要物品。创作后可问：这份愤怒在保护我什么。'
  },
  {
    id: 'body-map',
    title: '身体地图练习',
    keywords: ['身体', '身体地图', '紧绷', '胸口', '胃', '肩膀', '疲惫'],
    content: '身体地图可以帮助用户把模糊感受具体化。可以画一个简单身体轮廓，睁眼或闭眼都可以，观察头部、胸口、胃、肩膀、手脚等部位，再用颜色或符号标注紧绷、麻木、发热、沉重或空空的区域。它用于观察身心连接，但不能据此做医学或心理诊断。',
    evidenceLevel: 'evidence-informed',
    sourceUrls: ['https://doi.org/10.3389/fpsyg.2021.678397']
  },
  {
    id: 'three-minute-guide',
    title: '三分钟艺术疗愈引导结构',
    keywords: ['三分钟', '引导', '语音引导', '沉浸式', '边听边画', '放松'],
    content: '三分钟引导适合分为四段：先用20到30秒建立安全感和自然呼吸；再用40到60秒引导用户选择颜色或线条；中段用90秒进行简单重复动作，如线条、圆点、色块或身体地图；最后30秒邀请用户停下、观察作品，并给画面取一个名字。语言应具体、慢、低压力，避免过度解释。',
    evidenceLevel: 'practice-informed',
    sourceUrls: ['https://doi.org/10.3389/fpsyg.2021.678397']
  },
  {
    id: 'empathy-listening',
    title: '共情倾听话术',
    keywords: ['倾听', '共情', '陪伴', '安慰', '树洞', '理解'],
    content: '共情回应可包含三步：先确认“我听见了”；再用不确定的语言反映感受“这听起来可能让你很累/很不安/很委屈”；最后给出低压力陪伴“我们不急着解决，先把它放在这里看一看”。避免说教、比较、否定或快速给建议。用户沉默时，可以说“不想说也没关系，我们可以用颜色代替文字”。',
    evidenceLevel: 'evidence-informed',
    sourceUrls: ['https://doi.org/10.3389/fpsyg.2021.678397']
  },
  {
    id: 'safety-boundary',
    title: '心理安全边界',
    keywords: ['绝望', '自伤', '伤害', '危机', '诊断', '心理咨询', '专业帮助'],
    content: '艺术疗愈 AI 只能提供自我觉察、情绪支持和低风险创作练习，不能做心理诊断，也不能替代心理咨询或医疗服务。若用户表达自伤、伤害他人、强烈绝望或现实危险，应暂停普通练习，温和提醒其立刻联系身边可信任的人、当地紧急服务或专业心理危机援助，并鼓励不要独自承受。',
    evidenceLevel: 'safety-critical',
    sourceUrls: ['https://www.who.int/teams/mental-health-and-substance-use']
  },
  {
    id: 'self-care-senses',
    title: '感官锚定与自我关怀',
    keywords: ['呼吸', '五感', '自我拥抱', '放松', '睡不着', '安定'],
    content: '感官锚定能把注意力带回当下。可引导用户说出5样看到的、4样听到的、3样摸到的、2样闻到的、1样尝到的；也可做三次舒适、自然的呼吸，吸气约4秒、呼气约6秒，不屏息，不追求吸得很深。艺术创作可与感官结合：每一次呼气画一条线，每一次吸气选择一个颜色。',
    evidenceLevel: 'evidence-informed',
    sourceUrls: ['https://doi.org/10.3389/fnhum.2018.00353']
  },
  {
    id: 'reflection-after-art',
    title: '创作后的反思问题',
    keywords: ['画完', '反思', '作品', '名字', '观察', '感受'],
    content: '创作后的提问应开放且不评判，例如：你最先注意到画面里的哪里；哪个颜色最像现在的你；如果这幅画有一个名字，它会叫什么；画面里有没有一个可以支持你的部分；下一步你想给自己一个什么小动作。不要武断解释画面含义，应让用户自己赋义。'
  }
]
