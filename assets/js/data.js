/* ============================================================
   动量稳衡 · 数据可视化平台  —  数据层
   ------------------------------------------------------------
   量级说明：本平台的数值为平台仿真/示例数据，量级参考项目真实
   规划规模（中期 20+ 家机构试点 → 长期 80 家 / 3500 名居家患者），
   刻意保持克制，不夸大。
   所有随机过程使用固定种子，保证每次加载结果一致。
   ============================================================ */

window.MLH = window.MLH || {};
MLH.data = (function () {
  'use strict';

  /* ---------- 确定性随机数（mulberry32） ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function series(seed, n, base, amp, drift, dec) {
    const r = rng(seed), out = [];
    for (let i = 0; i < n; i++) {
      const d = drift * (i / (n - 1 || 1));
      const noise = (r() - 0.5) * 2 * amp * (dec ? Math.pow(1 - i / n, 0.7) : 1);
      out.push(+(base + d + noise).toFixed(2));
    }
    return out;
  }
  function round(v, p) { const m = Math.pow(10, p == null ? 2 : p); return Math.round(v * m) / m; }

  /* ---------- 平台元信息 ---------- */
  const P = {
    name: '动量稳衡',
    full: '姿态智防下肢失衡康养系统',
    version: 'v0.9.4-portal',
    snapshot: '2026-10-12 15:16',
    build: 'build 20261012-1137',
    dataMode: '仿真演示数据',
    firmware: 'FW 1.4.2'
  };

  /* ---------- 核心指标 ---------- */
  const kpi = {
    devices:    { total: 124, online: 86, offline: 12, maintain: 5, pending: 21, chg: +7, chgTxt: '较上周' },
    patients:   { registered: 328, inTraining: 42, weekNew: 9, chg: +5, chgTxt: '较昨' },
    hours:      { total: 12486, today: 188.4, week: 1269.0, avgSession: 34.6 },
    imbalance:  { total: 1246, autoFixed: 1203, manual: 43, today: 20, week: 161, fixRate: 96.5 },
    stability:  { rmse: 1.31, chg: -0.11, bbsAvg: 38.4 },
    diagnosis:  { active: 17, pendingReview: 4, reportWeek: 26 }
  };

  /* ---------- 近 7 天概览 ---------- */
  const trend7 = (function () {
    const days = ['10-06', '10-07', '10-08', '10-09', '10-10', '10-11', '10-12'];
    const weekday = ['周二', '周三', '周四', '周五', '周六', '周日', '周一'];
    const hours     = [168.5, 182.0, 155.3, 196.2, 204.8, 176.1, 188.4];
    const sessions  = [36, 41, 33, 45, 48, 39, 42];
    const imbalance = [24, 31, 19, 28, 22, 17, 20];
    const stability = [1.62, 1.58, 1.61, 1.49, 1.44, 1.38, 1.31];
    return {
      days, weekday, hours, sessions, imbalance, stability,
      onlineDevices: [78, 81, 76, 84, 88, 83, 86],
      newPatients: [4, 6, 3, 7, 5, 2, 9]
    };
  })();

  /* ---------- 实时告警提示（首页） ---------- */
  const alerts = [
    { id: 'AL-2026-1012-014', level: 'danger', type: '设备异常', device: 'DMH-2025-031', patient: '李*兰', title: '电机绕组温度 78.4 ℃，超过预警线 75 ℃', detail: '连续训练 42 min，绕组温升 31.2 K；已触发功率限幅，力矩上限降至 60%。', time: '15:09:52', status: '处理中', dur: '运行 6 min' },
    { id: 'AL-2026-1012-013', level: 'warn', type: '姿态超限', device: 'DMH-2025-017', patient: '张*明', title: '瞬时横滚 6.4°，触及恢复期一级阈值 6.0°', detail: '惯性矫正后 1.8 s 内回到 ±1.1°；未触发停机，已记录为失衡事件。', time: '14:32:08', status: '已自动矫正', dur: '1.8 s' },
    { id: 'AL-2026-1012-012', level: 'warn', type: '通信异常', device: 'DMH-2025-044', patient: '—', title: 'MQTT 心跳丢包率 4.2%，连续 3 个心跳周期超阈值', detail: '设备位于社区站 B2 走廊，判定为无线信道拥塞，已自动重连 2 次。', time: '14:07:31', status: '观察中', dur: '持续 3 min' },
    { id: 'AL-2026-1012-011', level: 'danger', type: '姿态超限', device: 'DMH-2025-009', patient: '周*生', title: '俯仰 9.1° 触及急性期紧急阈值，飞轮锁止停机', detail: '患者转向时重心突失，紧急防护触发用时 142 ms；康复师现场复核，患者无损伤。', time: '11:26:14', status: '已闭环', dur: '0.14 s' },
    { id: 'AL-2026-1012-010', level: 'warn', type: '设备异常', device: 'DMH-2025-052', patient: '—', title: '电池组电压 6.82 V，进入二级低压预警', detail: '剩余电量约 18%，触发声光提示；该设备今日剩余排程 2 台，建议轮换。', time: '10:48:05', status: '待充电', dur: '—' },
    { id: 'AL-2026-1012-009', level: 'info', type: '设备异常', device: 'DMH-2025-003', patient: '—', title: '光电编码器零点漂移 0.7°，已完成自动重标定', detail: '上电自检发现零漂超 0.5° 门限，自校准后残差 0.08°，无需人工干预。', time: '09:12:44', status: '已自愈', dur: '0.6 s' },
    { id: 'AL-2026-1012-008', level: 'info', type: '参数调整', device: 'DMH-2025-017', patient: '张*明', title: '分期自适应算法下发参数：Kp 2.90→3.05，Kd 0.121→0.134', detail: '姿态波动幅度连续 3 个窗口低于恢复期下界，判定训练适配度上升，按“阶段大调、单次微调”规则上调。', time: '08:55:20', status: '已生效', dur: '—' },
    { id: 'AL-2026-1012-007', level: 'info', type: '设备异常', device: 'DMH-2025-068', patient: '—', title: '亚克力防护外壳开合传感器触发，判定为日常检修', detail: '检修登记台账已关联，非故障事件。', time: '08:30:11', status: '已归档', dur: '—' }
  ];

  /* ---------- 关键事件日志 ---------- */
  const logs = [
    { time: '2026-10-12 15:09:52', type: '告警', level: 'danger', device: 'DMH-2025-031', patient: '李*兰', operator: '系统', detail: '电机绕组温度 78.4 ℃ 超限，功率限幅至 60%' },
    { time: '2026-10-12 14:51:03', type: '训练', level: 'info', device: 'DMH-2025-017', patient: '张*明', operator: '韩*敏', detail: '完成恢复期站姿平衡训练 24.5 min，失衡 3 次，均自动矫正' },
    { time: '2026-10-12 14:32:08', type: '失衡事件', level: 'warn', device: 'DMH-2025-017', patient: '张*明', operator: '系统', detail: '横滚峰值 6.4°，矫正力矩 0.31 N·m，收敛耗时 1.8 s' },
    { time: '2026-10-12 14:07:31', type: '通信', level: 'warn', device: 'DMH-2025-044', patient: '—', operator: '系统', detail: 'MQTT 心跳丢包率 4.2%，自动重连 2 次后恢复' },
    { time: '2026-10-12 13:40:19', type: '参数调整', level: 'info', device: 'DMH-2025-017', patient: '张*明', operator: '系统', detail: '滑模阻尼系数 0.86→0.92，MPC 约束阈值收紧 8%' },
    { time: '2026-10-12 11:26:14', type: '安全停机', level: 'danger', device: 'DMH-2025-009', patient: '周*生', operator: '系统', detail: '俯仰 9.1° 触及急性期紧急阈值，飞轮锁止 + 声光报警，用时 142 ms' },
    { time: '2026-10-12 11:28:40', type: '人工复核', level: 'info', device: 'DMH-2025-009', patient: '周*生', operator: '郭*强', detail: '现场复核设备与患者状态正常，重新签订训练安全确认' },
    { time: '2026-10-12 10:48:05', type: '电源', level: 'warn', device: 'DMH-2025-052', patient: '—', operator: '系统', detail: '电池电压 6.82 V 进入二级低压预警，剩余电量约 18%' },
    { time: '2026-10-12 10:12:37', type: '设备绑定', level: 'info', device: 'DMH-2025-081', patient: '吴*琴', operator: '田*薇', detail: '新增设备绑定，挂载形式：康复鞋具嵌入式，适配尺寸 M' },
    { time: '2026-10-12 09:45:22', type: '训练', level: 'info', device: 'DMH-2025-022', patient: '陈*海', operator: '于*婷', detail: '完成巩固期自主平衡训练 38.0 min，失衡 1 次，训练依从度 92%' },
    { time: '2026-10-12 09:12:44', type: '自检校准', level: 'info', device: 'DMH-2025-003', patient: '—', operator: '系统', detail: '光电编码器零点漂移 0.7°，自动重标定后残差 0.08°' },
    { time: '2026-10-12 08:55:20', type: '参数调整', level: 'info', device: 'DMH-2025-017', patient: '张*明', operator: '系统', detail: '分期判定：恢复期（适配度 0.71）；Kp 2.90→3.05，Kd 0.121→0.134' },
    { time: '2026-10-12 08:41:09', type: '固件升级', level: 'info', device: 'DMH-2025-068', patient: '—', operator: '何*鸣', detail: '固件 1.4.1→1.4.2：优化 UKF 动态噪声参数迭代周期至 200 ms' },
    { time: '2026-10-12 08:30:11', type: '检修', level: 'info', device: 'DMH-2025-068', patient: '—', operator: '何*鸣', detail: '外壳开合传感器触发，登记为计划内机械检修' },
    { time: '2026-10-11 17:22:56', type: '失衡事件', level: 'warn', device: 'DMH-2025-009', patient: '周*生', operator: '系统', detail: '横滚峰值 5.8°，矫正力矩 0.38 N·m，收敛耗时 2.4 s' },
    { time: '2026-10-11 16:50:12', type: '训练', level: 'info', device: 'DMH-2025-017', patient: '张*明', operator: '韩*敏', detail: '完成恢复期站姿 + 重心转移训练 31.0 min，失衡 4 次' },
    { time: '2026-10-11 15:33:41', type: '参数调整', level: 'info', device: 'DMH-2025-022', patient: '陈*海', operator: '系统', detail: '分期判定：巩固期（适配度 0.88）；MPC 约束放宽 12%，滑模阻尼下调至 0.62' },
    { time: '2026-10-11 14:18:07', type: '设备绑定', level: 'info', device: 'DMH-2025-077', patient: '赵*芳', operator: '于*婷', detail: '新增设备绑定，挂载形式：通用抱箍（轮椅支架）' },
    { time: '2026-10-11 11:02:33', type: '自检校准', level: 'info', device: 'DMH-2025-009', patient: '—', operator: '系统', detail: '六轴 IMU 上电零点标定完成，零漂补偿 0.11°' },
    { time: '2026-10-11 09:27:15', type: '人工复核', level: 'info', device: 'DMH-2025-031', patient: '李*兰', operator: '郭*强', detail: '更换散热硅脂，空载温升回落至 18 K/30min' }
  ];

  /* ---------- 康复分期参数库（表 2 + 4.2.1） ---------- */
  const stages = [
    {
      key: 'acute', name: '急性期', range: '训练第 1–4 周', color: 'var(--danger)',
      body: '平衡能力差，肢体控制力弱，姿态波动大',
      strategy: '调高 MPC 约束阈值、增大滑模阻尼，收紧运动范围',
      force: '大力度精准矫正', goal: '限制肢体大幅偏移，防摔倒、建立基础平衡感知',
      safety: '倾角严控 · 力矩上限限制 · 实时故障校验',
      params: { mpc: 0.62, slide: 0.94, torque: 0.42, kp: 2.05, ki: 0.22, kd: 0.09 },
      idx: { rmse: 3.42, sway: 2.68, recover: 3.6, imbalance: 18.6, bbs: 26.4, stability: 61 }
    },
    {
      key: 'recover', name: '恢复期', range: '训练第 5–12 周', color: 'var(--warn)',
      body: '基础平衡能力初步恢复，可完成简单站姿，姿态波动减小',
      strategy: '采用中等标准 MPC 约束、常规滑模阻尼参数',
      force: '适中柔性矫正', goal: '适度锻炼平衡肌群，循序渐进提升自主平衡能力',
      safety: '常规安全阈值校验 · 异常及时纠偏',
      params: { mpc: 0.44, slide: 0.86, torque: 0.31, kp: 3.05, ki: 0.34, kd: 0.134 },
      idx: { rmse: 1.86, sway: 1.42, recover: 2.2, imbalance: 8.4, bbs: 38.7, stability: 79 }
    },
    {
      key: 'consolidate', name: '巩固期', range: '训练第 13 周以后', color: 'var(--ok)',
      body: '平衡功能大幅改善，肢体控制稳定，无频繁倾倒趋势',
      strategy: '放宽 MPC 运动约束、下调滑模阻尼参数',
      force: '小力度辅助矫正', goal: '提升自主训练负荷，强化平衡控制能力，巩固康复效果',
      safety: '动态阈值适配 · 过载停机保护',
      params: { mpc: 0.28, slide: 0.62, torque: 0.18, kp: 3.62, ki: 0.41, kd: 0.176 },
      idx: { rmse: 1.04, sway: 0.82, recover: 1.5, imbalance: 4.2, bbs: 47.9, stability: 91 }
    }
  ];

  /* ---------- 患者档案 ---------- */
  const patientSeed = [
    { id: 'PT-2026-0417', name: '张*明', sex: '男', age: 68, dx: '脑卒中后遗症', stage: 'recover',       device: 'DMH-2025-017', therapist: '韩*敏', sessions: 38, hours: 22.4, last: '2026-10-12 14:51', bbs0: 28, bbs1: 46, adm: '2026-07-24', note: '右侧偏瘫，腓肠肌张力偏高，站姿训练需护具辅助' },
    { id: 'PT-2026-0392', name: '李*兰', sex: '女', age: 74, dx: '帕金森病',     stage: 'consolidate',   device: 'DMH-2025-031', therapist: '于*婷', sessions: 61, hours: 39.8, last: '2026-10-12 15:09', bbs0: 31, bbs1: 51, adm: '2026-05-18', note: '静止性震颤，晨起僵硬明显，训练安排于上午' },
    { id: 'PT-2026-0503', name: '王*国', sex: '男', age: 61, dx: '脑卒中偏瘫',   stage: 'acute',         device: 'DMH-2025-022', therapist: '郭*强', sessions: 9,  hours: 4.6,  last: '2026-10-12 10:24', bbs0: 21, bbs1: 28, adm: '2026-09-15', note: '发病 6 周，左侧肌力 3 级，首次离床站立训练' },
    { id: 'PT-2026-0448', name: '赵*芳', sex: '女', age: 70, dx: '髋关节置换术后', stage: 'recover',     device: 'DMH-2025-077', therapist: '于*婷', sessions: 27, hours: 15.9, last: '2026-10-12 09:38', bbs0: 33, bbs1: 44, adm: '2026-08-06', note: '术后 11 周，需控制患侧负重比例不超过 70%' },
    { id: 'PT-2026-0281', name: '陈*海', sex: '男', age: 77, dx: '老年平衡功能障碍', stage: 'consolidate', device: 'DMH-2025-022', therapist: '韩*敏', sessions: 74, hours: 48.2, last: '2026-10-12 09:45', bbs0: 36, bbs1: 52, adm: '2026-03-11', note: '既往 2 次跌倒史，依从度高，可作为居家康复样板' },
    { id: 'PT-2026-0471', name: '孙*梅', sex: '女', age: 65, dx: '脑卒中后遗症', stage: 'recover',     device: 'DMH-2025-052', therapist: '郭*强', sessions: 22, hours: 12.1, last: '2026-10-11 16:20', bbs0: 30, bbs1: 41, adm: '2026-08-22', note: '构音障碍，动作指令需配合图示卡片' },
    { id: 'PT-2026-0556', name: '周*生', sex: '男', age: 72, dx: '脊髓损伤（T12 不全）', stage: 'acute',   device: 'DMH-2025-009', therapist: '韩*敏', sessions: 6,  hours: 3.1,  last: '2026-10-12 11:28', bbs0: 18, bbs1: 24, adm: '2026-09-28', note: '躯干控制差，已发生 1 次紧急停机，需一对一监护' },
    { id: 'PT-2026-0512', name: '吴*琴', sex: '女', age: 69, dx: '膝关节术后',   stage: 'recover',       device: 'DMH-2025-081', therapist: '于*婷', sessions: 18, hours: 9.8,  last: '2026-10-12 10:12', bbs0: 35, bbs1: 45, adm: '2026-08-30', note: '居家康复，每周到社区站复训 2 次' }
  ];

  // 为每位患者生成 12 周康复轨迹（BBS 升、RMSE 降、失衡频次降）
  function patientSeries(p, i) {
    const weeks = [], bbs = [], rmse = [], sway = [], imb = [], stab = [], dose = [];
    const n = 12, r = rng(9100 + i * 137);
    const span = p.bbs1 - p.bbs0;
    for (let w = 0; w < n; w++) {
      const t = w / (n - 1);
      const e = 1 - Math.pow(1 - t, 1.9);              // 前快后慢的康复曲线
      const jit = (r() - 0.5) * 1.1;
      weeks.push('W' + (w + 1));
      bbs.push(round(p.bbs0 + span * e + jit * (1 - t * 0.5), 1));
      rmse.push(round(3.42 - (3.42 - 1.04) * e + (r() - 0.5) * 0.2 * (1 - t), 2));
      sway.push(round(2.68 - (2.68 - 0.82) * e + (r() - 0.5) * 0.14, 2));
      imb.push(round(18.6 - (18.6 - 4.2) * e + (r() - 0.5) * 1.4, 1));
      stab.push(Math.round(61 + (91 - 61) * e + (r() - 0.5) * 3));
      dose.push(round(12 + 16 * Math.min(1, t * 1.25) + (r() - 0.5) * 2.4, 1));
    }
    return { weeks, bbs, rmse, sway, imb, stab, dose };
  }
  const patients = patientSeed.map(function (p, i) {
    const s = patientSeries(p, i);
    const st = stages.find(function (x) { return x.key === p.stage; });
    return Object.assign({}, p, {
      series: s,
      stageName: st.name,
      bbs: s.bbs[s.bbs.length - 1],
      bbsGain: round(s.bbs[s.bbs.length - 1] - p.bbs0, 1),
      rmse: s.rmse[s.rmse.length - 1],
      imbalancePer1k: s.imb[s.imb.length - 1],
      stability: s.stab[s.stab.length - 1],
      adherence: Math.round(72 + rng(555 + i)() * 26),
      fallRiskDown: Math.round(62 + rng(777 + i)() * 24)
    });
  });
  const patientById = {};
  patients.forEach(function (p) { patientById[p.id] = p; });

  /* ---------- 设备台账 ---------- */
  const deviceSeed = [
    { id: 'DMH-2025-017', model: 'DMH-M1', mount: '固定式医用训练台', org: '盛京医院康复医学科', status: 'online',  battery: 84, fw: '1.4.2', hours: 412.6, last: '15:16:04', temp: 46.2, cpu: 63 },
    { id: 'DMH-2025-031', model: 'DMH-M1', mount: '固定式医用训练台', org: '盛京医院康复医学科', status: 'warn',    battery: 71, fw: '1.4.2', hours: 388.1, last: '15:16:01', temp: 78.4, cpu: 71 },
    { id: 'DMH-2025-022', model: 'DMH-M1', mount: '固定式医用训练台', org: '盛京医院康复医学科', status: 'online',  battery: 92, fw: '1.4.2', hours: 296.4, last: '15:15:58', temp: 44.8, cpu: 58 },
    { id: 'DMH-2025-009', model: 'DMH-M1', mount: '固定式医用训练台', org: '盛京医院康复医学科', status: 'online',  battery: 66, fw: '1.4.2', hours: 187.3, last: '15:16:02', temp: 51.6, cpu: 62 },
    { id: 'DMH-2025-052', model: 'DMH-P1', mount: '通用抱箍（助行器）', org: '浑南社区卫生服务中心', status: 'warn',  battery: 18, fw: '1.4.1', hours: 121.9, last: '15:15:41', temp: 41.2, cpu: 47 },
    { id: 'DMH-2025-077', model: 'DMH-P1', mount: '轮椅适配支架',     org: '浑南社区卫生服务中心', status: 'online',  battery: 88, fw: '1.4.2', hours: 96.5,  last: '15:16:00', temp: 39.7, cpu: 44 },
    { id: 'DMH-2025-081', model: 'DMH-P1', mount: '康复鞋具嵌入式',   org: '居家康复（沈阳·于洪）', status: 'online', battery: 79, fw: '1.4.2', hours: 64.2,  last: '15:15:55', temp: 38.4, cpu: 41 },
    { id: 'DMH-2025-068', model: 'DMH-P1', mount: '通用抱箍（助行器）', org: '浑南社区卫生服务中心', status: 'maintain', battery: 100, fw: '1.4.2', hours: 152.8, last: '—', temp: 26.1, cpu: 0 },
    { id: 'DMH-2025-044', model: 'DMH-P1', mount: '日常鞋履嵌入式',   org: '铁西区养老服务中心', status: 'offline', battery: 43, fw: '1.4.1', hours: 88.4,  last: '14:07:31', temp: 24.3, cpu: 0 },
    { id: 'DMH-2025-003', model: 'DMH-P1', mount: '通用抱箍（助行器）', org: '铁西区养老服务中心', status: 'online',  battery: 95, fw: '1.4.2', hours: 209.7, last: '15:15:59', temp: 43.5, cpu: 52 },
    { id: 'DMH-2025-090', model: 'DMH-P1', mount: '康复鞋具嵌入式',   org: '沈河区社区卫生服务中心', status: 'offline', battery: 12, fw: '1.4.0', hours: 141.2, last: '10-11 17:41', temp: 22.8, cpu: 0 },
    { id: 'DMH-2025-101', model: 'DMH-P1', mount: '待配置',           org: '未绑定（样机库）', status: 'pending', battery: 100, fw: '1.4.2', hours: 0, last: '—', temp: 21.4, cpu: 0 }
  ];
  const devName = { online: '在线', offline: '离线', maintain: '维护中', warn: '告警', pending: '待激活' };
  const devices = deviceSeed.map(function (d) {
    return Object.assign({}, d, {
      statusName: devName[d.status],
      patient: (patients.find(function (p) { return p.device === d.id; }) || {}).name || '—'
    });
  });

  /* ---------- 用户与权限 ---------- */
  const users = [
    { id: 'U-1001', name: '田*薇', account: 'tianwei', role: 'admin',     roleName: '系统管理员', org: '沈阳大学 动量稳衡项目组', dept: '项目组', last: '2026-10-12 15:02', scope: '全部机构', state: 'active' },
    { id: 'U-1002', name: '韩*敏', account: 'hanmin',  role: 'therapist', roleName: '康复师（高级）', org: '盛京医院康复医学科', dept: '神经康复组', last: '2026-10-12 14:56', scope: '盛京医院 42 台 / 68 名患者', state: 'active' },
    { id: 'U-1003', name: '于*婷', account: 'yuting',  role: 'therapist', roleName: '康复师',       org: '浑南社区卫生服务中心', dept: '康复门诊', last: '2026-10-12 15:10', scope: '浑南中心 21 台 / 44 名患者', state: 'active' },
    { id: 'U-1004', name: '郭*强', account: 'guoqiang',role: 'therapist', roleName: '康复师',       org: '盛京医院康复医学科', dept: '骨科康复组', last: '2026-10-11 17:20', scope: '盛京医院 26 台 / 37 名患者', state: 'active' },
    { id: 'U-1005', name: '徐*晗', account: 'xumenghan',role: 'rd',       roleName: '研发人员（算法）', org: '沈阳大学 动量稳衡项目组', dept: '算法组', last: '2026-10-12 15:14', scope: '只读全部数据 + 算法调参', state: 'active' },
    { id: 'U-1006', name: '何*鸣', account: 'heyiming',role: 'rd',        roleName: '研发人员（嵌入式）', org: '沈阳大学 动量稳衡项目组', dept: '硬件组', last: '2026-10-12 11:41', scope: '只读全部数据 + 固件下发', state: 'active' },
    { id: 'U-1007', name: '刘*硕', account: 'liuxinshuo', role: 'rd',     roleName: '研发人员（测试）', org: '沈阳大学 动量稳衡项目组', dept: '测试组', last: '2026-10-10 16:08', scope: '只读设备与算法数据', state: 'disabled' }
  ];
  const permModules = [
    { key: 'dashboard', name: '首页仪表盘',     short: '仪表盘' },
    { key: 'monitor',   name: '实时监测',       short: '监测' },
    { key: 'patient',   name: '患者康复数据分析', short: '患者数据' },
    { key: 'algorithm', name: '算法性能可视化',  short: '算法' },
    { key: 'alarm',     name: '告警与日志',     short: '告警' },
    { key: 'admin',     name: '用户与设备管理',  short: '设备管理' }
  ];
  // y=全部 / p=本单位可见 / n=无权限
  const permMatrix = {
    admin:     { dashboard: 'y', monitor: 'y', patient: 'y', algorithm: 'y', alarm: 'y', admin: 'y' },
    therapist: { dashboard: 'p', monitor: 'p', patient: 'y', algorithm: 'n', alarm: 'p', admin: 'n' },
    rd:        { dashboard: 'y', monitor: 'y', patient: 'p', algorithm: 'y', alarm: 'y', admin: 'p' }
  };
  const permDetail = {
    admin:     ['用户与权限管理', '设备台账维护', '全机构数据查看', '固件与参数下发', '日志导出'],
    therapist: ['患者档案维护', '康复报表生成', '本单位设备操作', '告警确认与闭环', '本机构数据查看'],
    rd:        ['算法参数调试', '固件版本下发', '全量时序数据读取', '仿真工况配置', '日志导出']
  };

  /* ---------- 算法性能数据 ---------- */
  // 卡尔曼滤波：原始含噪 vs 滤波后（同一段 20 s 姿态信号，含 5 次扰动）
  const kalman = (function () {
    const r = rng(20260212), n = 400, t = [], raw = [], fused = [], truth = [];
    for (let i = 0; i < n; i++) {
      const x = i / 20;                                   // 0–20 s
      // 真实姿态：基线上叠加 5 次受控扰动，指数收敛
      let v = 0.5 * Math.sin(x * 0.9);
      const evts = [3.5, 7.0, 10.5, 14.0, 17.5];
      evts.forEach(function (e, k) {
        if (x > e) {
          const amp = 5.2 - k * 0.55;
          v += amp * Math.exp(-(x - e) * 2.4) * Math.cos((x - e) * 3.1);
        }
      });
      truth.push(round(v, 3));
      raw.push(round(v + (r() - 0.5) * 2.6 + (r() > 0.965 ? (r() - 0.5) * 9 : 0), 3));
      // 融合输出：与真值贴合，仅保留极小幅残差与轻微相位滞后
      const prev = fused.length ? fused[fused.length - 1] : 0;
      const lagged = truth.length > 3 ? truth[truth.length - 3] : v;
      fused.push(round(prev * 0.42 + lagged * 0.58 + (r() - 0.5) * 0.13, 3));
      t.push(round(x, 2));
    }
    return { t, raw, fused, truth };
  })();

  // 自适应 PID / 复合控制参数整程时序（0–40 min，三阶段）
  const pidRun = (function () {
    const r = rng(777001), n = 240, t = [], kp = [], ki = [], kd = [], stageBand = [];
    for (let i = 0; i < n; i++) {
      const m = (i / n) * 40;                            // 分钟
      const w = m / 40;
      const s = m < 8 ? 0 : (m < 26 ? 1 : 2);            // 阶段：急性→恢复→巩固（演示同一患者整程）
      stageBand.push(s);
      const base = [2.05, 3.05, 3.62][s];
      const next = [3.05, 3.62, 3.62][s];
      const local = (m % 8) / 8;                          // 单次训练内微调
      const micro = Math.sin(local * Math.PI * 2) * 0.06;
      kp.push(round(base + (next - base) * Math.min(1, local * 0.8) + micro + (r() - 0.5) * 0.045, 3));
      ki.push(round([0.22, 0.34, 0.41][s] + micro * 0.4 + (r() - 0.5) * 0.012, 3));
      kd.push(round([0.09, 0.134, 0.176][s] + micro * 0.7 + (r() - 0.5) * 0.008, 4));
      t.push(round(m, 2));
    }
    return { t, kp, ki, kd, stageBand };
  })();

  const algoStats = {
    errStatic: 0.58, errDynamic: 1.32, errStd: 0.21,
    latencyMean: 86, latencyP95: 142, latencyMax: 178,
    ukfCost: 1.18, ctrlPeriod: 5.0, periodJitter: 0.09,
    torqueTrackErr: 3.1, cpu: 62, ram: 41, flashUse: 58,
    rmseRaw: 3.62, rmseFused: 0.87, snrGain: 12.4, noiseReject: 76.0,
    convRate: 97.8, missRate: 0.4, falseTrip: 0.3
  };

  const latencyHist = {
    buckets: ['<40', '40-60', '60-80', '80-100', '100-120', '120-150', '>150'],
    counts:  [12, 148, 612, 894, 431, 186, 43],
    unit: 'ms'
  };

  // 多梯度初始倾角收敛曲线（PPT 8 页工况，6 组）
  const gradient = (function () {
    const angles = [5, 10, 15, 20, 25, 30];
    const rows = angles.map(function (a, k) {
      const r = rng(3300 + k * 91), pts = [];
      const tau = 0.42 + a * 0.062;                      // 倾角越大，收敛越慢
      for (let i = 0; i <= 60; i++) {
        const x = i * 0.1;
        const v = a * Math.exp(-x / tau) - (a > 15 ? 0.9 * Math.exp(-x / 0.18) : 0);
        pts.push(round(Math.max(0, v + (r() - 0.5) * 0.22 * Math.exp(-x / tau)), 2));
      }
      return { angle: a, series: pts, cost: round(tau * 3.2, 2), peakTorque: round(0.09 + a * 0.0112, 3) };
    });
    const x = Array.from({ length: 61 }, function (_, i) { return round(i * 0.1, 1); });
    return { x, rows };
  })();

  /* ---------- 近 30 天告警统计 ---------- */
  const alarm30 = (function () {
    const r = rng(4242), days = [];
    const dev = [], pos = [], comm = [], power = [], param = [];
    for (let i = 29; i >= 0; i--) { days.push('09-' + String(13 + (29 - i) % 18).padStart(2, '0')); }
    for (let i = 0; i < 30; i++) {
      dev.push(1 + Math.round(r() * 3));                        // 设备异常 1–4
      pos.push(Math.max(2, Math.round(8 - i * 0.17 + r() * 3))); // 姿态超限，随康复推进缓降
      comm.push(Math.round(r() * 2));                           // 通信异常 0–2
      power.push(Math.round(r() * 2));                           // 电源预警 0–2
      param.push(2 + Math.round(r() * 4));                       // 参数调整 2–6
    }
    /* 最后一天（今日）对齐告警明细列表，保证指标卡 / 趋势图 / 列表三者一致 */
    const today = { dev: 4, pos: 2, comm: 1, power: 0, param: 1 };
    dev[29] = today.dev; pos[29] = today.pos; comm[29] = today.comm;
    power[29] = today.power; param[29] = today.param;
    return { days, dev, pos, comm, power, param, todayTotal: 8 };
  })();

  return {
    meta: P, kpi: kpi, trend7: trend7, alerts: alerts, logs: logs,
    stages: stages, patients: patients, patientById: patientById,
    devices: devices, users: users, permModules: permModules,
    permMatrix: permMatrix, permDetail: permDetail,
    kalman: kalman, pidRun: pidRun, algoStats: algoStats,
    latencyHist: latencyHist, gradient: gradient, alarm30: alarm30,
    /* helpers */
    rng: rng, series: series, round: round
  };
})();
