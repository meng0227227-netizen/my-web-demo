/* ============================================================
   M4 算法性能可视化模块
   卡尔曼滤波效果对比 / 自适应 PID 时序 / 性能指标统计
   ============================================================ */
window.MLH = window.MLH || {};
MLH.views = MLH.views || {};

MLH.views.algorithm = (function () {
  'use strict';
  const D = MLH.data, U = MLH.ui;

  let kfZoom = 0, gradHi = null;
  let handlers = [];

  function render(root) {
    const a = D.algoStats;

    const notice = '<div class="notice notice--info" style="margin-bottom:var(--sp-4)">' + U.icon('info', 13) +
      '<div>算法性能数据来源于 <b>MATLAB 多体动力学仿真 + 样机实测回放</b>（5°–30° 多梯度失衡工况）。本页数值为示例/仿真数据，用于展示算法可视化能力。</div></div>';

    /* 指标卡 */
    const kpis = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      ['<div class="c3">' + U.kpi({ label: '角度检测误差', icon: 'target', tone: 'primary',
        value: a.errDynamic.toFixed(2), unit: '°',
        foot: '静态 <span class="mono">' + a.errStatic.toFixed(2) + '°</span> · 标准差 <span class="mono">±' + a.errStd + '°</span>'
      }) + '</div>',
      '<div class="c3">' + U.kpi({ label: '系统响应延迟', icon: 'zap', tone: 'ok',
        value: a.latencyMean, unit: 'ms',
        foot: 'P95 <span class="mono">' + a.latencyP95 + ' ms</span> · 峰值 <span class="mono">' + a.latencyMax + ' ms</span>'
      }) + '</div>',
      '<div class="c3">' + U.kpi({ label: 'UKF 单次解算耗时', icon: 'chip',
        value: a.ukfCost.toFixed(2), unit: 'ms',
        foot: '控制周期 <span class="mono">' + a.ctrlPeriod.toFixed(1) + ' ms</span> · 抖动 <span class="mono">±' + a.periodJitter + ' ms</span>'
      }) + '</div>',
      '<div class="c3">' + U.kpi({ label: '力矩跟踪误差', icon: 'scale', tone: 'warn',
        value: a.torqueTrackErr.toFixed(1), unit: '%',
        foot: '转速限幅 <span class="mono">≤6000 rpm</span> · 限幅触发 <span class="mono">0.3%</span>'
      }) + '</div>'].join('') +
      '</div>';

    /* 卡尔曼对比 */
    const kfCard = U.card({
      title: '卡尔曼滤波效果对比', icon: 'filter',
      sub: '原始含噪传感器数据 vs 自适应 UKF 滤波输出',
      right: '<span class="segmented" id="kf-zoom"><button data-z="0" class="is-on">全程 20 s</button><button data-z="1">放大前 8 s</button></span>',
      body: '<div class="chart chart--340" id="ch-kf"></div>',
      foot: '<span>灰线：原始 IMU 测量（含毛刺）· 蓝线：自适应 UKF 输出 · 灰虚线：仿真参考真值</span>' +
        '<span>RMSE <span class="mono">' + a.rmseRaw + '° → ' + a.rmseFused + '°</span></span>'
    });

    const kfMetric = U.card({
      title: '滤波性能量化', icon: 'ruler', sub: '同一段含扰工况',
      body: '<div class="stats" style="border:1px solid var(--hairline);border-radius:3px">' +
        '<div class="stats__cell"><div class="stats__k">原始 RMSE</div><div class="stats__v">' + a.rmseRaw + '<small>°</small></div></div>' +
        '<div class="stats__cell"><div class="stats__k">滤波 RMSE</div><div class="stats__v" style="color:var(--ok)">' + a.rmseFused + '<small>°</small></div></div>' +
        '<div class="stats__cell"><div class="stats__k">信噪比提升</div><div class="stats__v">+' + a.snrGain + '<small>dB</small></div></div>' +
        '<div class="stats__cell"><div class="stats__k">噪声抑制比</div><div class="stats__v">' + a.noiseReject + '<small>%</small></div></div>' +
        '<div class="stats__cell"><div class="stats__k">姿态收敛率</div><div class="stats__v">' + a.convRate + '<small>%</small></div></div>' +
        '<div class="stats__cell"><div class="stats__k">误触发率</div><div class="stats__v" style="color:var(--ok)">' + a.falseTrip + '<small>%</small></div></div>' +
        '</div>' +
        '<div class="hr"></div>' +
        '<div class="stack stack--tight" style="font-size:11.5px">' +
        ['前置毛刺剔除 + 异常值截断', '多源数据互补校准', '动态噪声参数迭代（200 ms）', '自主动作 / 无意识倾倒区分']
          .map(function (t) {
            return '<div class="row" style="gap:7px"><span style="color:var(--ok);display:flex">' + U.icon('check', 13) + '</span><span style="color:var(--ink-2)">' + t + '</span></div>';
          }).join('') + '</div>',
      foot: '<span>算法未检出漏报率 ' + a.missRate + '%</span>'
    });

    const rowA = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c8">' + kfCard + '</div>' +
      '<div class="c4">' + kfMetric + '</div>' +
      '</div>';

    /* 残差 + 延迟分布 */
    const rowB = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c6">' + U.card({
        title: '滤波残差对比', icon: 'wave', sub: '与参考真值的偏差（误差带）',
        right: '<span class="tag-sim">仿真数据</span>',
        body: '<div class="chart chart--260" id="ch-kfres"></div>',
        foot: '<span>原始信号残差峰值 ±' + Math.max.apply(null, D.kalman.raw.map(function (v, i) { return Math.abs(v - D.kalman.truth[i]); })).toFixed(2) + '°</span>' +
          '<span>滤波后残差稳定在 ±0.6° 内</span>'
      }) + '</div>' +
      '<div class="c6">' + U.card({
        title: '响应延迟分布', icon: 'clock', sub: '从姿态超限判定到力矩输出的端到端延迟',
        right: '<span class="tag-sim">实测统计</span>',
        body: '<div class="chart chart--260" id="ch-lat"></div>',
        foot: '<span>样本 2,326 次 · 均值 ' + a.latencyMean + ' ms</span><span>98.2% 落在 150 ms 以内</span>'
      }) + '</div>' +
      '</div>';

    /* PID 时序 */
    const rowC = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c12">' + U.card({
        title: '自适应 PID / 复合控制参数时序曲线', icon: 'sliders',
        sub: '训练全程 0–40 min · Kp / Ki / Kd 动态变化',
        right: '<span class="row" style="gap:10px"><span class="legend">' +
          D.stages.map(function (s, i) {
            return '<span class="legend__item"><span class="legend__swatch" style="background:' +
              ['var(--warn)', 'var(--cyan)', 'var(--ok)'][i] + ';opacity:.55"></span>' + s.name + '</span>';
          }).join('') + '</span><span class="tag-sim">示例数据</span></span>',
        body: '<div class="chart chart--340" id="ch-pid"></div>',
        foot: '<span>遵循“阶段大调、单次微调”：阶段切换时整组更新，单次训练内按姿态改善度与失衡频次微调</span>' +
          '<span>Kp <span class="mono">2.05 → 3.62</span> · Ki <span class="mono">0.22 → 0.41</span> · Kd <span class="mono">0.09 → 0.176</span></span>'
      }) + '</div>' +
      '</div>';

    /* 多梯度仿真 + 散点 */
    const rowD = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c7">' + U.card({
        title: '多梯度失衡仿真验证曲线', icon: 'wave',
        sub: '初始倾角 5° / 10° / 15° / 20° / 25° / 30° 六组工况',
        right: '<span class="segmented" id="grad-pick"><button data-a="all" class="is-on">全部</button>' +
          D.gradient.rows.map(function (r) { return '<button data-a="' + r.angle + '">' + r.angle + '°</button>'; }).join('') +
          '</span>',
        body: '<div class="chart chart--340" id="ch-grad"></div>',
        foot: '<span>倾角越大，收敛耗时越长（初始倾角与收敛时间近似线性）</span>'
      }) + '</div>' +
      '<div class="c5">' + U.card({
        title: '倾角 – 收敛耗时关系', icon: 'ruler', sub: '散点 + 线性拟合',
        body: '<div class="chart chart--340" id="ch-cost"></div>',
        foot: '<span>六组工况峰值力矩 <span class="mono">0.15 → 0.43 N·m</span></span>'
      }) + '</div>' +
      '</div>';

    /* 控制品质 */
    const rowE = '<div class="grid g-12">' +
      '<div class="c5">' + U.card({
        title: '力矩跟踪品质', icon: 'target', sub: '指令力矩 vs 实际输出',
        right: '<span class="tag-sim">仿真数据</span>',
        body: '<div class="chart chart--260" id="ch-tq"></div>',
        foot: '<span>跟踪误差 ' + a.torqueTrackErr + '%（满量程）</span><span>虚线为理想 1:1 输出</span>'
      }) + '</div>' +
      '<div class="c4">' + U.card({
        title: '控制能力雷达', icon: 'shield', sub: '本项目 vs 常规单一 PID 方案',
        body: '<div class="chart chart--260" id="ch-perf"></div>',
        foot: '<span>定性对比，用于说明复合分层控制的互补优势</span>'
      }) + '</div>' +
      '<div class="c3">' + U.card({
        title: '算力资源占用', icon: 'chip', sub: 'STM32H743 / Cortex-M7 400 MHz',
        body: '<div class="stack stack--tight">' +
          [['CPU 占用', a.cpu, '%', 'warn'], ['SRAM 使用', a.ram, '%', ''], ['Flash 占用', a.flashUse, '%', '']]
            .map(function (r) {
              return '<div><div class="row row--between" style="font-size:11.5px;margin-bottom:4px">' +
                '<span style="color:var(--muted)">' + r[0] + '</span>' +
                '<span class="mono" style="color:var(--ink)">' + r[1] + ' ' + r[2] + '</span></div>' + U.meter(r[1], r[3]) + '</div>';
            }).join('') +
          '<div class="hr"></div>' +
          '<div class="row row--between" style="font-size:11.5px"><span style="color:var(--muted)">任务调度</span><span class="mono" style="color:var(--ink-2)">FreeRTOS 抢占式</span></div>' +
          '<div class="row row--between" style="font-size:11.5px"><span style="color:var(--muted)">浮点单元</span><span class="mono" style="color:var(--ink-2)">双精度 FPU</span></div>' +
          '<div class="row row--between" style="font-size:11.5px"><span style="color:var(--muted)">高优先级任务</span><span class="mono" style="color:var(--ink-2)">4 项 / 毫秒级</span></div>' +
          '<div class="row row--between" style="font-size:11.5px"><span style="color:var(--muted)">控制周期抖动</span><span class="mono" style="color:var(--ok)">±' + a.periodJitter + ' ms</span></div>' +
          '</div>',
        foot: '<span>全程无算力瓶颈、无控制滞后</span>'
      }) + '</div>' +
      '</div>';

    root.innerHTML = notice + kpis + rowA + rowB + rowC + rowD + rowE;
  }

  function mount(root) {
    U.mountChart(root.querySelector('#ch-kf'), function () {
      return MLH.charts.kalmanCompare(D.kalman, { zoom: kfZoom });
    });
    U.mountChart(root.querySelector('#ch-kfres'), function () { return MLH.charts.kalmanResidual(D.kalman); });
    U.mountChart(root.querySelector('#ch-lat'), function () { return MLH.charts.latencyHist(D.latencyHist); });
    U.mountChart(root.querySelector('#ch-pid'), function () { return MLH.charts.pidSeries(D.pidRun); });
    U.mountChart(root.querySelector('#ch-grad'), function () { return MLH.charts.gradient(D.gradient, gradHi); });
    U.mountChart(root.querySelector('#ch-cost'), function () { return MLH.charts.angleCost(D.gradient); });
    U.mountChart(root.querySelector('#ch-tq'), function () { return MLH.charts.torqueTrack(5150); });
    U.mountChart(root.querySelector('#ch-perf'), function () { return MLH.charts.perfRadar(); });

    /* 缩放切换 */
    bind(root, '#kf-zoom', function (b) { kfZoom = parseInt(b.dataset.z, 10); refresh('ch-kf', function () { return MLH.charts.kalmanCompare(D.kalman, { zoom: kfZoom }); }); });
    /* 梯度高亮 */
    bind(root, '#grad-pick', function (b) {
      gradHi = b.dataset.a === 'all' ? null : parseFloat(b.dataset.a);
      refresh('ch-grad', function () { return MLH.charts.gradient(D.gradient, gradHi); });
    });
  }

  function bind(root, sel, cb) {
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

  /* 仅更新指定图表，避免整页重建 */
  function refresh(id, fn) {
    const node = document.getElementById(id);
    if (!node) return;
    const inst = echarts.getInstanceByDom(node);
    if (inst) inst.setOption(fn(), true);
  }

  function unmount() {
    handlers.forEach(function (h) { h[0].removeEventListener('click', h[1]); });
    handlers = [];
  }

  return {
    title: '算法性能可视化', code: 'M04', icon: 'chip',
    subtitle: '卡尔曼滤波对比 · 自适应 PID 时序 · 性能指标统计',
    render: render, mount: mount, unmount: unmount
  };
})();
