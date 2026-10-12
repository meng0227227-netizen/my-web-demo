/* ============================================================
   动量稳衡 · 实时仿真引擎
   - 50 Hz 数据源仿真（六轴 IMU / 编码器 / 控制器状态）
   - 滚动示波器画布（Scope）
   - 事件标记（失衡矫正 / 参数自适应调整 / 安全阈值校验）
   ============================================================ */
window.MLH = window.MLH || {};
MLH.live = (function () {
  'use strict';

  const HZ = 50;                       // 采样率 50 Hz（控制周期 5 ms 的 10 倍抽取）
  const DT = 1000 / HZ;

  /* ---------- 内部状态 ---------- */
  const st = {
    t: 0,                       // 运行秒数
    frame: 0,
    roll: 0.6, pitch: -0.3, yaw: 4.2,
    gx: 0, gy: 0, gz: 0,        // 陀螺仪 °/s
    ax: 0.02, ay: -0.01, az: 1.0, // 加速度计 g
    temp: 41.8,
    rpm: 0, torque: 0,          // 动量轮
    volt: 7.86, current: 0.42,
    kp: 3.05, ki: 0.34, kd: 0.134,
    mpc: 0.44, slide: 0.86,
    latency: 86, cpu: 62, ukfCost: 1.18,
    ctrlPeriod: 5.0,
    stage: 'recover',
    online: true,
    /* 派生 */
    filtered: { roll: 0.6, pitch: -0.3, rawRoll: 0.6 },
    convTime: 1.8,
    eventCount: 0
  };

  /* 事件注入 */
  let evt = null;               // 当前失衡扰动
  let nextEvtIn = 9;            // 距下一次扰动秒数
  let paramPulse = 0;           // 参数自适应调整脉冲
  const listeners = [];
  const events = [];            // 事件标记（供 UI 展示）

  /* 每个 tick 生成的采样值（供示波器消费） */
  const sample = { roll: 0, pitch: 0, gx: 0, gy: 0, gz: 0, ax: 0, ay: 0, az: 0, rawRoll: 0, fusedRoll: 0, rpm: 0, torque: 0 };

  let timer = null;
  const rand = MLH.data.rng(20261012);

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function pushEvent(type, level, title, detail) {
    const now = new Date();
    const t = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    events.unshift({ time: t, type: type, level: level, title: title, detail: detail });
    if (events.length > 40) events.pop();
    listeners.forEach(function (f) { f({ kind: 'event', data: events[0] }); });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---------- 仿真步进 ---------- */
  function tick() {
    st.frame++;
    st.t += DT / 1000;
    const t = st.t;

    /* 1) 生理姿态：缓慢重心摆动 + 呼吸性抖动 */
    let baseRoll = 0.62 * Math.sin(t * 0.42) + 0.26 * Math.sin(t * 1.9 + 1.1);
    let basePitch = 0.38 * Math.sin(t * 0.31 + 0.7) - 0.2 * Math.sin(t * 2.3);

    /* 2) 失衡扰动：指数衰减振荡，幅度随“康复期”取 5–7° */
    if (!evt && t > nextEvtIn) {
      const amp = 5.4 + rand() * 1.6;
      evt = { t0: t, amp: amp, axis: rand() > 0.45 ? 'roll' : 'pitch', dir: rand() > 0.5 ? 1 : -1, tau: 0.72 };
      st.eventCount++;
      pushEvent('失衡矫正', 'warn',
        '惯性矫正触发 · 峰值 ' + amp.toFixed(1) + '°',
        '动量轮输出矫正力矩，' + (evt.axis === 'roll' ? '横滚' : '俯仰') + '方向收敛');
      st.torquePeak = 0.09 + amp * 0.056;
      nextEvtIn = t + 18 + rand() * 22;
    }
    let disturbRoll = 0, disturbPitch = 0, settled = 1;
    if (evt) {
      const dt = t - evt.t0;
      const env = Math.exp(-dt / evt.tau);
      const osc = Math.cos(dt * 7.2) * env;
      const v = evt.amp * evt.dir * osc;
      if (evt.axis === 'roll') disturbRoll = v; else disturbPitch = v * 0.78;
      settled = env;
      if (env < 0.012) {
        st.convTime = +(dt).toFixed(2);
        evt = null;
      }
    }

    /* 3) 真实姿态 */
    const truthRoll = baseRoll + disturbRoll;
    const truthPitch = basePitch + disturbPitch;
    st.roll = truthRoll;
    st.pitch = truthPitch;
    st.yaw = 4.2 + Math.sin(t * 0.08) * 1.6;

    /* 4) 传感器原始测量（含噪声 + 偶发毛刺） */
    const nz = function (a) { return (rand() - 0.5) * 2 * a; };
    const glitch = rand() > 0.993 ? (rand() - 0.5) * 16 : 0;
    sample.rawRoll = +(truthRoll + nz(1.28) + glitch).toFixed(3);
    sample.roll = +(truthRoll + nz(0.16)).toFixed(3);
    sample.pitch = +(truthPitch + nz(0.14)).toFixed(3);

    /* UKF 融合输出：一阶滞后 + 极低残差，复现“滤除毛刺、保留真实趋势” */
    st.filtered.rawRoll = sample.rawRoll;
    st.filtered.roll += (truthRoll - st.filtered.roll) * 0.16;
    sample.fusedRoll = +st.filtered.roll.toFixed(3);

    /* 5) 陀螺仪 / 加速度计（°・s⁻¹ / g） */
    const dRoll = (disturbRoll - (evt ? 0 : 0));
    sample.gx = +(clamp(dRoll * 2.1 + nz(7.4), -34, 34)).toFixed(2);
    sample.gy = +((basePitch * 1.4) + nz(6.2)).toFixed(2);
    sample.gz = +(Math.sin(t * 0.5) * 2.4 + nz(4.6)).toFixed(2);
    sample.ax = +(truthRoll * 0.0172 + nz(0.021)).toFixed(4);
    sample.ay = +(truthPitch * 0.0172 * -1 + nz(0.019)).toFixed(4);
    sample.az = +(1.0 - Math.abs(truthRoll) * 0.00042 + nz(0.014)).toFixed(4);
    st.gx = sample.gx; st.gy = sample.gy; st.gz = sample.gz;
    st.ax = sample.ax; st.ay = sample.ay; st.az = sample.az;

    /* 6) 动量轮：失衡期高转速输出，平时低速待命 */
    const need = evt ? clamp(0.34 + evt.amp * 0.055, 0, 0.46) : 0.05 + Math.abs(disturbRoll) * 0.012;
    st.torque += (need - st.torque) * (evt ? 0.22 : 0.06);
    const rpmTarget = evt ? 2400 + evt.amp * 260 * settled + 1400 * settled : 420 + Math.abs(baseRoll) * 120;
    st.rpm += (rpmTarget - st.rpm) * 0.14;
    if (st.rpm < 12) st.rpm = 0;
    sample.rpm = Math.round(st.rpm);
    sample.torque = +st.torque.toFixed(3);
    st.torque = sample.torque;

    /* 7) 电气与热 */
    st.current += ((0.18 + st.torque * 1.9 + Math.abs(sample.gx) * 0.004) - st.current) * 0.05;
    st.volt += (-0.00008 - st.current * 0.0006) + (st.volt < 7.4 ? 0 : 0);
    st.temp += (0.0016 + st.torque * 0.006) - (st.temp - 41.6) * 0.0009;

    /* 8) 控制与算法指标轻微抖动 */
    st.latency += ((evt ? 128 : 82) - st.latency) * 0.08 + nz(2.2);
    st.cpu += (62 + (evt ? 7 : 0) - st.cpu) * 0.05 + nz(0.8);
    st.ukfCost += (1.18 - st.ukfCost) * 0.1 + nz(0.027);
    st.ctrlPeriod += (5.0 - st.ctrlPeriod) * 0.2 + nz(0.012);
    st.latency = clamp(st.latency, 62, 186);
    st.cpu = clamp(st.cpu, 52, 78);
    st.ctrlPeriod = clamp(st.ctrlPeriod, 4.86, 5.14);

    /* 9) 参数自适应微调（“阶段大调、单次微调”） */
    paramPulse -= DT / 1000;
    if (evt && paramPulse <= 0) {
      paramPulse = 6;
      const dk = 0.06 + rand() * 0.07;
      st.kp = +(clamp(st.kp + dk * 0.5, 2.6, 3.9)).toFixed(3);
      st.kd = +(clamp(st.kd + dk * 0.22, 0.09, 0.21)).toFixed(4);
      st.slide = +(clamp(st.slide + 0.01, 0.62, 0.96)).toFixed(3);
      pushEvent('参数自适应', 'info',
        'Kp → ' + st.kp.toFixed(2) + '　Kd → ' + st.kd.toFixed(3),
        '依据单次训练失衡频次与姿态改善度进行微调，MPC 约束与滑模阻尼同步更新');
    }
    if (!evt && t > 6 && paramPulse <= 0) {
      paramPulse = 14;
      const relax = rand() > 0.5;
      if (relax) {
        st.kp = +(clamp(st.kp + 0.02, 2.6, 3.9)).toFixed(3);
        st.slide = +(clamp(st.slide - 0.008, 0.62, 0.96)).toFixed(3);
      }
    }

    /* 10) 安全阈值校验（三级：预警 / 纠偏 / 停机） */
    const absRoll = Math.abs(st.roll);
    if (absRoll > 6.0 && rand() > 0.92 && t > (st._lastThresh || 0) + 5) {
      st._lastThresh = t;
      pushEvent('安全阈值校验', 'info',
        '横滚 ' + absRoll.toFixed(1) + '° 触发恢复期一级预警',
        '设备执行柔性纠偏，未触发停机；力矩上限自动收紧至 82%');
    }
  }

  /* ---------- 启动 / 停止 ---------- */
  function start() {
    if (timer) return;
    timer = setInterval(function () {
      tick();
      listeners.forEach(function (f) { f({ kind: 'sample', data: sample }); });
    }, DT);
    pushEvent('系统就绪', 'ok', '实时数据通道已建立', '设备 DMH-2025-017 · 采样 50 Hz · UKF 解算 200 Hz 内插');
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function subscribe(fn) { listeners.push(fn); return function () { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
  function seek(sec) { nextEvtIn = st.t + sec; }

  /* ============================================================
     滚动示波器
     ============================================================ */
  function Scope(host, opts) {
    const o = Object.assign({
      seconds: 12, series: [], yMin: -1, yMax: 1, fixedY: true,
      grid: true, zeroLine: true, thresholds: [], labelFmt: function (v) { return v.toFixed(2); }
    }, opts || {});
    const canvas = document.createElement('canvas');
    const cssH = o.height || 120;
    canvas.style.height = cssH + 'px';
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const bufs = {};
    o.series.forEach(function (s) { bufs[s.key] = []; });
    const N = Math.round(o.seconds * HZ);
    let raf = null, dirty = true, dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = host.clientWidth || 320;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(cssH * dpr);
      dirty = true;
    }
    resize();
    if (window.ResizeObserver) {
      let rt = null;
      new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(function () { resize(); draw(); }, 80); }).observe(host);
    } else {
      window.addEventListener('resize', resize);
    }

    function push(v) {
      const b = bufs[v.key];
      if (!b) return;
      b.push(v.value);
      if (b.length > N) b.shift();
      dirty = true;
    }

    function themeColors() {
      const p = MLH.charts.pal();
      return { grid: p.split, axis: p.axis, text: p.muted, panel: p.panel, surface: p.surface };
    }

    function draw() {
      const w = canvas.width, h = canvas.height;
      const c = themeColors();
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = c.panel;
      ctx.fillRect(0, 0, w, h);

      const padT = 6 * dpr, padB = 6 * dpr;
      const plotH = h - padT - padB;

      /* 网格 */
      if (o.grid) {
        ctx.strokeStyle = c.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < 6; i++) {
          const x = (w / 6) * i;
          ctx.moveTo(x, 0); ctx.lineTo(x, h);
        }
        for (let i = 1; i < 4; i++) {
          const y = padT + (plotH / 4) * i;
          ctx.moveTo(0, y); ctx.lineTo(w, y);
        }
        ctx.stroke();
      }

      /* 纵向刻度（时间） */
      const span = o.yMax - o.yMin;
      const yOf = function (val) {
        return padT + plotH - ((val - o.yMin) / span) * plotH;
      };

      /* 阈值线 */
      o.thresholds.forEach(function (th) {
        const y = yOf(th.v);
        ctx.strokeStyle = th.color || '#FF7A45';
        ctx.setLineDash([5 * dpr, 4 * dpr]);
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        ctx.setLineDash([]);
      });

      /* 零线 */
      if (o.zeroLine && o.yMin < 0 && o.yMax > 0) {
        const y = yOf(0);
        ctx.strokeStyle = c.axis;
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      /* 曲线 */
      o.series.forEach(function (s) {
        const b = bufs[s.key];
        if (!b || b.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = (s.width || 1.4) * dpr;
        ctx.lineJoin = 'round';
        if (s.dash) ctx.setLineDash(s.dash.map(function (x) { return x * dpr; }));
        const step = w / (N - 1);
        const off = N - b.length;
        for (let i = 0; i < b.length; i++) {
          const x = (off + i) * step;
          const y = yOf(clamp(b[i], o.yMin - span, o.yMax + span));
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      /* 刻度文字 */
      ctx.fillStyle = c.text;
      ctx.font = (9.5 * dpr) + 'px ' + MLH.charts.MONO;
      ctx.textBaseline = 'middle';
      ctx.fillText(o.labelFmt(o.yMax), 4 * dpr, padT + 6 * dpr);
      ctx.fillText(o.labelFmt(o.yMin), 4 * dpr, h - padB - 6 * dpr);

      dirty = false;
    }

    // 降频绘制：每 2 帧，降低实时渲染开销
    let f = 0;
    raf = requestAnimationFrame(function step() {
      f++;
      if (f % 2 === 0 && dirty) draw();
      raf = requestAnimationFrame(step);
    });

    return {
      push: push,
      draw: draw,
      canvas: canvas,
      resize: resize,
      setRange: function (a, b) { o.yMin = a; o.yMax = b; draw(); },
      destroy: function () { cancelAnimationFrame(raf); canvas.remove(); }
    };
  }

  return {
    HZ: HZ, DT: DT, state: st, sample: sample, events: events,
    start: start, stop: stop, subscribe: subscribe, seek: seek,
    pushEvent: pushEvent, Scope: Scope
  };
})();
