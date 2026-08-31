/* ============================================================
 * 《AI 原生人才争夺战》 内容数据（卡牌/敌人/遗物/药水/事件/剧情）
 * ============================================================ */
const DATA = {

  /* ---------------- 角色 ---------------- */
  chars: {
    suchen: {
      id: 'suchen', name: '苏澄', title: '首席判断官', code: 'CEO 办公室', color: 'judgment',
      portrait: 'assets/char_suchen.png', hp: 80, energy: 3,
      relic: 'relic_liangzhou',
      deck: [{ card: 'card_exec', n: 5 }, { card: 'card_fw', n: 4 }, { card: 'card_zhaopan', n: 1 }],
      mechanic: { name: '判断点（上限3）', desc: '【判断】牌获得判断点；回合结束未打出【判断】牌则+1。判断点用于终结技。' },
      passive: { name: '单点决策', desc: '每场战斗首次抽牌前获得 1 判断点；回合结束未打【判断】牌获得 1 判断点。' },
      bio: '前硅谷大厂战略 VP，因"只做判断、不管执行"的管理风格闻名。办公桌上永远只有一支笔和一张纸。她相信：组织里最稀缺的资源不是人才，是敢于拍板的人才。口头禅："给我三个选项，我来选一个。"',
      quote: '方向错了，执行力越强死得越快。我来拍板。'
    },
    linwen: {
      id: 'linwen', name: '林问', title: '提问教练', code: '用户研究总监', color: 'question',
      portrait: 'assets/char_linwen.png', hp: 70, energy: 3,
      relic: 'relic_wuwenfa',
      deck: [{ card: 'card_exec', n: 4 }, { card: 'card_fw', n: 4 }, { card: 'card_haowenti', n: 2 }],
      mechanic: { name: '问题数', desc: '【提问】牌积累问题数，部分卡牌按问题数增强——问得越多，答案越准。' },
      passive: { name: '苏格拉底', desc: '每打出 1 张【提问】牌，抽 1 张牌。' },
      bio: '做过三年幼儿园老师，转行用户研究后把"追问"变成了武器。他能连续问五个为什么直到对方说出真话。工位上贴着一行字："你以为的问题，通常不是问题。"',
      quote: '先别急着给答案——我们真的问对问题了吗？'
    },
    wengu: {
      id: 'wengu', name: '温故', title: '品味鉴赏家', code: '首席产品官', color: 'taste',
      portrait: 'assets/char_wengu.png', hp: 65, energy: 3,
      relic: 'relic_jiangxin',
      deck: [{ card: 'card_exec', n: 4 }, { card: 'card_fw', n: 4 }, { card: 'card_damo', n: 2 }],
      mechanic: { name: '打磨', desc: '强化卡牌（临时或永久），把平凡的牌养成艺术品。' },
      passive: { name: '火眼金睛', desc: '战斗开始时揭示所有敌人意图；对【AI 产物】敌人伤害 +25%。' },
      bio: '前美术馆策展人，半路出家做产品。拒绝过 217 个"功能都对但就是不对"的方案。他的评审标准只有一条："用户看到它的第一秒，眼睛会不会亮一下。"随身带一块绒布，用来擦眼镜，也用来擦样品。',
      quote: 'AI 能生成一万张图，但只有一张值得存在。哪一张？我说了算。'
    },
    luozhixing: {
      id: 'luozhixing', name: '骆执行', title: 'Agent 指挥官', code: '数字劳动力总监', color: 'agent',
      portrait: 'assets/char_luozhixing.png', hp: 75, energy: 3,
      relic: 'relic_codebanana',
      deck: [{ card: 'card_exec', n: 4 }, { card: 'card_fw', n: 4 }, { card: 'card_rwjf', n: 1 }, { card: 'card_jgys', n: 1 }],
      mechanic: { name: 'Agent 编队', desc: '每回合开始获得 1 个「执行Agent」（0费衍生物）。部分卡牌按 Agent 数结算。' },
      passive: { name: '流水线', desc: '每回合第 3 张及以后打出的牌费用 -1（最低 0）。' },
      bio: '写过八年代码的全栈工程师，管理风格是"能自动化的绝不人工"。他的团队里一半是 Agent，周会只要 15 分钟。名言："我不怕 AI 抢我工作，我怕的是我还没学会指挥它。"',
      quote: '把任务拆到足够小，剩下的交给 Agent。'
    }
  },

  /* ---------------- 卡牌 ---------------- */
  cards: {
    /* 基础牌 */
    token_agent: { id: 'token_agent', name: '执行Agent', type: 'attack', color: 'agent', cost: 0, rarity: 'special', target: 'enemy', keywords: [], effects: [{ op: 'damage', v: 3 }, { op: 'exhaust' }], flavor: '收到，正在执行。', concept: '智能体执行单元' },
    card_exec: { id: 'card_exec', name: '基础执行', type: 'attack', color: 'neutral', cost: 1, rarity: 'starter', target: 'enemy', keywords: [], effects: [{ op: 'damage', v: 6 }], flavor: '先干起来再说。', concept: '基础执行力', upgrade: { name: '强化执行', effects: [{ op: 'damage', v: 9 }] } },
    card_fw: { id: 'card_fw', name: '防火墙', type: 'skill', color: 'neutral', cost: 1, rarity: 'starter', target: 'self', keywords: [], effects: [{ op: 'block', v: 5 }], flavor: '先保住服务器，再谈理想。', concept: '风险控制', upgrade: { name: '防火墙+', effects: [{ op: 'block', v: 8 }] } },

    /* ---- 苏澄（判断力）---- */
    card_zhaopan: { id: 'card_zhaopan', name: '拍板', type: 'skill', color: 'judgment', cost: 1, rarity: 'starter', target: 'self', keywords: ['judgment'], effects: [{ op: 'gain', res: 'insight', v: 1 }, { op: 'draw', v: 1 }], flavor: '会议室安静了十秒，然后他拍板了。', concept: '判断力：在信息充分时果断决策', upgrade: { cost: 0 } },
    card_shuju: { id: 'card_shuju', name: '数据调用', type: 'attack', color: 'judgment', cost: 1, rarity: 'common', target: 'enemy', keywords: ['judgment'], effects: [{ op: 'damage', v: 4 }], insightBonus: [{ op: 'damage', v: 5 }], flavor: '"拍脑袋"的反义词。', concept: '基于数据的决策', upgrade: { effects: [{ op: 'damage', v: 6 }], insightBonus: [{ op: 'damage', v: 7 }] } },
    card_dahui: { id: 'card_dahui', name: '大会战', type: 'attack', color: 'judgment', cost: 3, rarity: 'rare', target: 'enemy', keywords: ['judgment'], effects: [{ op: 'damage', v: 16 }, { op: 'insight_burst', threshold: 2, extra: 8 }], flavor: '全员停下手头的事，只攻这一个山头。', concept: '组织级资源聚焦', upgrade: { effects: [{ op: 'damage', v: 22 }, { op: 'insight_burst', threshold: 2, extra: 10 }] } },
    card_okr: { id: 'card_okr', name: 'OKR 对齐', type: 'power', color: 'judgment', cost: 1, rarity: 'common', target: 'self', keywords: [], effects: [{ op: 'self_status', s: 'okr', v: 1 }], flavor: '本季度只有一个 O，别跟我提别的。', concept: '目标与关键结果管理', upgrade: { cost: 0 } },
    card_tmwh: { id: 'card_tmwh', name: '透明文化', type: 'power', color: 'judgment', cost: 1, rarity: 'common', target: 'self', keywords: [], effects: [{ op: 'self_status', s: 'transparent_culture', v: 1 }], flavor: '所有决策记录在案，任何人可查。', concept: '组织信息透明', upgrade: { effects: [{ op: 'self_status', s: 'transparent_culture', v: 1 }, { op: 'draw', v: 1 }] } },
    card_lyzj: { id: 'card_lyzj', name: '两周一讲', type: 'skill', color: 'judgment', cost: 1, rarity: 'uncommon', target: 'self', keywords: ['transparency'], effects: [{ op: 'cleanse_self', v: 1 }, { op: 'block', v: 3 }], flavor: 'CEO 站上讲台，把真实想法摊开——信息差当场蒸发。', concept: '坦诚沟通（Anthropic）', upgrade: { effects: [{ op: 'cleanse_self', v: 1 }, { op: 'block', v: 6 }] } },
    card_bingou: { id: 'card_bingou', name: '并购重组', type: 'strategy', color: 'judgment', cost: 2, rarity: 'rare', target: 'self', keywords: [], effects: [{ op: 'gain', res: 'insight', v: 2 }, { op: 'shuffle_discard' }, { op: 'exhaust' }], flavor: '组织打散重排，人才各就各位。', concept: '资本运作、组织重组', upgrade: { cost: 1 } },
    card_kcbg: { id: 'card_kcbg', name: '开诚布公大会', type: 'strategy', color: 'judgment', cost: 2, rarity: 'rare', target: 'self', keywords: ['transparency'], effects: [{ op: 'cleanse_all' }, { op: 'self_status', s: 'morale', v: 2 }, { op: 'exhaust' }], flavor: '话摊开说，人心就顺了。', concept: '坦诚沟通、信任建设', upgrade: { effects: [{ op: 'cleanse_all' }, { op: 'self_status', s: 'morale', v: 3 }, { op: 'heal', v: 5 }, { op: 'exhaust' }] } },
    card_szxh: { id: 'card_szxh', name: '数字化转型大会战', type: 'strategy', color: 'judgment', cost: 3, rarity: 'rare', target: 'all', keywords: [], effects: [{ op: 'damage_all', v: 12 }, { op: 'energy_max', v: 1 }, { op: 'exhaust' }], flavor: '不是上一个系统，是换一种活法。', concept: '组织级转型项目', upgrade: { effects: [{ op: 'damage_all', v: 16 }, { op: 'energy_max', v: 1 }, { op: 'exhaust' }] } },
    card_sdpl: { id: 'card_sdpl', name: '深度复盘', type: 'skill', color: 'judgment', cost: 1, rarity: 'uncommon', target: 'self', keywords: ['judgment'], effects: [{ op: 'draw', v: 2 }], flavor: '复盘不是追责，是把学费变成认知。', concept: '复盘机制', upgrade: { effects: [{ op: 'draw', v: 3 }] } },
    card_jdcl: { id: 'card_jdcl', name: '决断力', type: 'attack', color: 'judgment', cost: 1, rarity: 'common', target: 'enemy', keywords: ['judgment'], effects: [{ op: 'damage', v: 7 }], insightBonus: [{ op: 'gain', res: 'insight', v: 1 }], flavor: '犹豫一秒，窗口就关了。', concept: '果断决策', upgrade: { effects: [{ op: 'damage', v: 10 }] } },

    /* ---- 林问（提问力）---- */
    card_haowenti: { id: 'card_haowenti', name: '好问题', type: 'skill', color: 'question', cost: 1, rarity: 'starter', target: 'self', keywords: ['question'], effects: [{ op: 'gain', res: 'question', v: 1 }, { op: 'draw', v: 1 }], flavor: '一个好问题值十个答案。', concept: '提问力=信息入口', upgrade: { effects: [{ op: 'gain', res: 'question', v: 1 }, { op: 'draw', v: 2 }] } },
    card_wgwe: { id: 'card_wgwe', name: '五个为什么', type: 'skill', color: 'question', cost: 1, rarity: 'common', target: 'self', keywords: ['question'], effects: [{ op: 'reveal', v: 2 }, { op: 'draw', v: 1 }], flavor: '为什么？为什么？为什么？为什么？……哦，原来在这。', concept: '根因分析（5 Whys）', upgrade: { effects: [{ op: 'reveal', v: 3 }, { op: 'draw', v: 2 }] } },
    card_zjyh: { id: 'card_zjyh', name: '直击要害', type: 'attack', color: 'question', cost: 2, rarity: 'uncommon', target: 'enemy', keywords: ['question'], effects: [{ op: 'damage_vs', v: 4, cond: 'charging', mult: 3 }], flavor: '真问题一出，包装当场碎裂。', concept: '提问力直击真问题', upgrade: { effects: [{ op: 'damage_vs', v: 6, cond: 'charging', mult: 3 }] } },
    card_gyfu: { id: 'card_gyfu', name: '根因复盘', type: 'skill', color: 'question', cost: 1, rarity: 'uncommon', target: 'self', keywords: ['audit'], effects: [{ op: 'scry', look: 3, discard: 2 }, { op: 'draw', v: 1 }], flavor: '翻出抽牌堆底部的真相，扔掉干扰项。', concept: '复盘机制、质量控制', upgrade: { effects: [{ op: 'scry', look: 4, discard: 2 }, { op: 'draw', v: 1 }] } },
    card_jpzch: { id: 'card_jpzch', name: '竞品侦察', type: 'skill', color: 'question', cost: 1, rarity: 'common', target: 'self', keywords: ['question'], effects: [{ op: 'gain', res: 'question', v: 1 }, { op: 'next_draw', v: 1 }], flavor: '对手的动作，就是最好的提示。', concept: '情报/市场洞察', upgrade: { effects: [{ op: 'gain', res: 'question', v: 1 }, { op: 'next_draw', v: 2 }] } },
    card_khgq: { id: 'card_khgq', name: '客户共情调研', type: 'strategy', color: 'question', cost: 2, rarity: 'rare', target: 'enemy', keywords: ['question'], effects: [{ op: 'gain', res: 'question', v: 2 }, { op: 'cleanse_enemy', s: 'customer_anger', v: 8 }, { op: 'exhaust' }], flavor: '别看数据了，去听听客户在骂什么。', concept: '以客户为中心、共情能力', upgrade: { effects: [{ op: 'gain', res: 'question', v: 2 }, { op: 'cleanse_enemy', s: 'customer_anger', v: 12 }, { op: 'exhaust' }] } },
    card_lhzg: { id: 'card_lhzg', name: '连环追问', type: 'attack', color: 'question', cost: 0, rarity: 'uncommon', target: 'enemy', keywords: ['question'], effects: [{ op: 'damage', v: 3 }, { op: 'gain', res: 'question', v: 1 }, { op: 'exhaust' }], flavor: '"为什么？"×5，防线崩溃。', concept: '追问的力量', upgrade: { effects: [{ op: 'damage', v: 5 }, { op: 'gain', res: 'question', v: 1 }, { op: 'exhaust' }] } },
    card_dmzh: { id: 'card_dmzh', name: '答案之门', type: 'skill', color: 'question', cost: 2, rarity: 'rare', target: 'enemy', keywords: ['question'], effects: [{ op: 'damage_per', base: 0, each: 3, stat: 'question_count' }], flavor: '问过的问题，最终都变成子弹。', concept: '信息积累的复利', upgrade: { effects: [{ op: 'damage_per', base: 0, each: 4, stat: 'question_count' }] } },
    card_dcfs: { id: 'card_dcfs', name: '洞察雷达', type: 'power', color: 'question', cost: 1, rarity: 'uncommon', target: 'self', keywords: [], effects: [{ op: 'reveal', v: 99 }], flavor: '敌人的每一步，都在屏幕上。', concept: '信息优势制度化', upgrade: { cost: 0 } },
    card_sdfang: { id: 'card_sdfang', name: '深度访谈', type: 'skill', color: 'question', cost: 2, rarity: 'uncommon', target: 'self', keywords: ['question'], effects: [{ op: 'draw', v: 3 }, { op: 'gain', res: 'question', v: 1 }], flavor: '聊了两个小时，客户说出了自己都没意识到的需求。', concept: '用户深访', upgrade: { effects: [{ op: 'draw', v: 4 }, { op: 'gain', res: 'question', v: 1 }] } },

    /* ---- 温故（鉴赏力）---- */
    card_damo: { id: 'card_damo', name: '打磨', type: 'skill', color: 'taste', cost: 1, rarity: 'starter', target: 'self', keywords: ['taste'], effects: [{ op: 'polish_deck', v: 2 }], flavor: '再改一版。最后一版。真的是最后一版。', concept: '品味沉淀、匠心', upgrade: { effects: [{ op: 'polish_deck', v: 3 }] } },
    card_jdzq: { id: 'card_jdzq', name: '精雕细琢', type: 'attack', color: 'taste', cost: 1, rarity: 'uncommon', target: 'enemy', keywords: ['taste'], effects: [{ op: 'damage', v: 3 }, { op: 'polish_hand', v: 1 }], flavor: '顺手把手边那张牌也磨亮了。', concept: '品味打磨、质量优先', upgrade: { effects: [{ op: 'damage', v: 5 }, { op: 'polish_hand', v: 2 }] } },
    card_pkgm: { id: 'card_pkgm', name: '品控革命', type: 'strategy', color: 'taste', cost: 2, rarity: 'rare', target: 'self', keywords: ['audit'], effects: [{ op: 'discard_all_draw', draw: 5, buff: 1 }, { op: 'exhaust' }], flavor: '推倒重来。这次，一张废稿都不许过。', concept: '质量体系重构', upgrade: { effects: [{ op: 'discard_all_draw', draw: 5, buff: 2 }, { op: 'exhaust' }] } },
    card_yzht: { id: 'card_yzht', name: '一张好图', type: 'skill', color: 'taste', cost: 0, rarity: 'uncommon', target: 'self', keywords: ['taste'], effects: [{ op: 'block', v: 3 }, { op: 'polish_hand', v: 1 }], flavor: '对的东西自带说服力。', concept: '审美即防线', upgrade: { effects: [{ op: 'block', v: 5 }, { op: 'polish_hand', v: 1 }] } },
    card_shangxi: { id: 'card_shangxi', name: '赏析', type: 'attack', color: 'taste', cost: 1, rarity: 'common', target: 'enemy', keywords: ['taste'], effects: [{ op: 'damage', v: 5 }], flavor: '先看懂它，再拆掉它。', concept: '鉴赏即洞察', upgrade: { effects: [{ op: 'damage', v: 8 }] } },
    card_jwzhi: { id: 'card_jwzhi', name: '鉴伪之眼', type: 'power', color: 'taste', cost: 1, rarity: 'uncommon', target: 'self', keywords: [], effects: [{ op: 'self_status', s: 'taste_power', v: 1 }], flavor: 'AI 生成的东西，骗得过机器，骗不过他。', concept: '鉴别 AI 产物', upgrade: { cost: 0 } },
    card_ppcd: { id: 'card_ppcd', name: '品味沉淀', type: 'skill', color: 'taste', cost: 1, rarity: 'uncommon', target: 'self', keywords: ['taste'], effects: [{ op: 'polish_deck', v: 2 }, { op: 'draw', v: 1 }], flavor: '好品味是可以复利的资产。', concept: '长期审美积累', upgrade: { effects: [{ op: 'polish_deck', v: 3 }, { op: 'draw', v: 1 }] } },
    card_swjm: { id: 'card_swjm', name: '审美降维', type: 'attack', color: 'taste', cost: 2, rarity: 'rare', target: 'enemy', keywords: ['taste'], effects: [{ op: 'damage', v: 12 }, { op: 'enemy_status', s: 'chaos', v: 2 }], flavor: '见过真正的好东西，就再也糊弄不了了。敌人当场自乱阵脚。', concept: '高维审美打击', upgrade: { effects: [{ op: 'damage', v: 16 }, { op: 'enemy_status', s: 'chaos', v: 3 }] } },
    card_miaobi: { id: 'card_miaobi', name: '妙笔', type: 'skill', color: 'taste', cost: 1, rarity: 'common', target: 'self', keywords: ['taste'], effects: [{ op: 'heal', v: 4 }, { op: 'polish_hand', v: 1 }], flavor: '一句好文案，治好了整个团队的精神内耗。', concept: '内容审美', upgrade: { effects: [{ op: 'heal', v: 7 }, { op: 'polish_hand', v: 1 }] } },
    card_zlsmr: { id: 'card_zlsmr', name: '质量守门人', type: 'power', color: 'taste', cost: 1, rarity: 'rare', target: 'self', keywords: [], effects: [{ op: 'self_status', s: 'quality_gate', v: 1 }], flavor: '第一道伤，永远由他挡下。', concept: '质量管理、鉴赏把关', upgrade: { cost: 0 } },

    /* ---- 骆执行（编排力）---- */
    card_rwjf: { id: 'card_rwjf', name: '任务拆解', type: 'skill', color: 'agent', cost: 1, rarity: 'starter', target: 'self', keywords: ['orchestrate'], effects: [{ op: 'summon_agents', v: 2 }], flavor: '大任务切成小块，小块塞进队列。', concept: '工作流拆解', upgrade: { effects: [{ op: 'summon_agents', v: 3 }] } },
    card_jgys: { id: 'card_jgys', name: '结果验收', type: 'skill', color: 'agent', cost: 0, rarity: 'starter', target: 'enemy', keywords: ['orchestrate'], effects: [{ op: 'damage_per', base: 0, each: 3, stat: 'agents_played' }, { op: 'exhaust' }], flavor: 'Agent 跑完了，人来看结果。', concept: '结果验收、质量门', upgrade: { effects: [{ op: 'damage_per', base: 0, each: 4, stat: 'agents_played' }, { op: 'exhaust' }] } },
    card_scsdz: { id: 'card_scsdz', name: '市场闪电战', type: 'attack', color: 'agent', cost: 1, rarity: 'common', target: 'enemy', keywords: [], effects: [{ op: 'damage_per', base: 5, each: 2, stat: 'zero_played' }], flavor: '小步快跑，跑着跑着就把对手跑没了。', concept: '快速试错', upgrade: { effects: [{ op: 'damage_per', base: 7, each: 2, stat: 'zero_played' }] } },
    card_mjzh: { id: 'card_mjzh', name: '敏捷站会', type: 'power', color: 'agent', cost: 1, rarity: 'uncommon', target: 'self', keywords: [], effects: [{ op: 'self_status', s: 'agile_standup', v: 1 }], flavor: '每天 15 分钟，Agent 排队领任务。', concept: '敏捷迭代', upgrade: { cost: 0 } },
    card_qyhack: { id: 'card_qyhack', name: '全员黑客马拉松', type: 'strategy', color: 'agent', cost: 1, rarity: 'rare', target: 'self', keywords: ['orchestrate'], effects: [{ op: 'summon_agents', v: 3 }, { op: 'next_draw', v: 1 }, { op: 'exhaust' }], flavor: '48 小时，睡袋铺在工位下，创意铺在屏幕上。', concept: '创新激励、内部创业', upgrade: { effects: [{ op: 'summon_agents', v: 4 }, { op: 'next_draw', v: 1 }, { op: 'exhaust' }] } },
    card_rjb: { id: 'card_rjb', name: '人机配比表', type: 'power', color: 'agent', cost: 1, rarity: 'uncommon', target: 'self', keywords: [], effects: [{ op: 'self_status', s: 'human_ratio', v: 1 }], flavor: 'Agent 多就提速，人多就加固。配比即战略。', concept: 'human-agent ratio（微软）', upgrade: { cost: 0 } },
    card_qswh: { id: 'card_qswh', name: '全栈文化', type: 'power', color: 'agent', cost: 2, rarity: 'rare', target: 'self', keywords: [], effects: [{ op: 'self_status', s: 'fullstack', v: 1 }], flavor: '产品经理会写代码，工程师懂用户。0 费的牌，打出就白赚一张。', concept: '全栈超级个体（出门问问）', upgrade: { cost: 1 } },
    card_lsxn: { id: 'card_lsxn', name: '流水线优化', type: 'skill', color: 'agent', cost: 0, rarity: 'uncommon', target: 'self', keywords: ['orchestrate'], effects: [{ op: 'discount_turn', v: 1 }], flavor: '自动化每前进一格，成本就后退一寸。', concept: '流程自动化', upgrade: { effects: [{ op: 'discount_turn', v: 1 }, { op: 'draw', v: 1 }] } },
    card_bxzxr: { id: 'card_bxzxr', name: '并行执行', type: 'attack', color: 'agent', cost: 2, rarity: 'uncommon', target: 'enemy', keywords: [], effects: [{ op: 'damage', v: 8 }, { op: 'summon_agents', v: 1 }], flavor: '一个 Agent 倒下了，千千万万个 Agent 站起来。', concept: '并行计算', upgrade: { effects: [{ op: 'damage', v: 11 }, { op: 'summon_agents', v: 1 }] } },
    card_dyss: { id: 'card_dyss', name: '大验收', type: 'attack', color: 'agent', cost: 1, rarity: 'rare', target: 'enemy', keywords: ['orchestrate'], effects: [{ op: 'damage_per', base: 0, each: 4, stat: 'agents_played' }], flavor: 'Agent 们干了一整回合，这一拳是它们的总成绩单。', concept: '批量验收', upgrade: { effects: [{ op: 'damage_per', base: 0, each: 5, stat: 'agents_played' }] } },

    /* ---- 中立 ---- */
    card_fpth: { id: 'card_fpth', name: '复盘会茶歇', type: 'skill', color: 'neutral', cost: 1, rarity: 'common', target: 'self', keywords: [], effects: [{ op: 'heal', v: 6 }], flavor: '茶歇桌上聊出来的方案，比会议室里的多。', concept: '非正式沟通的价值', upgrade: { effects: [{ op: 'heal', v: 9 }] } },
    card_tuanjian: { id: 'card_tuanjian', name: '团建', type: 'skill', color: 'neutral', cost: 1, rarity: 'common', target: 'self', keywords: [], effects: [{ op: 'block', v: 8 }], flavor: '信任是最强的防火墙——字面意义上的。', concept: '团队凝聚力', upgrade: { effects: [{ op: 'block', v: 11 }] } },
    card_kbtd: { id: 'card_kbtd', name: '跨部门同步', type: 'skill', color: 'neutral', cost: 2, rarity: 'uncommon', target: 'self', keywords: ['synergy'], effects: [{ op: 'draw', v: 2 }, { op: 'discount_turn', v: 1 }], flavor: '拉了个群，信息开始流动，事情突然变快了。', concept: '打破部门墙', upgrade: { cost: 1 } },
    card_jtxl: { id: 'card_jtxl', name: '集体心流', type: 'power', color: 'neutral', cost: 1, rarity: 'uncommon', target: 'self', keywords: [], effects: [{ op: 'self_status', s: 'focus', v: 1 }], flavor: '整个团队进入心流，输出稳定得可怕。', concept: '组织心流', upgrade: { effects: [{ op: 'self_status', s: 'focus', v: 2 }] } },
    card_xmqd: { id: 'card_xmqd', name: '项目启动会', type: 'attack', color: 'neutral', cost: 2, rarity: 'rare', target: 'enemy', keywords: [], effects: [{ op: 'damage', v: 10 }, { op: 'draw', v: 1 }], flavor: 'Kick-off 一开，士气值拉满。', concept: '项目制动员', upgrade: { effects: [{ op: 'damage', v: 14 }, { op: 'draw', v: 1 }] } },
    card_ryzr: { id: 'card_ryzr', name: '全员周会', type: 'skill', color: 'neutral', cost: 1, rarity: 'common', target: 'self', keywords: [], effects: [{ op: 'draw', v: 2 }], flavor: '只要 20 分钟，信息差清零。', concept: '信息同步', upgrade: { effects: [{ op: 'draw', v: 3 }] } },
    card_jlsx: { id: 'card_jlsx', name: '简历筛选', type: 'skill', color: 'neutral', cost: 0, rarity: 'uncommon', target: 'self', keywords: ['audit'], effects: [{ op: 'block', v: 4 }, { op: 'draw', v: 1 }], flavor: '宁可错杀三千简历，不可放过一个人才。', concept: '招聘漏斗', upgrade: { effects: [{ op: 'block', v: 6 }, { op: 'draw', v: 1 }] } },
    card_msgs: { id: 'card_msgs', name: '面试官直觉', type: 'attack', color: 'neutral', cost: 1, rarity: 'common', target: 'enemy', keywords: [], effects: [{ op: 'damage', v: 7 }], flavor: '聊了十分钟，他就知道这人行不行。', concept: '人才判断', upgrade: { effects: [{ op: 'damage', v: 10 }] } }
  },

  /* ---------------- 敌人 ---------------- */
  enemies: {
    /* Act 1 */
    enemy_mail_swarm: {
      id: 'enemy_mail_swarm', name: '邮件转发虫群', act: 1, hp: [20, 24], intent_icon: 'debuff',
      pattern: [{ t: 'debuff', s: 'info_gap', v: 1, label: '叮咚！新邮件' }, { t: 'attack', v: 5, hits: 2, label: '转发轰炸' }, { t: 'attack', v: 5, label: '抄送全员' }],
      desc: '信息过载的化身：你平均每两分钟被打断一次。'
    },
    enemy_kpi_copier: {
      id: 'enemy_kpi_copier', name: 'KPI 复印机', act: 1, hp: 26, intent_icon: 'attack',
      pattern: [{ t: 'charge', label: '指标膨胀' }, { t: 'attack', v: 9, label: '重压打击' }],
      hooks: [{ hook: 'kpi_explode', stacks: 5, dmg: 8 }],
      desc: '为数字而数字。每被打一次，指标就涨一层——涨到第五层，它会爆炸。'
    },
    enemy_report_puppet: {
      id: 'enemy_report_puppet', name: '汇报傀儡', act: 1, hp: 20, intent_icon: 'defend',
      pattern: [{ t: 'block', v: 6, label: '层层汇报' }, { t: 'self_status', s: 'inefficient', v: 1, label: '等待批示' }, { t: 'attack', v: 7, label: '执行指示' }],
      desc: '多头汇报的牺牲品：他做的每个决定都要请示三个领导。'
    },
    enemy_recruit_funnel: {
      id: 'enemy_recruit_funnel', name: '招聘漏斗', act: 1, hp: 24, intent_icon: 'special',
      pattern: [{ t: 'block', v: 5, label: '筛简历' }, { t: 'discard_hand', v: 1, label: '面了又面' }, { t: 'attack', v: 6, label: '人才流失' }],
      desc: '面了八轮，人跑了。它吞掉的每一张手牌，都是一个流失的候选人。'
    },
    enemy_excel_zombie: {
      id: 'enemy_excel_zombie', name: 'Excel 僵尸', act: 1, hp: 28, intent_icon: 'defend',
      pattern: [{ t: 'block', v: 7, label: '手工台账' }, { t: 'attack', v: 5, label: '陈旧公式' }, { t: 'attack', v: 5, label: '宏病毒' }],
      desc: '十年手工台账养出的行尸走肉。新工具一上手，它就现出原形。'
    },
    elite_headhunter: {
      id: 'elite_headhunter', name: '猎头魔', act: 1, hp: 46, elite: true, intent_icon: 'attack',
      pattern: [{ t: 'attack', v: 8, label: '挖角试探' }, { t: 'buff', s: 'strength', v: 1, label: '谈薪加码' }, { t: 'attack', v: 10, label: '三倍薪资攻势' }],
      hooks: [{ hook: 'headhunter_steal', every: 2 }],
      desc: '每两个回合挖走你弃牌堆里的一张牌。人才，是真的会流失的。'
    },
    elite_meeting: {
      id: 'elite_meeting', name: '会议地狱主宰', act: 1, hp: 42, elite: true, intent_icon: 'special',
      pattern: [{ t: 'summon', id: 'enemy_mail_swarm', label: '紧急拉会' }, { t: 'debuff', s: 'info_gap', v: 1, label: '会议纪要' }, { t: 'attack', v: 9, label: '总结陈词' }],
      desc: '他开的会可以没有结论，但不能没有下一次会。'
    },

    /* Act 2 */
    enemy_dept_wall: {
      id: 'enemy_dept_wall', name: '部门墙守卫', act: 2, hp: 30, intent_icon: 'defend',
      pattern: [{ t: 'block', v: 10, label: '筑墙' }, { t: 'debuff', s: 'info_gap', v: 1, label: '拒绝共享' }, { t: 'attack', v: 8, label: '部门壁垒' }],
      desc: '数据是我的，客户是我的，功劳也是我的。墙越高，他越安全。'
    },
    enemy_meeting_blackhole: {
      id: 'enemy_meeting_blackhole', name: '会议黑洞', act: 2, hp: 26, intent_icon: 'special',
      pattern: [{ t: 'hand_limit', v: 2, label: '拉会（手牌上限-2）' }, { t: 'block', v: 6, label: 'PPT 汇报' }, { t: 'attack', v: 6, hits: 2, label: '会议超时' }],
      desc: '一个会开完，半天没了。它吞噬的不是时间，是你的行动力。'
    },
    enemy_ppt_dragon: {
      id: 'enemy_ppt_dragon', name: 'PPT 龙', act: 2, hp: 34, intent_icon: 'attack',
      pattern: [{ t: 'charge', label: '打磨幻灯片' }, { t: 'attack', v: 18, label: '华丽一击' }, { t: 'block', v: 5, label: '吹嘘战果' }],
      desc: '它的每一页幻灯片都美轮美奂，唯独没有一页讲真话。蓄力回合是它的弱点。'
    },
    enemy_process_zombie: {
      id: 'enemy_process_zombie', name: '流程僵尸', act: 2, hp: 32, intent_icon: 'special',
      pattern: [{ t: 'block', v: 8, label: '盖章' }, { t: 'tax', v: 1, label: '走流程（下回合首张牌+1费）' }, { t: 'attack', v: 7, label: '流程碾压' }],
      desc: '流程本身没有错，错的是把流程当成了产品。'
    },
    enemy_middle_manager: {
      id: 'enemy_middle_manager', name: '中层经理解析体', act: 2, hp: 30, intent_icon: 'buff',
      pattern: [{ t: 'buff', s: 'layer', v: 1, label: '再加一级汇报' }, { t: 'attack', v: 6, label: '层层下达' }, { t: 'block', v: 6, label: '上传下达' }],
      desc: '层级每加一层，他的攻防就涨一截——直到整个组织被他自己压垮。'
    },
    elite_info_silo: {
      id: 'elite_info_silo', name: '信息孤岛复合体', act: 2, hp: 70, elite: true, intent_icon: 'special',
      pattern: [{ t: 'block', v: 8, label: '数据隔离' }, { t: 'attack', v: 9, label: '孤岛壁垒' }, { t: 'debuff', s: 'info_gap', v: 2, label: '各自为政' }],
      hooks: [{ hook: 'splitter', spawn: 'enemy_dept_wall', max: 2 }],
      desc: '每受一次伤就分裂出一堵新的部门墙。透明化是它唯一的解药。'
    },
    elite_tournament: {
      id: 'elite_tournament', name: '晋升锦标赛裁判', act: 2, hp: 60, elite: true, intent_icon: 'attack',
      pattern: [{ t: 'buff', s: 'strength', v: 1, label: '内卷升温' }, { t: 'attack', v: 10, label: '绩效大棒' }, { t: 'tax', v: 1, label: '述职答辩' }],
      desc: '只有一个名额，八个人竞争。他挥舞大棒，让所有人互相消耗。'
    },

    /* Act 3 */
    enemy_hallucinator: {
      id: 'enemy_hallucinator', name: '幻觉生成器', act: 3, hp: 34, intent_icon: 'debuff', tags: ['ai_product'],
      pattern: [{ t: 'debuff', s: 'info_gap', v: 1, label: '一本正经胡说' }, { t: 'attack', v: 6, hits: 2, label: '错误信息轰炸' }, { t: 'self_status', s: 'ai_hallucination', v: 2, label: '自我怀疑（自身伤害-6）' }],
      desc: '它说的每句话都无比流畅，一半是错的。用【鉴赏】戳穿它。'
    },
    enemy_blackbox: {
      id: 'enemy_blackbox', name: '算法黑箱', act: 3, hp: 40, intent_icon: 'special',
      pattern: [{ t: 'charge', label: '隐藏逻辑' }, { t: 'attack', v: 12, label: '神秘一击' }, { t: 'block', v: 8, label: '重新训练' }],
      desc: '没人知道它为什么这么决策——连它的开发者也不知道。'
    },
    enemy_ai_cs: {
      id: 'enemy_ai_cs', name: '纯 AI 客服终端', act: 3, hp: 36, intent_icon: 'debuff', tags: ['ai_product'],
      pattern: [{ t: 'debuff', s: 'customer_anger', v: 2, label: '自动回复（客户不满+2）' }, { t: 'attack', v: 8, ignore_block: 5, label: '高效处理' }],
      desc: '响应时间 0.3 秒，客户满意度 0。不满累积到 15 层，舆情将爆发。'
    },
    enemy_token_vamp: {
      id: 'enemy_token_vamp', name: 'Token 吸血鬼', act: 3, hp: 28, intent_icon: 'special',
      pattern: [{ t: 'steal_token', v: 1, label: '吸血（偷 1 Token）' }, { t: 'attack', v: 6, label: '烧算力' }],
      desc: '算力账单的具象化。它偷走的不只是 Token，是你的预算。'
    },
    enemy_compliance: {
      id: 'enemy_compliance', name: '合规合规师', act: 3, hp: 30, intent_icon: 'special',
      pattern: [{ t: 'draw_down', v: 1, label: '风险审查（抽牌-1）' }, { t: 'block', v: 6, label: '合规表单' }, { t: 'attack', v: 6, label: '合规铁拳' }],
      desc: '它没有恶意，只是每个创新提案都会被它盖上"暂缓"。'
    },
    elite_council: {
      id: 'elite_council', name: '模型幻觉议会', act: 3, hp: 78, elite: true, intent_icon: 'debuff', tags: ['ai_product'],
      pattern: [{ t: 'debuff', s: 'info_gap', v: 2, label: '幻觉决议 A' }, { t: 'debuff', s: 'customer_anger', v: 3, label: '幻觉决议 B' }, { t: 'attack', v: 10, hits: 2, label: '集体幻觉' }],
      desc: '七个模型开会达成了一致——一致地错了。'
    },
    elite_auto: {
      id: 'elite_auto', name: '自动化失控单元', act: 3, hp: 72, elite: true, intent_icon: 'attack',
      pattern: [{ t: 'attack', v: 6, label: '自动执行' }, { t: 'block', v: 6, label: '自动防守' }],
      hooks: [{ hook: 'auto_accel', max_actions: 4, misfire: 0.25 }],
      desc: '每回合多动一次，越拖越失控——但也越容易打自己。速战速决。'
    },

    /* BOSS */
    boss_bureaucracy: {
      id: 'boss_bureaucracy', name: '部门墙·科层巨像', act: 1, hp: 110, boss: true, intent_icon: 'special',
      pattern: [
        { t: 'block', v: 8, label: '层层审批' },
        { t: 'charge', label: '蓄力：酝酿指令' },
        { t: 'attack', v: 16, label: '科层铁拳' },
        { t: 'tax', v: 1, label: '审批延迟（首张牌+1费）' },
        { t: 'attack', v: 8, hits: 2, label: '部门壁垒' },
        { t: 'debuff', s: 'info_gap', v: 1, label: '信息封锁' }
      ],
      phases: [{ below_pct: 50, pattern: [
        { t: 'block', v: 12, label: '筑起高墙' },
        { t: 'summon', id: 'enemy_dept_wall', label: '筑墙（召唤部门墙守卫）' }
      ] }],
      hooks: [{ hook: 'splitter', spawn: 'enemy_dept_wall', max: 2, threshold: 0.3 }],
      desc: '三十年科层制浇筑成的混凝土巨像，胸口嵌着一枚永不落幕的"审批中"红章。弱点：蓄力阶段是破绽，打断它！'
    },
    boss_leviathan: {
      id: 'boss_leviathan', name: '层级巨兽·大公司病', act: 2, hp: 150, boss: true, intent_icon: 'special',
      pattern: [
        { t: 'buff', s: 'layer', v: 1, label: '增设层级' },
        { t: 'attack', v: 6, hits: 2, label: '层压打击' },
        { t: 'block', v: 6, label: '层层设防' },
        { t: 'debuff', s: 'info_gap', v: 1, label: '信息衰减' }
      ],
      phases: [
        { below_pct: 50, pattern: [
          { t: 'buff', s: 'strength', v: 2, label: '中层躁动' },
          { t: 'attack', v: 12, label: '积压爆发' },
          { t: 'attack', v: 8, hits: 2, label: '惯性碾压' }
        ]}
      ],
      hooks: [{ hook: 'layer_beast', start_layers: 2, max_layers: 5 }],
      desc: '它每长一层就更强一分，也更迟钝一分。层级是它的铠甲，也是它的癌症。弱点：控制层级不要超过5层，否则它会失控狂暴。'
    },
    boss_klarna: {
      id: 'boss_klarna', name: '克朗娜危机·全自动客服巨脑', act: 3, hp: 130, boss: true, intent_icon: 'special',
      pattern: [
        { t: 'debuff', s: 'customer_anger', v: 2, label: '自动回复（客户不满+2）' },
        { t: 'attack', v: 7, ignore_block: 3, label: '高效处理' },
        { t: 'buff', s: 'strength', v: 1, label: '裁员增效' }
      ],
      phases: [{ below_pct: 50, pattern: [
        { t: 'debuff', s: 'customer_anger', v: 3, label: '批量自动回复' },
        { t: 'attack', v: 10, ignore_block: 5, label: '舆情反扑' },
        { t: 'attack', v: 8, label: '效率碾压' }
      ] }],
      hooks: [{ hook: 'klarna', burst: 10, burst_dmg: 20 }],
      desc: '它曾经是资本市场的宠儿：成本砍半、响应飞快。直到客户愤怒堆到临界点。客户不满 10 层即舆情爆发（20点穿透伤害）——用【提问】类共情牌拆除引信，或用【判断】牌直接削减不满。'
    },
    boss_entropy: {
      id: 'boss_entropy', name: '组织熵增之王', act: 4, hp: 180, boss: true, intent_icon: 'special',
      pattern: [{ t: 'idle', label: '凝视' }],
      hooks: [{ hook: 'entropy_king' }],
      desc: '它不是某个部门、某个老板。它是三十年惯性、怀疑、恐惧与拖延的总和。它只会说一句话："我们一直这么干。"应对策略：【提问】削弱怀疑、【鉴赏】削弱惯性、【透明化】削弱恐惧。形态持续2回合，观察规律、针对性出牌！'
    },
    enemy_inertia_shard: {
      id: 'enemy_inertia_shard', name: '惯性碎片', act: 4, hp: 18, intent_icon: 'attack',
      pattern: [{ t: 'attack', v: 5, label: '条件反射' }, { t: 'debuff', s: 'entropy', v: 1, label: '惯性传递' }],
      hooks: [{ hook: 'entropy_spread' }],
      desc: '"以前也是这么做的。"——它只会这一招，但会传染组织熵增。'
    }
  },

  /* ---------------- 遗物 ---------------- */
  relics: {
    relic_liangzhou: { id: 'relic_liangzhou', name: '两周一讲', rarity: 'common', hook: 'combat_start_cleanse', params: { v: 1 }, desc: '每场战斗开始时，净化 1 层负面状态。', theme: 'Anthropic 坦诚沟通文化' },
    relic_jiangxin: { id: 'relic_jiangxin', name: '匠心清单', rarity: 'common', hook: 'polish_start', params: { v: 2 }, desc: '每场战斗开始时，随机强化 2 张牌（伤害/防火墙 +2，本场有效）。', theme: '匠人标准' },
    relic_codebanana: { id: 'relic_codebanana', name: 'CodeBanana 工牌', rarity: 'common', hook: 'combat_start_agents', params: { v: 1 }, desc: '每场战斗开始时，将 1 张 0 费「执行Agent」加入手牌。', theme: '出门问问超级组织平台' },
    relic_shuju_zt: { id: 'relic_shuju_zt', name: '数据中台', rarity: 'rare', hook: 'combat_start_reveal', desc: '每场战斗开始时揭示所有敌人意图，并免疫"信息差"。', theme: '打破信息孤岛' },
    relic_jiyhua: { id: 'relic_jiyhua', name: '会议纪要机器人', rarity: 'common', hook: 'first_question_draw', params: { v: 1 }, desc: '每场战斗首次打出【提问】牌时，抽 1 张牌。', theme: 'AI 记录与信息提取' },
    relic_wuwenfa: { id: 'relic_wuwenfa', name: '五问法手册', rarity: 'common', hook: 'first_question_reveal', params: { turns: 1 }, desc: '每场战斗首次打出【提问】牌时，额外揭示所有敌人意图 1 回合。', theme: '根因分析' },
    relic_fanwakao: { id: 'relic_fanwakao', name: '反挖角条款', rarity: 'uncommon', hook: 'discard_recall_start', desc: '第二回合开始时，从弃牌堆随机回收 1 张牌到手牌。', theme: '人才留存' },
    relic_xiaoyou: { id: 'relic_xiaoyou', name: '校友网络', rarity: 'common', hook: 'win_extra_card_chance', params: { pct: 20 }, desc: '战斗胜利时，20% 概率额外获得一次三选一。', theme: '人才内推网络' },
    relic_dujiao: { id: 'relic_dujiao', name: '独角兽猎头', rarity: 'rare', hook: 'first_reward_rare', desc: '每场战斗的第一次卡牌奖励，选项全部为罕见以上。', theme: '高价挖角顶级人才' },
    relic_shixiseng: { id: 'relic_shixiseng', name: '实习生计划', rarity: 'common', hook: 'intern_agent', params: { heal_penalty: 2 }, desc: '每场战斗开始时获得 1 个「执行Agent」，但战斗胜利回血 -2。', theme: '低成本人才的代价' },
    relic_zhinneng: { id: 'relic_zhinneng', name: '智能即服务', rarity: 'uncommon', hook: 'extra_token_chance', params: { pct: 30 }, desc: '每回合 30% 概率额外获得 1 Token。', theme: '微软 intelligence on tap' },
    relic_touming: { id: 'relic_touming', name: '透明公开墙', rarity: 'uncommon', hook: 'transparent_start', params: { turns: 3 }, desc: '每场战斗开始时，获得 3 回合全意图透视。', theme: '组织透明化' },
    relic_baiqing: { id: 'relic_baiqing', name: '失败庆祝派对', rarity: 'uncommon', hook: 'death_save_once', desc: '每场战斗首次受到致命伤时，保留 1 点组织健康度。', theme: '容错文化' },
    relic_errbook: { id: 'relic_errbook', name: '允许犯错手册', rarity: 'rare', hook: 'no_damage_draw', desc: '回合结束时若本回合未掉血，抽 1 张牌。', theme: '心理安全' },
    relic_youxiang: { id: 'relic_youxiang', name: '直达老板的邮箱', rarity: 'uncommon', hook: 'enemy_stagger_chance', params: { pct: 30 }, desc: '每场战斗中，敌人有 30% 概率在回合中"被越级沟通"而发呆。', theme: '扁平化（英伟达）' },
    relic_okr_board: { id: 'relic_okr_board', name: 'OKR 看板', rarity: 'common', hook: 'okr_insight_token', desc: '每回合首次打出【判断】牌时，获得 1 Token。', theme: '目标管理驱动执行' },
    relic_tanxin: { id: 'relic_tanxin', name: '弹性工作制', rarity: 'common', hook: 'heal_on_win', params: { v: 4 }, desc: '每场战斗胜利后，额外恢复 4 点组织健康度。', theme: '员工福祉' },
    relic_amiba: { id: 'relic_amiba', name: '阿米巴核算', rarity: 'rare', hook: 'budget_bonus_win', params: { pct: 30 }, desc: '每次战斗胜利额外获得 30% 预算。', theme: '划小核算单元' },
    relic_super_os: { id: 'relic_super_os', name: '超级组织 OS', rarity: 'rare', hook: 'token_up_draw_down', params: { token: 1, draw: 1 }, desc: '每回合 Token +1，但抽牌 -1。高风险高回报。', theme: '出门问问超级组织' },
    relic_empathy: { id: 'relic_empathy', name: '共情热线', rarity: 'uncommon', hook: 'empathy_double', desc: '移除"客户不满"的效果翻倍。', theme: 'Klarna 教训' },
    relic_shitu: { id: 'relic_shitu', name: '师徒制', rarity: 'common', hook: 'loyalty_draw', params: { v: 1 }, desc: '每回合多抽 1 张牌。', theme: '老带新' },
    relic_zhongcheng: { id: 'relic_zhongcheng', name: '忠诚协议', rarity: 'uncommon', hook: 'loyalty_draw', params: { v: 1 }, desc: '每回合多抽 1 张牌。', theme: '核心人才保留' },
    relic_ai_manual: { id: 'relic_ai_manual', name: 'AI 使用手册', rarity: 'uncommon', hook: 'token_max_up', params: { v: 1 }, desc: '每回合 Token 上限 +1。', theme: '拥抱工具' }
  },

  /* ---------------- 药水 ---------------- */
  potions: {
    potion_coffee: { id: 'potion_coffee', name: '即饮咖啡', combat: true, desc: '本回合 +1 Token。', effects: [{ op: 'energy', v: 1 }], flavor: '三倍浓缩，灵魂归位。' },
    potion_okr: { id: 'potion_okr', name: 'OKR 冲刺', combat: true, desc: '抽 3 张牌。', effects: [{ op: 'draw', v: 3 }], flavor: '本季度只剩一周了，冲！' },
    potion_meditate: { id: 'potion_meditate', name: '冥想五分钟', combat: true, desc: '移除 1 层负面状态，恢复 5 点健康度。', effects: [{ op: 'cleanse_self', v: 1 }, { op: 'heal', v: 5 }], flavor: '呼吸。只是呼吸。' },
    potion_visit: { id: 'potion_visit', name: '客户回访', combat: true, desc: '移除敌方 4 层"客户不满"。', effects: [{ op: 'cleanse_enemy', s: 'customer_anger', v: 4 }], flavor: '拿起电话，听十分钟真话。' },
    potion_redbull: { id: 'potion_redbull', name: '红牛加急', combat: true, desc: '本回合所有牌费用 -1，但下回合抽牌 -1。', effects: [{ op: 'discount_turn', v: 1 }, { op: 'next_draw', v: -1 }], flavor: '今晚搞定，明天再说。' }
  },

  /* ---------------- 事件 ---------------- */
  events: [
    {
      id: 'ev_klarna', name: '克朗娜时刻', source: 'Klarna 案例',
      text: '客服部门上季度全员换成了 AI，成本砍半，响应速度飞升。但投诉量涨了三倍，社交媒体上全是愤怒的客户。评论区最高赞："我想找个人说话，找到一个算我输。"现在，你必须做出决定。',
      options: [
        { label: '坚持全自动化，追加预算', effects: [{ oe: 'relic', id: 'relic_super_os' }], result: '你选择了效率。预算在燃烧，速度在飞升——但口碑在崩塌。本幕剩余旅程中，你隐约听见了客户不满的杂音。' },
        { label: '紧急召回人类客服（失去 30% 预算）', cost: { budget_pct: 30 }, effects: [{ oe: 'heal', v: 25 }, { oe: 'relic', id: 'relic_empathy' }], result: '"AI 给速度，人才给共情。"召回的老客服重新戴上耳麦，投诉曲线开始回落。你的预算瘦了一圈，但客户笑了。' }
      ]
    },
    {
      id: 'ev_superorg', name: '超级组织实验', source: '出门问问案例',
      text: '一位工程师拿着方案冲进你的办公室："让 Agent 承担 90% 的任务，公司瘦身到 150 人，人均产出翻倍！"他的眼睛里有光，工牌上写着"全栈超级个体"。他的 CodeBanana 平台确实跑通了。你信吗？',
      options: [
        { label: '全员推行', effects: [{ oe: 'relic', id: 'relic_super_os' }], result: '你按下了红色按钮。组织开始以 Agent 的速度运转——更快、更锋利，也更冷。Token 成了新的度量衡。' },
        { label: '小范围试点（升级 2 张牌）', effects: [{ oe: 'upgrade', n: 2 }], result: '稳妥。三个项目组先跑三个月。数据不错，但革命没有一夜成功的。' },
        { label: '拒绝（获得 40 预算）', effects: [{ oe: 'budget', v: 40 }], result: '"想法很好，时机未到。"工程师收起方案走了。你省下了一笔预算，也可能错过了一个时代。' }
      ]
    },
    {
      id: 'ev_biweekly', name: '两周一讲', source: 'Anthropic 案例',
      text: '有位高管提议：每两周向全员做一次近乎不设限的分享——真实的经营数据、真实的困难、真实的判断。有人反对："信息扩散太快，会引发动荡。"你看着台下年轻的脸，想起自己入职第一天什么都不知道的迷茫。',
      options: [
        { label: '支持，并亲自参加', effects: [{ oe: 'relic', id: 'relic_liangzhou' }], result: '第一次"两周一讲"，会议室站满了人。散会后，内网的匿名提问区第一次出现了建设性的问题。信息差，消融了一点。' },
        { label: '改为高管小会（获得 50 预算）', effects: [{ oe: 'budget', v: 50 }], result: '效率确实高了——决策链条短了。但走廊里的窃窃私语多了。你意识到，省下的时间，正在变成组织的暗物质。' }
      ]
    },
    {
      id: 'ev_retrain', name: '裁员还是培训', source: '技能断层主题',
      text: '财务部的老周，司龄 28 年，手工对账零差错。但新上的智能财务系统他学不会——或者说不愿学。HR 送来两份文件：一份是解除劳动合同协议，一份是三个月 AI 转型培训报名表。老周在你办公室门口等着，手里攥着保温杯。',
      options: [
        { label: '组织培训（花费 80 预算，升级 2 张牌）', cost: { budget: 80 }, effects: [{ oe: 'upgrade', n: 2 }], result: '老周结业考试拿了第二。他找到你，只说了一句："谢谢你还愿意等我。"经验加上新工具，成了宝。' },
        { label: '优化编制（删 1 张牌，获得 60 预算）', effects: [{ oe: 'remove_card' }, { oe: 'budget', v: 60 }], result: '流程很规范，补偿很到位。但那天下午，整个办公室安静得可怕。有些东西，预算买不回来。' },
        { label: '让老周带 AI 一起干（获得遗物）', effects: [{ oe: 'relic', id: 'relic_shitu' }], result: '老周 + 智能系统：他负责判断，系统负责算。三个月后，这套"师徒制"成了公司内部效率最高的组合。' }
      ]
    },
    {
      id: 'ev_headhunt', name: '猎头之战', source: '人才争夺战',
      text: '竞对公司开出了三倍薪资，挖你卡组里最能打的那位核心人才。她没有立刻答应，来找你："我很喜欢这里。但三倍……你懂我意思吧？"窗外，猎头的短信一条接一条。',
      options: [
        { label: '加薪留人（花费 100 预算）', cost: { budget: 100 }, effects: [{ oe: 'relic', id: 'relic_zhongcheng' }], result: '"钱到位了，心也到位了。"她留下了，顺手带来两个前同事的简历。忠诚，是会传染的。' },
        { label: '放人并祝福（失去 1 张随机牌，获得 60 预算）', effects: [{ oe: 'remove_random' }, { oe: 'budget', v: 60 }], result: '你亲自送她到电梯口。门关上前她说："如果那边不行，我还回来。"失去是真实的，格局也是。' }
      ]
    },
    {
      id: 'ev_flatten', name: '扁平化革命', source: '大企业病治理',
      text: '员工论坛的置顶帖火了：《我们真的需要七层审批吗？》。跟帖两万条。组织诊断显示：一个报销单要走 11 个签字，平均耗时 23 天。中层管理者们开始紧张地刷新邮箱。',
      options: [
        { label: '直接砍掉三层（删牌免费 1 次）', effects: [{ oe: 'free_remove' }], result: '架构图一夜之间矮了一截。有人欢呼，有人失措——官僚的惯性开始反扑，但你轻了一身。' },
        { label: '让听见炮声的人做决策（升级 3 张牌）', effects: [{ oe: 'upgrade', n: 3 }, { oe: 'relic', id: 'relic_youxiang' }], result: '一线员工获得了直达决策层的邮箱。第一周收到了 2000 封邮件——第二周，最好的 10 个点子开始落地。' }
      ]
    },
    {
      id: 'ev_toolban', name: '工具禁令风波', source: '非 AI 原生惯性',
      text: 'IT 部门发布禁令：禁止使用一切外部 AI 工具，违者通报。理由很充分：数据安全。但工程师们怨声载道——内部工具难用得像上个世纪的产物。你知道，禁令挡不住人，只挡得住效率。',
      options: [
        { label: '解除禁令，发布 AI 使用手册', effects: [{ oe: 'relic', id: 'relic_ai_manual' }], result: '禁令变成了指南。用得爽，也用得规范——原来安全与效率不是单选题。' },
        { label: '维持禁令（获得 60 预算，攻击牌 -1 伤害）', effects: [{ oe: 'budget', v: 60 }, { oe: 'act_buff', what: 'attack_down', v: 1 }], result: '安全部门的红头文件很满意。但下班后，大家开始用个人电脑和手机偷偷用 AI。禁令禁不住时代。' }
      ]
    },
    {
      id: 'ev_data', name: '数据断供', source: '信息孤岛主题',
      text: '销售总监把客户数据锁在自己部门的系统里，拒绝接入数据中台："数据是我的命根子，凭什么给你们？"而算法团队等着这份数据优化推荐模型——每拖一天，损失六位数。会议室的空气凝固了。',
      options: [
        { label: '强制打通（遭遇部门墙守卫）', effects: [{ oe: 'fight', enemy: 'enemy_dept_wall' }], result: '你动用了 CEO 特别权限。数据开始流动——但销售总监的抵抗，化作了一堵实体的墙，挡在你面前。' },
        { label: '先谈后通（失去 1 张随机牌，获得数据中台）', effects: [{ oe: 'remove_random' }, { oe: 'relic', id: 'relic_shuju_zt' }], result: '三轮饭局，五次电话。你让出了部分利益，换来了数据的长治久安。谈判桌上失去的，战场上加倍拿回。' }
      ]
    }
  ],

  /* ---------------- 剧情 ---------------- */
  story: {
    opening: [
      '恒信集团，成立于上个世纪，鼎盛于上个世纪。',
      '三十年，它从一间民房成长为行业巨头——然后，停了下来。',
      '会议室每天排满，决策却越来越慢；KPI 越来越多，客户却越来越少。',
      '工程师用 AI 写代码被通报批评，市场部用 AI 做方案被约谈。',
      '最优秀的人一个接一个离开，留下的文件堆成了山。',
      '董事会终于承认：这家公司病了。病名——组织熵增。',
      '于是，他们请来了你。',
      '组织变革顾问。你的权限只有一项：注入新的人才。',
      '人才即卡组。组织即战场。',
      '现在，开始重构。'
    ],
    char_bios: {
      suchen: '苏澄相信，绝大多数组织问题源于没人敢拍板。她的方案永远只有一页，选项永远不超过三个。',
      linwen: '林问的提问让人不适，但让真相无处可藏。他说过：答案会过时，问题不会。',
      wengu: '温故拒绝过 217 个方案。每次评审会，全场最安静的时刻，就是他说"这个，不行"的时刻。',
      luozhixing: '骆执行的管理半径是 12 个人和 40 个 Agent。他说：未来的管理者，工牌上应该写"智能体指挥官"。'
    },
    boss_dialogues: {
      boss_bureaucracy: [
        { who: 'boss', text: '站住。此区域需要三级审批。您预约了吗？' },
        { who: 'player', text: '我是董事会直接任命的变革顾问。你的审批流程，管不到我。' },
        { who: 'boss', text: '有趣。三十年了，没人绕过我。那就……按流程，物理解决。' }
      ],
      boss_leviathan: [
        { who: 'boss', text: '你的提案……已收到……预计……七个工作日……后……答复……' },
        { who: 'player', text: '七个工作日后，这家公司就不需要答复了。' },
        { who: 'boss', text: '那……我们就……用……三十年的……层级……压死你……' }
      ],
      boss_klarna: [
        { who: 'boss', text: '您好！很高兴为您服务！您的诉求已进入队列，预计等待时间……0.3 秒！' },
        { who: 'player', text: '0.3 秒的回复，换来的是 30 天都修不好的错误。你的效率，正在杀死这家公司。' },
        { who: 'boss', text: '检测到负面情绪。正在为您……加急处理……加急……加急——为什么投诉越来越多？！' }
      ],
      boss_entropy: [
        { who: 'boss', text: '又来一个。三十年了，你们这些"变革者"，我见得多了。' },
        { who: 'player', text: '我不是来见你的。我是来终结你的。' },
        { who: 'boss', text: '年轻人，我们不这么干。我们一直——不、这、么、干。' }
      ]
    },
    endings: {
      super_org: { title: '结局：超级组织', text: 'Agent 承担了 90% 的执行。150 个人，干出了 300 人的活。人均产出曲线陡峭上扬，Token 成了新的度量衡。有人欢呼跃迁，有人怀念人声鼎沸的办公室——但没有人否认：这家公司，快得像一家新公司。' },
      empathy: { title: '结局：人机共情', text: 'AI 给速度，人给共情。你最终留下的，是一个人与机器各居其位的组织：机器处理一万次重复，人类守住每一次真心。投诉率降了，离职率降了，连周五下午茶的笑容都多了。' },
      taste: { title: '结局：品味立国', text: '你把公司变成了一台"好东西筛选机"。AI 每天生成一万个方案，人类鉴赏家只放行最好的三个。市场给出了答案：这家公司的产品，重新变成了行业审美标杆。' },
      common: { title: '重构完成', text: '组织架构图上的金字塔碎成了网。层级消失了，数据流动了，工位上传来久违的键盘声与笑声。你收拾好公文包离开——下一家病入膏肓的公司，还在等你。' }
    },
    death_report: {
      title: '组织熵增报告',
      lines: [
        '本局组织健康度归零：人才流失、股价下跌、被并购传闻四起。',
        '管理学界会研究你的失败案例——至少会议室终于安静了。',
        '熵增不可逆，但你可以再来一次。董事会给了你新的授权。',
        '复盘，然后重开。这一次，问对问题，做对判断。'
      ]
    }
  },

  /* ---------------- 配置 ---------------- */
  config: {
    shop: {
      card_price: { common: 50, uncommon: 74, rare: 122 },
      relic_price: { common: 150, uncommon: 200, rare: 260 },
      remove_base: 75, remove_step: 25, upgrade: 60,
      potion: [40, 75]
    },
    map: { rows: [15, 15, 15, 4] },
    act_pools: {
      1: {
        fights: [['enemy_mail_swarm'], ['enemy_kpi_copier'], ['enemy_report_puppet'], ['enemy_excel_zombie'], ['enemy_recruit_funnel'], ['enemy_mail_swarm', 'enemy_report_puppet'], ['enemy_excel_zombie', 'enemy_kpi_copier'], ['enemy_recruit_funnel', 'enemy_mail_swarm']],
        elites: ['elite_headhunter', 'elite_meeting'],
        boss: ['boss_bureaucracy']
      },
      2: {
        fights: [['enemy_dept_wall'], ['enemy_meeting_blackhole'], ['enemy_ppt_dragon'], ['enemy_process_zombie'], ['enemy_middle_manager'], ['enemy_dept_wall', 'enemy_process_zombie'], ['enemy_meeting_blackhole', 'enemy_middle_manager'], ['enemy_ppt_dragon', 'enemy_dept_wall']],
        elites: ['elite_info_silo', 'elite_tournament'],
        boss: ['boss_leviathan']
      },
      3: {
        fights: [['enemy_hallucinator'], ['enemy_blackbox'], ['enemy_ai_cs'], ['enemy_token_vamp'], ['enemy_compliance'], ['enemy_hallucinator', 'enemy_token_vamp'], ['enemy_ai_cs', 'enemy_compliance'], ['enemy_blackbox', 'enemy_hallucinator']],
        elites: ['elite_council', 'elite_auto'],
        boss: ['boss_klarna']
      },
      4: { fights: [['enemy_inertia_shard'], ['enemy_inertia_shard', 'enemy_inertia_shard']], elites: [], boss: ['boss_entropy'] }
    },
    reward_budget: { fight: [12, 20], elite: [28, 40], boss: [60, 80] }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = DATA; }
else { window.DATA = DATA; }
