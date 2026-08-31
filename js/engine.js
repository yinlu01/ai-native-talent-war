/* ============================================================
 * 《AI 原生人才争夺战》 战斗引擎（纯逻辑，无 DOM 依赖）
 * 浏览器: window.Engine  |  Node: module.exports
 * ============================================================ */
(function (root, factory) {
  const E = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
  else root.Engine = E;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  let UID = 1;
  const rnd = () => Math.random();
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  const HAND_LIMIT = 10;
  const MAX_ENEMIES = 6;

  /* ---------- 初始化 ---------- */
  function makeCardInstance(defId, upgraded) {
    return { uid: 'c' + (UID++), defId, upgraded: !!upgraded, buffD: 0, buffB: 0, costUp: 0 };
  }

  function cardDef(DATA, inst) {
    const d = DATA.cards[inst.defId];
    if (inst.upgraded && d.upgrade) {
      return Object.assign({}, d, {
        name: d.upgrade.name || d.name + '+',
        cost: d.upgrade.cost !== undefined ? d.upgrade.cost : d.cost,
        effects: d.upgrade.effects || d.effects,
        insightBonus: d.upgrade.insightBonus || d.insightBonus,
        upgraded: true
      });
    }
    return d;
  }

  function makeEnemy(DATA, defId) {
    const d = DATA.enemies[defId];
    if (!d) return null;
    const hp = Array.isArray(d.hp) ? ri(d.hp[0], d.hp[1]) : d.hp;
    const e = {
      defId, name: d.name, maxHp: hp, hp, block: 0, turnCount: 0,
      statuses: {}, hookState: {}, summoned: false,
      phaseIdx: 0, boss: !!d.boss, elite: !!d.elite,
      tags: d.tags || [], hooks: d.hooks || []
    };
    for (const h of e.hooks) {
      if (h.hook === 'layer_beast') e.statuses.layer = h.start_layers || 2;
      if (h.hook === 'auto_accel') e.hookState.actions = 2;
      if (h.hook === 'entropy_king') { e.hookState.form = 0; e.hookState.formDuration = 0; }
    }
    return e;
  }

  function startBattle(DATA, cfg) {
    UID = 1;
    const ch = DATA.chars[cfg.charId];
    let deck;
    if (cfg.deckInst) {
      deck = cfg.deckInst.map(x => { x.buffD = 0; x.buffB = 0; x.costUp = 0; return x; });
      shuffle(deck);
    } else {
      deck = cfg.deck.map(id => makeCardInstance(id, cfg.upgraded && cfg.upgraded[id]));
      shuffle(deck);
    }
    const b = {
      DATA,
      charId: cfg.charId,
      act: cfg.act || 1,
      state: 'player',
      turn: 1,
      revealTurns: ch.id === 'wengu' ? 9999 : 0,
      log: [],
      pendingChoice: null,
      stats: { damageDealt: 0, cardsPlayed: 0, turns: 0, keywords: {} },
      player: {
        maxHp: cfg.maxHp || ch.hp, hp: cfg.hp || ch.hp, block: 0,
        maxEnergy: ch.energy, energy: ch.energy,
        draw: deck, hand: [], discard: [], exhaust: [],
        statuses: {},
        resources: { insight: 0, question: 0, polish: 0 },
        relics: cfg.relics || [], potions: cfg.potions || [],
        flags: {
          infoGained: false, judgmentPlayed: false, cardsPlayed: 0,
          zeroPlayed: 0, agentsPlayed: 0, firstQuestion: false,
          firstDiscardRecall: false, deathSaved: false,
          discount: 0, taxPending: 0, handLimitNext: 0, drawDownNext: 0,
          hpAtTurnStart: cfg.hp || ch.hp
        }
      },
      enemies: cfg.enemies.map(id => makeEnemy(DATA, id)).filter(Boolean)
    };

    /* 战斗开始遗物 */
    for (const rid of b.player.relics) {
      const r = DATA.relics[rid];
      if (!r) continue;
      const p = r.params || {};
      switch (r.hook) {
        case 'combat_start_cleanse': cleanseSelf(b, p.v || 1); break;
        case 'combat_start_agents': for (let i = 0; i < (p.v || 1); i++) addTokenAgent(b); break;
        case 'combat_start_reveal': b.revealTurns = Math.max(b.revealTurns, 99); break;
        case 'transparent_start': b.revealTurns = Math.max(b.revealTurns, p.turns || 3); break;
        case 'intern_agent': addTokenAgent(b); break;
        case 'polish_start': {
          for (let i = 0; i < (p.v || 2) && deck.length; i++) {
            const c = deck[Math.floor(rnd() * deck.length)];
            c.buffD += 2; c.buffB += 2;
          }
          break;
        }
        case 'token_up_draw_down': b.player.maxEnergy += p.token || 1; break;
        case 'token_max_up': b.player.maxEnergy += p.v || 1; break;
        case 'loyalty_draw': b.player.flags.loyaltyDraw = (b.player.flags.loyaltyDraw || 0) + (p.v || 1); break;
      }
    }
    if (b.charId === 'suchen') gainResource(b, 'insight', 1);

    drawCards(b, 5);
    b.log.push({ type: 'battle_start', enemies: b.enemies.map(e => e.defId) });
    return b;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ---------- 抽牌/手牌 ---------- */
  function drawCards(b, n) {
    const P = b.player;
    for (let i = 0; i < n; i++) {
      if (P.hand.length >= HAND_LIMIT + (P.flags.handLimitApplied || 0)) { P.flags.handOverflow = true; break; }
      if (P.draw.length === 0) {
        if (P.discard.length === 0) break;
        P.draw = shuffle(P.discard.splice(0));
        b.log.push({ type: 'reshuffle' });
      }
      const c = P.draw.pop();
      P.hand.push(c);
      b.log.push({ type: 'draw', uid: c.uid });
    }
  }

  function addTokenAgent(b) {
    const P = b.player;
    const inst = makeCardInstance('token_agent', false);
    if (P.hand.length < HAND_LIMIT) { P.hand.push(inst); b.log.push({ type: 'draw', uid: inst.uid, token: true }); }
    else P.discard.push(inst);
  }

  /* ---------- 状态 ---------- */
  function addStatus(target, s, v) {
    target.statuses[s] = (target.statuses[s] || 0) + v;
    if (target.statuses[s] < 0) target.statuses[s] = 0;
  }
  function cleanseSelf(b, v) {
    const S = b.player.statuses;
    let left = v;
    for (const key of ['info_gap', 'entropy']) {
      while (left > 0 && S[key] > 0) { S[key]--; left--; b.log.push({ type: 'status', target: 'player', s: key, dir: -1 }); }
    }
  }

  function gainResource(b, res, v) {
    const P = b.player;
    P.resources[res] = (P.resources[res] || 0) + v;
    if (res === 'insight' && P.resources.insight > 3) P.resources.insight = 3;
    b.log.push({ type: 'resource', res, v: P.resources[res] });
  }

  /* ---------- 费用 ---------- */
  function getCost(b, inst) {
    const d = cardDef(b.DATA, inst);
    let c = d.cost + (inst.costUp || 0);
    const F = b.player.flags;
    if (F.taxPending > 0) c += F.taxPending;           // 首张牌加税（打出时扣）
    if (F.discount > 0) c -= F.discount;
    if (b.player.statuses.entropy > 0) c += b.player.statuses.entropy;
    if (b.charId === 'luozhixing' && F.cardsPlayed >= 2) c -= 1; // 流水线：第3张起-1
    return Math.max(0, c);
  }

  function intentVisible(b, enemy) {
    if (b.revealTurns > 0) return true;
    if (b.player.statuses.info_gap > 0) return false;
    return true;
  }

  function getIntent(b, enemy) {
    const d = b.DATA.enemies[enemy.defId];
    let pattern = d.pattern;
    if (d.phases) {
      for (let i = 0; i < d.phases.length; i++) {
        if (enemy.hp <= enemy.maxHp * d.phases[i].below_pct / 100) { pattern = d.phases[i].pattern; enemy.phaseIdx = i + 1; }
      }
    }
    return pattern[enemy.turnCount % pattern.length];
  }

  /* ---------- 出牌 ---------- */
  function findHand(b, uid) { return b.player.hand.find(c => c.uid === uid); }

  function playCard(b, uid, targetIdx) {
    const P = b.player, F = P.flags;
    const inst = findHand(b, uid);
    if (!inst || b.state !== 'player' || b.pendingChoice) return { ok: false, msg: '无效操作' };
    const d = cardDef(b.DATA, inst);
    const cost = getCost(b, inst);
    if (cost > P.energy) return { ok: false, msg: 'Token 不足' };

    const needsTarget = d.target === 'enemy' && b.enemies.filter(e => e.hp > 0).length > 1;
    if (d.target === 'enemy' && b.enemies.filter(e => e.hp > 0).length === 1) {
      targetIdx = b.enemies.findIndex(e => e.hp > 0);
    }
    if (d.target === 'enemy' && (targetIdx === undefined || targetIdx === null || !b.enemies[targetIdx] || b.enemies[targetIdx].hp <= 0)) {
      return { ok: false, msg: '需要选择目标', needTarget: true };
    }

    /* 支付费用并结算首张牌税 */
    P.energy -= cost;
    if (F.taxPending > 0) F.taxPending = 0;
    F.cardsPlayed++;
    if (d.cost === 0) {
      F.zeroPlayed++;
      if (P.statuses.fullstack > 0) drawCards(b, 1);   // 全栈文化：0费牌抽1
    }
    if (inst.defId === 'token_agent') F.agentsPlayed++;
    b.stats.cardsPlayed++;
    for (const kw of d.keywords || []) {
      b.stats.keywords[kw] = (b.stats.keywords[kw] || 0) + 1;
      if (kw === 'question') F.questionPlayedThisTurn = true;
      if (kw === 'taste') F.tastePlayedThisTurn = true;
    }

    P.hand.splice(P.hand.indexOf(inst), 1);
    b.log.push({ type: 'card_played', uid: inst.uid, card: d.id, name: d.name, target: targetIdx });

    const ctx = { inst, d, targetIdx };
    runOps(b, d.effects || [], ctx);

    /* 【判断】：本回合获得过信息则触发加成 */
    if (d.insightBonus && F.infoGained) runOps(b, d.insightBonus, ctx);

    /* 关键词联动 */
    const kws = d.keywords || [];
    if (kws.includes('question')) {
      F.infoGained = true;
      if (b.charId === 'linwen') drawCards(b, 1);      // 被动：苏格拉底
      relicOnce(b, 'first_question_draw', () => drawCards(b, relicParam(b, 'first_question_draw', 'v', 1)));
      relicOnce(b, 'first_question_reveal', () => { b.revealTurns = Math.max(b.revealTurns, relicParam(b, 'first_question_reveal', 'turns', 1)); });
    }
    if (kws.includes('judgment')) {
      F.judgmentPlayed = true;
      relicOncePerTurn(b, 'okr_insight_token', () => { P.energy++; });
    }
    if (kws.includes('transparency') || d.effects.some(o => o.op === 'reveal')) F.infoGained = true;

    /* 卡牌去向 */
    if (d.exhaust || (d.effects || []).some(o => o.op === 'exhaust')) { P.exhaust.push(inst); b.log.push({ type: 'exhaust', uid: inst.uid }); }
    else P.discard.push(inst);

    checkDeaths(b);
    return { ok: true };
  }

  function relicParam(b, hook, key, def) {
    for (const rid of b.player.relics) {
      const r = b.DATA.relics[rid];
      if (r && r.hook === hook) return (r.params && r.params[key] !== undefined) ? r.params[key] : def;
    }
    return def;
  }
  function hasRelic(b, hook) {
    return b.player.relics.some(rid => { const r = b.DATA.relics[rid]; return r && r.hook === hook; });
  }
  function relicOnce(b, hook, fn) {
    if (!hasRelic(b, hook)) return;
    const F = b.player.flags;
    const key = 'used_' + hook;
    if (F[key]) return;
    F[key] = true; fn();
  }
  function relicOncePerTurn(b, hook, fn) {
    if (!hasRelic(b, hook)) return;
    const F = b.player.flags;
    const key = 'turn_' + hook;
    if (F[key] === b.turn) return;
    F[key] = b.turn; fn();
  }

  /* ---------- 效果执行 ---------- */
  function runOps(b, ops, ctx) {
    for (const op of ops || []) runOp(b, op, ctx);
  }

  function runOp(b, op, ctx) {
    const P = b.player;
    const target = () => b.enemies[ctx.targetIdx] && b.enemies[ctx.targetIdx].hp > 0 ? b.enemies[ctx.targetIdx] : b.enemies.find(e => e.hp > 0);
    switch (op.op) {
      case 'damage': dealDamage(b, target(), op.v + (ctx.inst ? ctx.inst.buffD : 0), ctx); break;
      case 'damage_all': for (const e of [...b.enemies]) if (e.hp > 0) dealDamage(b, e, op.v + (ctx.inst ? ctx.inst.buffD : 0), ctx); break;
      case 'damage_per': {
        const stat = op.stat === 'agents_played' ? P.flags.agentsPlayed
          : op.stat === 'zero_played' ? P.flags.zeroPlayed
          : P.resources.question || 0;
        dealDamage(b, target(), op.base + op.each * stat + (ctx.inst ? ctx.inst.buffD : 0), ctx);
        break;
      }
      case 'damage_vs': {
        const e = target();
        let v = op.v + (ctx.inst ? ctx.inst.buffD : 0);
        if (e && op.cond === 'charging' && e.statuses.charging > 0) v = Math.round(v * op.mult);
        dealDamage(b, e, v, ctx);
        break;
      }
      case 'block': gainBlock(b, op.v + (ctx.inst ? ctx.inst.buffB : 0)); break;
      case 'draw': drawCards(b, op.v); break;
      case 'heal': healPlayer(b, op.v); break;
      case 'energy': P.energy += op.v; b.log.push({ type: 'energy', v: op.v }); break;
      case 'gain': gainResource(b, op.res, op.v); break;
      case 'enemy_status': { const e = target(); if (e) { addStatus(e, op.s, op.v); b.log.push({ type: 'status', target: e.defId, s: op.s, dir: op.v }); } break; }
      case 'cleanse_enemy': {
        const e = target();
        if (e && e.statuses[op.s]) {
          let v = op.v;
          if (op.s === 'customer_anger' && hasRelic(b, 'empathy_double')) v *= 2;
          e.statuses[op.s] = Math.max(0, e.statuses[op.s] - v);
          b.log.push({ type: 'status', target: e.defId, s: op.s, dir: -v });
          checkKlarna(b);
        }
        break;
      }
      case 'self_status':
        addStatus(P, op.s, op.v);
        if (op.s === 'human_ratio') {
          /* 按卡组中 Agent 类牌数量决定模式 */
          const all = P.draw.concat(P.hand, P.discard, P.exhaust);
          const agentN = all.filter(c => (b.DATA.cards[c.defId] || {}).color === 'agent').length;
          P.flags.humanRatioMode = agentN >= 4 ? 'agent' : 'human';
          b.log.push({ type: 'hook', hook: 'human_ratio_mode', mode: P.flags.humanRatioMode });
        }
        b.log.push({ type: 'status', target: 'player', s: op.s, dir: op.v });
        break;
      case 'cleanse_self': cleanseSelf(b, op.v); break;
      case 'cleanse_all': P.statuses.info_gap = 0; P.statuses.entropy = 0; b.log.push({ type: 'status', target: 'player', s: 'cleanse_all', dir: 0 }); break;
      case 'summon_agents': for (let i = 0; i < op.v; i++) addTokenAgent(b); break;
      case 'reveal': b.revealTurns = Math.max(b.revealTurns, op.v); P.flags.infoGained = true; b.log.push({ type: 'reveal', turns: op.v }); break;
      case 'next_draw': P.flags.drawBonusNext = (P.flags.drawBonusNext || 0) + op.v; b.log.push({ type: 'next_draw', v: op.v }); break;
      case 'discount_turn': P.flags.discount += op.v; break;
      case 'polish_hand': {
        const cands = P.hand.filter(c => c.uid !== (ctx.inst && ctx.inst.uid));
        if (cands.length) {
          const c = cands[Math.floor(rnd() * cands.length)];
          c.buffD += op.v; c.buffB += op.v;
          b.log.push({ type: 'polish', uid: c.uid, v: op.v });
        }
        break;
      }
      case 'polish_deck': {
        b.pendingChoice = { type: 'polish_deck', v: op.v, options: P.draw.map(c => c.uid) };
        b.log.push({ type: 'choice', choice: 'polish_deck' });
        break;
      }
      case 'shuffle_discard': P.draw = shuffle(P.draw.concat(P.discard.splice(0))); b.log.push({ type: 'reshuffle' }); break;
      case 'discard_all_draw': {
        P.discard.push(...P.hand.splice(0));
        drawCards(b, op.draw || 5);
        for (const c of P.hand) { c.buffD += op.buff || 0; c.buffB += op.buff || 0; }
        break;
      }
      case 'insight_burst': {
        if (P.resources.insight >= op.threshold) {
          const e = target();
          dealDamage(b, e, op.extra, ctx);
          P.resources.insight = 0;
          b.log.push({ type: 'resource', res: 'insight', v: 0 });
        }
        break;
      }
      case 'budget': P.budgetGain = (P.budgetGain || 0) + op.v; break;
      case 'energy_max': P.maxEnergy += op.v; P.energy += op.v; break;
      case 'scry': {
        const look = Math.min(op.look || 3, P.draw.length);
        b.pendingChoice = {
          type: 'scry', look, discardMax: op.discard || 0,
          options: P.draw.slice(-look).map(c => c.uid)
        };
        b.log.push({ type: 'choice', choice: 'scry', look });
        break;
      }
      case 'exhaust': break; // 在 playCard 处理
      default: b.log.push({ type: 'unknown_op', op: op.op });
    }
  }

  function resolveChoice(b, payload) {
    if (!b.pendingChoice) return { ok: false };
    const ch = b.pendingChoice;
    b.pendingChoice = null;
    if (ch.type === 'polish_deck') {
      const c = b.player.draw.find(c => c.uid === payload);
      if (c) { c.buffD += ch.v; c.buffB += ch.v; b.log.push({ type: 'polish', uid: c.uid, v: ch.v, permanent: true }); }
    } else if (ch.type === 'scry') {
      const uids = Array.isArray(payload) ? payload : [];
      for (const uid of uids.slice(0, ch.discardMax)) {
        const idx = b.player.draw.findIndex(c => c.uid === uid);
        if (idx >= 0) {
          const c = b.player.draw.splice(idx, 1)[0];
          b.player.discard.push(c);
          b.log.push({ type: 'scry_discard', uid });
        }
      }
    }
    return { ok: true };
  }

  /* ---------- 伤害/格挡/治疗 ---------- */
  function playerAttackPower(b) { return b.player.statuses.focus || 0; }

  function dealDamage(b, enemy, base, ctx) {
    if (!enemy || enemy.hp <= 0 || base <= 0) return;
    let v = base + playerAttackPower(b);
    if (enemy.statuses.inefficient > 0) { /* 敌方低效不影响玩家输出；保留语义对称 */ }
    if (enemy.statuses.chaos > 0) v = Math.round(v * 1.5);
    if (enemy.tags.includes('ai_product') && (b.charId === 'wengu' || b.player.statuses.taste_power > 0)) v = Math.round(v * 1.25);

    /* 熵增之王形态弱点在 entropyKingAct 内处理 */
    const blocked = Math.min(enemy.block, v);
    enemy.block -= blocked;
    const dmg = v - blocked;
    enemy.hp -= dmg;
    b.stats.damageDealt += dmg;
    b.log.push({ type: 'damage', target: enemy.defId, dmg, blocked, crit: enemy.statuses.chaos > 0 });

    for (const h of enemy.hooks) {
      if (h.hook === 'kpi_explode') {
        enemy.hookState.stacks = (enemy.hookState.stacks || 0) + 1;
        b.log.push({ type: 'hook', hook: 'kpi_stack', v: enemy.hookState.stacks });
        if (enemy.hookState.stacks >= h.stacks) {
          enemy.hp = 0;
          b.log.push({ type: 'hook', hook: 'kpi_explode' });
          hurtPlayer(b, h.dmg, { source: enemy.defId });
        }
      }
      if (h.hook === 'splitter' && enemy.hp > 0) {
        const alive = b.enemies.filter(e => e.hp > 0 && e.summoned).length;
        if (alive < h.max && b.enemies.filter(e => e.hp > 0).length < MAX_ENEMIES) {
          // threshold: 受伤时召唤概率（默认100%）
          if (h.threshold && rnd() > h.threshold) return;
          const spawn = makeEnemy(b.DATA, h.spawn);
          if (spawn) { spawn.summoned = true; spawn.maxHp = Math.round(spawn.maxHp * 0.6); spawn.hp = spawn.maxHp; b.enemies.push(spawn); b.log.push({ type: 'summon', enemy: h.spawn }); }
        }
      }
    }
    if (enemy.hp <= 0) b.log.push({ type: 'death', target: enemy.defId });
  }

  function entropyWeakness(b, enemy, v, kind) {
    const forms = ['habit', 'doubt', 'fear', 'delay'];
    const form = forms[enemy.hookState.form % 4];
    const kws = b.stats.keywords; // 用本回合标志更准，这里用 flag
    const F = b.player.flags;
    if (kind === 'damage' && form === 'doubt' && F.questionPlayedThisTurn) return Math.round(v * 0.5);
    if (kind === 'block' && form === 'habit' && F.tastePlayedThisTurn) return Math.round(v * 0.5);
    return v;
  }

  function gainBlock(b, v) {
    let val = v + (b.player.statuses.agile || 0);
    b.player.block += val;
    b.log.push({ type: 'block', v: val });
  }

  function healPlayer(b, v) {
    b.player.hp = Math.min(b.player.maxHp, b.player.hp + v);
    b.log.push({ type: 'heal', v });
  }

  function hurtPlayer(b, v, opts) {
    if (v <= 0) return;
    opts = opts || {};
    const P = b.player;
    /* 质量守门人：本回合首次受伤减半 */
    if (P.statuses.quality_gate > 0 && (P.flags.hurtThisTurn || 0) === 0 && !opts.no_gate) {
      v = Math.ceil(v / 2);
      b.log.push({ type: 'hook', hook: 'quality_gate' });
    }
    P.flags.hurtThisTurn = (P.flags.hurtThisTurn || 0) + 1;
    const ignore = opts.ignore_block || 0;
    let effective = v;
    if (!opts.pierce) {
      const blockable = Math.max(0, v - ignore);
      const blocked = Math.min(b.player.block, blockable);
      b.player.block -= blocked;
      effective = v - blocked;
      if (blocked > 0) b.log.push({ type: 'player_blocked', v: blocked });
    }
    b.player.hp -= effective;
    if (effective > 0) b.log.push({ type: 'player_damage', dmg: effective, source: opts.source });
    if (b.player.hp <= 0) {
      if (!b.player.flags.deathSaved && hasRelic(b, 'death_save_once')) {
        b.player.flags.deathSaved = true;
        b.player.hp = 1;
        b.log.push({ type: 'hook', hook: 'death_save' });
      } else {
        b.player.hp = 0;
        b.state = 'lost';
        b.log.push({ type: 'defeat' });
      }
    }
  }

  /* ---------- 药水 ---------- */
  function usePotion(b, idx) {
    if (b.state !== 'player') return { ok: false };
    const pid = b.player.potions[idx];
    if (!pid) return { ok: false };
    const p = b.DATA.potions[pid];
    b.player.potions.splice(idx, 1);
    b.log.push({ type: 'potion', id: pid, name: p.name });
    runOps(b, p.effects, { inst: { buffD: 0, buffB: 0 } });
    return { ok: true };
  }

  /* ---------- 结束回合 / 敌方阶段 ---------- */
  function endTurn(b) {
    if (b.state !== 'player') return b;
    const P = b.player, F = P.flags;

    /* 苏澄被动：本回合未打判断牌则+1判断点 */
    if (b.charId === 'suchen' && !F.judgmentPlayed) gainResource(b, 'insight', 1);
    /* OKR 对齐：回合结束+1判断点 */
    if (P.statuses.okr > 0) gainResource(b, 'insight', Math.min(1, P.statuses.okr));
    /* 允许犯错手册 */
    relicOncePerTurn(b, 'no_damage_draw', () => {
      if (P.hp >= F.hpAtTurnStart) drawCards(b, 1);
    });

    b.state = 'enemy';
    b.log.push({ type: 'turn_end' });

    /* 敌方行动 */
    for (const e of b.enemies) {
      if (e.hp <= 0 || b.state === 'lost') continue;
      enemyAct(b, e);
    }
    if (b.state === 'lost') return b;

    /* 敌方状态结算 */
    for (const e of b.enemies) {
      if (e.hp <= 0) continue;
      if (e.statuses.attrition > 0) {
        e.hp -= e.statuses.attrition;
        b.stats.damageDealt += e.statuses.attrition;
        b.log.push({ type: 'dot', target: e.defId, dmg: e.statuses.attrition, s: 'attrition' });
        e.statuses.attrition--;
        if (e.hp <= 0) b.log.push({ type: 'death', target: e.defId });
      }
      if (e.statuses.chaos > 0) e.statuses.chaos--;
      if (e.statuses.inefficient > 0) e.statuses.inefficient--;
    }
    checkKlarna(b);

    /* 玩家回合末状态 */
    if (P.statuses.morale > 0) healPlayer(b, P.statuses.morale);
    if (P.statuses.entropy > 0) hurtPlayer(b, P.statuses.entropy, { source: 'entropy' });
    if (b.state === 'lost') return b;

    checkDeaths(b);
    if (b.state === 'won') return b;

    nextRound(b);
    return b;
  }

  function enemyAct(b, e) {
    /* 发呆 */
    if (e.statuses.stagger > 0) {
      e.statuses.stagger--;
      b.log.push({ type: 'enemy_idle', target: e.defId, reason: 'stagger' });
      e.turnCount++;
      return;
    }
    /* 直达老板的邮箱：概率发呆 */
    if (hasRelic(b, 'enemy_stagger_chance') && rnd() * 100 < relicParam(b, 'enemy_stagger_chance', 'pct', 30)) {
      b.log.push({ type: 'enemy_idle', target: e.defId, reason: 'relic' });
      e.turnCount++;
      return;
    }

    const d = b.DATA.enemies[e.defId];

    /* 熵增之王专用 */
    if (e.hooks.some(h => h.hook === 'entropy_king')) { entropyKingAct(b, e); e.turnCount++; return; }

    /* auto_accel：多动 */
    let extraActions = 0;
    const accel = e.hooks.find(h => h.hook === 'auto_accel');
    if (accel) {
      extraActions = Math.max(0, (e.hookState.actions || 2) - 1);
      e.hookState.actions = Math.min(accel.max_actions, (e.hookState.actions || 2) + 1);
    }

    executeIntent(b, e, getIntent(b, e));
    for (let i = 0; i < extraActions && e.hp > 0 && b.state !== 'lost'; i++) {
      if (rnd() < (accel.misfire || 0.25)) {
        e.hp -= 4;
        b.log.push({ type: 'misfire', target: e.defId, dmg: 4 });
        if (e.hp <= 0) b.log.push({ type: 'death', target: e.defId });
      } else {
        executeIntent(b, e, { t: 'attack', v: 4, label: '追加执行' });
      }
    }

    /* 猎头魔：每 N 回合偷弃牌堆 */
    const hh = e.hooks.find(h => h.hook === 'headhunter_steal');
    if (hh && e.turnCount % hh.every === hh.every - 1 && b.player.discard.length > 0) {
      const i = Math.floor(rnd() * b.player.discard.length);
      const stolen = b.player.discard.splice(i, 1)[0];
      b.player.exhaust.push(stolen);
      b.log.push({ type: 'hook', hook: 'headhunter_steal', uid: stolen.uid });
    }

    e.turnCount++;
  }

  function executeIntent(b, e, it) {
    if (!it || b.state === 'lost') return;
    const str = e.statuses.strength || 0;
    const layer = e.statuses.layer || 0;
    let v = it.v || 0;
    switch (it.t) {
      case 'attack': {
        e.statuses.charging = 0;
        const maxL = (e.hooks.find(h => h.hook === 'layer_beast') || {}).max_layers || 99;
        let dmg = v + str + Math.min(layer, maxL) * 2;
        if (e.statuses.inefficient > 0) dmg = Math.round(dmg * 0.75);
        if (e.statuses.ai_hallucination > 0) dmg = Math.max(0, dmg - 3 * e.statuses.ai_hallucination);
        const hits = it.hits || 1;
        for (let i = 0; i < hits && b.state !== 'lost'; i++) {
          hurtPlayer(b, dmg, { source: e.defId, ignore_block: it.ignore_block || 0 });
          b.log.push({ type: 'enemy_attack', target: e.defId, v: dmg, label: it.label });
        }
        break;
      }
      case 'block': { const maxL = (e.hooks.find(h => h.hook === 'layer_beast') || {}).max_layers || 99; e.block += v + Math.min(layer, maxL) * 3; b.log.push({ type: 'enemy_block', target: e.defId, v: v + Math.min(layer, maxL) * 3, label: it.label }); break; }
      case 'debuff':
        addStatus(b.player, it.s, it.v);
        b.log.push({ type: 'status', target: 'player', s: it.s, dir: it.v, label: it.label });
        if (it.s === 'customer_anger') checkKlarna(b);
        break;
      case 'buff': addStatus(e, it.s, it.v); b.log.push({ type: 'status', target: e.defId, s: it.s, dir: it.v, label: it.label }); break;
      case 'self_status': addStatus(e, it.s, it.v); b.log.push({ type: 'status', target: e.defId, s: it.s, dir: it.v, label: it.label }); break;
      case 'steal_token': b.player.flags.stolenNext = (b.player.flags.stolenNext || 0) + (it.v || 1); b.log.push({ type: 'steal_token', target: e.defId, v: it.v }); break;
      case 'summon': {
        if (b.enemies.filter(x => x.hp > 0).length < MAX_ENEMIES) {
          const s = makeEnemy(b.DATA, it.id);
          if (s) { s.summoned = true; b.enemies.push(s); b.log.push({ type: 'summon', enemy: it.id }); }
        }
        break;
      }
      case 'discard_hand': {
        for (let i = 0; i < (it.v || 1) && b.player.hand.length; i++) {
          const idx = Math.floor(rnd() * b.player.hand.length);
          const c = b.player.hand.splice(idx, 1)[0];
          b.player.discard.push(c);
          b.log.push({ type: 'discard_by_enemy', uid: c.uid });
        }
        break;
      }
      case 'tax': b.player.flags.taxNext = (b.player.flags.taxNext || 0) + (it.v || 1); b.log.push({ type: 'tax', target: e.defId, v: it.v }); break;
      case 'hand_limit': b.player.flags.handLimitNext = Math.max(b.player.flags.handLimitNext, it.v || 2); b.log.push({ type: 'hand_limit', v: it.v }); break;
      case 'draw_down': b.player.flags.drawDownNext += it.v || 1; b.log.push({ type: 'draw_down', v: it.v }); break;
      case 'charge': addStatus(e, 'charging', 1); b.log.push({ type: 'charge', target: e.defId }); break;
      case 'idle': b.log.push({ type: 'enemy_idle', target: e.defId, reason: 'idle' }); break;
    }
  }

  function entropyKingAct(b, e) {
    const isPhase2 = e.hp <= e.maxHp * 0.4;
    if (isPhase2 && !e.hookState.phase2) {
      e.hookState.phase2 = true;
      b.log.push({ type: 'boss_phase', target: e.defId, phase: 2 });
      for (let i = 0; i < 2 && b.enemies.filter(x => x.hp > 0).length < MAX_ENEMIES; i++) {
        const s = makeEnemy(b.DATA, 'enemy_inertia_shard');
        if (s) { s.summoned = true; b.enemies.push(s); b.log.push({ type: 'summon', enemy: 'enemy_inertia_shard' }); }
      }
    }
    if (isPhase2) {
      addStatus(b.player, 'entropy', 1);
      b.log.push({ type: 'status', target: 'player', s: 'entropy', dir: 1 });
      const seq = [
        { t: 'attack', v: 12, label: '熵之洪流' },
        { t: 'attack', v: 8, hits: 2, label: '惯性反扑' },
        { t: 'block', v: 12, label: '故步自封' }
      ];
      executeIntent(b, e, seq[e.turnCount % 3]);
      return;
    }

    // 形态持续2回合
    if (e.hookState.formDuration === 0) {
      const forms = ['惯性之格', '怀疑之格', '恐惧之格', '拖延之格'];
      const f = e.hookState.form % 4;
      b.log.push({ type: 'boss_form', target: e.defId, form: forms[f], duration: 2 });
    }
    e.hookState.formDuration++;

    const f = e.hookState.form % 4;
    switch (f) {
      case 0: /* 惯性 */ {
        let blk = 10;
        if (b.player.flags.tastePlayedThisTurn) blk = Math.round(blk * 0.5);
        e.block += blk;
        b.log.push({ type: 'enemy_block', target: e.defId, v: blk, label: '故步自封' });
        if (e.hookState.formDuration === 1) {
          const deck = b.player.draw.concat(b.player.hand, b.player.discard);
          if (deck.length) {
            const c = deck[Math.floor(rnd() * deck.length)];
            c.costUp += 1;
            b.log.push({ type: 'cost_up', uid: c.uid });
          }
        }
        break;
      }
      case 1: /* 怀疑 */
        if (e.hookState.formDuration === 1) {
          if (b.player.flags.questionPlayedThisTurn) {
            b.log.push({ type: 'hook', hook: 'entropy_weak_doubt' });
            executeIntent(b, e, { t: 'attack', v: 5, label: '动摇的攻击' });
          } else {
            executeIntent(b, e, { t: 'attack', v: 10, label: '怀疑之击' });
          }
          addStatus(b.player, 'info_gap', 2);
          b.log.push({ type: 'status', target: 'player', s: 'info_gap', dir: 2 });
        }
        break;
      case 2: /* 恐惧 */
        if (e.hookState.formDuration === 1) {
          if (b.revealTurns > 0) {
            b.log.push({ type: 'hook', hook: 'entropy_weak_fear' });
          } else {
            executeIntent(b, e, { t: 'attack', v: 6, hits: 2, label: '恐惧之噬' });
            b.player.flags.stolenNext = (b.player.flags.stolenNext || 0) + 1;
          }
        }
        break;
      case 3: /* 拖延 */
        if (e.hookState.formDuration === 1) {
          addStatus(e, 'charging', 1);
          b.log.push({ type: 'charge', target: e.defId });
        } else {
          executeIntent(b, e, { t: 'attack', v: 12, label: '拖延之击' });
        }
        break;
    }

    // 2回合后切换形态
    if (e.hookState.formDuration >= 2) {
      e.hookState.form++;
      e.hookState.formDuration = 0;
    }
  }

  function checkKlarna(b) {
    const kl = b.enemies.find(e => e.hp > 0 && e.hooks.some(h => h.hook === 'klarna'));
    if (!kl) return;
    const anger = b.player.statuses.customer_anger || 0;
    const cfg = kl.hooks.find(h => h.hook === 'klarna');
    if (anger >= cfg.burst) {
      b.player.statuses.customer_anger = 0;
      b.log.push({ type: 'hook', hook: 'klarna_burst' });
      hurtPlayer(b, cfg.burst_dmg, { source: kl.defId, pierce: true });
    }
  }

  function checkDeaths(b) {
    for (const e of b.enemies) {
      if (e.hp <= 0) {
        // entropy_spread hook: 死亡时传染熵增
        if (e.hooks.some(h => h.hook === 'entropy_spread')) {
          addStatus(b.player, 'entropy', 1);
          b.log.push({ type: 'status', target: 'player', s: 'entropy', dir: 1, from: e.defId });
        }
      }
    }
    if (b.enemies.every(e => e.hp <= 0) && b.state !== 'lost') {
      b.state = 'won';
      b.log.push({ type: 'victory' });
    }
  }

  function nextRound(b) {
    const P = b.player, F = P.flags;
    b.turn++;
    b.stats.turns++;
    b.state = 'player';
    P.block = 0;
    for (const e of b.enemies) e.block = 0;
    if (b.revealTurns < 9999 && b.revealTurns > 0) b.revealTurns--;

    /* 重置每回合标志 */
    F.infoGained = false; F.judgmentPlayed = false; F.cardsPlayed = 0;
    F.zeroPlayed = 0; F.agentsPlayed = 0; F.discount = 0; F.hurtThisTurn = 0;
    F.questionPlayedThisTurn = false; F.tastePlayedThisTurn = false;
    F.hpAtTurnStart = P.hp;
    for (const k of Object.keys(F)) if (k.startsWith('turn_')) F[k] = -99;

    /* 能力牌持续效果 */
    if (P.statuses.transparent_culture > 0) b.revealTurns = Math.max(b.revealTurns, 1);
    if (P.statuses.agile_standup > 0) addTokenAgent(b);
    if (P.statuses.human_ratio > 0) {
      if (F.humanRatioMode === 'agent') { P.energy++; b.log.push({ type: 'hook', hook: 'human_ratio_energy' }); }
      else { gainBlock(b, 3); b.log.push({ type: 'hook', hook: 'human_ratio_block' }); }
    }
    if (P.statuses.info_gap > 0) P.statuses.info_gap--;

    /* 能量 */
    P.energy = P.maxEnergy;
    if (F.stolenNext > 0) { P.energy = Math.max(0, P.energy - F.stolenNext); b.log.push({ type: 'token_stolen', v: F.stolenNext }); F.stolenNext = 0; }
    if (hasRelic(b, 'extra_token_chance') && rnd() * 100 < relicParam(b, 'extra_token_chance', 'pct', 30)) {
      P.energy++; b.log.push({ type: 'hook', hook: 'extra_token' });
    }
    /* 税 */
    F.taxPending = F.taxNext || 0; F.taxNext = 0;

    /* 抽牌 */
    let drawN = 5 + (F.loyaltyDraw || 0) + (F.drawBonusNext || 0) - (F.drawDownNext > 0 ? F.drawDownNext : 0);
    F.drawBonusNext = 0; F.drawDownNext = 0;
    if (hasRelic(b, 'token_up_draw_down')) drawN -= relicParam(b, 'token_up_draw_down', 'draw', 1);
    drawCards(b, Math.max(1, drawN));

    /* 手牌上限惩罚 */
    if (F.handLimitNext > 0) {
      while (P.hand.length > HAND_LIMIT - F.handLimitNext && P.hand.length > 0) {
        P.discard.push(P.hand.pop());
      }
      b.log.push({ type: 'hand_crunched', v: F.handLimitNext });
      F.handLimitNext = 0;
    }

    /* 骆执行：回合开始发 Agent */
    if (b.charId === 'luozhixing') addTokenAgent(b);
    /* 实习生计划遗物已在开战发 */
    /* 反挖角条款：首回合结束回收已在 endTurn；此处为通用版本 */
    if (hasRelic(b, 'discard_recall_start') && !F.firstDiscardRecall && P.discard.length > 0 && b.turn === 2) {
      F.firstDiscardRecall = true;
      const i = Math.floor(rnd() * P.discard.length);
      const c = P.discard.splice(i, 1)[0];
      if (P.hand.length < HAND_LIMIT) P.hand.push(c); else P.discard.push(c);
      b.log.push({ type: 'hook', hook: 'discard_recall', uid: c.uid });
    }

    b.log.push({ type: 'turn_start', turn: b.turn });
  }

  /* 关键词标志（出牌时由 UI 调用前设置——实际在 playCard 内记录） */
  function markKeywordTurn(b, kw) {
    if (kw === 'question') b.player.flags.questionPlayedThisTurn = true;
    if (kw === 'taste') b.player.flags.tastePlayedThisTurn = true;
  }

  return {
    startBattle, playCard, endTurn, usePotion, resolveChoice,
    getCost, getIntent, intentVisible, cardDef, makeCardInstance,
    markKeywordTurn, HAND_LIMIT
  };
});
