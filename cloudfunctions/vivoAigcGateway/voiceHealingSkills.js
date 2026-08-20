// 语音疗愈技能定义。
// 这些技能是低风险的自我觉察与情绪支持练习，不构成心理诊断或医疗治疗。

module.exports = {
  start_soundscape: {
    id: 'start_soundscape',
    name: '声音陪伴',
    description: '准备低音量、可循环的环境音景，让注意力有一个稳定的听觉锚点。',
    icon: '♫',
    goals: ['放松', '降低环境干扰', '睡前安顿', '稳定注意力'],
    evidenceLevel: 'evidence-informed',
    sources: [
      {
        title: 'Effects of music interventions on stress-related outcomes',
        year: 2019,
        url: 'https://doi.org/10.1080/17437199.2019.1627897'
      }
    ],
    safety: '音景用于陪伴和注意力调节，不宣称某种频率具有治疗作用；音量保持低，任何不适都可以停止。'
  },

  start_breathing: {
    id: 'start_breathing',
    name: '呼吸引导',
    description: '用较长呼气的节律提示帮助用户把注意力带回身体。',
    icon: '◒',
    goals: ['焦虑时降速', '身体觉察', '短暂安顿'],
    evidenceLevel: 'evidence-informed',
    sources: [
      {
        title: 'How Breath-Control Can Change Your Life: A Systematic Review on Psycho-Physiological Correlates of Slow Breathing',
        year: 2018,
        url: 'https://doi.org/10.3389/fnhum.2018.00353'
      },
      {
        title: 'From Therapeutic Factors to Mechanisms of Change in the Creative Arts Therapies',
        year: 2021,
        url: 'https://doi.org/10.3389/fpsyg.2021.678397'
      }
    ],
    safety: '不使用屏息或强迫深呼吸；如果头晕、胸闷或不舒服，立即回到自然呼吸并停止练习。'
  },

  start_grounding: {
    id: 'start_grounding',
    name: '感官接地',
    description: '通过脚底、座面、声音和颜色等当下线索，把注意力带回此刻。',
    icon: '◌',
    goals: ['焦虑', '思绪飘散', '紧张', '情绪过载'],
    evidenceLevel: 'evidence-informed',
    sources: [
      {
        title: 'From Therapeutic Factors to Mechanisms of Change in the Creative Arts Therapies',
        year: 2021,
        url: 'https://doi.org/10.3389/fpsyg.2021.678397'
      }
    ],
    safety: '只邀请观察，不要求用户压制或改变感受；用户可以跳过任何让自己不舒服的感官线索。'
  },

  start_art_exercise: {
    id: 'start_art_exercise',
    name: '艺术表达练习',
    description: '提供一个低门槛、短时长的线条、色块或身体地图练习。',
    icon: '✎',
    goals: ['表达难以言说的感受', '情绪觉察', '恢复掌控感', '自我关怀'],
    evidenceLevel: 'evidence-informed',
    sources: [
      {
        title: 'The effectiveness of art therapy for anxiety in adults',
        year: 2018,
        url: 'https://doi.org/10.1371/journal.pone.0208716'
      },
      {
        title: 'From Therapeutic Factors to Mechanisms of Change in the Creative Arts Therapies',
        year: 2021,
        url: 'https://doi.org/10.3389/fpsyg.2021.678397'
      }
    ],
    safety: '不评价画得像不像，也不根据颜色或形状诊断心理状态；重点是创作过程和用户自己的解释。'
  },

  analyze_artwork: {
    id: 'analyze_artwork',
    name: '创作分析',
    description: '打开创作分析板块，对用户主动提交的作品进行非诊断式画面观察。',
    icon: '▧',
    goals: ['回看作品', '画面观察', '创作后反思'],
    evidenceLevel: 'practice-informed',
    sources: [
      {
        title: 'Art therapy in mental health: A systematic review of approaches and practices',
        year: 2015,
        url: 'https://doi.org/10.1016/j.aip.2015.09.003'
      }
    ],
    safety: '分析只描述可观察的画面和开放式问题，不做心理诊断，不武断解释象征意义。'
  },

  handoff_support: {
    id: 'handoff_support',
    name: '安全支持',
    description: '在出现危机信号时暂停普通练习，鼓励用户联系现实中的可信任的人和专业支持。',
    icon: '♡',
    goals: ['危机识别', '现实支持', '降低独处风险'],
    evidenceLevel: 'safety-critical',
    sources: [
      {
        title: 'WHO mental health and psychosocial support resources',
        year: 2023,
        url: 'https://www.who.int/teams/mental-health-and-substance-use'
      }
    ],
    safety: 'AI 不处理紧急危机；如果存在现实危险，应优先联系身边的人、当地急救服务或危机援助渠道。'
  }
}
