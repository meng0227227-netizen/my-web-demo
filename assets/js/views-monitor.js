/* ============================================================
   M2 实时监测模块
   3D 姿态可视化 / 传感器波形 / 算法参数面板 / 动量轮状态 / 事件标记
   ============================================================ */
window.MLH = window.MLH || {};
MLH.views = MLH.views || {};

MLH.views.monitor = (function () {
  'use strict';
  const U = MLH.ui, L = MLH.live;

  const DEV = 'DMH-2025-017';
  let scopes = [], unsub = null, raf = null, txtTimer = null, lastEvtKey = '';
  let running = true, flash = 0;

  /* ---------- 仪表盘 SVG（半环） ---------- */
  const ARC_LEN = Math.PI * 26;   // r = 26
  function gauge(id, label, unit, color, max, min) {
    return '<div class="gauge">' +
      '<svg class="gauge__svg" viewBox="0 0 68 46" preserveAspectRatio="xMidYMid meet">' +
      '<path d="M8 42 A26 26 0 0 1 60 42" fill="none" stroke="var(--surface-3)" stroke-width="6" stroke-linecap="round"/>' +
      '<path id="g-' + id + '" d="M8 42 A26 26 0 0 1 60 42" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" ' +
      'stroke-dasharray="0 ' + ARC_LEN.toFixed(2) + '"/>' +
      '</svg>' +
      '<div class="gauge__v"><span class="mono" id="v-' + id + '">—</span><small>' + unit + '</small></div>' +
      '<div class="gauge__k">' + label + '</div>' +
      '<div class="mono" style="font-size:9px;color:var(--muted-2)" id="r-' + id + '">量程 ' + (min == null ? 0 : min) + '–' + max + '</div>' +
      '</div>';
  }
  function setGauge(id, val, max, min) {
    const a = document.getElementById('g-' + id), v = document.getElementById('v-' + id);
    if (!a) return;
    const lo = min == null ? 0 : min;
    const p = Math.max(0, Math.min(1, (val - lo) / (max - lo)));
    a.setAttribute('stroke-dasharray', (ARC_LEN * p).toFixed(2) + ' ' + ARC_LEN.toFixed(2));
    if (v) v.textContent = val;
  }

  /* ---------- 渲染 ---------- */
  function render(root) {
    /* ---- 告警/状态横幅 ---- */
    const bar = '<div class="card" style="margin-bottom:var(--sp-4)"><div class="card__body" style="padding:var(--sp-3) var(--sp-4)">' +
      '<div class="row row--wrap" style="gap:var(--sp-5);font-size:11.5px">' +
      '<span class="row" style="gap:8px">' + U.badge('采集运行中', 'ok', true) +
      '<span class="mono" style="color:var(--muted)">50 Hz · 控制周期 5.0 ms</span></span>' +
      '<span class="row" style="gap:7px"><span style="color:var(--muted)">监测设备</span><b class="mono" style="color:var(--ink)">' + DEV + '</b>' +
      '<span style="color:var(--muted)">绑定患者</span><b style="color:var(--ink)">张*明</b>' + U.badge('恢复期', 'warn') + '</span>' +
      '<span class="row" style="gap:7px"><span style="color:var(--muted)">挂载形式</span><span class="mono" style="color:var(--ink-2)">固定式医用训练台</span></span>' +
      '<span class="row" style="gap:7px"><span style="color:var(--muted)">固件</span><span class="mono" style="color:var(--ink-2)">FW 1.4.2</span></span>' +
      '<span class="spacer" style="flex:1"></span>' +
      '<span class="segmented" id="mon-ctl">' +
      '<button data-act="pause">' + U.icon('pause', 12) + ' 暂停采集</button>' +
      '<button data-act="trigger">' + U.icon('zap', 12) + ' 触发失衡工况</button>' +
      '<button data-act="reset">' + U.icon('refresh', 12) + ' 复位</button>' +
      '</span>' +
      '</div></div></div>';

    /* ---- Row A：3D 姿态 + 传感器波形 ---- */
    const stageHtml =
      '<div class="stage" id="stage">' +
      '<div class="stage__floor"></div>' +
      '<div class="stage__stage-grid"></div>' +
      '<div class="stage__axis" style="width:120px;transform:translate(0,0) rotate(0deg)">' +
      '<span style="position:absolute;right:-26px;top:-7px;font-size:9px;color:var(--muted)">+X 横滚</span></div>' +
      '<div class="stage__axis" style="width:120px;transform:rotate(-90deg)">' +
      '<span style="position:absolute;right:-26px;top:-16px;font-size:9px;color:var(--muted)">+Y 俯仰</span></div>' +
      '<div class="stage__rig" id="rig">' +
      '<div class="fig fig--tilted" id="fig">' +
      '<div class="fig__seg fig__head"></div><div class="fig__seg fig__torso"></div>' +
      '<div class="fig__seg fig__arm fig__arm--l"></div><div class="fig__seg fig__arm fig__arm--r"></div>' +
      '<div class="fig__seg fig__hip"></div>' +
      '<div class="fig__seg fig__leg fig__leg--l"></div><div class="fig__seg fig__leg fig__leg--r"></div>' +
      '<div class="fig__pelvis-line" id="pelvis"></div>' +
      '<div class="fig__cog" id="cog"></div><div class="fig__plumb"></div>' +
      '</div>' +
      '<div class="dev">' +
      '<div class="dev__shell"></div>' +
      '<div class="dev__flywheel dev__flywheel--l" id="fw-l"></div>' +
      '<div class="dev__flywheel dev__flywheel--r" id="fw-r"></div>' +
      '<div class="dev__tag">双层惯性飞轮 · 无刷直流电机</div>' +
      '</div>' +
      '</div>' +
      '<div class="stage__hud">' +
      '<div><span class="k">横滚 Roll</span> <b class="mono" id="hud-roll">0.00</b> °</div>' +
      '<div><span class="k">俯仰 Pitch</span> <b class="mono" id="hud-pitch">0.00</b> °</div>' +
      '<div><span class="k">偏航 Yaw</span> <b class="mono" id="hud-yaw">0.00</b> °</div>' +
      '<div><span class="k">合成倾角</span> <b class="mono" id="hud-tilt">0.00</b> °</div>' +
      '</div>' +
      '<div class="stage__hud" style="left:auto;right:12px;text-align:right">' +
      '<div><span class="k">UKF 输出</span> <b class="mono" id="hud-fused">0.00</b> °</div>' +
      '<div><span class="k">原始 IMU</span> <b class="mono" id="hud-raw">0.00</b> °</div>' +
      '<div><span class="k">偏移速率</span> <b class="mono" id="hud-rate">0.00</b> °/s</div>' +
      '</div>' +
      '<div class="stage__legend">' +
      '<span>— 蓝色人体：躯干姿态估计</span><span>— 橙色点：动态重心 CoG</span><span>— 虚线：铅垂参考</span><span>— 青色双环：动量轮执行机构</span>' +
      '</div>' +
      '</div>';

    const readoutsHtml =
      '<div class="readouts" style="margin-bottom:var(--sp-3)">' +
      '<div class="readout readout--x"><div class="readout__k">Gyro X · °/s</div><div class="readout__v"><span id="ro-gx">0.0</span></div></div>' +
      '<div class="readout readout--y"><div class="readout__k">Gyro Y · °/s</div><div class="readout__v"><span id="ro-gy">0.0</span></div></div>' +
      '<div class="readout readout--z"><div class="readout__k">Gyro Z · °/s</div><div class="readout__v"><span id="ro-gz">0.0</span></div></div>' +
      '</div>' +
      '<div class="readouts">' +
      '<div class="readout readout--x"><div class="readout__k">Accel X · g</div><div class="readout__v"><span id="ro-ax">0.000</span></div></div>' +
      '<div class="readout readout--y"><div class="readout__k">Accel Y · g</div><div class="readout__v"><span id="ro-ay">0.000</span></div></div>' +
      '<div class="readout readout--z"><div class="readout__k">Accel Z · g</div><div class="readout__v"><span id="ro-az">0.000</span></div></div>' +
      '</div>';

    const rowA = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c5">' + U.card({
        title: '3D 姿态可视化', icon: 'rotate', sub: '设备与人体倾斜状态',
        right: '<span class="tag-sim">实时仿真</span>',
        body: stageHtml
      }) + '</div>' +
      '<div class="c7">' + U.card({
        title: '传感器原始采集波形', icon: 'wave', sub: 'MPU6050 六轴 · 三轴陀螺仪 / 三轴加速度计',
        right: '<span class="mono" style="font-size:10px;color:var(--muted)">12 s 滚动窗</span>',
        body: '<div style="display:flex;flex-direction:column;gap:var(--sp-3)">' +
          '<div><div class="row row--between" style="margin-bottom:6px"><span style="font-size:11px;color:var(--ink-soft)">陀螺仪（角速度 °·s⁻¹）</span>' +
          '<span class="mono" style="font-size:10px;color:var(--muted)">X <span style="color:var(--s3)">Gx</span> · Y <span style="color:var(--ok)">Gy</span> · Z <span style="color:var(--s4)">Gz</span></span></div>' +
          '<div class="scope" id="sc-gyro"></div></div>' +
          '<div><div class="row row--between" style="margin-bottom:6px"><span style="font-size:11px;color:var(--ink-soft)">加速度计（重力加速度 g）</span>' +
          '<span class="mono" style="font-size:10px;color:var(--muted)">量程 0.80–1.20 g</span></div>' +
          '<div class="scope" id="sc-accel"></div></div>' +
          '</div>' + readoutsHtml
      }) + '</div>' +
      '</div>';

    /* ---- Row B：卡尔曼对比 + 动量轮 ---- */
    const rowB = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c8">' + U.card({
        title: '卡尔曼滤波前后数据对比', icon: 'filter', sub: '自适应 UKF 融合输出 vs 原始 IMU 测量',
        right: '<span class="segmented" id="kf-y"><button data-y="12" class="is-on">±12°</button><button data-y="5">±5°</button></span>',
        body: '<div class="scope" id="sc-kf"></div>' +
          '<div class="stats" style="margin-top:var(--sp-3);border:1px solid var(--hairline);border-radius:var(--radius-sm,3px)">' +
          '<div class="stats__cell"><div class="stats__k">原始信号 RMSE</div><div class="stats__v"><span class="mono" id="kf-rmse-raw">3.62</span><small>°</small></div></div>' +
          '<div class="stats__cell"><div class="stats__k">滤波后 RMSE</div><div class="stats__v" style="color:var(--ok)"><span class="mono" id="kf-rmse-fused">0.87</span><small>°</small></div></div>' +
          '<div class="stats__cell"><div class="stats__k">噪声抑制比</div><div class="stats__v"><span class="mono">76.0</span><small>%</small></div></div>' +
          '<div class="stats__cell"><div class="stats__k">毛刺剔除</div><div class="stats__v"><span class="mono" id="kf-glitch">17</span><small>次/分</small></div></div>' +
          '</div>',
        foot: '<span>自适应噪声参数迭代周期 200 ms</span><span>区分自主动作 / 无意识倾倒，杜绝误触发</span>'
      }) + '</div>' +
      '<div class="c4">' + U.card({
        title: '动量轮运行状态', icon: 'target', sub: '双层惯性飞轮',
        body: '<div class="readouts" style="margin-bottom:var(--sp-3)">' +
          '<div class="readout"><div class="readout__k">转速 RPM</div><div class="readout__v"><span id="ro-rpm">0</span></div></div>' +
          '<div class="readout"><div class="readout__k">输出力矩 N·m</div><div class="readout__v"><span id="ro-tq">0.000</span></div></div>' +
          '<div class="readout"><div class="readout__k">峰值转速</div><div class="readout__v"><span id="ro-rpm-pk">0</span></div></div>' +
          '</div>' +
          '<div class="scope" id="sc-wheel"></div>' +
          '<div class="stack stack--tight" style="margin-top:var(--sp-3);font-size:11px">' +
          '<div class="row row--between"><span style="color:var(--muted)">转速限幅</span><span class="mono" style="color:var(--ink-2)">≤ 6000 rpm</span></div>' +
          '<div class="row row--between"><span style="color:var(--muted)">力矩上限</span><span class="mono" style="color:var(--ink-2)">0.46 N·m（恢复期 82%）</span></div>' +
          '<div class="row row--between"><span style="color:var(--muted)">能量回收</span><span class="mono" style="color:var(--ok)" id="ro-regen">已回收 0.42 Wh</span></div>' +
          '</div>',
        foot: '<span>双向连续力矩输出 · 无级精细调节</span>'
      }) + '</div>' +
      '</div>';

    /* ---- Row C：算法参数 + 分期判定 + 事件标记 ---- */
    const ctrl = L.state;
    const paramCard = U.card({
      title: '算法实时参数面板', icon: 'sliders', sub: '自适应 PID / 复合控制',
      right: '<span class="badge badge--cyan">自适应调参中</span>',
      body: '<div class="stack stack--tight">' +
        '<div class="param param--cyan"><div class="param__top"><span class="param__k">Kp</span>' +
        '<span class="param__v" id="p-kp">' + ctrl.kp.toFixed(3) + '</span></div>' +
        '<div class="param__track"><div class="param__fill" id="f-kp" style="width:' + (ctrl.kp / 4 * 100) + '%"></div></div>' +
        '<div class="param__d">比例增益 · 影响姿态偏差的即时矫正强度</div></div>' +
        '<div class="param param"><div class="param__top"><span class="param__k">Ki</span>' +
        '<span class="param__v" id="p-ki">' + ctrl.ki.toFixed(3) + '</span></div>' +
        '<div class="param__track"><div class="param__fill" id="f-ki" style="width:' + (ctrl.ki / 0.6 * 100) + '%"></div></div>' +
        '<div class="param__d">积分增益 · 消除滑模稳态误差，补偿渐进偏移</div></div>' +
        '<div class="param param--violet"><div class="param__top"><span class="param__k">Kd</span>' +
        '<span class="param__v" id="p-kd">' + ctrl.kd.toFixed(4) + '</span></div>' +
        '<div class="param__track"><div class="param__fill" id="f-kd" style="width:' + (ctrl.kd / 0.25 * 100) + '%"></div></div>' +
        '<div class="param__d">微分增益 · 抑制高频抖振，保障矫正柔和</div></div>' +
        '<div class="hr"></div>' +
        '<div class="row row--between" style="font-size:11.5px"><span style="color:var(--muted)">MPC 约束阈值</span><span class="mono" style="color:var(--ink)" id="p-mpc">' + ctrl.mpc.toFixed(3) + '</span></div>' +
        '<div class="row row--between" style="font-size:11.5px"><span style="color:var(--muted)">滑模阻尼系数</span><span class="mono" style="color:var(--ink)" id="p-slide">' + ctrl.slide.toFixed(3) + '</span></div>' +
        '<div class="row row--between" style="font-size:11.5px"><span style="color:var(--muted)">UKF 解算耗时</span><span class="mono" style="color:var(--ink)" id="p-ukf">1.18 ms</span></div>' +
        '</div>'
    });

    const stageCard = U.card({
      title: '康复阶段智能判定', icon: 'scale', sub: '五维体征 → 阈值判别',
      body: '<div class="stageswitch" style="margin-bottom:var(--sp-3)">' +
        MLH.data.stages.map(function (st) {
          return '<div class="stageswitch__btn' + (st.key === 'recover' ? ' is-on' : '') + '" data-stage="' + st.key + '">' +
            '<div class="stageswitch__n">' + st.name + '</div><div class="stageswitch__d">' + st.range + '</div></div>';
        }).join('') + '</div>' +
        '<div class="stack stack--tight" style="font-size:11.5px">' +
        ['姿态波动幅度', '重心偏移频率', '肢体摆动幅值', '姿态恢复稳定性', '训练持续适配度']
          .map(function (n, i) {
            const v = [72, 64, 58, 81, 71][i];
            return '<div><div class="row row--between" style="margin-bottom:3px"><span style="color:var(--muted)">' + n + '</span>' +
              '<span class="mono" style="color:var(--ink-2)">' + v + '</span></div>' +
              '<div class="minibar__track"><div class="minibar__fill" style="width:' + v + '%"></div></div></div>';
          }).join('') + '</div>' +
        '<div class="notice notice--info" style="margin-top:var(--sp-3)">' + U.icon('info', 12) +
        '<div>当前判定 <b>恢复期</b>（适配度 0.71）· 已按“阶段大调、单次微调”下发参数</div></div>'
    });

    const evtCard = U.card({
      title: '事件标记', icon: 'clock', sub: '失衡矫正 / 参数自适应 / 阈值校验',
      right: '<span class="mono" style="font-size:10px;color:var(--muted)" id="evt-count">0 条</span>',
      body: '<div class="timeline" id="evt-list" style="max-height:392px;overflow-y:auto"></div>'
    });

    const rowC = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c4">' + paramCard + '</div>' +
      '<div class="c4">' + stageCard + '</div>' +
      '<div class="c4">' + evtCard + '</div>' +
      '</div>';

    /* ---- Row D：安全监测参数仪表盘阵列 ---- */
    const rowD = '<div class="grid g-12">' +
      '<div class="c12">' + U.card({
        title: '十项安全监测参数', icon: 'shield', sub: '毫秒级实时监测 · 三级阈值判定（预警 / 纠偏 / 停机）',
        right: '<span class="row" style="gap:10px">' + U.badge('正常', 'ok', true) +
          '<span class="mono" style="font-size:10px;color:var(--muted)">阈值动态随康复阶段调整</span></span>',
        body: '<div class="gauges">' +
          gauge('tilt', '合成倾角', '°', 'var(--s2)', 10, 0) +
          gauge('rpm', '飞轮转速', 'rpm', 'var(--s1)', 6000, 0) +
          gauge('torque', '矫正力矩', 'N·m', 'var(--s3)', 0.5, 0) +
          gauge('volt', '电池电压', 'V', 'var(--s5)', 8.4, 6.0) +
          gauge('temp', '电机温度', '℃', 'var(--s3)', 90, 20) +
          gauge('rate', '偏移速率', '°/s', 'var(--s4)', 40, 0) +
          gauge('cur', '工作电流', 'A', 'var(--s6)', 1.8, 0) +
          gauge('period', '控制周期', 'ms', 'var(--s2)', 6.0, 4.0) +
          gauge('ukf', 'UKF 解算', 'ms', 'var(--s1)', 2.5, 0) +
          gauge('cpu', 'CPU 占用', '%', 'var(--s4)', 100, 0) +
          '</div>' +
          '<div class="row row--wrap" style="gap:var(--sp-4);margin-top:var(--sp-3);font-size:11px">' +
          '<span class="row" style="gap:6px"><span class="dot dot--ok"></span>硬件故障自检：<b style="color:var(--ok)">通过</b></span>' +
          '<span class="row" style="gap:6px"><span class="dot dot--ok"></span>通信链路：<b style="color:var(--ok)">正常</b><span class="mono" style="color:var(--muted)">丢包 0.3%</span></span>' +
          '<span class="row" style="gap:6px"><span class="dot dot--ok"></span>三级阈值：<b style="color:var(--ok)">未触及停机线</b></span>' +
          '<span class="row" style="gap:6px"><span class="dot dot--warn"></span>力矩上限：<b style="color:var(--warn-600)">82% 限幅生效</b></span>' +
          '</div>'
      }) + '</div>' +
      '</div>';

    root.innerHTML = bar + rowA + rowB + rowC + rowD;
  }

  /* ---------- 挂载 ---------- */
  function mount(root) {
    const p = MLH.charts.pal();

    /* 示波器 */
    scopes.forEach(function (s) { s.scope.destroy(); });
    scopes = [];

    const scGyro = L.Scope(root.querySelector('#sc-gyro'), {
      seconds: 12, height: 108, yMin: -30, yMax: 30,
      series: [
        { key: 'gx', color: p.series[2], width: 1.4 },
        { key: 'gy', color: p.series[4], width: 1.2 },
        { key: 'gz', color: p.series[3], width: 1.2 }
      ],
      thresholds: [{ v: 24, color: p.series[2] }, { v: -24, color: p.series[2] }],
      labelFmt: function (v) { return v.toFixed(0) + '°/s'; }
    });
    const scAcc = L.Scope(root.querySelector('#sc-accel'), {
      seconds: 12, height: 108, yMin: 0.80, yMax: 1.20,
      series: [
        { key: 'ax', color: p.series[2], width: 1.4 },
        { key: 'ay', color: p.series[4], width: 1.2 },
        { key: 'az', color: p.series[3], width: 1.4 }
      ],
      labelFmt: function (v) { return v.toFixed(2) + 'g'; }
    });
    const scKf = L.Scope(root.querySelector('#sc-kf'), {
      seconds: 12, height: 128, yMin: -12, yMax: 12,
      series: [
        { key: 'rawRoll', color: '#A9B7C6', width: 1 },
        { key: 'fusedRoll', color: p.series[1], width: 2 }
      ],
      labelFmt: function (v) { return v.toFixed(0) + '°'; }
    });
    const scWheel = L.Scope(root.querySelector('#sc-wheel'), {
      seconds: 12, height: 96, yMin: 0, yMax: 6000,
      series: [
        { key: 'rpm', color: p.series[0], width: 1.6 },
        { key: 'torqueScaled', color: p.series[2], width: 1.4 }
      ],
      labelFmt: function (v) { return Math.round(v) + ''; }
    });
    scopes = [
      { scope: scGyro, key: 'gyro' }, { scope: scAcc, key: 'acc' },
      { scope: scKf, key: 'kf' }, { scope: scWheel, key: 'wheel' }
    ];

    /* y 轴量程切换 */
    const yseg = root.querySelector('#kf-y');
    if (yseg) {
      yseg.addEventListener('click', function (e) {
        const b = e.target.closest('button'); if (!b) return;
        yseg.querySelectorAll('button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        const y = parseFloat(b.dataset.y);
        scKf.setRange(-y, y);
      });
    }

    /* 采集控制 */
    const ctl = root.querySelector('#mon-ctl');
    if (ctl) {
      ctl.addEventListener('click', function (e) {
        const b = e.target.closest('button'); if (!b) return;
        const act = b.dataset.act;
        if (act === 'pause') {
          running = !running;
          if (running) { L.start(); b.innerHTML = U.icon('pause', 12) + ' 暂停采集'; U.toast('已恢复采集', '实时数据通道运行中', 'ok'); }
          else { L.stop(); b.innerHTML = U.icon('play', 12) + ' 恢复采集'; U.toast('已暂停采集', '示波器保留最后一帧波形', 'warn'); }
        } else if (act === 'trigger') {
          L.seek(0.05);
          U.toast('已注入失衡工况', '模拟患者重心突失，观察矫正响应', 'warn');
        } else if (act === 'reset') {
          L.pushEvent('系统复位', 'info', '实时监测窗口已复位', '事件标记与波形缓存清空');
          renderEvt(root);
        }
      });
    }

    /* 分期切换（演示用） */
    root.querySelectorAll('[data-stage]').forEach(function (b) {
      b.addEventListener('click', function () {
        root.querySelectorAll('[data-stage]').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        const st = MLH.data.stages.find(function (s) { return s.key === b.dataset.stage; });
        L.state.kp = st.params.kp; L.state.ki = st.params.ki;
        L.state.kd = st.params.kd; L.state.mpc = st.params.mpc; L.state.slide = st.params.slide;
        L.pushEvent('分期切换', 'info', '控制参数已按 ' + st.name + ' 整组下发',
          'Kp ' + st.params.kp + ' · Ki ' + st.params.ki + ' · Kd ' + st.params.kd + ' · 力矩梯度 ' + st.params.torque + ' N·m');
        U.toast('已切换至 ' + st.name, 'MPC 约束与滑模阻尼整组更新', 'ok');
      });
    });

    renderEvt(root);
    lastEvtKey = L.events.length ? L.events[0].time + L.events[0].title : '';

    /* 采样订阅 */
    unsub = L.subscribe(function (msg) {
      if (msg.kind !== 'sample') return;
      const v = msg.data;
      scGyro.push({ key: 'gx', value: v.gx }); scGyro.push({ key: 'gy', value: v.gy }); scGyro.push({ key: 'gz', value: v.gz });
      scAcc.push({ key: 'ax', value: v.ax }); scAcc.push({ key: 'ay', value: v.ay }); scAcc.push({ key: 'az', value: v.az });
      scKf.push({ key: 'rawRoll', value: v.rawRoll }); scKf.push({ key: 'fusedRoll', value: v.fusedRoll });
      scWheel.push({ key: 'rpm', value: v.rpm }); scWheel.push({ key: 'torqueScaled', value: v.torque / 0.5 * 6000 });
    });

    /* 姿态位姿动画 */
    const rig = root.querySelector('#rig'), fig = root.querySelector('#fig');
    const cog = root.querySelector('#cog'), pelvis = root.querySelector('#pelvis');
    const fwL = root.querySelector('#fw-l'), fwR = root.querySelector('#fw-r');
    const stageEl = root.querySelector('#stage');
    let rpmPk = 0;

    function frame() {
      const s = L.state;
      const roll = s.roll, pitch = s.pitch;
      rig.style.transform = 'rotateX(' + (pitch * 3.4).toFixed(2) + 'deg) rotateZ(' + (-roll * 2.1).toFixed(2) +
        'deg) translateX(' + (roll * 2.6).toFixed(1) + 'px) translateY(' + (Math.abs(roll) * 0.9 + Math.abs(pitch) * 0.6).toFixed(1) + 'px)';
      fig.style.setProperty('--fig-tilt', (roll * 0.85).toFixed(2) + 'deg');
      cog.style.transform = 'translateX(' + (roll * 1.5).toFixed(1) + 'px)';
      pelvis.style.transform = 'rotate(' + (roll * 0.8).toFixed(2) + 'deg)';
      const spin = Math.max(0.18, 1.4 - s.rpm / 4200);
      if (fwL) fwL.style.animationDuration = spin.toFixed(2) + 's';
      if (fwR) fwR.style.animationDuration = spin.toFixed(2) + 's';

      /* 失衡时画布外框提示 */
      const tilt = Math.sqrt(roll * roll + pitch * pitch);
      const over = tilt > 4.2;
      if (over !== (flash > 0)) flash = over ? 26 : 0;
      if (over) {
        stageEl.style.boxShadow = 'inset 0 0 0 1px var(--warn)';
        if (flash > 0 && s.rpm > 1200 && stageEl.dataset.alert !== '1') {
          stageEl.dataset.alert = '1';
          U.toast('失衡矫正中', '合成倾角 ' + tilt.toFixed(1) + '° · 飞轮转速 ' + Math.round(s.rpm) + ' rpm', 'warn', 2200);
        }
      } else {
        stageEl.style.boxShadow = 'none';
        stageEl.dataset.alert = '0';
      }
      if (s.rpm > rpmPk) rpmPk = s.rpm;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    /* 文本读数（12.5 Hz 刷新，避免无意义抖动） */
    const lastFused = L.state.filtered.roll;
    txtTimer = setInterval(function () {
      const s = L.state;
      const set = function (id, v) { const n = document.getElementById(id); if (n) n.textContent = v; };
      const tilt = Math.sqrt(s.roll * s.roll + s.pitch * s.pitch);
      set('hud-roll', s.roll.toFixed(2));
      set('hud-pitch', s.pitch.toFixed(2));
      set('hud-yaw', s.yaw.toFixed(2));
      set('hud-tilt', tilt.toFixed(2));
      set('hud-fused', lastFused.toFixed(2));
      set('hud-raw', s.filtered.rawRoll.toFixed(2));
      set('hud-rate', (Math.abs(s.gx) * 0.62 + 1.4).toFixed(2));

      set('ro-gx', s.gx.toFixed(1)); set('ro-gy', s.gy.toFixed(1)); set('ro-gz', s.gz.toFixed(1));
      set('ro-ax', s.ax.toFixed(3)); set('ro-ay', s.ay.toFixed(3)); set('ro-az', s.az.toFixed(3));
      if (s.rpm > rpmPk) rpmPk = s.rpm;
      set('ro-rpm', Math.round(s.rpm)); set('ro-rpm-pk', Math.round(rpmPk));
      set('ro-tq', s.torque.toFixed(3));
      set('ro-regen', '已回收 ' + (0.42 + s.t * 0.00021).toFixed(2) + ' Wh');

      set('p-kp', s.kp.toFixed(3)); set('p-ki', s.ki.toFixed(3)); set('p-kd', s.kd.toFixed(4));
      set('p-mpc', s.mpc.toFixed(3)); set('p-slide', s.slide.toFixed(3));
      set('p-ukf', s.ukfCost.toFixed(2) + ' ms');
      const f = function (id, pct) { const n = document.getElementById(id); if (n) n.style.width = pct + '%'; };
      f('f-kp', s.kp / 4 * 100); f('f-ki', s.ki / 0.6 * 100); f('f-kd', s.kd / 0.25 * 100);

      /* 卡尔曼实时残差 */
      const diff = Math.abs(s.filtered.rawRoll - s.filtered.roll);
      set('kf-rmse-raw', (2.9 + diff * 0.9).toFixed(2));
      set('kf-rmse-fused', (0.62 + diff * 0.16).toFixed(2));
      set('kf-glitch', String(12 + Math.round(Math.abs(s.gx) * 0.4)));

      /* 仪表盘阵列 */
      setGauge('tilt', tilt.toFixed(2), 10);
      setGauge('rpm', Math.round(s.rpm), 6000);
      setGauge('torque', s.torque.toFixed(3), 0.5);
      setGauge('volt', s.volt.toFixed(2), 8.4, 6.0);
      setGauge('temp', s.temp.toFixed(1), 90, 20);
      setGauge('rate', (Math.abs(s.gx) * 0.68 + 2.1).toFixed(1), 40);
      setGauge('cur', s.current.toFixed(2), 1.8);
      setGauge('period', s.ctrlPeriod.toFixed(2), 6.0, 4.0);
      setGauge('ukf', s.ukfCost.toFixed(2), 2.5);
      setGauge('cpu', s.cpu.toFixed(0), 100);

      /* 事件刷新 */
      const key = L.events.length ? L.events[0].time + L.events[0].title : '';
      if (key !== lastEvtKey) { lastEvtKey = key; renderEvt(root); }
    }, 80);
  }

  const EVT_TONE = { '失衡矫正': 'warn', '参数自适应': 'info', '安全阈值校验': 'info', '系统就绪': 'ok', '分期切换': 'ok', '系统复位': 'info' };
  function renderEvt(root) {
    const n = root.querySelector('#evt-list');
    if (!n) return;
    if (!L.events.length) { n.innerHTML = '<div class="empty">暂无事件</div>'; return; }
    n.innerHTML = L.events.slice(0, 14).map(function (e) {
      const tone = EVT_TONE[e.type] || 'info';
      return '<div class="timeline__item timeline__item--' + tone + '">' +
        '<div class="timeline__t">' + e.time + ' · ' + U.badge(e.type, tone === 'warn' ? 'warn' : (tone === 'ok' ? 'ok' : 'info')) + '</div>' +
        '<div class="timeline__b">' + U.esc(e.title) + '</div>' +
        '<div class="mono" style="font-size:10.5px;color:var(--muted)">' + U.esc(e.detail) + '</div></div>';
    }).join('');
    const c = root.querySelector('#evt-count');
    if (c) c.textContent = L.events.length + ' 条';
  }

  function unmount() {
    if (unsub) { unsub(); unsub = null; }
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (txtTimer) { clearInterval(txtTimer); txtTimer = null; }
    scopes.forEach(function (s) { s.scope.destroy(); });
    scopes = [];
  }

  return {
    title: '实时监测', code: 'M02', icon: 'pulse',
    subtitle: '3D 姿态 · 传感器波形 · 算法参数 · 动量轮状态 · 事件标记',
    render: render, mount: mount, unmount: unmount
  };
})();
