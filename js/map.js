/* ============================================================
 * 《AI 原生人才争夺战》 地图生成 v2（简化路线版）
 * 设计目标：
 *  - 每幕 12 层、每层 2-4 节点（原 15 层 × 4-6 节点太密）
 *  - 连边遵循"就近单调"，视觉上几乎无交叉线
 *  - 节点类型分布保证：每幕 ≥1 商店、≥1 休息（BOSS 前保底）、2 精英
 * ============================================================ */
(function (root, factory) {
  const M = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.MapGen = M;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function generateAct(actIdx, totalRows) {
    totalRows = totalRows || (actIdx === 4 ? 4 : 12);
    const isFinal = actIdx === 3;

    /* ---- 每层节点数：首层 2，中间 2-3，BOSS 层 1 ---- */
    const widths = [];
    for (let r = 0; r < totalRows; r++) {
      if (r === totalRows - 1) widths.push(1);
      else if (r === 0) widths.push(2);
      else widths.push(ri(2, 3));
    }

    /* ---- 节点类型分配 ---- */
    const types = widths.map(w => new Array(w).fill('fight'));
    types[totalRows - 1][0] = 'boss';

    if (isFinal) {
      /* 终章短幕：入口 → 战斗/事件 → 战斗 → 休息 → BOSS */
      if (totalRows >= 4) {
        types[1][ri(0, widths[1] - 1)] = 'event';
        types[totalRows - 2][ri(0, widths[totalRows - 2] - 1)] = 'rest';
      }
    } else {
      /* 精英：2 个（前段 1 + 中段 1） */
      const elite1 = ri(3, 5);
      const elite2 = ri(6, Math.min(9, totalRows - 4));
      types[elite1][ri(0, widths[elite1] - 1)] = 'elite';
      if (elite2 !== elite1) types[elite2][ri(0, widths[elite2] - 1)] = 'elite';

      /* 商店：1 个（中段） */
      const shopRow = ri(5, totalRows - 5);
      types[shopRow][ri(0, widths[shopRow] - 1)] = 'shop';

      /* BOSS 前一层保底一个非战斗节点（休息优先） */
      const preBoss = totalRows - 2;
      if (types[preBoss].every(t => t === 'fight')) {
        types[preBoss][ri(0, widths[preBoss] - 1)] = Math.random() < 0.65 ? 'rest' : 'shop';
      }

      /* 休息：中后段 1 个（若该层全为战斗） */
      const restRow = ri(Math.floor(totalRows * 0.45), totalRows - 4);
      if (types[restRow].every(t => t === 'fight')) types[restRow][ri(0, widths[restRow] - 1)] = 'rest';

      /* 事件：约 1/4 的普通战斗换成事件（不覆盖特殊节点） */
      for (let r = 1; r < totalRows - 1; r++) {
        for (let c = 0; c < widths[r]; c++) {
          if (types[r][c] === 'fight' && Math.random() < 0.22) types[r][c] = 'event';
        }
      }
    }

    /* ---- 连边：就近单调，最少交叉 ---- */
    const map = [];
    for (let r = 0; r < totalRows; r++) {
      map.push(types[r].map(t => ({ type: t, edges: [], visited: false })));
    }
    for (let r = 0; r < totalRows - 1; r++) {
      const w0 = widths[r], w1 = widths[r + 1];
      const indeg = new Array(w1).fill(0);
      for (let i = 0; i < w0; i++) {
        /* 比例映射的目标列（保证视觉单调不交叉） */
        const base = Math.min(w1 - 1, Math.floor(i * w1 / w0));
        const targets = [base];
        /* 30% 概率分叉到相邻列（制造路线选择） */
        if (w1 > 1 && Math.random() < 0.3) {
          const alt = base + (base < w1 - 1 ? 1 : -1);
          if (alt >= 0 && alt < w1) targets.push(alt);
        }
        for (const t of targets) {
          if (!map[r][i].edges.includes(t)) {
            map[r][i].edges.push(t);
            indeg[t]++;
          }
        }
      }
      /* 补孤岛：无入边的节点从最近的上游连一条 */
      for (let j = 0; j < w1; j++) {
        if (indeg[j] === 0) {
          const from = Math.min(w0 - 1, Math.max(0, Math.round(j * w0 / w1)));
          if (!map[r][from].edges.includes(j)) map[r][from].edges.push(j);
        }
      }
      /* 边按目标列排序（渲染顺序稳定） */
      for (let i = 0; i < w0; i++) map[r][i].edges.sort((a, b) => a - b);
    }
    return { rows: map, act: actIdx };
  }

  /** 当前位置的可选下一步 */
  function nextOptions(map, pos) {
    if (!pos) return map.rows[0].map((_, i) => ({ row: 0, col: i }));
    const node = map.rows[pos.row][pos.col];
    return node.edges.map(c => ({ row: pos.row + 1, col: c }));
  }

  return { generateAct, nextOptions };
});
