/* ============================================================
 * 《AI 原生人才争夺战》 地图生成 v3（杀戮尖塔式3列单路径布局）
 * 设计目标：
 *  - 3列布局，每行3个节点选择（类Slay the Spire）
 *  - 单路径从底部向顶部推进（类似从左下到右上的斜向路线）
 *  - 每幕7-9层，紧凑排列可在一个屏幕内展示
 *  - 节点类型分布保证：每幕有精英、商店、休息、BOSS
 * ============================================================ */
(function (root, factory) {
  const M = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.MapGen = M;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* 每幕总层数（不含入口和BOSS） */
  const ACT_ROWS = { 1: 7, 2: 7, 3: 7, 4: 4 };

  /* 节点类型权重（相对概率） */
  const POOL_FIGHT = 'fight', POOL_ELITE = 'elite', POOL_SHOP = 'shop',
        POOL_REST = 'rest', POOL_EVENT = 'event', POOL_BOSS = 'boss';

  /**
   * 生成一幕地图
   * @param {number} actIdx 幕索引（1-4）
   * @returns {object} { rows: [[{type, col, edges, visited}]], path: [col indices] }
   *
   * 布局设计（杀戮尖塔风格）：
   * - 每行3个节点，分别在左(0)、中(1)、右(2)列
   * - 玩家只能选择与上一列相邻的列（0→0或1, 1→0或1或2, 2→1或2）
   * - 这样形成一条从左下蜿蜒到右上的路径
   */
  function generateAct(actIdx, totalRows) {
    totalRows = totalRows || ACT_ROWS[actIdx] || 7;
    const isFinal = actIdx === 4;

    /* ---- 构建行的基础结构 ---- */
    // rows[0] 是入口（1个节点在中间）
    // rows[1..totalRows-2] 是中间层（每行3个节点）
    // rows[totalRows-1] 是BOSS层（1个节点在中间）
    const numRows = totalRows + 1; // +1 for entrance row

    const types = [];
    const pathCols = []; // 每层的列选择

    // 第0行：入口（只有中间列有节点）
    types.push([null, 'entrance', null]);

    // 中间层：随机分配节点类型
    for (let r = 1; r < numRows - 1; r++) {
      types.push(['fight', 'fight', 'fight']);
    }

    // 最后一行：BOSS
    types.push([null, 'boss', null]);

    /* ---- 分配特殊节点 ---- */
    if (isFinal) {
      // 终章：短而精
      // 第1行随机一个事件
      const evRow = ri(1, Math.min(2, numRows - 3));
      types[evRow] = [null, 'event', null];
      // 休息点
      const restRow = ri(1, numRows - 3);
      if (types[restRow][1] === 'fight') types[restRow] = [null, 'rest', null];
    } else {
      // 普通幕：2个精英（前段1个 + 中后段1个）
      const elite1 = ri(2, 3);
      const elite2 = ri(4, numRows - 3);
      types[elite1] = [null, 'elite', null];
      if (elite2 !== elite1) types[elite2] = [null, 'elite', null];

      // 1个商店（中段）
      const shopRow = ri(3, numRows - 4);
      if (types[shopRow][1] === 'fight') types[shopRow] = [null, 'shop', null];

      // 1个休息点（中后段）
      const restRow = ri(3, numRows - 3);
      if (types[restRow][1] === 'fight') types[restRow] = [null, 'rest', null];

      // 约20%的战斗换成事件
      for (let r = 1; r < numRows - 1; r++) {
        if (types[r][1] === 'fight' && Math.random() < 0.2) {
          types[r] = [null, 'event', null];
        }
      }
    }

    /* ---- 生成连边（单路径约束） ---- */
    // 从入口(第0行中间)开始，每一层的列选择受到上一层的约束
    // 约束：相邻列之间才能连接（0→0或1, 1→0或1或2, 2→1或2）
    const rows = [];
    let prevCol = 1; // 入口在中间列

    for (let r = 0; r < numRows; r++) {
      const rowTypes = types[r];
      const rowNodes = [];

      for (let c = 0; c < 3; c++) {
        const nodeType = rowTypes[c];
        if (nodeType === null) {
          rowNodes.push(null); // 无节点位置
        } else {
          const node = {
            type: nodeType,
            col: c,
            edges: [], // 可选的下一列
            visited: false
          };

          // 计算可选的下一列（基于当前位置的相邻列）
          // 下一层中，与当前列相邻的列才可选
          const nextCols = [];
          if (c === 0) nextCols.push(0, 1);
          else if (c === 2) nextCols.push(1, 2);
          else nextCols.push(0, 1, 2);

          // 如果下一行该列有节点，则连接
          if (r < numRows - 1 && types[r + 1][c] !== null) {
            node.edges.push(c);
          }
          // 相邻列的连接
          for (const nc of nextCols) {
            if (nc !== c && r < numRows - 1 && types[r + 1][nc] !== null) {
              if (!node.edges.includes(nc)) node.edges.push(nc);
            }
          }

          rowNodes.push(node);
        }
      }

      rows.push(rowNodes);

      // 决定下一层选择哪一列（基于当前节点的可连接列）
      if (r < numRows - 1) {
        const currentNode = rowNodes[prevCol];
        if (currentNode && currentNode.edges.length > 0) {
          prevCol = pick(currentNode.edges);
        } else {
          // 找不到有效连接，随机选一个有节点的列
          const availableCols = currentNode ? currentNode.edges : [];
          if (availableCols.length === 0) {
            // 回退：从下一行有节点的列中随机选
            for (let c = 0; c < 3; c++) {
              if (types[r + 1][c] !== null) { prevCol = c; break; }
            }
          }
        }
        pathCols.push(prevCol);
      }
    }

    return { rows, path: pathCols, act: actIdx };
  }

  /**
   * 获取指定位置的可用下一步
   */
  function nextOptions(map, pos) {
    if (!pos) {
      // 起点：返回第一行所有节点
      return map.rows[0].map((n, i) => n ? { row: 0, col: i } : null).filter(Boolean);
    }
    const node = map.rows[pos.row][pos.col];
    if (!node) return [];
    return node.edges.map(c => ({ row: pos.row + 1, col: c })).filter(
      opt => map.rows[opt.row] && map.rows[opt.row][opt.col]
    );
  }

  /**
   * 检查某行某列是否可达（基于历史路径）
   */
  function canReach(map, row, col, historyPath) {
    if (row === 0) return map.rows[0][col] !== null;
    if (row > historyPath.length) return false;

    const prevCol = historyPath[row - 1];
    // 相邻列检查
    return Math.abs(prevCol - col) <= 1 && map.rows[row][col] !== null;
  }

  return { generateAct, nextOptions, canReach, ACT_ROWS };
});
