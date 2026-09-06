/* ============================================================
 * 《AI 原生人才争夺战》 冒烟测试
 * 运行方式: npx playwright test tests/smoke.spec.js
 * 或直接打开 index.html?test=smoke 触发
 * ============================================================ */
const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

test.describe('地图节点点击冒烟测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FILE_URL);
    // 点击开始 → 选择角色 → 确认，进入地图
    await page.click('#btn-start');
    await page.waitForSelector('#screen-select.on');
    await page.click('.char-card');
    await page.click('#btn-sel-go');
    // 跳过剧情
    for (let i = 0; i < 15; i++) {
      const storyBox = page.locator('#story-box');
      if (await storyBox.count() > 0 && await storyBox.isVisible()) {
        await storyBox.click();
      }
      const mapScreen = page.locator('#screen-map.on');
      if (await mapScreen.count() > 0) break;
      await page.waitForTimeout(200);
    }
    await page.waitForSelector('#screen-map.on', { timeout: 10000 });
  });

  test('入口节点不应被标记为可用', async ({ page }) => {
    // 入口节点是 row=0，不应该是 avail class
    const entranceNodes = page.locator('.map-node[data-type="entrance"]');
    await expect(entranceNodes).toHaveCount(1);
    const avail = await entranceNodes.getAttribute('class');
    expect(avail).not.toContain('avail');
  });

  test('第1行节点应该标记为可用', async ({ page }) => {
    // 等待 SVG 渲染完成
    await page.waitForTimeout(500);
    const availNodes = page.locator('.map-node.avail');
    const count = await availNodes.count();
    expect(count).toBeGreaterThan(0);
    // 所有可用节点都不应该是 entrance 类型
    for (let i = 0; i < count; i++) {
      const type = await availNodes.nth(i).getAttribute('data-type');
      expect(type).not.toEqual('entrance');
    }
  });

  test('点击可用节点应该进入节点', async ({ page }) => {
    await page.waitForTimeout(500);
    // 用 dispatchEvent 直接派发 click 事件到 g 元素（绕过 SVG 动画稳定性检测）
    const clicked = await page.evaluate(() => {
      const fight = document.querySelector('.map-node.avail[data-type="fight"]');
      const node = fight || document.querySelector('.map-node.avail');
      if (!node) return null;
      const key = node.dataset.key;
      const type = node.dataset.type;
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return { key, type };
    });
    expect(clicked).not.toBeNull();
    await page.waitForTimeout(1000);
    // 应该触发了某个 overlay（战斗/商店/事件）或跳转到了对应界面
    const overlayShown = await page.locator('.overlay.on').count();
    const battleShown = await page.locator('#screen-battle.on').count();
    expect(overlayShown + battleShown).toBeGreaterThan(0);
    // 验证 G.pos 已经更新
    const pos = await page.evaluate(() => window.ATW?.G?.pos);
    expect(pos).not.toBeNull();
    expect(pos.row).toBeGreaterThan(0);
  });

  test('入口节点点击应该被忽略（不崩溃）', async ({ page }) => {
    await page.waitForTimeout(500);
    const entranceNode = page.locator('.map-node[data-type="entrance"]');
    await entranceNode.click({ force: true });
    await page.waitForTimeout(500);
    // 地图仍显示，没有崩溃
    const mapStillOn = await page.locator('#screen-map.on').count();
    expect(mapStillOn).toBe(1);
  });

  test('连续点击多个节点应该正常推进', async ({ page }) => {
    await page.waitForTimeout(500);
    for (let step = 0; step < 3; step++) {
      const clicked = await page.evaluate(() => {
        const fight = document.querySelector('.map-node.avail[data-type="fight"]');
        const node = fight || document.querySelector('.map-node.avail');
        if (!node) return false;
        node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        return true;
      });
      if (!clicked) break;
      await page.waitForTimeout(800);
      // 关闭可能弹出的所有 overlay 形式
      await page.evaluate(() => {
        ['ov-close', 'ev-result-ok', 'reward-done', 'shop-leave', 'rest-heal', 'rest-upgrade'].forEach(id => {
          const btn = document.querySelector('.overlay.on #' + id);
          if (btn) btn.click();
        });
        // 选事件选项
        const evOpt = document.querySelector('.overlay.on .event-opt');
        if (evOpt) evOpt.click();
        // 选三选一卡
        const pickCard = document.querySelector('.overlay.on #pick-cards .card, .overlay.on #deck-pick .card');
        if (pickCard) pickCard.click();
      });
      await page.waitForTimeout(400);
    }
    // 至少走了一步
    const pos = await page.evaluate(() => window.ATW?.G?.pos);
    expect(pos).not.toBeNull();
    expect(pos.row).toBeGreaterThan(0);
  });
});

test.describe('战斗冒烟测试', () => {
  test('战斗结算后应该显示奖励', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.click('#btn-start');
    await page.waitForSelector('#screen-select.on');
    await page.click('.char-card');
    await page.click('#btn-sel-go');
    for (let i = 0; i < 15; i++) {
      const storyBox = page.locator('#story-box');
      if (await storyBox.count() > 0 && await storyBox.isVisible()) await storyBox.click();
      const mapScreen = page.locator('#screen-map.on');
      if (await mapScreen.count() > 0) break;
      await page.waitForTimeout(200);
    }
    await page.waitForSelector('#screen-map.on');

    // 直接注入一场战斗
    await page.evaluate(() => {
      window.ATW.startFight('fight');
    });
    await page.waitForSelector('#screen-battle.on', { timeout: 5000 });

    // 手动结束战斗（engine inject）
    await page.evaluate(() => {
      const b = window.ATW.G.battle;
      if (b) { b.state = 'won'; window.ATW.onBattleWon(); }
    });
    await page.waitForTimeout(500);
    const rewardOverlay = page.locator('#ov-reward.on');
    await expect(rewardOverlay).toBeVisible();
  });
});
