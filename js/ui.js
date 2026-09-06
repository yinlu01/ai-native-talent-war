/* ============================================================
 * 《AI 原生人才争夺战》 UI 控制器（游戏流程串联）
 * 依赖: engine.js / data.js / map.js / audio.js
 * ============================================================ */
(function () {
  'use strict';
  const D = window.DATA, E = window.Engine, MG = window.MapGen;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  /* ---------------- 全局 Run 状态 ---------------- */
  const G = {
    screen: 'menu',
    charId: null,
    deck: [],            // 卡组实例 [{uid, defId, upgraded, buffD...}]
    upgraded: {},        // defId -> bool（休息点升级）
    hp: 0, maxHp: 0,
    budget: 0,
    relics: [],
    potions: [],
    act: 1, actMax: 4,
    maps: [],            // 每幕地图
    pos: null,           // {row, col}
    battle: null,
    removeCount: 0,
    freeRemove: false,
    lastBattleMeta: null,
    eventResults: [],
    stats: { fights: 0, elites: 0, dmg: 0, turns: 0 },
    choiceCardUid: null, // 待选择目标的卡
    _actionLock: false,  // 全局操作锁，防止快速点击重复触发
    _overlayLock: false, // overlay 操作锁
  };

  /* 全局操作锁：防止快速点击在状态更新前重复触发；计数器支持嵌套 */
  function withLock(fn) {
    G._actionLock = (G._actionLock || 0) + 1;
    try { fn(); } finally {
      G._actionLock--;
      if (G._actionLock < 0) G._actionLock = 0;
    }
  }

  /* ---------------- 工具 ---------------- */
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('on'));
    $('#screen-' + id).classList.add('on');
    G.screen = id;
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._tm);
    t._tm = setTimeout(() => t.classList.remove('on'), 1800);
  }

  const TYPE_ICON = { attack: '⚔️', skill: '🤝', power: '🏛️', strategy: '🎯' };
  const KW_LABEL = {
    judgment: '判断', question: '提问', taste: '鉴赏', synergy: '协同',
    audit: '审查', iterate: '迭代', orchestrate: '编排', transparency: '透明化'
  };
  const TYPE_LABEL = { attack: '执行', skill: '协作', power: '制度', strategy: '战略' };
  const STATUS_INFO = {
    chaos: { n: '混乱', d: '受到伤害 +50%', bad: 1 },
    inefficient: { n: '低效', d: '造成伤害 -25%', bad: 1 },
    attrition: { n: '人才流失', d: '回合结束受到等量伤害并递减', bad: 1 },
    charging: { n: '蓄力', d: '正在酝酿大动作（【直击要害】可三倍打击）', bad: 1 },
    strength: { n: '指标膨胀', d: '攻击力提升', bad: 1 },
    layer: { n: '层级', d: '攻防提升的层级', bad: 1 },
    ai_hallucination: { n: 'AI幻觉', d: '自身伤害 -3/层', bad: 1 },
    info_gap: { n: '信息差', d: '无法看到敌人意图', bad: 1 },
    customer_anger: { n: '客户不满', d: '满 15 层时舆情爆发（25 点穿透伤害）', bad: 1 },
    entropy: { n: '组织熵', d: '回合结束扣血且所有牌费用 +1', bad: 1 },
    focus: { n: '专注', d: '攻击 +1/层', good: 1 },
    agile: { n: '响应力', d: '防火墙 +1/层', good: 1 },
    morale: { n: '士气', d: '回合结束回血', good: 1 },
    taste_power: { n: '鉴伪之力', d: '对【AI产物】敌人伤害 +25%', good: 1 },
    quality_gate: { n: '质量守门', d: '每回合首次受到的伤害减半', good: 1 },
    fullstack: { n: '全栈', d: '打出 0 费牌时抽 1 张', good: 1 },
    transparent_culture: { n: '透明文化', d: '每回合开始揭示敌人意图', good: 1 },
    agile_standup: { n: '敏捷站会', d: '每回合开始获得 1 个执行Agent', good: 1 },
    human_ratio: { n: '人机配比', d: '每回合开始按卡组配比获得 Token 或防火墙', good: 1 },
    okr: { n: 'OKR', d: '回合结束获得 1 判断点', good: 1 }
  };

  function opText(op) {
    switch (op.op) {
      case 'damage': return `造成 ${op.v} 点伤害`;
      case 'damage_all': return `对所有敌人造成 ${op.v} 点伤害`;
      case 'damage_per': {
        const st = op.stat === 'agents_played' ? '已打出Agent数' : op.stat === 'zero_played' ? '本回合0费牌数' : '问题数';
        return `造成 ${op.base}+${op.each}×${st} 伤害`;
      }
      case 'damage_vs': return `造成 ${op.v} 点伤害；对【蓄力】敌人 ×${op.mult}`;
      case 'block': return `获得 ${op.v} 点防火墙`;
      case 'draw': return `抽 ${op.v} 张牌`;
      case 'heal': return `恢复 ${op.v} 点组织健康度`;
      case 'energy': return `本回合 +${op.v} Token`;
      case 'energy_max': return `本局战斗 Token 上限 +${op.v}`;
      case 'gain': return op.res === 'insight' ? `获得 ${op.v} 点判断点` : op.res === 'question' ? `获得 ${op.v} 点问题数` : `获得 ${op.v} 点打磨`;
      case 'enemy_status': return `给予敌方 ${op.v} 层「${STATUS_INFO[op.s] ? STATUS_INFO[op.s].n : op.s}」`;
      case 'cleanse_enemy': return `移除敌方 ${op.v} 层「${STATUS_INFO[op.s] ? STATUS_INFO[op.s].n : op.s}」`;
      case 'self_status': return `获得 ${op.v} 层「${STATUS_INFO[op.s] ? STATUS_INFO[op.s].n : op.s}」`;
      case 'cleanse_self': return `移除 ${op.v} 层负面状态`;
      case 'cleanse_all': return `移除所有负面状态`;
      case 'summon_agents': return `将 ${op.v} 张「执行Agent」加入手牌`;
      case 'reveal': return `揭示所有敌人意图 ${op.v >= 99 ? '整场' : op.v + ' 回合'}`;
      case 'next_draw': return (op.v >= 0 ? `下回合抽牌 +${op.v}` : `下回合抽牌 ${op.v}`);
      case 'discount_turn': return `本回合所有牌费用 -${op.v}`;
      case 'polish_hand': return `随机强化手牌 1 张（+${op.v}）`;
      case 'polish_deck': return `选择抽牌堆 1 张牌永久 +${op.v}`;
      case 'shuffle_discard': return `弃牌堆洗回抽牌堆`;
      case 'discard_all_draw': return `弃置所有手牌，抽 ${op.draw} 张并强化 +${op.buff}`;
      case 'insight_burst': return `判断点≥${op.threshold} 时额外 ${op.extra} 伤害并清空判断点`;
      case 'scry': return `查看抽牌堆顶 ${op.look} 张，弃置至多 ${op.discard} 张`;
      case 'budget': return `获得 ${op.v} 预算`;
      case 'exhaust': return '';
      default: return '';
    }
  }

  function cardDescText(def) {
    const parts = [];
    for (const op of def.effects || []) { const t = opText(op); if (t) parts.push(t); }
    if (def.insightBonus) {
      const bp = def.insightBonus.map(opText).filter(Boolean);
      if (bp.length) parts.push(`【判断】已获信息时：` + bp.join('，'));
    }
    return parts.join('。');
  }

  /* ---------------- 卡牌 DOM ---------------- */
  function makeCardEl(inst, opts) {
    opts = opts || {};
    const def = E.cardDef(D, inst);
    const el = document.createElement('div');
    el.className = `card color-${def.color} rarity-${def.rarity}` + (inst.upgraded ? ' upgraded' : '') + (inst.buffD > 0 || inst.buffB > 0 ? ' buff' : '');
    el.dataset.uid = inst.uid;
    const kws = (def.keywords || []).map(k => KW_LABEL[k]).filter(Boolean);
    let desc = cardDescText(def);
    if (inst.buffD > 0) desc += `（已强化 +${inst.buffD}）`;
    el.innerHTML = `
      <div class="cost ${def.cost === 0 ? 'free' : ''}">${def.cost}</div>
      <div class="card-name">${def.name}</div>
      <div class="card-type">${TYPE_LABEL[def.type] || def.type} ${kws.length ? '· ' + kws.join(' ') : ''}</div>
      <div class="card-art">${TYPE_ICON[def.type] || '🃏'}</div>
      <div class="card-desc">${desc || '&nbsp;'}</div>`;
    if (opts.tip !== false) {
      el.addEventListener('mouseenter', () => {
        if (G.screen === 'battle' && G.battle && !G.battle.pendingChoice) showTooltip(el, def, inst);
      });
    }
    return el;
  }

  function showTooltip(el, def, inst) {
    // flavor 悬浮提示通过 title 兜底（简单可靠）
    el.title = `${def.flavor || ''}\n—— ${def.concept || ''}`;
  }

  /* ---------------- 主菜单 ---------------- */
  $('#btn-start').addEventListener('click', () => { SFX.play('click'); showScreen('select'); renderSelect(); });
  $('#btn-help').addEventListener('click', () => { SFX.play('click'); showHelp(); });
  $('#mute-btn').addEventListener('click', () => {
    const m = SFX.toggle();
    $('#mute-btn').textContent = m ? '🔇' : '🔊';
  });
  $('#deck-btn').addEventListener('click', () => {
    if (G.deck.length) showCardView('当前卡组', G.deck.slice());
  });

  function showHelp() {
    openOverlay('ov-generic', `
      <div class="overlay-title">玩法指南<small>《AI 原生人才争夺战》—— 杀戮尖塔式 Roguelike 卡牌</small></div>
      <div style="max-width:660px;font-size:14px;line-height:2.1;color:var(--txt2);text-align:left">
        <b style="color:var(--amber)">目标</b>：扮演组织变革顾问，带领 AI 原生人才卡组闯过 3 幕组织病症 + 终章，击败「组织熵增之王」。<br>
        <b style="color:var(--amber)">Token</b>：每回合 3 点能量，用于打出卡牌（人才行动）。<br>
        <b style="color:var(--amber)">防火墙</b>：格挡值，回合结束清零——护得住一时，护不住一世。<br>
        <b style="color:var(--amber)">意向公告</b>：敌人会公示下回合行动，明牌博弈、预判取舍是核心策略。<br>
        <b style="color:var(--amber)">地图</b>：每幕 15 层，自行规划路线——精英=高风险高回报，复盘会=恢复/升级卡牌，猎头市场=买卡/删牌。<br>
        <b style="color:var(--amber)">卡组哲学</b>：卡组不是越多越好——「删牌」往往比「加牌」更强，小而精的人才团队才能打硬仗。<br>
        <b style="color:var(--amber)">四个关键词</b>：【提问】揭示信息、【判断】基于信息爆发、【鉴赏】打磨强化、【编排】Agent 调度。跨关键词组合远强于单打独斗。
      </div>
      <div class="overlay-actions"><div class="btn primary" id="ov-close">明白了</div></div>`);
    $('#ov-close').addEventListener('click', closeOverlays);
  }

  /* ---------------- 角色选择 ---------------- */
  let selChar = null;
  function renderSelect() {
    selChar = null;
    const row = $('#char-row');
    row.innerHTML = '';
    for (const ch of Object.values(D.chars)) {
      const el = document.createElement('div');
      el.className = 'char-card';
      el.style.setProperty('--cc', `var(--${ch.color})`);
      el.innerHTML = `
        <img src="${ch.portrait}" alt="${ch.name}">
        <div class="char-info">
          <div class="char-name">${ch.name}<em>${ch.title}</em></div>
          <div class="char-role">${ch.code} · ${KW_LABEL[ch.color]}型</div>
          <div class="char-hp">组织健康度 <b>${ch.hp}</b> · Token ${ch.energy}/回合</div>
          <div class="char-mech"><b>${ch.passive.name}</b>：${ch.passive.desc}<br><b>${ch.mechanic.name}</b>：${ch.mechanic.desc}</div>
          <div class="char-quote">"${ch.quote}"</div>
        </div>`;
      el.addEventListener('click', () => {
        SFX.play('click');
        selChar = ch.id;
        $$('.char-card').forEach(c => c.classList.remove('sel'));
        el.classList.add('sel');
      });
      row.appendChild(el);
    }
  }
  $('#btn-sel-back').addEventListener('click', () => { SFX.play('click'); showScreen('menu'); });
  $('#btn-sel-go').addEventListener('click', () => {
    if (!selChar) return toast('请先选择一位变革领袖');
    SFX.play('click');
    startRun(selChar);
  });

  function startRun(charId) {
    if (G._actionLock) return;
    withLock(() => {
      const ch = D.chars[charId];
      G.charId = charId;
      G.deck = [];
      for (const d of ch.deck) for (let i = 0; i < d.n; i++) G.deck.push({ uid: 'r' + Math.random().toString(36).slice(2), defId: d.card, upgraded: false });
      G.upgraded = {};
      G.hp = ch.hp; G.maxHp = ch.hp;
      G.budget = 99;
      G.relics = [ch.relic];
      G.potions = [];
      G.act = 1;
      G.maps = [];
      G.pos = null;
      G.removeCount = 0;
      G.freeRemove = false;
      G.stats = { fights: 0, elites: 0, dmg: 0, turns: 0 };
      G.eventResults = [];
      G._battleResolved = false;
      playOpening();
    });
  }

  /* ---------------- 剧情（打字机） ---------------- */
  let typeTimer = null;
  function playTypewriter(lines, boxSel, textSel, onDone, speed) {
    speed = speed || 34;
    const box = $(boxSel), txt = $(textSel);
    box.classList.add('on');
    let li = 0, ci = 0, cur = '', done = false;
    const finish = (skipped) => {
      if (done) return;
      done = true;
      clearInterval(typeTimer);
      box.classList.remove('on');
      onDone && onDone(skipped);
    };
    clearInterval(typeTimer);
    txt.innerHTML = '';
    function tick() {
      if (li >= lines.length) { finish(false); return; }
      const line = lines[li];
      cur = line.slice(0, ++ci);
      txt.innerHTML = cur + '<span class="cursor"></span>';
      if (ci >= line.length) { li++; ci = 0; typeTimer = setTimeout(tick, 620); }
      else typeTimer = setTimeout(tick, speed);
    }
    tick();
    box.onclick = () => {
      if (li < lines.length && ci > 0 && ci < lines[li].length) {
        ci = lines[li].length; txt.innerHTML = lines[li] + '<span class="cursor"></span>';
      } else if (li < lines.length) { li++; ci = 0; }
      else { finish(true); }
    };
  }

  function playOpening() {
    const st = D.story.opening;
    showScreen('story');
    $('#story-bg').style.backgroundImage = `url(assets/bg_menu.png)`;
    playTypewriter(st, '#story-box', '#story-text', (skipped) => {
      if (G.screen !== 'story' || G._openingDone) return;  // 已离开剧情屏则不再触发
      G._openingDone = true;
      showScreen('map');
      newAct(1);
    });
  }

  /* ---------------- 幕 / 地图 ---------------- */
  /* SVG图标（更精致的视觉效果） */
  const NODE_ICONS = {
    entrance: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10"/></svg>`,
    fight: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 7l4 4M7 17l-4 4"/></svg>`,
    elite: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>`,
    shop: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>`,
    rest: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>`,
    event: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>`,
    boss: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 8v4M12 16h.01"/></svg>`
  };

  const NODE_META = {
    entrance: { icon: 'entrance', label: '入口', color: '#38bdf8' },
    fight: { icon: 'fight', label: '部门挑战', color: '#ef6a5a' },
    elite: { icon: 'elite', label: '关键战役', color: '#d4a94e' },
    shop: { icon: 'shop', label: '猎头市场', color: '#4ade80' },
    rest: { icon: 'rest', label: '复盘会', color: '#f5b453' },
    event: { icon: 'event', label: '管理事件', color: '#a78bfa' },
    boss: { icon: 'boss', label: 'BOSS战', color: '#ef6a5a' }
  };

  /* 每幕主题色（用于地图背景/节点辉光） */
  const ACT_THEME = {
    1: { bg: '#0a0f1a', accent: '#38bdf8', glow: 'rgba(56,189,248,0.15)', name: '从0到1' },
    2: { bg: '#0d1510', accent: '#4ade80', glow: 'rgba(74,222,128,0.12)', name: '规模化' },
    3: { bg: '#100d1a', accent: '#a78bfa', glow: 'rgba(167,139,250,0.12)', name: '人机协同' },
    4: { bg: '#1a0d0d', accent: '#ef6a5a', glow: 'rgba(239,106,90,0.15)', name: '终极重构' }
  };

  const ACT_NAME = { 1: '第一幕 · 从 0 到 1', 2: '第二幕 · 规模化', 3: '第三幕 · 人机协同治理', 4: '终章 · 终极重构' };
  const ACT_BG = { 1: 'bg_act1', 2: 'bg_act2', 3: 'bg_act3', 4: 'bg_final' };

  function newAct(act) {
    G.act = act;
    G.pos = null;
    G.maps[act] = MG.generateAct(act);
    renderMap();
    showScreen('map');
    if (act > 1) toast(ACT_NAME[act] + ' 开始');
  }

  function renderMap() {
    const map = G.maps[G.act];
    const m = map.rows;
    const theme = ACT_THEME[G.act];
    $('#map-title').textContent = ACT_NAME[G.act];
    $('#map-sub').textContent = `第 ${G.act} 幕 · 选择你的路线`;
    $('#hud-hp').textContent = `${G.hp} / ${G.maxHp}`;
    $('#hud-budget').textContent = G.budget;

    // 更新地图背景主题色
    const mapScreen = $('#screen-map');
    mapScreen.style.background = `linear-gradient(180deg, ${theme.bg} 0%, #080c14 100%)`;
    mapScreen.querySelector('::before') && mapScreen.style.setProperty('--map-accent', theme.accent);

    const relicBar = $('#relic-bar');
    relicBar.innerHTML = '';
    for (const rid of G.relics) {
      const r = D.relics[rid];
      if (!r) continue;
      const el = document.createElement('div');
      el.className = 'relic-dot ' + r.rarity;
      el.innerHTML = '🏛️<div class="relic-tip"><b>' + r.name + '（' + ({ common: '普通', uncommon: '罕见', rare: '稀有' }[r.rarity]) + '）</b>' + r.desc + '<br><span style="color:var(--txt2)">' + r.theme + '</span></div>';
      relicBar.appendChild(el);
    }

    const svgWrap = $('#map-svg');
    const W = svgWrap.clientWidth || 1200;
    const H = svgWrap.clientHeight || 700;

    const rows = m.length;
    const numCols = 3;
    const padX = W * 0.18;
    const padTop = 60;
    const padBot = 80;
    const rowGap = (H - padTop - padBot) / (rows - 1);
    const colWidth = (W - padX * 2) / (numCols - 1);

    // 列位置：左、中、右
    const colX = [padX, W / 2, W - padX];

    // 计算每行每列节点的位置
    const posOf = (r, c) => ({
      x: colX[c],
      y: H - padBot - r * rowGap
    });

    // 计算可用节点集合
    let avail = new Set();
    if (!G.pos) {
      // 起点：从第1行（不是入口行）开始选
      m[1] && m[1].forEach((node, c) => {
        if (node) avail.add('1,' + c);
      });
    } else {
      // 根据当前位置找下一层可选节点
      const currentNode = m[G.pos.row][G.pos.col];
      if (currentNode) {
        currentNode.edges.forEach(c => {
          if (m[G.pos.row + 1] && m[G.pos.row + 1][c]) {
            avail.add((G.pos.row + 1) + ',' + c);
          }
        });
      }
    }

    // 构建SVG边缘
    let edges = '';
    for (let r = 0; r < rows - 1; r++) {
      m[r].forEach((node, c) => {
        if (!node) return;
        node.edges.forEach(t => {
          if (!m[r + 1][t]) return;
          const a = posOf(r, c), b = posOf(r + 1, t);
          const isLit = G.pos && G.pos.row === r && G.pos.col === c;
          const isPast = G.pos && r < G.pos.row;
          const alpha = isPast ? 0.08 : isLit ? 0.7 : 0.25;
          const color = isPast ? '#4a5568' : theme.accent;
          edges += `<path d="M${a.x},${a.y} L${b.x},${b.y}"
            stroke="${color}" stroke-width="${isLit ? 3 : 2}" stroke-opacity="${alpha}"
            fill="none" ${isLit ? 'stroke-dasharray="6,3"' : ''}/>`;
        });
      });
    }

    // 构建节点
    let nodes = '';
    for (let r = 0; r < rows; r++) {
      m[r].forEach((node, c) => {
        if (!node) return;
        const p = posOf(r, c);
        const meta = NODE_META[node.type];
        const key = r + ',' + c;
        const isAvail = avail.has(key);
        const isCur = G.pos && G.pos.row === r && G.pos.col === c;
        const isPast = !isAvail && !isCur && G.pos && r < G.pos.row;
        const isBoss = node.type === 'boss';
        const R = isBoss ? 32 : 26;

        const stateClass = isCur ? 'current' : isPast ? 'past' : isAvail ? 'avail' : 'locked';
        const fillColor = isCur ? meta.color : isPast ? '#2a3a52' : isAvail ? meta.color : '#16213c';
        const fillOpacity = isCur ? 1 : isPast ? 0.6 : isAvail ? 0.92 : 0.75;
        const strokeW = isCur ? 3 : isBoss ? 2.5 : 1.5;

        nodes += `<g class="map-node ${stateClass}${isBoss ? ' boss-node' : ''}" data-key="${key}" data-type="${node.type}" transform="translate(${p.x},${p.y})">
          <circle class="node-ring" r="${R + 8}" fill="none" stroke="${meta.color}" stroke-width="2" opacity="${isAvail && !isCur ? 0.6 : 0.2}"/>
          <circle class="node-bg" r="${R}" fill="${fillColor}" fill-opacity="${fillOpacity}"
            stroke="${isCur ? meta.color : '#2a3a52'}" stroke-width="${strokeW}"
            ${isCur ? `filter="url(#glow)"` : ''}/>
          <g class="node-icon" transform="translate(-13,-13)" style="color:${isCur ? meta.color : isPast ? '#4a5568' : '#8fa3c4'}">
            ${NODE_ICONS[node.type] || NODE_ICONS.fight}
          </g>
          <text class="map-node-label" y="${R + 18}" text-anchor="middle" font-size="11" fill="${isPast ? '#4a5568' : '#8fa3c4'}">${meta.label}</text>
          ${isCur ? `<text y="${-R - 6}" text-anchor="middle" font-size="10" fill="${meta.color}" font-weight="bold">当前</text>` : ''}
        </g>`;
      });
    }

    // 添加BOSS血条指示（当前进度）
    let progressBar = '';
    if (G.pos) {
      const progress = G.pos.row / (rows - 1) * 100;
      progressBar = `<rect x="${padX}" y="${H - 30}" width="${W - padX * 2}" height="4" rx="2" fill="#1a2535"/>
        <rect x="${padX}" y="${H - 30}" width="${(W - padX * 2) * progress / 100}" height="4" rx="2" fill="${theme.accent}"/>`;
    }

    svgWrap.innerHTML = `<svg id="map-svg-inner" viewBox="0 0 ${W} ${H}" style="width:100%;height:100%">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      ${edges}
      ${nodes}
      ${progressBar}
    </svg>`;

    // 事件委托：绑定到SVG容器上，避免动态元素问题
    svgWrap.onclick = function(e) {
      var el = e.target.closest('.map-node');
      if (!el) return;
      var key = el.dataset.key;
      if (!key) return;
      var isAvail = el.classList.contains('avail');
      var isCurrent = el.classList.contains('current');
      if (!isAvail && !isCurrent) return;
      var parts = key.split(',');
      var r = parseInt(parts[0]);
      var c = parseInt(parts[1]);
      SFX.play('click');
      enterNode(r, c);
    };
  }

  function enterNode(r, c) {
    withLock(() => {
      const node = G.maps[G.act].rows[r][c];
      if (!node) return;
      G.pos = { row: r, col: c };
      node.visited = true;
      switch (node.type) {
        case 'fight': startFight('fight'); break;
        case 'elite': startFight('elite'); break;
        case 'boss': startFight('boss'); break;
        case 'shop': openShop(); break;
        case 'rest': openRest(); break;
        case 'event': openEvent(); break;
      }
    });
  }

  /* ---------------- 战斗 ---------------- */
  function pickEnemies(kind) {
    const pool = D.config.act_pools[G.act] || D.config.act_pools[3];
    if (kind === 'boss') return [pool.boss[0]];
    if (kind === 'elite') return [pick(pool.elites)];
    return pick(pool.fights);
  }

  function startFight(kind, enemyIds) {
    const ids = enemyIds || pickEnemies(kind);
    G.lastBattleMeta = { kind, ids };
    // Boss 前剧情对话
    if (kind === 'boss') {
      const bid = ids[0];
      const dlg = D.story.boss_dialogues[bid];
      if (dlg) {
        showScreen('story');
        $('#story-bg').style.backgroundImage = `url(assets/${bid}.png)`;
        playDialogue(dlg, () => beginBattle(ids, kind));
        return;
      }
    }
    beginBattle(ids, kind);
  }

  function playDialogue(dlg, onDone) {
    let i = 0;
    const box = $('#dialogue-box');
    $('#story-box').style.display = 'none';
    box.style.display = 'block';
    function step() {
      if (i >= dlg.length) { box.style.display = 'none'; $('#story-box').style.display = ''; onDone(); return; }
      const line = dlg[i];
      $('#dialogue-who').textContent = line.who === 'boss' ? '？？？' : D.chars[G.charId].name;
      $('#dialogue-who').className = 'dialogue-who' + (line.who === 'boss' ? ' enemy' : '');
      const t = $('#dialogue-text');
      t.textContent = '';
      let ci = 0;
      clearInterval(typeTimer);
      typeTimer = setInterval(() => {
        t.textContent = line.text.slice(0, ++ci);
        if (ci >= line.text.length) clearInterval(typeTimer);
      }, 32);
      box.onclick = () => {
        clearInterval(typeTimer);
        t.textContent = line.text;
        setTimeout(() => { i++; step(); }, 250);
      };
    }
    step();
  }

  function beginBattle(ids, kind) {
    withLock(() => {
      const ch = D.chars[G.charId];
      G._battleResolved = false;
      G.battle = E.startBattle(D, {
        charId: G.charId,
        deckInst: G.deck.map(x => ({ ...x })),
        maxHp: G.maxHp, hp: G.hp,
        enemies: ids, relics: G.relics, potions: [...G.potions],
        act: G.act
      });
      G.potions = G.battle.player.potions;
      showScreen('battle');
      $('#battle-bg').style.backgroundImage = `url(assets/${ACT_BG[G.act]}.png)`;
      document.documentElement.style.setProperty('--cc', `var(--${ch.color})`);
      SFX.play(kind === 'boss' ? 'boss' : 'turn');
      renderBattle();
    });
  }

  const INTENT_ICON = { attack: '⚔️', block: '🛡️', debuff: '🌀', buff: '📈', self_status: '💭', steal_token: '🪙', summon: '➕', discard_hand: '🗑️', tax: '🧾', hand_limit: '✋', draw_down: '📉', idle: '💤', charge: '⚡' };

  function renderBattle() {
    const b = G.battle;
    if (!b) return;
    const P = b.player;
    const ch = D.chars[G.charId];

    /* 敌人 */
    const ez = $('#enemy-zone');
    ez.innerHTML = '';
    const targeting = !!G.choiceCardUid;
    b.enemies.forEach((e, i) => {
      const def = D.enemies[e.defId];
      const el = document.createElement('div');
      el.className = 'enemy' + (e.hp <= 0 ? ' dead' : '') + (def.boss ? ' boss' : '') + (targeting && e.hp > 0 ? ' targetable' : '');
      el.dataset.idx = i;
      let intentHtml = '';
      if (e.hp > 0) {
        if (E.intentVisible(b, e)) {
          const it = E.getIntent(b, e);
          let detail = '';
          if (it.t === 'attack') {
            let dmg = it.v + (e.statuses.strength || 0) + (e.statuses.layer || 0) * 2;
            if (e.statuses.inefficient > 0) dmg = Math.round(dmg * .75);
            if (e.statuses.ai_hallucination > 0) dmg = Math.max(0, dmg - 3 * e.statuses.ai_hallucination);
            detail = `⚔️ ${dmg}${(it.hits || 1) > 1 ? '×' + it.hits : ''}${it.ignore_block ? ' 破防' : ''}<br><span style="font-size:10px;color:var(--txt2)">${it.label}</span>`;
            el.dataset.atk = dmg * (it.hits || 1);
          } else {
            detail = `${INTENT_ICON[it.t] || '❔'} ${it.label || ''}`;
          }
          intentHtml = `<div class="intent ${it.t}">${detail}</div>`;
        } else {
          intentHtml = `<div class="intent hidden-intent">❔ 意图未知<br><span style="font-size:10px">（信息差）</span></div>`;
        }
      }
      const statuses = Object.entries(e.statuses).filter(([k, v]) => v > 0 && STATUS_INFO[k]).map(([k, v]) =>
        `<span class="status-chip ${STATUS_INFO[k].bad ? 'bad' : 'good'}">${STATUS_INFO[k].n} ${v}<div class="status-tip">${STATUS_INFO[k].d}</div></span>`).join('');
      el.innerHTML = `
        ${intentHtml}
        <img class="enemy-img" src="assets/${e.defId}.png" alt="${e.name}">
        <div class="enemy-name">${e.name}${e.statuses.charging ? ' ⚡' : ''}</div>
        <div class="enemy-hpbar"><i style="width:${Math.max(0, e.hp / e.maxHp * 100)}%"></i><span>${Math.max(0, e.hp)} / ${e.maxHp}</span></div>
        ${e.block > 0 ? `<div class="enemy-block">🛡️ ${e.block}</div>` : ''}
        <div class="status-row">${statuses}</div>`;
      if (targeting && e.hp > 0) {
        el.addEventListener('click', () => chooseTarget(i));
      }
      ez.appendChild(el);
    });

    /* 玩家状态 */
    $('#char-avatar').src = ch.portrait;
    $('#hud-hp-val').textContent = `${P.hp} / ${P.maxHp}`;
    $('#hp-fill').style.height = (P.hp / P.maxHp * 100) + '%';
    $('#energy-val').textContent = P.energy;
    $('#energy-max').textContent = '/ ' + P.maxEnergy;
    $('#block-val').textContent = P.block;
    $('#block-wrap').style.display = P.block > 0 ? 'flex' : 'none';
    $('#pile-draw-n').textContent = P.draw.length;
    $('#pile-discard-n').textContent = P.discard.length;
    $('#pile-exhaust-n').textContent = P.exhaust.length;
    $('#btn-end-turn').classList.toggle('disabled', b.state !== 'player' || !!b.pendingChoice);

    /* 资源 */
    let resHtml = '';
    if (P.resources.insight > 0 || G.charId === 'suchen') resHtml += `<span class="status-chip info" style="border-color:var(--judgment)">判断点 ${P.resources.insight}/3<div class="status-tip">终结技资源：【判断】牌与【大会战】积累</div></span>`;
    if (P.resources.question > 0) resHtml += `<span class="status-chip info">问题数 ${P.resources.question}<div class="status-tip">提问积累：问得越多，答案越准（【答案之门】按此结算）</div></span>`;
    const pstat = Object.entries(P.statuses).filter(([k, v]) => v > 0 && STATUS_INFO[k]).map(([k, v]) =>
      `<span class="status-chip ${STATUS_INFO[k].bad ? 'bad' : 'good'}">${STATUS_INFO[k].n} ${v}<div class="status-tip">${STATUS_INFO[k].d}</div></span>`).join('');
    $('#player-status').innerHTML = resHtml + pstat;

    /* 药水 */
    const pb = $('#potion-bar');
    pb.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const pid = P.potions[i];
      const el = document.createElement('div');
      el.className = 'potion-slot' + (pid ? ' filled' : '');
      if (pid) {
        const p = D.potions[pid];
        el.innerHTML = '🧪<div class="potion-tip"><b>' + p.name + '</b>' + p.desc + '<br><span style="color:var(--txt2)">' + p.flavor + '</span></div>';
        el.addEventListener('click', () => { if (b.state === 'player') { E.usePotion(b, i); SFX.play('potion'); renderBattle(); } });
      } else el.textContent = '';
      pb.appendChild(el);
    }

    /* 手牌 */
    renderHand();

    /* 待定选择（占卜/打磨） */
    if (b.pendingChoice) renderPendingChoice();

    /* 日志 */
    const log = $('#combat-log');
    const recent = b.log.slice(-14).reverse();
    log.innerHTML = recent.map(l => logLine(l)).join('');
  }

  function logLine(l) {
    switch (l.type) {
      case 'card_played': return `<div>▶ 打出 <span class="hl">${l.name}</span></div>`;
      case 'damage': return `<div>对「${D.enemies[l.target] ? D.enemies[l.target].name : l.target}」造成 <span class="hl">${l.dmg}</span> 伤害${l.blocked ? `（格挡 ${l.blocked}）` : ''}</div>`;
      case 'player_damage': return `<div class="bad">受到 <b>${l.dmg}</b> 点伤害</div>`;
      case 'dot': return `<div class="hl">人才流失结算：${l.dmg} 伤害</div>`;
      case 'enemy_attack': return `<div class="bad">${D.enemies[l.target].name}：${l.label}（${l.v}）</div>`;
      case 'heal': return `<div class="hl">恢复 ${l.v} 生命</div>`;
      case 'block': return `<div>获得 ${l.v} 防火墙</div>`;
      case 'draw': return `<div>抽牌</div>`;
      case 'status': return `<div>${l.dir > 0 ? '施加' : '移除'} ${l.s} ×${Math.abs(l.dir)}</div>`;
      case 'summon': return `<div class="bad">敌人增援：${D.enemies[l.enemy] ? D.enemies[l.enemy].name : l.enemy}</div>`;
      case 'hook': return `<div class="hl">⚡ ${l.hook}</div>`;
      case 'boss_form': return `<div class="bad">【${l.form}】现身${l.duration ? `（持续${l.duration}回合）` : ''}</div>`;
      case 'boss_phase': return `<div class="bad">BOSS 进入第 ${l.phase} 阶段！</div>`;
      case 'victory': return `<div class="hl">✔ 组织挑战胜利！</div>`;
      case 'defeat': return `<div class="bad">✘ 组织崩解……</div>`;
      case 'turn_start': return `<div>—— 第 ${l.turn} 回合 ——</div>`;
      case 'misfire': return `<div class="hl">失控自伤 ${l.dmg}</div>`;
      case 'klarna_burst': return `<div class="bad">舆情爆发！</div>`;
      case 'kpi_explode': return `<div class="bad">KPI 过载自爆！</div>`;
      case 'enemy_block': return `<div>${D.enemies[l.target] ? D.enemies[l.target].name : l.target}获得 ${l.v} 防火墙</div>`;
      case 'enemy_idle': return `<div>${D.enemies[l.target] ? D.enemies[l.target].name : l.target}发呆中（${l.reason === 'stagger' ? '被越级沟通' : l.reason === 'relic' ? '直达老板邮箱' : '空闲'}）</div>`;
      case 'token_stolen': return `<div class="bad">被偷走 ${l.v} 点 Token</div>`;
      case 'tax': return `<div class="bad">首张牌费用 +${l.v}</div>`;
      case 'reshuffle': return `<div>洗牌</div>`;
      case 'exhaust': return `<div class="hl">卡牌被消耗</div>`;
      case 'polish': return `<div>卡牌被强化 +${l.v}</div>`;
      case 'cost_up': return `<div>卡牌费用 +1</div>`;
      case 'charge': return `<div>${D.enemies[l.target] ? D.enemies[l.target].name : l.target}蓄力中</div>`;
      case 'steal_token': return `<div class="bad">${D.enemies[l.target] ? D.enemies[l.target].name : l.target}偷取 ${l.v} Token</div>`;
      case 'entropy_burst': return `<div class="bad">组织熵增爆发！</div>`;
      case 'player_blocked': return `<div>格挡 ${l.v} 伤害</div>`;
      case 'hand_crunched': return `<div>手牌上限 -${l.v}</div>`;
      case 'draw_down': return `<div>下回合抽牌 -${l.v}</div>`;
      case 'hand_limit': return `<div>手牌上限 -${l.v}</div>`;
      case 'extra_token': return `<div class="hl">额外 Token +1（幸运！）</div>`;
      case 'death_save': return `<div class="hl">失败庆祝派对触发！保留1点HP</div>`;
      case 'entropy_weak_doubt': return `<div class="hl">【提问】削弱了怀疑之击！</div>`;
      case 'entropy_weak_fear': return `<div class="hl">【透明化】削弱了恐惧之击！</div>`;
      default: return '';
    }
  }

  function renderHand() {
    const b = G.battle;
    const P = b.player;
    const hz = $('#hand-cards');
    hz.innerHTML = '';
    const n = P.hand.length;
    P.hand.forEach((inst, i) => {
      const def = E.cardDef(D, inst);
      const cost = E.getCost(b, inst);
      const el = makeCardEl(inst);
      el.style.setProperty('--i', i);
      /* 扇形排布 */
      const mid = (n - 1) / 2;
      const angle = (i - mid) * Math.min(4, 40 / Math.max(n, 1));
      const lift = Math.pow(Math.abs(i - mid), 2) * -2.2;
      el.style.transform = `rotate(${angle}deg) translateY(${lift}px)`;
      el.style.zIndex = i;
      const playable = b.state === 'player' && !b.pendingChoice && cost <= P.energy && !G.choiceCardUid;
      el.classList.toggle('playable', cost <= P.energy && b.state === 'player' && !b.pendingChoice);
      el.classList.toggle('unaffordable', cost > P.energy);
      /* 费用角标实时更新（税/折扣） */
      el.querySelector('.cost').textContent = cost;
      el.querySelector('.cost').classList.toggle('free', cost === 0);
      el.addEventListener('click', () => {
        withLock(() => {
          if (b.pendingChoice || b.state !== 'player') return;
          if (G.choiceCardUid) { cancelTargeting(); return; }
          if (cost > P.energy) { SFX.play('error'); toast('Token 不足'); return; }
          tryPlayCard(inst);
        });
      });
      hz.appendChild(el);
    });
  }

  function tryPlayCard(inst) {
    const b = G.battle;
    const def = E.cardDef(D, inst);
    const alive = b.enemies.filter(e => e.hp > 0).length;
    if (def.target === 'enemy' && alive > 1) {
      // 需要选目标
      G.choiceCardUid = inst.uid;
      $('#target-hint').classList.add('on');
      renderBattle();
      return;
    }
    doPlay(inst, undefined);
  }

  function chooseTarget(idx) {
    const b = G.battle;
    const inst = b.player.hand.find(c => c.uid === G.choiceCardUid);
    G.choiceCardUid = null;
    $('#target-hint').classList.remove('on');
    if (inst) doPlay(inst, idx);
  }

  function cancelTargeting() {
    G.choiceCardUid = null;
    $('#target-hint').classList.remove('on');
    renderBattle();
  }

  function doPlay(inst, targetIdx) {
    const b = G.battle;
    const r = E.playCard(b, inst.uid, targetIdx);
    if (!r.ok) { SFX.play('error'); if (r.msg) toast(r.msg); return; }
    const def = E.cardDef(D, inst);
    SFX.play(def.type === 'attack' ? 'card' : 'draw');
    renderBattle();
    /* 伤害动画 */
    requestAnimationFrame(() => animateDamage(b));
    if (b.pendingChoice) renderPendingChoice();
    checkBattleEnd();
  }

  function animateDamage(b) {
    const log = b.log;
    for (let i = log.length - 1; i >= 0 && i > log.length - 12; i--) {
      const l = log[i];
      if (l.type === 'damage' && !l._anim) {
        l._anim = true;
        const el = $(`.enemy[data-idx="${b.enemies.findIndex(e => e.defId === l.target)}"]`);
        if (el) {
          el.classList.add('hit-anim');
          const pop = document.createElement('div');
          pop.className = 'dmg-pop' + (l.crit ? ' crit' : '');
          pop.textContent = '-' + l.dmg;
          el.appendChild(pop);
          setTimeout(() => { el.classList.remove('hit-anim'); pop.remove(); }, 800);
        }
        SFX.play(l.crit ? 'crit' : 'hit');
      }
      if (l.type === 'player_damage' && !l._anim) {
        l._anim = true;
        SFX.play('debuff');
      }
      if (l.type === 'block' && !l._anim) { l._anim = true; SFX.play('block'); }
      if (l.type === 'heal' && !l._anim) { l._anim = true; SFX.play('heal'); }
    }
  }

  function renderPendingChoice() {
    const b = G.battle;
    const ch = b.pendingChoice;
    if (!ch) return;
    if (ch.type === 'polish_deck') {
      const cards = b.player.draw.slice(-8).map(inst => {
        const el = makeCardEl(inst);
        el.addEventListener('click', () => { E.resolveChoice(b, inst.uid); SFX.play('coin'); renderBattle(); });
        return el;
      });
      openOverlay('ov-generic', `
        <div class="overlay-title">选择要打磨的牌<small>「品味」：选中抽牌堆中的 1 张牌，永久强化 +${ch.v}</small></div>
        <div class="overlay-cards" id="polish-pick"></div>`);
      const box = $('#polish-pick');
      cards.forEach(c => box.appendChild(c));
    } else if (ch.type === 'scry') {
      openOverlay('ov-generic', `
        <div class="overlay-title">【审查】结果<small>查看抽牌堆顶部 ${ch.look} 张，点击弃置至多 ${ch.discardMax} 张</small></div>
        <div class="overlay-cards" id="scry-pick"></div>
        <div class="overlay-actions"><div class="btn primary" id="scry-done">确认</div></div>`);
      const box = $('#scry-pick');
      const picked = new Set();
      ch.options.forEach(uid => {
        const inst = b.player.draw.find(c => c.uid === uid);
        if (!inst) return;
        const el = makeCardEl(inst);
        el.addEventListener('click', () => {
          if (picked.has(uid)) { picked.delete(uid); el.style.outline = ''; }
          else if (picked.size < ch.discardMax) { picked.add(uid); el.style.outline = '3px solid var(--red)'; }
        });
        box.appendChild(el);
      });
      $('#scry-done').addEventListener('click', () => {
        E.resolveChoice(b, [...picked]);
        closeOverlays();
        renderBattle();
      });
    }
  }

  $('#btn-end-turn').addEventListener('click', () => {
    withLock(() => {
      const b = G.battle;
      if (!b || b.state !== 'player' || b.pendingChoice) return;
      cancelTargeting();
      SFX.play('turn');
      E.endTurn(b);
      renderBattle();
      requestAnimationFrame(() => animateDamage(b));
      checkBattleEnd();
    });
  });

  function checkBattleEnd() {
    const b = G.battle;
    if (!b) return;
    if (b.state === 'won') {
      SFX.play('win');
      setTimeout(() => withLock(() => onBattleWon()), 900);
    } else if (b.state === 'lost') {
      SFX.play('lose');
      setTimeout(() => withLock(() => onBattleLost()), 900);
    }
  }

  /* ---------------- 战斗胜利/失败 ---------------- */
  function onBattleWon() {
    const b = G.battle;
    if (!b || b.state !== 'won') return;   // 状态守卫：防止对非胜利战斗重复结算
    if (G._battleResolved) return; G._battleResolved = true;
    const meta = G.lastBattleMeta;
    G.hp = Math.max(1, b.player.hp);
    G.budget += b.player.budgetGain || 0;
    /* 药水归还 */
    G.potions = [...b.player.potions];
    /* 战斗胜利奖励遗物效果 */
    for (const rid of G.relics) {
      const r = D.relics[rid];
      if (r) {
        if (r.hook === 'heal_on_win') G.hp = Math.min(G.maxHp, G.hp + (r.params.v || 4));
        if (r.hook === 'budget_bonus_win') { /* 已在预算结算 */ }
        if (r.hook === 'intern_agent') G.hp = Math.max(1, G.hp - (r.params.heal_penalty || 2));
      }
    }
    /* 预算奖励 */
    const kind = meta.kind;
    const [lo, hi] = D.config.reward_budget[kind] || D.config.reward_budget.fight;
    let gold = ri(lo, hi);
    if (G.relics.includes('relic_amiba')) gold = Math.round(gold * 1.3);
    G.budget += gold;
    G.stats[kind === 'elite' ? 'elites' : 'fights']++;
    G.stats.dmg += b.stats.damageDealt;
    G.stats.turns += b.stats.turns;

    /* 奖励界面 */
    const rewards = [];
    rewards.push({ icon: '💰', text: `预算 +${gold}`, fn: null });
    /* 卡牌三选一 */
    if (kind !== 'event_fight') {
      rewards.push({ icon: '🃏', text: '人才招募（三选一加卡）', fn: onBack => offerCards(kind, onBack) });
    }
    /* 精英/BOSS 遗物 */
    if (kind === 'elite' || kind === 'boss') {
      rewards.push({ icon: '🏛️', text: kind === 'boss' ? '组织遗物（BOSS 级）' : '组织遗物', fn: onBack => offerRelic(kind === 'boss', onBack) });
    }
    if (kind === 'fight' && G.relics.includes('relic_xiaoyou') && Math.random() < 0.2) {
      rewards.push({ icon: '🎁', text: '校友网络：额外三选一', fn: onBack => offerCards('fight', onBack) });
    }
    /* 药水 */
    if (Math.random() < 0.4 && G.potions.length < 3) {
      rewards.push({ icon: '🧪', text: '获得道具（药水）', fn: onBack => { G.potions.push(pick(Object.keys(D.potions))); toast('获得道具'); onBack(); } });
    }
    openRewards(rewards, () => {
      G.battle = null;
      afterNodeDone();
    });
  }

  function onBattleLost() {
    const b = G.battle;
    if (!b || b.state !== 'lost') return;  // 状态守卫
    if (G._battleResolved) return; G._battleResolved = true;
    G.hp = 0;
    showScreen('death');
    $('#death-title').textContent = D.story.death_report.title;
    $('#death-text').innerHTML = D.story.death_report.lines.join('<br>');
    const ch = D.chars[G.charId];
    $('#death-stats').innerHTML = `
      领队：${ch.name} · ${ch.title}<br>
      战绩：${G.stats.fights} 场部门挑战 · ${G.stats.elites} 场关键战役<br>
      总输出：${G.stats.dmg + b.stats.damageDealt} 点伤害 · 存活 ${G.stats.turns + b.stats.turns} 个回合<br>
      死因：${D.enemies[G.lastBattleMeta.ids[0]] ? D.enemies[G.lastBattleMeta.ids[0]].name : '未知'} 战役`;
  }
  $('#btn-restart').addEventListener('click', () => { SFX.play('click'); showScreen('select'); renderSelect(); });
  $('#btn-retry').addEventListener('click', () => { SFX.play('click'); startRun(G.charId); });

  /* ---------------- 卡牌奖励三选一 ---------------- */
  function cardPool(kind) {
    const ch = D.chars[G.charId];
    const pool = [];
    /* 角色专属 75% + 中立 25% */
    for (const c of Object.values(D.cards)) {
      if (c.rarity === 'starter' || c.rarity === 'special') continue;
      if (c.color === ch.color) pool.push({ c, w: 3 });
      else if (c.color === 'neutral') pool.push({ c, w: 1 });
      else if (G.act >= 2 && Math.random() < 0.15) pool.push({ c, w: 0.3 }); // 少量异色人才（协作空间）
    }
    return pool;
  }

  function rollCards(n, forceRare) {
    const pool = cardPool();
    const out = [];
    const used = new Set();
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      const total = pool.reduce((s, p) => s + p.w, 0);
      let r = Math.random() * total;
      let chosen = pool[0].c;
      for (const p of pool) { r -= p.w; if (r <= 0) { chosen = p.c; break; } }
      if (used.has(chosen.id)) continue;
      used.add(chosen.id);
      out.push(chosen);
    }
    /* 稀有度修正 */
    for (let i = 0; i < out.length; i++) {
      const roll = Math.random();
      let want = roll < 0.5 ? 'common' : roll < 0.83 ? 'uncommon' : 'rare';
      if (forceRare && i === 0) want = 'rare';
      if (G.relics.includes('relic_dujiao')) want = i < 2 ? 'uncommon' : want;
      const cands = pool.filter(p => p.c.rarity === want && !used.has(p.c.id));
      if (cands.length) { out[i] = pick(cands).c; used.add(out[i].id); }
    }
    return out;
  }

  function offerCards(kind, onBack) {
    const forceRare = kind === 'boss' || G.relics.includes('relic_dujiao');
    const cards = rollCards(3, forceRare);
    openOverlay('ov-cards', `
      <div class="overlay-title">人才招募<small>${kind === 'boss' ? 'BOSS 战利品（保底稀有人才）' : '选择一位新人才加入卡组'} —— 也可以全部拒绝</small></div>
      <div class="overlay-cards" id="pick-cards"></div>
      <div class="overlay-actions">
        <div class="btn" id="pick-skip">全部婉拒（有时不加牌才是对的）</div>
      </div>`);
    const box = $('#pick-cards');
    const back = () => { closeOverlays(); if (onBack) onBack(); };
    cards.forEach(def => {
      const inst = { uid: 'n' + def.id, defId: def.id, upgraded: false };
      const el = makeCardEl(inst);
      el.addEventListener('click', () => {
        G.deck.push({ uid: 'r' + Math.random().toString(36).slice(2), defId: def.id, upgraded: false });
        SFX.play('coin');
        toast(`「${def.name}」加入卡组`);
        back();
      });
      box.appendChild(el);
    });
    $('#pick-skip').addEventListener('click', back);
  }

  function offerRelic(bossLevel, onBack) {
    const owned = new Set(G.relics);
    const cands = Object.values(D.relics).filter(r => !owned.has(r.id) && !['relic_liangzhou', 'relic_jiangxin', 'relic_codebanana', 'relic_wuwenfa'].includes(r.id));
    const back = () => { closeOverlays(); if (onBack) onBack(); };
    if (!cands.length) { toast('没有可选遗物'); back(); return; }
    const relic = pick(cands);
    G.relics.push(relic.id);
    SFX.play('coin');
    openOverlay('ov-generic', `
      <div class="overlay-title">获得组织遗物<small>${{ common: '普通', uncommon: '罕见', rare: '稀有' }[relic.rarity]}</small></div>
      <div style="text-align:center">
        <div style="font-size:64px;margin:10px 0">🏛️</div>
        <div style="font-size:22px;color:var(--gold);margin-bottom:12px">${relic.name}</div>
        <div style="max-width:440px;font-size:14px;line-height:2;color:var(--txt2)">${relic.desc}<br><span style="font-size:12px">${relic.theme}</span></div>
      </div>
      <div class="overlay-actions"><div class="btn primary" id="ov-close">收入囊中</div></div>`);
    $('#ov-close').addEventListener('click', back);
  }

  /* ---------------- 奖励列表 UI ---------------- */
  function openRewards(items, onAllDone) {
    if (G._actionLock) return;
    withLock(() => {
      const claimed = new Set();
      const renderList = () => {
        openOverlay('ov-reward', `
          <div class="overlay-title">挑战胜利<small>领取你的战利品</small></div>
          <div class="reward-list" id="reward-list"></div>
          <div class="overlay-actions"><div class="btn primary" id="reward-done">继续</div></div>`);
        const list = $('#reward-list');
        items.forEach((it, i) => {
          const el = document.createElement('div');
          el.className = 'reward-item' + (claimed.has(i) ? ' done' : '');
          el.innerHTML = `<span class="ri">${it.icon}</span><span>${it.text}</span>`;
          el.addEventListener('click', () => {
            if (el.classList.contains('done')) return;
            claimed.add(i);
            if (it.fn) {
              /* 子界面完成后返回奖励列表 */
              it.fn(renderList);
            } else {
              renderList();
            }
          });
          list.appendChild(el);
        });
        $('#reward-done').addEventListener('click', () => {
          closeOverlays();
          onAllDone();
        });
      };
      renderList();
    });
  }

  /* ---------------- 事件 ---------------- */
  function openEvent() {
    const used = new Set(G.eventResults);
    const cands = D.events.filter(e => !used.has(e.id));
    const ev = cands.length ? pick(cands) : pick(D.events);
    G.eventResults.push(ev.id);
    openOverlay('ov-event', `
      <div class="event-box">
        <div class="event-name">❓ ${ev.name}</div>
        <div class="event-src">改编自：${ev.source}</div>
        <div class="event-text">${ev.text}</div>
        <div class="event-opts" id="ev-opts"></div>
      </div>`);
    const box = $('#ev-opts');
    ev.options.forEach(opt => {
      const el = document.createElement('div');
      el.className = 'event-opt';
      let costNote = '';
      if (opt.cost) {
        if (opt.cost.budget) costNote = `<span class="cost-note">（花费 ${opt.cost.budget} 预算）</span>`;
        if (opt.cost.budget_pct) costNote = `<span class="cost-note">（花费 ${opt.cost.budget_pct}% 预算）</span>`;
      }
      el.innerHTML = opt.label + costNote;
      el.addEventListener('click', () => applyEventOption(ev, opt));
      box.appendChild(el);
    });
  }

  function applyEventOption(ev, opt) {
    /* 检查预算 */
    if (opt.cost) {
      if (opt.cost.budget && G.budget < opt.cost.budget) return toast('预算不足');
      if (opt.cost.budget_pct) {
        const c = Math.floor(G.budget * opt.cost.budget_pct / 100);
        if (G.budget < c) return toast('预算不足');
        G.budget -= c;
      }
      if (opt.cost.budget) G.budget -= opt.cost.budget;
    }
    let needFight = null, needRemove = false, needUpgrade = 0, freeRemove = false;
    for (const eff of opt.effects) {
      switch (eff.oe) {
        case 'heal': G.hp = Math.min(G.maxHp, G.hp + eff.v); break;
        case 'budget': G.budget += eff.v; break;
        case 'relic': G.relics.push(eff.id); break;
        case 'upgrade': needUpgrade += eff.n; break;
        case 'remove_card': needRemove = true; break;
        case 'remove_random': {
          if (G.deck.length > 5) {
            const i = ri(0, G.deck.length - 1);
            const gone = G.deck.splice(i, 1)[0];
            toast(`失去「${D.cards[gone.defId].name}」`);
          }
          break;
        }
        case 'card': G.deck.push({ uid: 'r' + Math.random().toString(36).slice(2), defId: eff.id, upgraded: false }); break;
        case 'fight': needFight = eff.enemy; break;
        case 'free_remove': freeRemove = true; break;
        case 'act_buff': break; // 简化：不实现局内减益
      }
    }
    /* 展示结果文本 */
    openOverlay('ov-generic', `
      <div class="overlay-title">${ev.name}<small>抉择已定</small></div>
      <div style="max-width:560px;font-size:15px;line-height:2.2;color:#d8e2f3;text-align:left">${opt.result}</div>
      <div class="overlay-actions"><div class="btn primary" id="ev-result-ok">继续</div></div>`);
    $('#ev-result-ok').addEventListener('click', () => {
      closeOverlays();
      const steps = [];
      if (needUpgrade) steps.push(() => upgradeCardsFlow(needUpgrade, () => afterEventSteps()));
      else if (needRemove) steps.push(() => removeCardFlow(() => afterEventSteps()));
      else if (freeRemove) steps.push(() => removeCardFlow(() => afterEventSteps(), true));
      else afterEventSteps();
      function afterEventSteps() {
        if (needFight) startFight('event_fight', [needFight]);
        else afterNodeDone();
      }
      if (steps.length) steps[0]();
    });
  }

  /* ---------------- 休息 ---------------- */
  function openRest() {
    openOverlay('ov-generic', `
      <div class="rest-box">
        <div class="rest-title">☕ 复盘会</div>
        <div class="rest-sub">团队围坐一圈，复盘得失。你可以选择恢复组织健康度，<br>或对一位人才进行深度培训（升级卡牌）。</div>
        <div class="rest-opts">
          <div class="rest-opt" id="rest-heal">
            <div class="ri">💚</div>
            <div class="rn">团队休整</div>
            <div class="rd">恢复 30% 组织健康度<br>（约 ${Math.floor(G.maxHp * 0.3)} 点）</div>
          </div>
          <div class="rest-opt" id="rest-upgrade">
            <div class="ri">📚</div>
            <div class="rn">人才培训</div>
            <div class="rd">升级卡组中的 1 张卡牌<br>（效果永久增强）</div>
          </div>
        </div>
      </div>`);
    $('#rest-heal').addEventListener('click', () => {
      G.hp = Math.min(G.maxHp, G.hp + Math.floor(G.maxHp * 0.3));
      SFX.play('heal');
      closeOverlays();
      afterNodeDone();
    });
    $('#rest-upgrade').addEventListener('click', () => {
      closeOverlays();
      upgradeCardsFlow(1, () => afterNodeDone());
    });
  }

  function upgradeCardsFlow(n, onDone) {
    const upgradable = G.deck.filter(x => !x.upgraded && D.cards[x.defId].upgrade);
    if (!upgradable.length) { toast('没有可升级的卡牌'); onDone(); return; }
    pickFromDeck('人才培训：选择升级的卡牌', upgradable, (inst) => {
      inst.upgraded = true;
      SFX.play('coin');
      toast(`「${D.cards[inst.defId].name}」已升级`);
      if (--n > 0) upgradeCardsFlow(n, onDone); else onDone();
    });
  }

  function removeCardFlow(onDone, free) {
    if (!free) {
      // 商店内由商店流程处理；事件中直接选
    }
    if (G.deck.length <= 5) { toast('卡组已是最小规模'); onDone(); return; }
    pickFromDeck('优化编制：选择移除的卡牌（' + (free ? '本次免费' : '') + '）', G.deck.slice(), (inst) => {
      G.deck.splice(G.deck.indexOf(inst), 1);
      toast(`「${D.cards[inst.defId].name}」离开卡组`);
      onDone();
    });
  }

  function pickFromDeck(title, cards, onPick) {
    openOverlay('ov-cards', `
      <div class="overlay-title">${title}<small>点击卡牌确认</small></div>
      <div class="overlay-cards" id="deck-pick"></div>
      <div class="overlay-actions"><div class="btn" id="deck-pick-cancel">取消</div></div>`);
    const box = $('#deck-pick');
    cards.forEach(inst => {
      const el = makeCardEl(inst);
      el.addEventListener('click', () => { closeOverlays(); onPick(inst); });
      box.appendChild(el);
    });
    $('#deck-pick-cancel').addEventListener('click', () => { closeOverlays(); });
  }

  /* ---------------- 商店 ---------------- */
  function openShop() {
    const C = D.config.shop;
    const cards = rollCards(4);
    const relicCands = Object.values(D.relics).filter(r => !G.relics.includes(r.id) && !['relic_liangzhou', 'relic_jiangxin', 'relic_codebanana', 'relic_wuwenfa'].includes(r.id));
    const shopRelics = [];
    let guard = 0;
    while (shopRelics.length < 2 && relicCands.length && guard++ < 50) {
      const r = pick(relicCands);
      if (!shopRelics.includes(r)) shopRelics.push(r);
    }
    const potion = pick(Object.values(D.potions));
    const removeCost = C.remove_base + G.removeCount * C.remove_step;

    G._shopState = { cards, shopRelics, potion, removeCost, sold: new Set(), removed: false };

    renderShop();
  }

  function renderShop() {
    const S = G._shopState;
    const C = D.config.shop;
    openOverlay('ov-shop', `
      <div class="overlay-title">🛒 猎头市场<small>预算：<b id="shop-budget" style="color:var(--amber)">${G.budget}</b> $ · 人才与工具明码标价</small></div>
      <div class="shop-grid" id="shop-grid"></div>
      <div class="overlay-actions">
        <div class="btn" id="shop-remove">🗑️ 优化编制（删 1 张牌，${G.freeRemove ? '免费' : S.removeCost + ' $'})</div>
        <div class="btn primary" id="shop-leave">离开市场</div>
      </div>`);
    const grid = $('#shop-grid');

    /* 卡牌列 */
    const col1 = document.createElement('div');
    col1.className = 'shop-col';
    S.cards.forEach((def, i) => {
      if (S.sold.has('c' + i)) return;
      const price = C.card_price[def.rarity];
      const el = makeCardEl({ uid: 's' + i, defId: def.id, upgraded: false });
      el.classList.add('shop-item');
      el.insertAdjacentHTML('beforeend', `<div class="shop-price ${G.budget < price ? 'no' : ''}">${price} $</div>`);
      el.addEventListener('click', () => {
        if (G.budget < price) return toast('预算不足');
        G.budget -= price;
        G.deck.push({ uid: 'r' + Math.random().toString(36).slice(2), defId: def.id, upgraded: false });
        S.sold.add('c' + i);
        SFX.play('coin');
        toast(`「${def.name}」签约入组`);
        renderShop();
      });
      col1.appendChild(el);
    });
    grid.appendChild(col1);

    /* 遗物+药水列 */
    const col2 = document.createElement('div');
    col2.className = 'shop-col';
    S.shopRelics.forEach((r, i) => {
      if (S.sold.has('r' + i)) return;
      const price = C.relic_price[r.rarity];
      const el = document.createElement('div');
      el.className = 'shop-item';
      el.innerHTML = `<div class="relic-dot ${r.rarity}" style="width:64px;height:64px;font-size:28px">🏛️</div>
        <div style="text-align:center;font-size:13px;color:var(--gold);margin-top:6px">${r.name}</div>
        <div style="text-align:center;font-size:11px;color:var(--txt2);max-width:190px;line-height:1.6;margin-top:4px">${r.desc}</div>
        <div class="shop-price ${G.budget < price ? 'no' : ''}">${price} $</div>`;
      el.addEventListener('click', () => {
        if (G.budget < price) return toast('预算不足');
        G.budget -= price;
        G.relics.push(r.id);
        S.sold.add('r' + i);
        SFX.play('coin');
        toast(`获得遗物「${r.name}」`);
        renderShop();
      });
      col2.appendChild(el);
    });
    /* 药水 */
    if (!S.sold.has('p')) {
      const price = ri(C.potion[0], C.potion[1]);
      S.potionPrice = price;
      const el = document.createElement('div');
      el.className = 'shop-item';
      el.innerHTML = `<div class="potion-slot filled" style="width:64px;height:64px;font-size:30px">🧪</div>
        <div style="text-align:center;font-size:13px;color:var(--purple);margin-top:6px">${S.potion.name}</div>
        <div style="text-align:center;font-size:11px;color:var(--txt2);max-width:190px;line-height:1.6;margin-top:4px">${S.potion.desc}</div>
        <div class="shop-price ${G.budget < price ? 'no' : ''}">${price} $</div>`;
      el.addEventListener('click', () => {
        if (G.potions.length >= 3) return toast('道具栏已满');
        if (G.budget < price) return toast('预算不足');
        G.budget -= price;
        G.potions.push(S.potion.id);
        S.sold.add('p');
        SFX.play('coin');
        renderShop();
      });
      col2.appendChild(el);
    }
    grid.appendChild(col2);

    $('#shop-budget').textContent = G.budget;
    $('#shop-remove').addEventListener('click', () => {
      if (G.deck.length <= 5) return toast('卡组已是最小规模');
      closeOverlays();
      removeCardFlow(() => {
        if (!G.freeRemove) { G.budget -= S.removeCost; G.removeCount++; }
        else G.freeRemove = false;
        renderShop();
      });
    });
    $('#shop-leave').addEventListener('click', () => { closeOverlays(); afterNodeDone(); });
  }

  /* ---------------- 节点完成 → 幕推进 ---------------- */
  function afterNodeDone() {
    const map = G.maps[G.act];
    const lastRow = map.rows.length - 1;
    if (G.pos && G.pos.row >= lastRow) {
      /* 幕 BOSS 已通关 */
      if (G.act >= G.actMax) {
        showEnding();
      } else {
        newAct(G.act + 1);
      }
      return;
    }
    renderMap();
    showScreen('map');
  }

  /* ---------------- 结局 ---------------- */
  function showEnding() {
    showScreen('ending');
    $('#ending-bg').style.backgroundImage = 'url(assets/bg_final.png)';
    /* 按本局关键词统计选择结局 */
    const kw = G._kwAgg || { question: 1, taste: 1, orchestrate: 1 };
    const ch = D.chars[G.charId];
    const intro = `${ch.name}带领的卡组：${G.deck.length} 张牌 · ${G.relics.length} 件遗物 · 预算 ${G.budget} $<br>部门挑战 ${G.stats.fights} 胜 · 关键战役 ${G.stats.elites} 胜 · 总输出 ${G.stats.dmg} 伤害`;
    const ending = D.story.endings[ch.color === 'agent' ? 'super_org' : ch.color === 'taste' ? 'taste' : ch.color === 'question' ? 'empathy' : 'super_org'];
    $('#ending-title').textContent = '重构完成';
    $('#ending-text').innerHTML = ending.text + '<br><br>' + D.story.endings.common.text;
    $('#ending-stats').innerHTML = intro + `<br><b>${ending.title}</b>`;
    SFX.play('win');
  }
  $('#btn-ending-menu').addEventListener('click', () => { SFX.play('click'); showScreen('menu'); });
  $('#btn-ending-new').addEventListener('click', () => { SFX.play('click'); showScreen('select'); renderSelect(); });

  /* ---------------- 弹层管理 ---------------- */
  function openOverlay(id, html) {
    if (G._overlayLock) return;
    G._overlayLock = true;
    try {
      const ov = $('#' + id) || $('#ov-generic');
      if (id !== 'ov-generic' && ov) { ov.innerHTML = html; ov.classList.add('on'); return; }
      $('#ov-generic').innerHTML = html;
      $('#ov-generic').classList.add('on');
    } finally { G._overlayLock = false; }
  }
  function closeOverlays() {
    if (G._overlayLock) return;
    G._overlayLock = true;
    try { $$('.overlay').forEach(o => { o.classList.remove('on'); o.innerHTML = ''; }); }
    finally { G._overlayLock = false; }
  }
  window.closeOverlays = closeOverlays;

  /* 查看抽牌堆/弃牌堆 */
  $('#pile-draw').addEventListener('click', () => {
    if (!G.battle) return;
    showCardView('抽牌堆（乱序）', shuffleView(G.battle.player.draw));
  });
  $('#pile-discard').addEventListener('click', () => {
    if (!G.battle) return;
    showCardView('弃牌堆', G.battle.player.discard.slice());
  });
  $('#pile-exhaust').addEventListener('click', () => {
    if (!G.battle) return;
    showCardView('消耗堆', G.battle.player.exhaust.slice());
  });

  function shuffleView(arr) { return arr.slice().sort(() => Math.random() - .5); }

  function showCardView(title, cards) {
    openOverlay('ov-cards', `
      <div class="overlay-title">${title}<small>共 ${cards.length} 张</small></div>
      <div class="overlay-cards" id="view-cards"></div>
      <div class="overlay-actions"><div class="btn primary" id="view-close">关闭</div></div>`);
    const box = $('#view-cards');
    cards.forEach(inst => {
      const el = makeCardEl(inst);
      el.classList.add('static');
      box.appendChild(el);
    });
    $('#view-close').addEventListener('click', closeOverlays);
  }

  /* 测试钩子（E2E 驱动用） */
  window.ATW = { G, showScreen, newAct, startRun, startFight, beginBattle, renderBattle, renderMap, enterNode, afterNodeDone, closeOverlays, onBattleWon, onBattleLost, E, D };

  /* 初始化 */
  $('#screen-menu').classList.add('on');

  /* 调试模式：?debug=select|battle|map 直接跳屏（仅供渲染验证） */
  const dbg = new URLSearchParams(location.search).get('debug');
  if (dbg) {
    try {
      if (dbg === 'select') { showScreen('select'); renderSelect(); }
      if (dbg === 'map') {
        startRun('suchen');
        clearInterval(typeTimer);
        $('#story-box').classList.remove('on');
        showScreen('map'); newAct(1);
      }
      if (dbg === 'battle') {
        G.charId = 'suchen';
        const ch = D.chars[G.charId];
        G.deck = ch.deck.flatMap(d => Array(d.n).fill(d.card)).map(id => ({ uid: 'r' + Math.random().toString(36).slice(2), defId: id, upgraded: false }));
        G.maxHp = ch.hp; G.hp = 52; G.budget = 156; G.relics = [ch.relic, 'relic_touming']; G.potions = ['potion_coffee', 'potion_okr'];
        beginBattle(['boss_bureaucracy'], 'boss');
      }
    } catch (err) {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:0;left:0;z-index:9999;background:#b00;color:#fff;padding:8px;font-size:13px;';
      d.textContent = 'DEBUG ERROR: ' + err.message + ' | ' + (err.stack || '').split('\n').slice(0, 3).join(' <- ');
      document.body.appendChild(d);
    }
  }
})();
