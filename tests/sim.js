#!/usr/bin/env node
/* 自动化平衡测试：真实引擎跑 N 场完整战斗 */
const D = require('../js/data.js');
const E = require('../js/engine.js');

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/* 简单策略 bot：优先打出能打的攻击牌，血量低时优先防火墙 */
function botPlay(b) {
  let guard = 0;
  while (b.state === 'player' && !b.pendingChoice && guard++ < 30) {
    const hand = [...b.player.hand];
    if (!hand.length) break;
    const cost = c => E.getCost(b, c);
    // 排序：低血优先防御，否则攻击牌优先
    const needBlock = b.player.hp < b.player.maxHp * 0.4;
    hand.sort((a, c) => {
      const da = D.cards[a.defId] || {};
      const dc = D.cards[c.defId] || {};
      const wa = (needBlock && da.type === 'skill' ? 100 : 0) + (da.type === 'attack' ? 50 : 0) - cost(a);
      const wc = (needBlock && dc.type === 'skill' ? 100 : 0) + (dc.type === 'attack' ? 50 : 0) - cost(c);
      return wc - wa;
    });
    let played = false;
    for (const inst of hand) {
      if (E.getCost(b, inst) <= b.player.energy) {
        const alive = b.enemies.map((e, i) => e.hp > 0 ? i : -1).filter(i => i >= 0);
        E.playCard(b, inst.uid, alive[0]);
        if (b.pendingChoice) E.resolveChoice(b, b.pendingChoice.options ? (Array.isArray(b.pendingChoice.options) ? b.pendingChoice.options[0] : null) : null);
        played = true;
        break;
      }
    }
    if (!played) break;
  }
}

function simBattle(charId, enemyIds, relics) {
  const ch = D.chars[charId];
  const deck = ch.deck.flatMap(d => Array(d.n).fill(d.card));
  const b = E.startBattle(D, {
    charId, deck,
    maxHp: ch.hp, hp: ch.hp,
    enemies: enemyIds, relics: relics || [ch.relic]
  });
  let turns = 0;
  while (b.state === 'player' && turns < 60) {
    turns++;
    botPlay(b);
    if (b.state !== 'player') break;
    E.endTurn(b);
  }
  return { result: b.state, turns, hpLeft: Math.max(0, b.player.hp) };
}

/* ---- 测试 1：各角色 vs Act1 普通敌 ---- */
console.log('=== 测试1：普通战斗胜率（各 30 场）===');
const act1Fights = D.config.act_pools[1].fights;
for (const cid of Object.keys(D.chars)) {
  let wins = 0, hpSum = 0, turnSum = 0;
  for (let i = 0; i < 30; i++) {
    const r = simBattle(cid, act1Fights[i % act1Fights.length]);
    if (r.result === 'won') { wins++; hpSum += r.hpLeft; turnSum += r.turns; }
  }
  console.log(`${D.chars[cid].name}: 胜 ${wins}/30, 平均剩血 ${wins ? (hpSum / wins).toFixed(0) : '-'}, 平均 ${wins ? (turnSum / wins).toFixed(1) : '-'} 回合`);
}

/* ---- 测试 2：各角色 vs 各幕 BOSS（起始牌组，理应打不过但要看能撑多久） ---- */
console.log('=== 测试2：起始牌组 vs BOSS（撑回合数）===');
for (const cid of Object.keys(D.chars)) {
  for (const bid of ['boss_bureaucracy', 'boss_leviathan', 'boss_klarna', 'boss_entropy']) {
    const r = simBattle(cid, [bid]);
    console.log(`${D.chars[cid].name} vs ${D.enemies[bid].name}: ${r.result} @ ${r.turns} 回合 (剩血 ${r.hpLeft})`);
  }
}

/* ---- 测试 3：强化卡组 vs BOSS（模拟中期卡组） ---- */
console.log('=== 测试3：强化卡组 vs BOSS ===');
const strongDeck = {
  suchen: ['card_exec6','card_exec6','card_exec6','card_fw5','card_fw5','card_shuju','card_dahui','card_okr','card_jdcl','card_lyzj'],
  linwen: ['card_exec5','card_exec5','card_fw4','card_fw4','card_haowenti','card_wgwe','card_zjyh','card_lhzg','card_dmzh','card_sdfang'],
  wengu: ['card_exec5','card_exec5','card_fw4','card_fw4','card_damo','card_jdzq','card_shangxi','card_swjm','card_yzht','card_zlsmr'],
  luozhixing: ['card_exec5','card_exec5','card_fw4','card_fw4','card_rwjf','card_jgys','card_scsdz','card_bxzxr','card_dyss','card_mjzh']
};
for (const cid of Object.keys(D.chars)) {
  let wins = 0;
  for (const bid of ['boss_bureaucracy', 'boss_leviathan', 'boss_klarna', 'boss_entropy']) {
    for (let i = 0; i < 10; i++) {
      const ch = D.chars[cid];
      const b = E.startBattle(D, { charId: cid, deck: strongDeck[cid], maxHp: ch.hp + 20, hp: ch.hp + 20, enemies: [bid], relics: [ch.relic, 'relic_touming'] });
      let turns = 0;
      while (b.state === 'player' && turns < 60) {
        turns++;
        botPlay(b);
        if (b.state !== 'player') break;
        E.endTurn(b);
      }
      if (b.state === 'won') wins++;
    }
  }
  console.log(`${D.chars[cid].name} 强化卡组 vs 4 BOSS ×10: 胜 ${wins}/40`);
}

/* ---- 测试 4：引擎不变量 ---- */
console.log('=== 测试4：不变量检查 ===');
let errs = [];
// 手牌上限
{
  const b = E.startBattle(D, { charId: 'suchen', deck: Array(10).fill('card_fw5'), enemies: ['enemy_mail_swarm'] });
  // 玩家能量不足时无法出牌
  const card = b.player.hand[0];
  b.player.energy = 0;
  const r = E.playCard(b, card.uid, 0);
  if (r.ok) errs.push('0 能量竟能出牌');
}
// 死亡判定
{
  const b = E.startBattle(D, { charId: 'linwen', deck: Array(10).fill('card_fw4'), enemies: ['boss_entropy'] });
  b.player.hp = 1; b.player.block = 0; b.player.statuses.entropy = 5;
  E.endTurn(b);
  if (b.state !== 'lost') errs.push('组织熵致死失败: state=' + b.state);
}
// Klarna 客户不满爆发
{
  const b = E.startBattle(D, { charId: 'suchen', deck: Array(10).fill('card_fw5'), enemies: ['boss_klarna'] });
  const hp0 = b.player.hp;
  b.player.statuses.customer_anger = 15;
  // 触发 checkKlarna 的路径（打出净化牌或直接结算敌人回合）
  E.endTurn(b);
  const hit = b.player.hp < hp0;
  if (!hit && b.state !== 'lost') errs.push('客户不满爆发未生效?');
}
// 熵增之王阶段切换
{
  const b = E.startBattle(D, { charId: 'suchen', deck: Array(10).fill('card_exec6'), enemies: ['boss_entropy'] });
  b.enemies[0].hp = Math.floor(b.enemies[0].maxHp * 0.3);
  E.endTurn(b);
  if (!b.enemies[0].hookState.phase2) errs.push('熵增之王未进入二阶段');
}
console.log(errs.length ? 'FAIL:\n' + errs.join('\n') : '全部不变量通过 ✓');
console.log('\n测试完成');
