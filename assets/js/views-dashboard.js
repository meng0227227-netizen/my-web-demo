/* ============================================================
   M1 首页仪表盘
   ============================================================ */
window.MLH = window.MLH || {};
MLH.views = MLH.views || {};

MLH.views.dashboard = (function () {
  'use strict';
  const D = MLH.data, U = MLH.ui;

  const L = {
    levelTone: { danger: 'danger', warn: 'warn', info: 'info' },
    levelName: { danger: '高危', warn: '预警', info: '提示' },
    levelIcon: { danger: 'alert', warn: 'alert', info: 'info' }
  };

  function render(root) {
    const k = D.kpi, t = D.trend7;

    /* --- 顶部平台运行提示 --- */
    const notice = '<div class="notice notice--info" style="margin-bottom:var(--sp-4)">' +
      U.icon('info', 13) +
      '<div><b>本平台演示数据均为仿真/示例数据</b>，量级参考项目试点阶段真实规划规模（中期 20+ 家机构、长期 80 家 / 3500 名居家患者），未作夸大处理。生理与算法信号由平台内置 50 Hz 仿真引擎实时生成。</div></div>';

    /* --- 4 张核心指标卡 --- */
    const kpis = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c3">' + U.kpi({
        key: 'dev-online', label: '在线设备数量', icon: 'chip', tone: 'primary',
        value: k.devices.online, unit: '台',
        sparkId: 'spk-dev',
        foot: '总接入 <span class="mono">' + k.devices.total + '</span> 台 · 在线率 <span class="mono">' +
          (k.devices.online / k.devices.total * 100).toFixed(1) + '%</span>' + U.delta(k.devices.chg, ' 台', false)
      }) + '</div>' +
      '<div class="c3">' + U.kpi({
        key: 'pt-train', label: '在训患者数量', icon: 'users', tone: 'ok',
        value: k.patients.inTraining, unit: '人',
        sparkId: 'spk-pt',
        foot: '已建档 <span class="mono">' + k.patients.registered + '</span> 人 · 本周新增 <span class="mono">' + k.patients.weekNew + '</span>' + U.delta(k.patients.chg, ' 人', false)
      }) + '</div>' +
      '<div class="c3">' + U.kpi({
        key: 'hr-total', label: '累计训练时长', icon: 'clock',
        value: U.fmt(k.hours.total), unit: 'h',
        sparkId: 'spk-hr',
        foot: '今日 <span class="mono">' + k.hours.today + ' h</span> · 单次均 <span class="mono">' + k.hours.avgSession + ' min</span>'
      }) + '</div>' +
      '<div class="c3">' + U.kpi({
        key: 'im-total', label: '失衡预警总次数', icon: 'pulse', tone: 'warn',
        value: U.fmt(k.imbalance.total), unit: '次',
        sparkId: 'spk-im',
        foot: '自动矫正 <span class="mono">' + U.fmt(k.imbalance.autoFixed) + '</span> 次 · 矫正率 <span class="mono">' + k.imbalance.fixRate + '%</span>'
      }) + '</div>' +
      '</div>';

    /* --- 概览趋势 + 实时告警 --- */
    const alertRows = D.alerts.slice(0, 6).map(function (a) {
      return '<div class="feed__item">' +
        '<div class="feed__icon feed__icon--' + (a.level === 'danger' ? 'danger' : a.level === 'warn' ? 'warn' : 'info') + '">' + U.icon(L.levelIcon[a.level], 14) + '</div>' +
        '<div><div class="feed__title">' + U.esc(a.title) + '</div>' +
        '<div class="feed__meta">' + U.esc(a.device) + ' · ' + U.esc(a.patient) + ' · ' + U.esc(a.type) + ' · ' + U.esc(a.status) + '</div></div>' +
        '<div class="feed__time">' + a.time + '</div></div>';
    }).join('');

    const trendRow = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c8">' + U.card({
        title: '近 7 天康复数据简览', icon: 'wave',
        sub: '训练时长 / 失衡预警',
        right: '<span class="tag-sim">示例数据</span>',
        body: '<div class="chart chart--300" id="ch-trend7"></div>',
        foot: '<span>统计口径：每日 00:00–24:00 · 含院内与居家设备</span><span>失衡预警 7 日累计 ' + t.imbalance.reduce(function (a, b) { return a + b; }, 0) + ' 次，环比下降 21.4%</span>'
      }) + '</div>' +
      '<div class="c4">' + U.card({
        title: '实时告警提示', icon: 'bell', sub: '设备故障 / 姿态异常',
        right: '<span class="link" data-goto="alarm">全部日志 →</span>',
        flush: true,
        body: '<div class="feed" style="max-height:344px;overflow-y:auto">' + alertRows + '</div>'
      }) + '</div>' +
      '</div>';

    /* --- 设备状态 + 每日训练 --- */
    const devLegend =
      '<div style="display:flex;flex-direction:column;gap:var(--sp-2);margin-top:var(--sp-3)">' +
      [['在线', k.devices.online, 'var(--cyan)'], ['离线', k.devices.offline, 'var(--muted-2)'],
       ['维护中', k.devices.maintain, 'var(--warn)'], ['待激活', k.devices.pending, 'var(--hairline-2)']]
        .map(function (r) {
          return '<div class="row row--between" style="font-size:11.5px">' +
            '<span class="row" style="gap:6px"><span class="legend__swatch" style="background:' + r[2] + '"></span>' + r[0] + '</span>' +
            '<span class="mono" style="color:var(--ink)">' + r[1] + ' <span style="color:var(--muted)">台</span></span></div>';
        }).join('') + '</div>';

    const row3 = '<div class="grid g-12">' +
      '<div class="c4">' + U.card({
        title: '设备接入状态', icon: 'chip', sub: '共 ' + k.devices.total + ' 台',
        body: '<div class="chart chart--220" id="ch-devdonut"></div>' + devLegend,
        foot: '<span>在线率 ' + (k.devices.online / k.devices.total * 100).toFixed(1) + '%</span><span>已绑定患者 ' + D.patients.length + ' 例</span>'
      }) + '</div>' +
      '<div class="c8">' + U.card({
        title: '每日训练人次 / 新增建档', icon: 'pulse', sub: '近 7 天',
        right: '<span class="tag-sim">示例数据</span>',
        body: '<div class="chart chart--220" id="ch-daily"></div>',
        foot: '<span>本周训练 <span class="mono">' + t.sessions.reduce(function (a, b) { return a + b; }, 0) + '</span> 人次</span>' +
          '<span>在训患者姿态偏移 RMSE 由 <span class="mono">1.62°</span> 降至 <span class="mono">1.31°</span></span>'
      }) + '</div>' +
      '</div>';

    /* --- 平台链路状态条 --- */
    const link = '<div class="card" style="margin-top:var(--sp-4)"><div class="card__body" style="padding:var(--sp-3) var(--sp-4)">' +
      '<div class="row row--wrap" style="gap:var(--sp-5);font-size:11.5px">' +
      [['设备端 MQTT 上报', 'ok', '50 Hz · 丢包 0.3%'],
       ['云端数据入库', 'ok', '延迟 142 ms'],
       ['UKF 解算服务', 'ok', '耗时 1.18 ms/次'],
       ['分期自适应引擎', 'ok', '当前判定 恢复期'],
       ['告警推送通道', 'warn', '1 条高危待复核']]
        .map(function (r) {
          return '<span class="row" style="gap:7px"><span class="dot dot--' + (r[1] === 'ok' ? 'ok' : 'warn') + '"></span>' +
            '<b style="font-weight:600;color:var(--ink)">' + r[0] + '</b>' +
            '<span class="mono" style="color:var(--muted)">' + r[2] + '</span></span>';
        }).join('') + '</div></div></div>';

    root.innerHTML = notice + kpis + trendRow + row3 + link;
  }

  function mount(root) {
    const k = D.kpi, t = D.trend7;
    const p = MLH.charts.pal();

    /* KPI 火花线（ECharts 画布不解析 CSS 变量，必须传实际色值） */
    const sparks = [
      ['#spk-dev', t.onlineDevices, p.series[0]],
      ['#spk-pt', t.sessions, p.series[4]],
      ['#spk-hr', t.hours, p.series[1]],
      ['#spk-im', t.imbalance, p.series[2]]
    ];
    sparks.forEach(function (s) {
      const n = root.querySelector(s[0]);
      if (n) U.mountChart(n, function () { return MLH.charts.spark(s[1], s[2]); });
    });

    U.mountChart(root.querySelector('#ch-trend7'), function () { return MLH.charts.trend7(t); });
    U.mountChart(root.querySelector('#ch-daily'), function () { return MLH.charts.dailyBars(t); });
    U.mountChart(root.querySelector('#ch-devdonut'), function () { return MLH.charts.deviceDonut(k); });

    /* 数字滚动动画 */
    root.querySelectorAll('[data-kpi]').forEach(function (n) {
      const target = parseFloat(String(n.textContent).replace(/[^\d.]/g, ''));
      if (isNaN(target)) return;
      const dec = (String(n.textContent).split('.')[1] || '').length;
      const dur = 620;
      const t0 = performance.now();
      const from = target * 0.72;
      function step(now) {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        const v = from + (target - from) * e;
        n.textContent = dec ? v.toFixed(dec) : U.fmt(Math.round(v));
        if (p < 1) requestAnimationFrame(step);
        else n.textContent = dec ? target.toFixed(dec) : U.fmt(target);
      }
      requestAnimationFrame(step);
    });
  }

  function unmount() {}

  return {
    title: '首页仪表盘', code: 'M01', icon: 'dashboard',
    subtitle: '平台总览 · 核心指标 · 近 7 天趋势 · 实时告警',
    render: render, mount: mount, unmount: unmount
  };
})();
