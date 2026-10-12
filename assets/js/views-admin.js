/* ============================================================
   M6 用户与设备管理
   用户权限（康复师 / 研发人员 / 管理员）· 设备台账与绑定
   ============================================================ */
window.MLH = window.MLH || {};
MLH.views = MLH.views || {};

MLH.views.admin = (function () {
  'use strict';
  const D = MLH.data, U = MLH.ui;

  const ROLE = {
    admin: { name: '系统管理员', tone: 'violet' },
    therapist: { name: '康复师', tone: 'cyan' },
    rd: { name: '研发人员', tone: 'info' }
  };
  const MOUNT = ['固定式医用训练台', '通用抱箍（助行器）', '康复鞋具嵌入式', '日常鞋履嵌入式', '轮椅适配支架', '待配置'];

  let devQ = '', devFilter = 'all';
  let handlers = [];

  function render(root) {
    /* ---- 用户账号表 ---- */
    const userRows = D.users.map(function (u) {
      const r = ROLE[u.role];
      return '<tr data-u="' + u.id + '">' +
        '<td><div class="user-cell">' + U.avatar(u.name, D.users.indexOf(u)) + '<div><div class="strong">' + u.name + '</div>' +
        '<div class="mono" style="font-size:10px;color:var(--muted)">' + u.account + '</div></div></div></td>' +
        '<td>' + U.badge(r.name, r.tone) + '</td>' +
        '<td style="white-space:normal">' + u.org + '<div style="font-size:10.5px;color:var(--muted)">' + u.dept + '</div></td>' +
        '<td style="white-space:normal;max-width:220px;font-size:11px;color:var(--ink-soft)">' + u.scope + '</td>' +
        '<td class="mono" style="font-size:11px;color:var(--muted)">' + u.last + '</td>' +
        '<td>' + (u.state === 'active' ? U.badge('正常', 'ok', true) : U.badge('已停用', 'neutral')) + '</td>' +
        '<td class="r"><button class="btn" data-act="toggle" data-id="' + u.id + '" style="height:24px;font-size:11px">' +
        (u.state === 'active' ? '停用' : '启用') + '</button></td>' +
        '</tr>';
    }).join('');

    const userCard = U.card({
      title: '用户账号管理', icon: 'users', sub: '康复师 / 研发人员 / 系统管理员',
      right: '<button class="btn" id="ad-adduser">' + U.icon('plus', 14) + ' 新增账号</button>',
      flush: true,
      body: '<div class="tbl-wrap" style="max-height:300px"><table class="tbl"><thead><tr>' +
        '<th>用户</th><th>角色</th><th>所属机构 / 部门</th><th>数据范围</th><th>最近登录</th><th>状态</th><th class="r">操作</th>' +
        '</tr></thead><tbody id="ad-users">' + userRows + '</tbody></table></div>',
      foot: '<span>共 ' + D.users.length + ' 个账号 · 正常 ' + D.users.filter(function (u) { return u.state === 'active'; }).length + ' 个</span>' +
        '<span>账号采用最小权限原则，数据范围随所属机构自动隔离</span>'
    });

    /* ---- 权限矩阵 ---- */
    const permRows = Object.keys(D.permMatrix).map(function (roleKey) {
      const r = ROLE[roleKey], m = D.permMatrix[roleKey];
      return '<tr>' +
        '<td><span class="row" style="gap:7px">' + U.badge(r.name, r.tone) +
        '<span class="mono" style="font-size:10.5px;color:var(--muted)">' +
        (roleKey === 'admin' ? '1 人' : roleKey === 'therapist' ? '3 人' : '3 人') + '</span></span></td>' +
        D.permModules.map(function (mod) {
          const v = m[mod.key];
          const cls = v === 'y' ? 'perm--y' : (v === 'p' ? 'perm--p' : 'perm--n');
          const ic = v === 'y' ? 'check' : (v === 'p' ? 'minus' : 'x');
          const label = v === 'y' ? '全部' : (v === 'p' ? '受限' : '无');
          return '<td class="c"><span class="perm ' + cls + '" title="' + label + '">' + U.icon(ic, 12) + '</span></td>';
        }).join('') +
        '</tr>';
    }).join('');

    const permCard = U.card({
      title: '角色权限矩阵', icon: 'shield', sub: '模块级可见性',
      right: '<span class="legend"><span class="legend__item"><span class="perm perm--y">' + U.icon('check', 11) + '</span>全部</span>' +
        '<span class="legend__item"><span class="perm perm--p">' + U.icon('minus', 11) + '</span>受限</span>' +
        '<span class="legend__item"><span class="perm perm--n">' + U.icon('x', 11) + '</span>无</span></span>',
      flush: true,
      body: '<div class="tbl-wrap"><table class="tbl matrix"><thead><tr><th>角色</th>' +
        D.permModules.map(function (m) { return '<th class="c" title="' + m.name + '">' + m.short + '</th>'; }).join('') +
        '</tr></thead><tbody>' + permRows + '</tbody></table></div>',
      foot: '<span>“受限”指仅可查看所属机构/本人在管范围内的数据</span>'
    });

    /* ---- 权限明细 ---- */
    const detailCard = U.card({
      title: '角色能力清单', icon: 'file', sub: '岗位职责对应的系统能力',
      body: '<div class="stack stack--tight">' +
        Object.keys(D.permDetail).map(function (k) {
          const r = ROLE[k];
          return '<div style="border:1px solid var(--hairline);border-radius:3px;padding:var(--sp-3)">' +
            '<div class="row row--between" style="margin-bottom:6px">' + U.badge(r.name, r.tone) +
            '<span class="mono" style="font-size:10px;color:var(--muted)">' + D.permDetail[k].length + ' 项能力</span></div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:5px">' +
            D.permDetail[k].map(function (t) {
              return '<span class="chip" style="cursor:default;height:20px;font-size:10.5px">' + t + '</span>';
            }).join('') + '</div></div>';
        }).join('') + '</div>',
      foot: '<span>权限变更需系统管理员二次确认并写入操作日志</span>'
    });

    /* ---- 设备概览 ---- */
    const counts = {};
    D.devices.forEach(function (d) { counts[d.status] = (counts[d.status] || 0) + 1; });
    const devStats = U.card({
      title: '设备概览', icon: 'chip', sub: '挂载形式与运行状态',
      body: '<div class="stats" style="border:1px solid var(--hairline);border-radius:3px;margin-bottom:var(--sp-4)">' +
        '<div class="stats__cell"><div class="stats__k">在线</div><div class="stats__v" style="color:var(--ok)">' + (counts.online || 0) + '</div></div>' +
        '<div class="stats__cell"><div class="stats__k">告警</div><div class="stats__v" style="color:var(--danger)">' + (counts.warn || 0) + '</div></div>' +
        '<div class="stats__cell"><div class="stats__k">离线</div><div class="stats__v">' + (counts.offline || 0) + '</div></div>' +
        '<div class="stats__cell"><div class="stats__k">维护 / 待激活</div><div class="stats__v">' + ((counts.maintain || 0) + (counts.pending || 0)) + '</div></div>' +
        '</div>' +
        '<div class="chart chart--220" id="ch-mount"></div>',
      foot: '<span>单台设备日均可承接 6–9 人次训练</span><span>居家中继设备平均在线率 92.4%</span>'
    });

    const rowA = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c7">' + userCard + '</div>' +
      '<div class="c5">' + permCard + '</div>' +
      '</div>';

    const rowB = '<div class="grid g-12" style="margin-bottom:var(--sp-4)">' +
      '<div class="c5">' + detailCard + '</div>' +
      '<div class="c7">' + devStats + '</div>' +
      '</div>';

    /* ---- 设备台账 ---- */
    const ledger = U.card({
      title: '设备台账', icon: 'layers', sub: '型号 / 固件 / 绑定患者 / 归属机构',
      right: '<span class="row" style="gap:var(--sp-2)">' +
        '<span class="topbar__field" style="height:28px">' + U.icon('search', 13) +
        '<input id="dv-q" placeholder="搜索设备编号 / 机构 / 患者" style="border:0;background:transparent;outline:none;color:var(--ink);font-size:11.5px;width:184px"></span>' +
        '<span class="segmented" id="dv-filter">' +
        '<button data-f="all" class="is-on">全部</button><button data-f="online">在线</button>' +
        '<button data-f="warn">告警</button><button data-f="offline">离线</button><button data-f="maintain">维护</button>' +
        '</span></span>',
      flush: true,
      body: '<div class="tbl-wrap tbl__scroll" style="max-height:380px"><table class="tbl"><thead><tr>' +
        '<th>设备编号</th><th>型号</th><th>挂载形式</th><th>归属机构</th><th>绑定患者</th><th>固件</th>' +
        '<th class="r">累计工时</th><th>电量</th><th class="r">温度</th><th class="r">CPU</th><th>状态</th><th>最后在线</th>' +
        '</tr></thead><tbody id="dv-body"></tbody></table></div>',
      foot: '<span id="dv-count"></span><span>点击设备卡片可查看绑定详情并调整绑定关系</span>'
    });

    /* ---- 设备卡片网格 ---- */
    const devCards = U.card({
      title: '康养设备绑定管理', icon: 'link', sub: '点击卡片查看设备信息与绑定关系',
      right: '<span class="mono" style="font-size:10.5px;color:var(--muted)">共 ' + D.devices.length + ' 台</span>',
      body: '<div class="dev-grid">' + D.devices.map(function (d) {
        const tone = d.status === 'online' ? 'ok' : (d.status === 'warn' ? 'danger' : (d.status === 'maintain' ? 'warn' : 'neutral'));
        return '<div class="devcard' + (d.status === 'offline' || d.status === 'pending' ? ' devcard--off' : '') + '" data-dev="' + d.id + '">' +
          '<div class="devcard__top"><span class="devcard__id">' + d.id + '</span>' + U.badge(d.statusName, tone, true) + '</div>' +
          '<div class="devcard__model">' + d.model + ' · ' + d.mount + '</div>' +
          '<div class="devcard__rows">' +
          '<div class="devcard__row"><span>绑定患者</span><span>' + d.patient + '</span></div>' +
          '<div class="devcard__row"><span>归属机构</span><span style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + d.org + '</span></div>' +
          '<div class="devcard__row"><span>固件</span><span>' + d.fw + '</span></div>' +
          '<div class="devcard__row"><span>电量 / 温度</span><span>' + d.battery + '% · ' + d.temp + '℃</span></div>' +
          '</div>' +
          '<div style="margin-top:2px">' + U.meter(d.battery, d.battery < 25 ? 'danger' : (d.battery < 50 ? 'warn' : 'ok')) + '</div>' +
          '</div>';
      }).join('') + '</div>'
    });

    root.innerHTML = rowA + rowB +
      '<div class="grid g-12" style="margin-bottom:var(--sp-4)"><div class="c12">' + ledger + '</div></div>' +
      '<div class="grid g-12"><div class="c12">' + devCards + '</div></div>';
  }

  /* ---------- 设备表填充 ---------- */
  function fillDevices(root) {
    const body = root.querySelector('#dv-body');
    if (!body) return;
    const list = D.devices.filter(function (d) {
      const okF = devFilter === 'all' || d.status === devFilter || (devFilter === 'maintain' && d.status === 'pending');
      const okQ = !devQ || (d.id + d.org + d.patient + d.model).indexOf(devQ) >= 0;
      return okF && okQ;
    });
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="12"><div class="empty">无匹配设备</div></td></tr>';
    } else {
      body.innerHTML = list.map(function (d) {
        return '<tr data-devrow="' + d.id + '">' +
          '<td class="mono strong">' + d.id + '</td>' +
          '<td class="mono">' + d.model + '</td>' +
          '<td style="white-space:normal;font-size:11px">' + d.mount + '</td>' +
          '<td style="white-space:normal;font-size:11px">' + d.org + '</td>' +
          '<td>' + d.patient + '</td>' +
          '<td class="mono">' + d.fw + '</td>' +
          '<td class="r mono">' + d.hours.toFixed(1) + '</td>' +
          '<td>' + U.meter(d.battery, d.battery < 25 ? 'danger' : (d.battery < 50 ? 'warn' : 'ok')) + '</td>' +
          '<td class="r mono" style="color:' + (d.temp > 70 ? 'var(--danger)' : 'var(--ink-2)') + '">' + d.temp + '</td>' +
          '<td class="r mono">' + d.cpu + '%</td>' +
          '<td>' + U.statusBadge(d.status) + '</td>' +
          '<td class="mono" style="color:var(--muted)">' + d.last + '</td>' +
          '</tr>';
      }).join('');
    }
    const c = root.querySelector('#dv-count');
    if (c) c.textContent = '显示 ' + list.length + ' / ' + D.devices.length + ' 台设备';
  }

  /* ---------- 设备详情 / 绑定弹层 ---------- */
  function openDevice(d) {
    const pts = D.patients.map(function (p) {
      return '<option value="' + p.id + '"' + (p.name === d.patient ? ' selected' : '') + '>' + p.name + '（' + p.id + ' · ' + p.dx + '）</option>';
    }).join('');
    const body = '<div class="grid" style="grid-template-columns:1fr 1fr;gap:var(--sp-5)">' +
      '<div><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">设备信息</div>' +
      '<dl class="kv">' +
      '<dt>设备编号</dt><dd>' + d.id + '</dd>' +
      '<dt>型号</dt><dd>' + d.model + '</dd>' +
      '<dt>挂载形式</dt><dd>' + d.mount + '</dd>' +
      '<dt>归属机构</dt><dd style="font-family:var(--font-sans)">' + d.org + '</dd>' +
      '<dt>固件版本</dt><dd>' + d.fw + '</dd>' +
      '<dt>累计工时</dt><dd>' + d.hours.toFixed(1) + ' h</dd>' +
      '<dt>电池电量</dt><dd>' + d.battery + ' %</dd>' +
      '<dt>电机温度</dt><dd>' + d.temp + ' ℃</dd>' +
      '<dt>CPU 占用</dt><dd>' + d.cpu + ' %</dd>' +
      '<dt>状态</dt><dd>' + d.statusName + '</dd>' +
      '<dt>最后在线</dt><dd>' + d.last + '</dd>' +
      '</dl></div>' +
      '<div><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">绑定关系</div>' +
      '<div style="font-size:11.5px;color:var(--muted);margin-bottom:6px">当前绑定患者</div>' +
      '<div class="topbar__field" style="height:32px;width:100%"><select id="md-patient" style="width:100%;max-width:none">' +
      '<option value="">（不绑定 · 巡诊共用机）</option>' + pts + '</select></div>' +
      '<div class="hr"></div>' +
      '<div style="font-size:11.5px;color:var(--muted);margin-bottom:6px">硬件配置</div>' +
      '<div class="stack stack--tight" style="font-size:11px;color:var(--ink-2)">' +
      [['主控', 'STM32H743 · Cortex-M7 400 MHz · 双精度 FPU'],
       ['惯性单元', '工业级六轴 IMU（三轴加速度计 + 三轴陀螺仪）'],
       ['测速单元', '高分辨率光电编码器（转速 / 位置 / 力矩反馈）'],
       ['执行机构', '双层惯性飞轮 + 直流无刷电机'],
       ['电源', '聚合物锂电池 + 多级隔离稳压（三级电压阈值）'],
       ['结构', '高强度铝合金支架 + 轻量化亚克力外壳'],
       ['整机重量', '≤ 300 g']]
        .map(function (r) {
          return '<div class="row row--between" style="gap:var(--sp-3)"><span style="color:var(--muted);white-space:nowrap">' + r[0] + '</span>' +
            '<span style="text-align:right;font-size:10.5px">' + r[1] + '</span></div>';
        }).join('') + '</div></div></div>';
    U.modal({
      title: '设备详情 · ' + d.id, icon: 'chip', body: body,
      foot: '<button class="btn" data-close>取消</button>' +
        '<button class="btn" data-act="ota">' + U.icon('refresh', 14) + ' 下发固件</button>' +
        '<button class="btn btn--primary" data-act="bind">' + U.icon('link', 14) + ' 保存绑定关系</button>'
    });
    const root = document.getElementById('modalRoot');
    const bind = root.querySelector('[data-act="bind"]');
    if (bind) bind.addEventListener('click', function () {
      const sel = root.querySelector('#md-patient');
      const pid = sel.value;
      const p = D.patientById[pid];
      d.patient = p ? p.name : '—';
      if (p) p.device = d.id;
      if (d.status === 'pending' && p) d.status = 'online';
      U.toast('绑定关系已更新', d.id + ' → ' + d.patient, 'ok');
      root.innerHTML = '';
      const host = document.querySelector('.view');
      if (host) { MLH.views.admin.unmount(); MLH.ui.disposeAll(); host.innerHTML = ''; MLH.views.admin.render(host); MLH.views.admin.mount(host); }
    });
    const ota = root.querySelector('[data-act="ota"]');
    if (ota) ota.addEventListener('click', function () {
      U.toast('固件下发已排队', d.id + ' · FW 1.4.2 → 下次空闲时自动升级', 'info');
      root.innerHTML = '';
    });
  }

  function mount(root) {
    fillDevices(root);

    /* 挂载形式分布 */
    U.mountChart(root.querySelector('#ch-mount'), function () {
      const p = MLH.charts.pal();
      const counts = MOUNT.map(function (m) {
        return D.devices.filter(function (d) { return d.mount === m; }).length;
      });
      return {
        grid: { left: 6, right: 30, top: 8, bottom: 4, containLabel: true },
        tooltip: {
          trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: p.surface,
          borderColor: p.grid, textStyle: { color: p.ink2, fontFamily: MLH.charts.STACK, fontSize: 11.5 }
        },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: p.split, type: [3, 3] } },
          axisLabel: { color: p.muted, fontFamily: MLH.charts.MONO, fontSize: 10 }, axisLine: { show: false } },
        yAxis: { type: 'category', inverse: true, data: MOUNT,
          axisLine: { lineStyle: { color: p.grid } }, axisTick: { show: false },
          axisLabel: { color: p.soft, fontFamily: MLH.charts.SANS, fontSize: 10.5 } },
        series: [{
          type: 'bar', data: counts, barMaxWidth: 14,
          itemStyle: {
            borderRadius: [0, 3, 3, 0],
            color: function (q) { return q.dataIndex === 0 ? p.series[0] : (q.dataIndex === MOUNT.length - 1 ? p.grid : p.series[1]); }
          },
          label: { show: true, position: 'right', color: p.muted, fontFamily: MLH.charts.MONO, fontSize: 10,
            formatter: function (q) { return q.value + ' 台'; } }
        }]
      };
    });

    /* 用户状态切换 */
    const ut = root.querySelector('#ad-users');
    if (ut) {
      const h = function (e) {
        const b = e.target.closest('[data-act="toggle"]'); if (!b) return;
        const u = D.users.find(function (x) { return x.id === b.dataset.id; });
        if (!u) return;
        u.state = u.state === 'active' ? 'disabled' : 'active';
        U.toast('账号状态已更新', u.name + ' · ' + (u.state === 'active' ? '已启用' : '已停用'), u.state === 'active' ? 'ok' : 'warn');
        const host = root;
        unmount(); MLH.ui.disposeAll(); host.innerHTML = ''; render(host); mount(host);
      };
      ut.addEventListener('click', h); handlers.push([ut, h]);
    }
    /* 新增账号 */
    const add = root.querySelector('#ad-adduser');
    if (add) {
      const h = function () {
        U.modal({
          title: '新增账号', icon: 'users',
          body: '<div class="stack">' +
            '<div><div style="font-size:11px;color:var(--muted);margin-bottom:5px">姓名 / 工号</div>' +
            '<div class="topbar__field" style="height:32px"><input placeholder="如：王*明" style="border:0;background:transparent;outline:none;color:var(--ink);font-size:12px;width:100%"></div></div>' +
            '<div><div style="font-size:11px;color:var(--muted);margin-bottom:5px">角色</div>' +
            '<div class="stageswitch">' + Object.keys(ROLE).map(function (k, i) {
              return '<div class="stageswitch__btn' + (i === 1 ? ' is-on' : '') + '"><div class="stageswitch__n">' + ROLE[k].name + '</div>' +
                '<div class="stageswitch__d">' + D.permDetail[k].length + ' 项能力</div></div>';
            }).join('') + '</div></div>' +
            '<div class="notice notice--warn">' + U.icon('alert', 13) +
            '<div>新增账号需由系统管理员在平台管理后台二次确认，本演示环境不实际写入数据。</div></div></div>',
          foot: '<button class="btn" data-close>取消</button><button class="btn btn--primary" data-act="ok">提交申请</button>'
        });
        const r = document.getElementById('modalRoot');
        r.querySelector('[data-act="ok"]').addEventListener('click', function () {
          U.toast('已提交账号申请', '待系统管理员确认后生效', 'info');
          r.innerHTML = '';
        });
      };
      add.addEventListener('click', h); handlers.push([add, h]);
    }
    /* 设备筛选 */
    const df = root.querySelector('#dv-filter');
    if (df) {
      const h = function (e) {
        const b = e.target.closest('button'); if (!b) return;
        df.querySelectorAll('button').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on'); devFilter = b.dataset.f; fillDevices(root);
      };
      df.addEventListener('click', h); handlers.push([df, h]);
    }
    const dq = root.querySelector('#dv-q');
    if (dq) {
      let t = null;
      const h = function () { clearTimeout(t); t = setTimeout(function () { devQ = dq.value.trim(); fillDevices(root); }, 200); };
      dq.addEventListener('input', h); handlers.push([dq, h]);
    }
    /* 设备卡片点击 */
    const grid = root.querySelector('.dev-grid');
    if (grid) {
      const h = function (e) {
        const c = e.target.closest('[data-dev]'); if (!c) return;
        const d = D.devices.find(function (x) { return x.id === c.dataset.dev; });
        if (d) openDevice(d);
      };
      grid.addEventListener('click', h); handlers.push([grid, h]);
    }
    /* 台账行点击 */
    const tb = root.querySelector('#dv-body');
    if (tb) {
      const h = function (e) {
        const tr = e.target.closest('tr[data-devrow]'); if (!tr) return;
        const d = D.devices.find(function (x) { return x.id === tr.dataset.devrow; });
        if (d) openDevice(d);
      };
      tb.addEventListener('click', h); handlers.push([tb, h]);
    }
  }

  function unmount() {
    handlers.forEach(function (h) { h[0].removeEventListener('click', h[1]); h[0].removeEventListener('input', h[1]); });
    handlers = [];
  }

  return {
    title: '用户与设备管理', code: 'M06', icon: 'gear',
    subtitle: '权限管理 · 设备台账 · 绑定与基础信息',
    render: render, mount: mount, unmount: unmount
  };
})();
