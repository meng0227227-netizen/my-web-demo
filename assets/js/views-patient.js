/* ============================================================
   M3 患者康复数据分析模块
   档案查询 / 康复趋势 / 失衡频次 / 阶段对比 / 评估报表导出
   ============================================================ */
window.MLH = window.MLH || {};
MLH.views = MLH.views || {};

MLH.views.patient = (function () {
  'use strict';
  const D = MLH.data, U = MLH.ui;

  let curId = 'PT-2026-0417';
  let q = '', stageFilter = 'all', stageKey = 'recover';
  let handlers = [];

  function current() { return D.patientById[curId] || D.patients[0]; }

  function filtered() {
    return D.patients.filter(function (p) {
      const okQ = !q || (p.name + p.id + p.dx).indexOf(q) >= 0;
      const okS = stageFilter === 'all' || p.stage === stageFilter;
      return okQ && okS;
    });
  }

  /* ---------- 渲染 ---------- */
  function render(root) {
    const list = filtered();

    const toolbar =
      '<span class="segmented" id="pt-stage">' +
      '<button data-s="all"' + (stageFilter === 'all' ? ' class="is-on"' : '') + '>全部阶段</button>' +
      D.stages.map(function (s) {
        return '<button data-s="' + s.key + '"' + (stageFilter === s.key ? ' class="is-on"' : '') + '>' + s.name + '</button>';
      }).join('') + '</span>';

    const head = '<div class="card" style="margin-bottom:var(--sp-4)"><div class="card__body" style="padding:var(--sp-3) var(--sp-4)">' +
      '<div class="row row--wrap" style="gap:var(--sp-3)">' +
      '<div class="topbar__field" style="height:30px">' + U.icon('search', 14) +
      '<input id="pt-q" value="' + U.esc(q) + '" placeholder="搜索姓名 / 编号 / 诊断" style="border:0;background:transparent;outline:none;color:var(--ink);font-size:11.5px;width:196px">' +
      '</div>' + toolbar +
      '<span class="spacer" style="flex:1"></span>' +
      '<span class="mono" style="font-size:11px;color:var(--muted)">共 <b style="color:var(--ink)">' + list.length + '</b> / ' + D.patients.length + ' 例在管患者</span>' +
      '<button class="btn btn--primary" id="pt-export">' + U.icon('download', 14) + ' 导出康复评估报表</button>' +
      '</div></div></div>';

    /* 档案表 */
    const rows = list.map(function (p) {
      return '<tr data-id="' + p.id + '"' + (p.id === curId ? ' class="is-selected"' : '') + '>' +
        '<td><div class="user-cell">' + U.avatar(p.name, D.patients.indexOf(p)) + '<span class="strong">' + p.name + '</span></div></td>' +
        '<td class="cell-id">' + p.id + '</td>' +
        '<td>' + p.sex + ' / ' + p.age + '</td>' +
        '<td>' + U.esc(p.dx) + '</td>' +
        '<td>' + U.stageBadge(p.stage, p.stageName) + '</td>' +
        '<td class="r mono">' + p.sessions + '</td>' +
        '<td class="r mono">' + p.hours.toFixed(1) + ' h</td>' +
        '<td class="r mono strong">' + p.bbs + '</td>' +
        '<td class="r mono" style="color:var(--ok)">+' + p.bbsGain + '</td>' +
        '<td class="r mono">' + p.imbalancePer1k + ' ‰</td>' +
        '<td>' + U.meter(p.stability, p.stability > 85 ? 'ok' : (p.stability > 70 ? '' : 'warn')) + '</td>' +
        '<td class="mono" style="font-size:11px;color:var(--muted)">' + p.last + '</td>' +
        '</tr>';
    }).join('');

    const tableCard = U.card({
      title: '患者档案与历史训练记录', icon: 'users', sub: '点击行查看该患者完整康复分析',
      flush: true,
      right: '<span class="tag-sim">示例数据</span>',
      body: '<div class="tbl-wrap tbl__scroll" style="max-height:352px"><table class="tbl"><thead><tr>' +
        '<th>患者</th><th>档案编号</th><th>性别 / 年龄</th><th>临床诊断</th><th>康复阶段</th>' +
        '<th class="r">训练次数</th><th class="r">累计时长</th><th class="r">BBS</th><th class="r">提升</th>' +
        '<th class="r">失衡频次</th><th>稳定度</th><th>最近训练</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>',
      foot: '<span>BBS = Berg 平衡量表（0–56 分，≥45 分为跌倒低风险）</span><span>失衡频次 = 每千次训练动作的失衡触发次数</span>'
    });

    const pt = current();

    /* 档案详情 */
    const detail = U.card({
      title: '患者基础档案', icon: 'file', sub: pt.id,
      body: '<div class="row" style="gap:var(--sp-3);margin-bottom:var(--sp-4)">' +
        '<span class="avatar" style="width:40px;height:40px;font-size:15px">' + pt.name.replace(/[^一-龥]/g, '').slice(-1) + '</span>' +
        '<div><div style="font-size:15px;font-weight:700">' + pt.name + '　<span style="font-size:11px;color:var(--muted)">' + pt.sex + ' · ' + pt.age + ' 岁</span></div>' +
        '<div style="font-size:11px;color:var(--muted)">' + U.esc(pt.dx) + '　' + U.stageBadge(pt.stage, pt.stageName) + '</div></div></div>' +
        '<dl class="kv">' +
        '<dt>建档日期</dt><dd>' + pt.adm + '</dd>' +
        '<dt>责任康复师</dt><dd>' + pt.therapist + '</dd>' +
        '<dt>绑定设备</dt><dd>' + pt.device + '</dd>' +
        '<dt>训练次数</dt><dd>' + pt.sessions + ' 次</dd>' +
        '<dt>累计时长</dt><dd>' + pt.hours.toFixed(1) + ' h</dd>' +
        '<dt>训练依从度</dt><dd>' + pt.adherence + ' %</dd>' +
        '<dt>跌倒风险下降</dt><dd style="color:var(--ok)">' + pt.fallRiskDown + ' %</dd>' +
        '</dl>' +
        '<div class="hr"></div>' +
        '<div style="font-size:11px;color:var(--muted);margin-bottom:6px">临床备注</div>' +
        '<div style="font-size:11.5px;color:var(--ink-2);line-height:1.65">' + U.esc(pt.note) + '</div>' +
        '<div class="hr"></div>' +
        '<div class="stats" style="border:1px solid var(--hairline);border-radius:3px">' +
        '<div class="stats__cell"><div class="stats__k">当前 BBS</div><div class="stats__v">' + pt.bbs + '<small>/56</small></div></div>' +
        '<div class="stats__cell"><div class="stats__k">RMSE</div><div class="stats__v">' + pt.rmse + '<small>°</small></div></div>' +
        '<div class="stats__cell"><div class="stats__k">稳定度</div><div class="stats__v">' + pt.stability + '<small>分</small></div></div>' +
        '<div class="stats__cell"><div class="stats__k">失衡频次</div><div class="stats__v">' + pt.imbalancePer1k + '<small>‰</small></div></div>' +
        '</div>',
      foot: '<span>档案由康复师在训练前录入</span>'
    });

    /* 趋势行 */
    const trendRow = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c8">' + U.card({
        title: '康复趋势可视化', icon: 'wave', sub: pt.name + ' · 12 周',
        right: '<span class="tag-sim">示例数据</span>',
        body: '<div class="chart chart--300" id="ch-pt-trend"></div>',
        foot: '<span>BBS 12 周内由 <span class="mono">' + pt.bbs0 + '</span> 升至 <span class="mono">' + pt.bbs + '</span> 分</span>' +
          '<span>姿态偏移 RMSE 由 <span class="mono">3.42°</span> 降至 <span class="mono">' + pt.rmse + '°</span></span>'
      }) + '</div>' +
      '<div class="c4">' + detail + '</div>' +
      '</div>';

    /* 频次 + 阶段对比 */
    const row2 = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c6">' + U.card({
        title: '失衡发生频次统计', icon: 'pulse', sub: '每千次训练动作的失衡触发次数',
        right: '<span class="tag-sim">示例数据</span>',
        body: '<div class="chart chart--260" id="ch-pt-imb"></div>',
        foot: '<span>第 1 周 18.6 ‰ → 第 12 周 ' + pt.imbalancePer1k + ' ‰</span><span>降幅 ' +
          Math.round((1 - pt.imbalancePer1k / 18.6) * 100) + '%</span>'
      }) + '</div>' +
      '<div class="c6">' + U.card({
        title: '康复阶段指标对比', icon: 'layers', sub: '急性期 / 恢复期 / 巩固期（归一化改善指数）',
        right: '<span class="tag-sim">示例数据</span>',
        body: '<div class="chart chart--260" id="ch-pt-stage"></div>',
        foot: '<span>柱越高表示该阶段康复表现越好</span><span>量表口径见《康复阶段患者各项参数统计表》</span>'
      }) + '</div>' +
      '</div>';

    /* 阶段详情 + 散点 */
    const st = D.stages.find(function (s) { return s.key === stageKey; });
    const stageCard = U.card({
      title: '康复阶段适配策略', icon: 'scale', sub: '分期自适应参数库',
      right: '<span class="segmented" id="pt-stagepick">' +
        D.stages.map(function (s) { return '<button data-k="' + s.key + '"' + (s.key === stageKey ? ' class="is-on"' : '') + '>' + s.name + '</button>'; }).join('') +
        '</span>',
      body: '<div class="grid" style="grid-template-columns:repeat(2,1fr);gap:var(--sp-3)">' +
        '<div><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:5px">患者身体特征</div>' +
        '<div style="font-size:11.5px;color:var(--ink-2)">' + st.body + '</div>' +
        '<div class="hr"></div>' +
        '<div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:5px">核心参数适配策略</div>' +
        '<div style="font-size:11.5px;color:var(--ink-2)">' + st.strategy + '</div></div>' +
        '<div><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:5px">飞轮矫正 / 训练目标</div>' +
        '<div style="font-size:11.5px;color:var(--ink-2)"><b>' + st.force + '</b>　' + st.goal + '</div>' +
        '<div class="hr"></div>' +
        '<div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:5px">安全机制</div>' +
        '<div style="font-size:11.5px;color:var(--ink-2)">' + st.safety + '</div></div>' +
        '</div>' +
        '<div class="hr"></div>' +
        '<div class="stats" style="border:1px solid var(--hairline);border-radius:3px">' +
        '<div class="stats__cell"><div class="stats__k">Kp / Ki / Kd</div><div class="stats__v" style="font-size:13px">' + st.params.kp + ' / ' + st.params.ki + ' / ' + st.params.kd + '</div></div>' +
        '<div class="stats__cell"><div class="stats__k">MPC 约束</div><div class="stats__v" style="font-size:13px">' + st.params.mpc + '</div></div>' +
        '<div class="stats__cell"><div class="stats__k">滑模阻尼</div><div class="stats__v" style="font-size:13px">' + st.params.slide + '</div></div>' +
        '<div class="stats__cell"><div class="stats__k">力矩梯度</div><div class="stats__v" style="font-size:13px">' + st.params.torque + ' N·m</div></div>' +
        '</div>'
    });

    const scatterCard = U.card({
      title: '训练剂量与平衡稳定度关系', icon: 'target', sub: '气泡大小 = 失衡频次',
      right: '<span class="tag-sim">示例数据</span>',
      body: '<div class="chart chart--260" id="ch-pt-dose"></div>',
      foot: '<span>橙色 = 急性期 · 青色 = 恢复期 · 绿色 = 巩固期</span>'
    });

    const row3 = '<div class="grid g-12">' +
      '<div class="c7">' + stageCard + '</div>' +
      '<div class="c5">' + scatterCard + '</div>' +
      '</div>';

    root.innerHTML = head + tableCard + trendRow + row2 + row3;
  }

  /* ---------- 挂载 ---------- */
  function mount(root) {
    const pt = current();

    U.mountChart(root.querySelector('#ch-pt-trend'), function () { return MLH.charts.patientTrend(pt); });
    U.mountChart(root.querySelector('#ch-pt-imb'), function () { return MLH.charts.imbalanceFreq(pt); });
    U.mountChart(root.querySelector('#ch-pt-stage'), function () { return MLH.charts.stageCompare(D.stages); });
    U.mountChart(root.querySelector('#ch-pt-dose'), function () { return MLH.charts.doseScatter(D.patients); });

    /* 表格交互 */
    const tb = root.querySelector('tbody');
    if (tb) {
      const h = function (e) {
        const tr = e.target.closest('tr'); if (!tr) return;
        curId = tr.dataset.id;
        rerender(root);
      };
      tb.addEventListener('click', h);
      handlers.push([tb, h]);
    }

    /* 搜索 */
    const qn = root.querySelector('#pt-q');
    if (qn) {
      const h = function () { q = qn.value.trim(); rerender(root, 'keepFocus'); };
      qn.addEventListener('input', debounce(h, 220));
      handlers.push([qn, h]);
    }
    /* 阶段筛选 */
    bindSeg(root, '#pt-stage', function (b) { stageFilter = b.dataset.s; rerender(root); });
    bindSeg(root, '#pt-stagepick', function (b) { stageKey = b.dataset.k; rerender(root); });

    /* 导出 */
    const ex = root.querySelector('#pt-export');
    if (ex) {
      const h = function () { exportReport(pt); };
      ex.addEventListener('click', h);
      handlers.push([ex, h]);
    }
  }

  function bindSeg(root, sel, cb) {
    const n = root.querySelector(sel);
    if (!n) return;
    const h = function (e) {
      const b = e.target.closest('button'); if (!b) return;
      n.querySelectorAll('button').forEach(function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
      cb(b);
    };
    n.addEventListener('click', h);
    handlers.push([n, h]);
  }

  function debounce(fn, ms) {
    let t = null;
    return function () { const a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); };
  }

  function rerender(root, mode) {
    unmount();
    U.disposeAll();
    root.innerHTML = '';
    render(root);
    mount(root);
    if (mode === 'keepFocus') {
      const qn = root.querySelector('#pt-q');
      if (qn) { qn.focus(); qn.setSelectionRange(qn.value.length, qn.value.length); }
    }
  }

  /* ---------- 评估报表导出 ---------- */
  function exportReport(pt) {
    const s = pt.series;
    const rows = [];
    rows.push(['动量稳衡 · 下肢平衡康复评估报表']);
    rows.push(['患者姓名', pt.name, '档案编号', pt.id]);
    rows.push(['性别 / 年龄', pt.sex + ' / ' + pt.age + ' 岁', '临床诊断', pt.dx]);
    rows.push(['康复阶段', pt.stageName, '责任康复师', pt.therapist]);
    rows.push(['绑定设备', pt.device, '建档日期', pt.adm]);
    rows.push(['导出时间', new Date().toLocaleString('zh-CN')]);
    rows.push([]);
    rows.push(['一、康复指标汇总']);
    rows.push(['指标', '入院基线', '当前值', '变化']);
    rows.push(['Berg 平衡量表 BBS（分）', pt.bbs0, pt.bbs, '+' + pt.bbsGain]);
    rows.push(['姿态偏移 RMSE（°）', 3.42, pt.rmse, '-' + (3.42 - pt.rmse).toFixed(2)]);
    rows.push(['失衡频次（次/千次动作）', 18.6, pt.imbalancePer1k, '-' + (18.6 - pt.imbalancePer1k).toFixed(1)]);
    rows.push(['姿态稳定度评分', 61, pt.stability, '+' + (pt.stability - 61)]);
    rows.push(['训练依从度（%）', '—', pt.adherence, '—']);
    rows.push(['跌倒风险下降（%）', '—', pt.fallRiskDown, '—']);
    rows.push([]);
    rows.push(['二、逐周训练与康复记录']);
    rows.push(['周次', 'BBS（分）', '姿态偏移 RMSE（°）', '躯干摆幅（°）', '失衡频次（‰）', '稳定度评分', '周训练剂量（h）']);
    s.weeks.forEach(function (w, i) {
      rows.push([w, s.bbs[i], s.rmse[i], s.sway[i], s.imb[i], s.stab[i], s.dose[i]]);
    });
    rows.push([]);
    rows.push(['三、阶段适配参数执行记录']);
    rows.push(['康复阶段', 'Kp', 'Ki', 'Kd', 'MPC 约束', '滑模阻尼', '力矩梯度（N·m）']);
    D.stages.forEach(function (st) {
      rows.push([st.name, st.params.kp, st.params.ki, st.params.kd, st.params.mpc, st.params.slide, st.params.torque]);
    });
    rows.push([]);
    rows.push(['四、结论与建议']);
    rows.push(['平衡能力评级', pt.bbs >= 45 ? '低跌倒风险' : (pt.bbs >= 35 ? '中等风险' : '较高风险')]);
    rows.push(['康复建议', '维持当前' + pt.stageName + '训练方案，周训练量建议不低于 12 h；'
      + (pt.bbs >= 45 ? '可逐步下调辅助力矩，鼓励自主平衡训练。' : '继续强化平衡肌群训练，密切监测失衡频次变化。')]);
    rows.push([]);
    rows.push(['注：本报表数据来源为平台仿真/示例数据，用于演示数据可视化能力，不作为临床诊疗依据。']);

    const fname = '动量稳衡_康复评估报表_' + pt.name.replace(/\*/g, '') + '_' + pt.id + '.csv';
    U.downloadCSV(fname, rows);
    U.toast('报表已导出', fname, 'ok');
  }

  function unmount() {
    handlers.forEach(function (h) { h[0].removeEventListener('click', h[1]); h[0].removeEventListener('input', h[1]); });
    handlers = [];
  }

  return {
    title: '患者康复数据分析', code: 'M03', icon: 'users',
    subtitle: '档案与训练记录 · 康复趋势 · 失衡频次 · 阶段对比 · 报表导出',
    render: render, mount: mount, unmount: unmount
  };
})();
