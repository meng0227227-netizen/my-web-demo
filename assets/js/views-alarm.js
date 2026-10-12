/* ============================================================
   M5 基础告警与日志模块
   分级告警 / 姿态超限 / 关键事件日志查询
   ============================================================ */
window.MLH = window.MLH || {};
MLH.views = MLH.views || {};

MLH.views.alarm = (function () {
  'use strict';
  const D = MLH.data, U = MLH.ui;

  const LEVEL = {
    danger: { name: '高危', tone: 'danger', icon: 'alert' },
    warn:   { name: '预警', tone: 'warn',   icon: 'alert' },
    info:   { name: '提示', tone: 'info',   icon: 'info' }
  };
  const STATUS_TONE = { '处理中': 'warn', '待充电': 'warn', '观察中': 'warn', '待复核': 'warn', '已闭环': 'ok', '已自愈': 'ok', '已自动矫正': 'ok', '已生效': 'info', '已归档': 'neutral' };

  const alerts = D.alerts.map(function (a) { return Object.assign({}, a); });
  const logs = D.logs.slice();

  let fLevel = 'all', fType = 'all', fLogType = 'all', fLogQ = '';
  let handlers = [];

  function alertTypes() {
    const s = {};
    alerts.forEach(function (a) { s[a.type] = (s[a.type] || 0) + 1; });
    return Object.keys(s);
  }

  function render(root) {
    const today = alerts.length;
    const high = alerts.filter(function (a) { return a.level === 'danger'; }).length;
    const open = alerts.filter(function (a) { return ['处理中', '待充电', '观察中'].indexOf(a.status) >= 0; }).length;
    const closed = alerts.length - open;

    const kpis = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      ['<div class="c3">' + U.kpi({ label: '今日告警总数', icon: 'bell', tone: 'primary', value: today, unit: '条',
        foot: '高危 <span class="mono">' + high + '</span> 条 · 预警 <span class="mono">' +
          alerts.filter(function (a) { return a.level === 'warn'; }).length + '</span> 条 · 当日为进行中半天数据' }) + '</div>',
      '<div class="c3">' + U.kpi({ label: '高危告警', icon: 'alert', tone: 'danger', value: high, unit: '条',
        foot: '需康复师现场复核 <span class="mono">1</span> 条' }) + '</div>',
      '<div class="c3">' + U.kpi({ label: '待处理', icon: 'clock', tone: 'warn', value: open, unit: '条',
        foot: '平均响应耗时 <span class="mono">2.4 min</span>' }) + '</div>',
      '<div class="c3">' + U.kpi({ label: '自动闭环率', icon: 'shield', tone: 'ok',
        value: (closed / alerts.length * 100).toFixed(1), unit: '%',
        foot: '自动矫正 / 自愈 <span class="mono">' + closed + '</span> 条' }) + '</div>'].join('') +
      '</div>';

    const rowB = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c8">' + U.card({
        title: '近 30 天告警趋势', icon: 'wave', sub: '按类型堆叠',
        right: '<span class="tag-sim">示例数据</span>',
        body: '<div class="chart chart--260" id="ch-a30"></div>',
        foot: '<span>姿态超限类告警呈缓慢下降趋势，与康复进程推进一致</span>'
      }) + '</div>' +
      '<div class="c4">' + U.card({
        title: '告警类型分布', icon: 'layers', sub: '近 30 天累计',
        body: '<div class="chart chart--260" id="ch-typec"></div>',
        foot: '<span>姿态超限类告警随康复进程推进逐周缓降</span><span>参数调整类属算法自适应正常行为</span>'
      }) + '</div>' +
      '</div>';

    const typeOpts = ['<option value="all">全部类型</option>'].concat(alertTypes().map(function (t) {
      return '<option value="' + U.esc(t) + '">' + U.esc(t) + '</option>';
    })).join('');

    const tableCard = U.card({
      title: '分级告警列表', icon: 'alert', sub: '设备异常 / 姿态超限 / 通信 / 电源',
      right: '<span class="row" style="gap:var(--sp-2)">' +
        '<span class="segmented" id="al-level">' +
        '<button data-l="all" class="is-on">全部</button>' +
        '<button data-l="danger">高危</button><button data-l="warn">预警</button><button data-l="info">提示</button></span>' +
        '<span class="topbar__field" style="height:28px">' + U.icon('filter', 13) +
        '<select id="al-type">' + typeOpts + '</select></span></span>',
      flush: true,
      body: '<div class="tbl-wrap" style="max-height:420px"><table class="tbl"><thead><tr>' +
        '<th>级别</th><th>告警编号</th><th>类型</th><th>告警内容</th><th>设备 / 患者</th>' +
        '<th>触发时间</th><th>持续</th><th>状态</th><th class="r">操作</th>' +
        '</tr></thead><tbody id="al-body"></tbody></table></div>',
      foot: '<span id="al-count"></span><span>点击“确认闭环”登记现场核实结果，记录写入关键事件日志</span>'
    });

    const logCard = U.card({
      title: '关键事件日志', icon: 'file', sub: '失衡事件 / 参数调整 / 安全停机 / 校准 / 绑定',
      right: '<span class="row" style="gap:var(--sp-2)">' +
        '<span class="topbar__field" style="height:28px">' + U.icon('search', 13) +
        '<input id="lg-q" placeholder="搜索设备 / 患者 / 内容" style="border:0;background:transparent;outline:none;color:var(--ink);font-size:11.5px;width:172px"></span>' +
        '<span class="topbar__field" style="height:28px">' + U.icon('filter', 13) +
        '<select id="lg-type"><option value="all">全部事件</option>' +
        ['失衡事件', '参数调整', '安全停机', '训练', '自检校准', '设备绑定', '固件升级', '电源', '通信', '告警', '检修', '人工复核']
          .map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') +
        '</select></span>' +
        '<button class="btn" id="lg-export">' + U.icon('download', 14) + ' 导出日志</button></span>',
      flush: true,
      body: '<div class="tbl-wrap" style="max-height:420px"><table class="tbl"><thead><tr>' +
        '<th>时间</th><th>事件类型</th><th>级别</th><th>设备</th><th>患者</th><th>操作人</th><th>详情</th>' +
        '</tr></thead><tbody id="lg-body"></tbody></table></div>',
      foot: '<span id="lg-count"></span><span>日志保留期 180 天，支持按时间区间归档导出</span>'
    });

    root.innerHTML = kpis + rowB +
      '<div class="grid g-12" style="margin-bottom:var(--sp-4)"><div class="c12">' + tableCard + '</div></div>' +
      '<div class="grid g-12"><div class="c12">' + logCard + '</div></div>';
  }

  /* ---------- 告警表 ---------- */
  function fillAlerts(root) {
    const body = root.querySelector('#al-body');
    if (!body) return;
    const list = alerts.filter(function (a) {
      const okL = fLevel === 'all' || a.level === fLevel;
      const okT = fType === 'all' || a.type === fType;
      return okL && okT;
    });
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="9"><div class="empty">当前筛选条件下无告警记录</div></td></tr>';
    } else {
      body.innerHTML = list.map(function (a) {
        const lv = LEVEL[a.level];
        const stTone = STATUS_TONE[a.status] || 'neutral';
        const done = ['已闭环', '已自愈', '已自动矫正', '已生效', '已归档'].indexOf(a.status) >= 0;
        return '<tr data-al="' + a.id + '">' +
          '<td>' + U.badge(lv.name, lv.tone, true) + '</td>' +
          '<td class="cell-id">' + a.id + '</td>' +
          '<td>' + U.badge(a.type, 'neutral') + '</td>' +
          '<td class="strong" style="white-space:normal;max-width:340px;min-width:260px">' + U.esc(a.title) +
          '<div style="font-size:10.5px;color:var(--muted);font-weight:400;margin-top:2px;white-space:normal">' + U.esc(a.detail) + '</div></td>' +
          '<td class="cell-id">' + a.device + '<div style="color:var(--muted)">' + a.patient + '</div></td>' +
          '<td class="mono">' + a.time + '</td>' +
          '<td class="mono" style="color:var(--muted)">' + a.dur + '</td>' +
          '<td>' + U.badge(a.status, stTone) + '</td>' +
          '<td class="r">' + (done
            ? '<span class="mono" style="font-size:10.5px;color:var(--muted)">已闭环</span>'
            : '<button class="btn" data-act="close" data-id="' + a.id + '" style="height:24px;font-size:11px">确认闭环</button>') +
          '</td></tr>';
      }).join('');
    }
    const c = root.querySelector('#al-count');
    if (c) c.textContent = '显示 ' + list.length + ' / ' + alerts.length + ' 条告警';
  }

  /* ---------- 日志表 ---------- */
  function fillLogs(root) {
    const body = root.querySelector('#lg-body');
    if (!body) return;
    const list = logs.filter(function (g) {
      const okT = fLogType === 'all' || g.type === fLogType;
      const okQ = !fLogQ || (g.device + g.patient + g.detail + g.operator + g.type).indexOf(fLogQ) >= 0;
      return okT && okQ;
    });
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="7"><div class="empty">无匹配日志</div></td></tr>';
    } else {
      body.innerHTML = list.map(function (g) {
        const lv = LEVEL[g.level] || LEVEL.info;
        return '<tr>' +
          '<td class="mono" style="color:var(--ink-soft)">' + g.time + '</td>' +
          '<td>' + U.badge(g.type, g.type === '失衡事件' ? 'warn' : (g.type === '安全停机' || g.type === '告警' ? 'danger' : (g.type === '参数调整' ? 'cyan' : 'neutral'))) + '</td>' +
          '<td>' + U.badge(lv.name, lv.tone) + '</td>' +
          '<td class="cell-id">' + g.device + '</td>' +
          '<td>' + g.patient + '</td>' +
          '<td>' + g.operator + '</td>' +
          '<td style="white-space:normal;min-width:380px;color:var(--ink-2)">' + U.esc(g.detail) + '</td>' +
          '</tr>';
      }).join('');
    }
    const c = root.querySelector('#lg-count');
    if (c) c.textContent = '显示 ' + list.length + ' / ' + logs.length + ' 条记录';
  }

  function mount(root) {
    /* 30 天趋势 */
    U.mountChart(root.querySelector('#ch-a30'), function () { return MLH.charts.alarm30(D.alarm30); });

    /* 类型分布环 */
    U.mountChart(root.querySelector('#ch-typec'), function () {
      const p = MLH.charts.pal();
      const a = D.alarm30;
      const sum = function (arr) { return arr.reduce(function (x, y) { return x + y; }, 0); };
      const data = [
        { value: sum(a.param), name: '参数调整', itemStyle: { color: p.series[1] } },
        { value: sum(a.pos), name: '姿态超限', itemStyle: { color: p.series[2] } },
        { value: sum(a.dev), name: '设备异常', itemStyle: { color: p.series[0] } },
        { value: sum(a.comm), name: '通信异常', itemStyle: { color: p.series[3] } },
        { value: sum(a.power), name: '电源预警', itemStyle: { color: p.series[5] } }
      ];
      return {
        tooltip: { trigger: 'item', backgroundColor: p.surface, borderColor: p.grid, textStyle: { color: p.ink2, fontFamily: MLH.charts.STACK, fontSize: 11.5 } },
        legend: {
          orient: 'vertical', right: 0, top: 'center', icon: 'roundRect',
          textStyle: { color: p.soft, fontSize: 10.5, fontFamily: MLH.charts.SANS },
          formatter: function (n) {
            const it = data.find(function (d) { return d.name === n; });
            return n + '  ' + it.value;
          }
        },
        series: [{
          type: 'pie', radius: ['54%', '78%'], center: ['31%', '50%'],
          itemStyle: { borderColor: p.surface, borderWidth: 2 },
          label: { show: false }, labelLine: { show: false },
          data: data
        }]
      };
    });

    fillAlerts(root);
    fillLogs(root);

    /* 级别筛选 */
    const lv = root.querySelector('#al-level');
    if (lv) {
      const h = function (e) {
        const b = e.target.closest('button'); if (!b) return;
        lv.querySelectorAll('button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on'); fLevel = b.dataset.l; fillAlerts(root);
      };
      lv.addEventListener('click', h); handlers.push([lv, h]);
    }
    /* 类型筛选 */
    const ty = root.querySelector('#al-type');
    if (ty) {
      const h = function () { fType = ty.value; fillAlerts(root); };
      ty.addEventListener('change', h); handlers.push([ty, h]);
    }
    /* 闭环操作 */
    const body = root.querySelector('#al-body');
    if (body) {
      const h = function (e) {
        const b = e.target.closest('[data-act="close"]'); if (!b) return;
        const a = alerts.find(function (x) { return x.id === b.dataset.id; });
        if (!a) return;
        a.status = a.level === 'danger' ? '已闭环' : '已自动矫正';
        const now = new Date();
        const ts = '2026-10-12 ' + [now.getHours(), now.getMinutes(), now.getSeconds()].map(function (n) { return n < 10 ? '0' + n : n; }).join(':');
        logs.unshift({ time: ts, type: '人工复核', level: 'info', device: a.device, patient: a.patient, operator: '韩*敏', detail: '告警 ' + a.id + ' 现场核实完成，登记闭环：' + a.title });
        fillAlerts(root); fillLogs(root);
        U.toast('告警已闭环', a.id + ' · 已写入关键事件日志', 'ok');
      };
      body.addEventListener('click', h); handlers.push([body, h]);
    }
    /* 日志筛选 */
    const lq = root.querySelector('#lg-q');
    if (lq) {
      let t = null;
      const h = function () { clearTimeout(t); t = setTimeout(function () { fLogQ = lq.value.trim(); fillLogs(root); }, 200); };
      lq.addEventListener('input', h); handlers.push([lq, h]);
    }
    const lt = root.querySelector('#lg-type');
    if (lt) {
      const h = function () { fLogType = lt.value; fillLogs(root); };
      lt.addEventListener('change', h); handlers.push([lt, h]);
    }
    /* 导出日志 */
    const ex = root.querySelector('#lg-export');
    if (ex) {
      const h = function () {
        const rows = [['时间', '事件类型', '级别', '设备', '患者', '操作人', '详情']];
        logs.forEach(function (g) {
          rows.push([g.time, g.type, (LEVEL[g.level] || LEVEL.info).name, g.device, g.patient, g.operator, g.detail]);
        });
        rows.push([]);
        rows.push(['注：数据来源为平台仿真/示例数据，仅用于演示。']);
        const f = '动量稳衡_关键事件日志_2026-10-12.csv';
        U.downloadCSV(f, rows);
        U.toast('日志已导出', f + '（' + logs.length + ' 条）', 'ok');
      };
      ex.addEventListener('click', h); handlers.push([ex, h]);
    }
  }

  function unmount() {
    handlers.forEach(function (h) { h[0].removeEventListener('click', h[1]); h[0].removeEventListener('change', h[1]); h[0].removeEventListener('input', h[1]); });
    handlers = [];
  }

  return {
    title: '告警与日志', code: 'M05', icon: 'bell',
    subtitle: '设备异常 · 姿态超限 · 关键事件日志查询',
    render: render, mount: mount, unmount: unmount
  };
})();
