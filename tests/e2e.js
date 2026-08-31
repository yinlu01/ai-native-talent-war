/* E2E 全流程测试驱动：?test=1 时加载，驱动完整一局（DOM 层真实点击/真实引擎） */
(function () {
  'use strict';
  const A = window.ATW;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  function dump(msg) {
    document.title = 'E2E:' + msg;
    const el = document.getElementById('e2e-status') || (() => {
      const d = document.createElement('div');
      d.id = 'e2e-status';
      d.style.cssText = 'position:fixed;top:0;right:0;z-index:99999;background:#0369a1;color:#fff;padding:4px 10px;font-size:12px;';
      document.body.appendChild(d);
      return d;
    })();
    el.textContent = 'E2E: ' + msg;
  }

  /* 战斗 bot：直接调用引擎（UI 渲染走 renderBattle） */
  function battleBot() {
    const b = A.G.battle;
    if (!b) return;
    let guard = 0;
    while (b.state === 'player' && !b.pendingChoice && guard++ < 40) {
      const alive = b.enemies.map((e, i) => e.hp > 0 ? i : -1).filter(i => i >= 0);
      if (!alive.length) break;
      let played = false;
      for (const inst of [...b.player.hand]) {
        if (A.E.getCost(b, inst) <= b.player.energy) {
          const r = A.E.playCard(b, inst.uid, alive[0]);
          if (r.ok) { played = true; A.renderBattle(); break; }
        }
      }
      if (!played) break;
    }
    if (b.pendingChoice) {
      const ch = b.pendingChoice;
      const payload = ch.type === 'scry' ? [] : ch.options[0];
      A.E.resolveChoice(b, payload);
      A.renderBattle();
    }
    if (b.state === 'player') { A.E.endTurn(b); A.renderBattle(); }
  }

  async function waitBattleEnd(timeout) {
    const t0 = Date.now();
    while (Date.now() - t0 < (timeout || 15000)) {
      const b = A.G.battle;
      if (!b) return 'nobattle';
      if (b.state === 'won' || b.state === 'lost') return b.state;
      battleBot();
      await sleep(120);
    }
    return 'timeout';
  }

  async function waitOverlay(on, sel, timeout) {
    const t0 = Date.now();
    while (Date.now() - t0 < (timeout || 8000)) {
      const el = document.querySelector(sel);
      if (on ? el : !el) return true;
      await sleep(80);
    }
    return false;
  }

  async function run() {
    dump('启动');
    await sleep(100);

    /* 1. 菜单 → 角色选择 */
    document.getElementById('btn-start').click();
    await waitOverlay(true, '#screen-select.on');
    dump('角色选择');
    const charCards = document.querySelectorAll('.char-card');
    charCards[ri(0, 3)].click();
    document.getElementById('btn-sel-go').click();

    /* 2. 跳过开场剧情（等待打字机自然结束或强制跳过） */
    dump('跳过剧情');
    for (let i = 0; i < 30; i++) {
      if (document.getElementById('screen-map').classList.contains('on') || A.G.maps[1]) break;
      document.getElementById('story-box').click();
      await sleep(300);
    }
    if (!A.G.maps[1]) { A.showScreen('map'); A.newAct(1); }
    await sleep(300);

    let nodesVisited = 0, fightsWon = 0;
    const t0 = Date.now();

    /* 3. 走完整局 */
    while (Date.now() - t0 < 120000) {
      const G = A.G;
      if (document.getElementById('screen-death').classList.contains('on')) { dump('到达死亡结局 ✓'); return finish('death-ok', nodesVisited, fightsWon); }
      if (document.getElementById('screen-ending').classList.contains('on')) { dump('到达胜利结局 ✓'); return finish('win-ok', nodesVisited, fightsWon); }

      /* 战斗中 */
      if (G.battle && (G.battle.state === 'won' || G.battle.state === 'lost')) {
        const deathOn = document.getElementById('screen-death').classList.contains('on');
        if (G.battle.state === 'lost') {
          if (!deathOn) { A.onBattleLost(); await sleep(600); }
          continue;  /* 顶部死亡检测会收尾 */
        }
        const hasReward = document.querySelector('#ov-reward.on #reward-done');
        if (!hasReward) {
          /* battleBot 绕过了 UI 的 checkBattleEnd，手动驱动结算流程 */
          A.onBattleWon();
          await sleep(600);
        }
        /* 奖励界面已打开或刚打开 → 落入下方奖励处理分支（不进 battleBot） */
      } else if (G.battle) { battleBot(); await sleep(100); continue; }

      /* 子界面优先：三选一卡牌 / 遗物确认 / 升级删牌选择（只认激活弹层） */
      const pickCards = document.querySelectorAll('#ov-cards.on #pick-cards .card');
      if (pickCards.length) { pickCards[ri(0, pickCards.length - 1)].click(); await sleep(150); continue; }
      if (document.querySelector('#ov-cards.on #pick-skip')) { document.querySelector('#ov-cards.on #pick-skip').click(); await sleep(100); continue; }
      if (document.querySelector('#ov-generic.on #ov-close')) { document.querySelector('#ov-generic.on #ov-close').click(); await sleep(150); continue; }

      /* 奖励界面（无子弹层时才点） */
      const rewardDone = document.querySelector('#ov-reward.on #reward-done');
      if (rewardDone) {
        const items = document.querySelectorAll('#ov-reward.on #reward-list .reward-item:not(.done)');
        dump(`奖励 ${items.length} 项待领`);
        if (items.length) { items[items.length - 1].click(); await sleep(250); }
        else { rewardDone.click(); await sleep(250); }
        continue;
      }

      /* 商店 */
      if (document.querySelector('#ov-shop.on #shop-leave')) {
        // 随机买一张买得起的卡
        const cards = [...document.querySelectorAll('#ov-shop.on #shop-grid .shop-item')].filter(el => !el.querySelector('.shop-price.no'));
        if (cards.length && Math.random() < 0.7) cards[0].click();
        await sleep(100);
        document.querySelector('#ov-shop.on #shop-leave').click();
        await sleep(200);
        continue;
      }

      /* 休息 */
      if (document.querySelector('#ov-generic.on #rest-heal')) { document.querySelector('#ov-generic.on #rest-heal').click(); await sleep(200); continue; }
      if (document.querySelector('#ov-generic.on #rest-upgrade')) { document.querySelector('#ov-generic.on #rest-upgrade').click(); await sleep(200); continue; }

      /* 事件（结果确认优先于选项，防止重复选择） */
      if (document.querySelector('#ov-generic.on #ev-result-ok')) { document.querySelector('#ov-generic.on #ev-result-ok').click(); await sleep(200); continue; }
      const evOpts = document.querySelectorAll('#ov-event.on .event-opt');
      if (evOpts.length) { evOpts[ri(0, evOpts.length - 1)].click(); await sleep(200); continue; }

      /* 升级/删牌选择 */
      const deckPick = document.querySelectorAll('#ov-cards.on #deck-pick .card');
      if (deckPick.length) { deckPick[ri(0, deckPick.length - 1)].click(); await sleep(150); continue; }

      /* BOSS 对话 */
      const dlgNext = document.getElementById('dialogue-box');
      if (dlgNext && dlgNext.style.display === 'block') { dlgNext.click(); await sleep(350); continue; }

      /* 地图：选一个可用节点 */
      const availNodes = document.querySelectorAll('.map-node.avail');
      if (availNodes.length) {
        // 偏好精英/商店/休息，加速测试
        let node = null;
        for (const n of availNodes) { if (n.textContent.includes('👑') || n.textContent.includes('🛒') || n.textContent.includes('☕')) { node = n; break; } }
        if (!node) node = availNodes[ri(0, availNodes.length - 1)];
        /* SVG 元素无 .click()，用事件派发 */
        const evObj = document.createEvent('Events');
        evObj.initEvent('click', true, false);
        node.dispatchEvent(evObj);
        nodesVisited++;
        dump(`第${A.G.act}幕 · 已访问 ${nodesVisited} 节点`);
        await sleep(300);
        continue;
      }

      /* 战斗进行中（engine bot 已在上面处理） */
      if (G.battle) { battleBot(); await sleep(100); continue; }

      /* 卡住诊断 */
      const screen = ['menu','select','story','map','battle','ending','death'].find(s => document.getElementById('screen-'+s).classList.contains('on')) || '?';
      const ovs = [...document.querySelectorAll('.overlay.on')].map(o => o.id).join(',');
      dump(`WAIT screen=${screen} battle=${G.battle ? G.battle.state : 'none'} ov=${ovs} pos=${G.pos ? G.pos.row + ',' + G.pos.col : 'null'}`);

      await sleep(150);
    }
    dump('超时');
    finish('timeout', nodesVisited, fightsWon);
  }

  function finish(status, nodes, wins) {
    const el = document.getElementById('e2e-result') || (() => {
      const d = document.createElement('div');
      d.id = 'e2e-result';
      d.style.cssText = 'position:fixed;bottom:0;left:0;z-index:99999;background:#166534;color:#fff;padding:8px 16px;font-size:14px;';
      document.body.appendChild(d);
      return d;
    })();
    el.textContent = `E2E-RESULT: ${status} nodes=${nodes} wins=${wins} act=${A.G.act} hp=${A.G.hp} deck=${A.G.deck.length}`;
  }

  window.addEventListener('load', () => setTimeout(run, 300));
})();
