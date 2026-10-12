/* ============================================================
   动量稳衡 · UI 基础件
   图标 / 卡片 / 指标卡 / 表格 / 徽标 / 通知 / 弹层 / 表单件
   ============================================================ */
window.MLH = window.MLH || {};
MLH.ui = (function () {
  'use strict';

  /* ---------- 图标（1.6 描边，currentColor） ---------- */
  const PATHS = {
    dashboard: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="4.5" rx="1.5"/><rect x="13.5" y="10.5" width="7.5" height="10.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    pulse: '<path d="M2 12h4l2.2-6 3.1 12L14 9.6l1.6 2.4H22"/>',
    users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.6 20.4a6.6 6.6 0 0 1 12.8 0"/><path d="M17 5.4a3.2 3.2 0 0 1 0 6.2"/><path d="M18.4 20.4a6.4 6.4 0 0 0-2.6-5"/>',
    chip: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><path d="M10 3.2v3.3M14 3.2v3.3M10 17.5v3.3M14 17.5v3.3M3.2 10h3.3M3.2 14h3.3M17.5 10h3.3M17.5 14h3.3"/>',
    bell: '<path d="M6.6 9.6a5.4 5.4 0 0 1 10.8 0c0 4.1 1.8 5.4 1.8 5.4H4.8s1.8-1.3 1.8-5.4Z"/><path d="M10.2 18.6a2 2 0 0 0 3.6 0"/>',
    sliders: '<path d="M4 7h11M18.5 7H20M4 17h3.5M11 17h9"/><circle cx="16.2" cy="7" r="2.2"/><circle cx="8.7" cy="17" r="2.2"/>',
    download: '<path d="M12 3.4v11.2"/><path d="M7.6 10.2 12 14.6l4.4-4.4"/><path d="M4 17.2v1.9A1.9 1.9 0 0 0 5.9 21h12.2A1.9 1.9 0 0 0 20 19.1v-1.9"/>',
    refresh: '<path d="M20.2 12a8.2 8.2 0 1 1-2.6-6"/><path d="M20.6 4.2v5.2h-5.2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.2M12 19.2v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.4 19.6 6 18M18 6l1.6-1.6"/>',
    moon: '<path d="M20 14.4A8.3 8.3 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z"/>',
    check: '<path d="M4.8 12.6 9.6 17.4 19.2 6.6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M6 12h12"/>',
    alert: '<path d="M12 3.6 21 19.4H3L12 3.6Z"/><path d="M12 9.6v4.2M12 16.6v.9"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.9v.9"/>',
    wifi: '<path d="M2.4 8.6a14 14 0 0 1 19.2 0"/><path d="M5.8 12.2a9.2 9.2 0 0 1 12.4 0"/><path d="M9 15.6a4.6 4.6 0 0 1 6 0"/><circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none"/>',
    battery: '<rect x="2.4" y="7.4" width="16" height="9.2" rx="2.2"/><path d="M21.2 10.6v2.8"/><rect x="4.6" y="9.6" width="8" height="4.8" rx="1" fill="currentColor" stroke="none"/>',
    thermometer: '<path d="M13.4 13.6V5.2a2.4 2.4 0 0 0-4.8 0v8.4a4.4 4.4 0 1 0 4.8 0Z"/><path d="M11 9.4v6.2"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.4"/><path d="M15.6 15.6 20.4 20.4"/>',
    filter: '<path d="M3.6 5.4h16.8L14.2 12v6.2l-4.4 2.4V12L3.6 5.4Z"/>',
    up: '<path d="M12 19.4V5M6.2 10.8 12 5l5.8 5.8"/>',
    down: '<path d="M12 4.6V19M17.8 13.2 12 19l-5.8-5.8"/>',
    play: '<path d="M7.4 4.8 19 12 7.4 19.2V4.8Z"/>',
    pause: '<path d="M9 4.8v14.4M15 4.8v14.4"/>',
    shield: '<path d="M12 3.2 20 6v6c0 5-3.4 7.6-8 8.8-4.6-1.2-8-3.8-8-8.8V6l8-2.8Z"/><path d="M9 12l2.2 2.2L15.4 10"/>',
    target: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
    zap: '<path d="M13.4 3 5.6 13.2h5l-.6 7.8 7.8-10.2h-5l.6-7.8Z"/>',
    wind: '<path d="M3.4 8.6h11a2.6 2.6 0 1 0-2.6-2.6"/><path d="M3.4 15.4h8a2.6 2.6 0 1 1-2.6 2.6"/><path d="M17.4 12h3.2"/>',
    ruler: '<rect x="2.6" y="8.4" width="18.8" height="7.2" rx="1.4"/><path d="M7 8.4v3M11 8.4v4.4M15 8.4v3M19 8.4v4.4"/>',
    link: '<path d="M9.6 14.4 14.4 9.6"/><path d="M12.6 6.6l1.4-1.4a3.6 3.6 0 0 1 5.1 5.1l-1.4 1.4"/><path d="M11.4 17.4l-1.4 1.4a3.6 3.6 0 0 1-5.1-5.1l1.4-1.4"/>',
    file: '<path d="M14 3.4H7a2 2 0 0 0-2 2v13.2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.4l-5-5Z"/><path d="M13.8 3.6v4.8H19"/>',
    calendar: '<rect x="3.4" y="5" width="17.2" height="15.6" rx="2"/><path d="M3.4 9.6h17.2M8.4 3.2v3.6M15.6 3.2v3.6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.6v2.3M12 19.1v2.3M4.4 4.4l1.7 1.7M17.9 17.9l1.7 1.7M2.6 12h2.3M19.1 12h2.3M4.4 19.6 6.1 17.9M17.9 6.1l1.7-1.7"/>',
    route: '<circle cx="6" cy="6.4" r="2.6"/><circle cx="18" cy="17.6" r="2.6"/><path d="M8.6 6.4h5.2a4 4 0 0 1 0 8h-3.6a4 4 0 0 0 0 3.2"/>',
    wave: '<path d="M2.6 12c1.6-4.4 3.2-4.4 4.8 0s3.2 4.4 4.8 0 3.2-4.4 4.8 0 3.2 4.4 4.8 0"/>',
    rotate: '<path d="M20.4 12a8.4 8.4 0 1 1-3-6.4"/><path d="M20.6 4v5h-5"/>',
    layers: '<path d="M12 3.2 3.4 7.6 12 12l8.6-4.4L12 3.2Z"/><path d="M3.4 12.4 12 16.8l8.6-4.4M3.4 16.6 12 21l8.6-4.4"/>',
    scale: '<path d="M12 4.2v15.6M7 19.8h10"/><path d="M4 8.4h16M6.4 8.4 4 14.2h4.8L6.4 8.4ZM17.6 8.4 15.2 14.2H20l-2.4-5.8Z"/>'
  };
  function icon(name, size, sw) {
    const d = PATHS[name] || PATHS.info;
    const s = size || 16;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" ' +
      'stroke="currentColor" stroke-width="' + (sw || 1.6) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  /* ---------- DOM helpers ---------- */
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n, p) {
    if (n == null || isNaN(n)) return '—';
    const v = Number(n);
    return v.toLocaleString('zh-CN', { minimumFractionDigits: p == null ? 0 : p, maximumFractionDigits: p == null ? 0 : p });
  }

  /* ---------- 结构件 ---------- */
  function section(title, desc, right) {
    return '<div class="section__head"><h2>' + esc(title) + '</h2>' +
      (desc ? '<p>' + desc + '</p>' : '') +
      (right ? '<div style="flex:1"></div>' + right : '') + '</div>';
  }

  function card(o) {
    const oo = o || {};
    let head = '';
    if (oo.title || oo.right) {
      head = '<div class="card__head">' +
        (oo.icon ? '<span style="color:var(--cyan-600);display:flex">' + icon(oo.icon, 15) + '</span>' : '') +
        (oo.title ? '<h3>' + esc(oo.title) + '</h3>' : '') +
        (oo.sub ? '<span class="sub">' + oo.sub + '</span>' : '') +
        '<span class="spacer"></span>' + (oo.right || '') + '</div>';
    }
    const bodyCls = 'card__body' + (oo.flush ? ' card__body--flush' : '');
    return '<div class="card' + (oo.cls ? ' ' + oo.cls : '') + '">' + head +
      '<div class="' + bodyCls + '"' + (oo.bodyId ? ' id="' + oo.bodyId + '"' : '') + '>' + (oo.body || '') + '</div>' +
      (oo.foot ? '<div class="card__foot">' + oo.foot + '</div>' : '') + '</div>';
  }

  function kpi(o) {
    return '<div class="kpi' + (o.tone ? ' kpi--' + o.tone : '') + '">' +
      '<div class="kpi__label">' + (o.icon ? icon(o.icon, 13) : '') + esc(o.label) + '</div>' +
      '<div class="kpi__value"><span class="kpi__num" data-kpi="' + esc(o.key || '') + '">' + o.value + '</span>' +
      (o.unit ? '<span class="kpi__unit">' + esc(o.unit) + '</span>' : '') + '</div>' +
      (o.sparkId ? '<div class="kpi__spark" id="' + o.sparkId + '"></div>' : '') +
      '<div class="kpi__foot">' + (o.foot || '') + '</div></div>';
  }

  function delta(v, unit, goodDown) {
    const dir = v > 0 ? 'up' : (v < 0 ? 'down' : 'flat');
    const cls = v === 0 ? 'delta--flat' : (goodDown ? (v > 0 ? 'delta--up' : 'delta--down') : (v > 0 ? 'delta--down' : 'delta--up'));
    const ic = v > 0 ? icon('up', 11) : (v < 0 ? icon('down', 11) : '');
    return '<span class="delta ' + cls + '">' + ic + (v > 0 ? '+' : '') + v + (unit || '') + '</span>';
  }

  function badge(text, tone, withDot) {
    return '<span class="badge badge--' + (tone || 'neutral') + '">' +
      (withDot ? '<span class="dot dot--' + (tone === 'danger' ? 'danger' : tone === 'warn' ? 'warn' : 'ok') + '" style="width:6px;height:6px;box-shadow:none"></span>' : '') +
      esc(text) + '</span>';
  }

  function statusBadge(status) {
    const map = {
      online: ['在线', 'ok'], offline: ['离线', 'neutral'],
      maintain: ['维护中', 'warn'], warn: ['告警', 'danger'], pending: ['待激活', 'info']
    };
    const m = map[status] || ['未知', 'neutral'];
    return badge(m[0], m[1], true);
  }

  function meter(pct, tone) {
    return '<div class="minibar"><div class="minibar__track"><div class="minibar__fill' +
      (tone ? ' minibar__fill--' + tone : '') + '" style="width:' + Math.max(0, Math.min(100, pct)) + '%"></div></div>' +
      '<span class="mono" style="font-size:10.5px;color:var(--muted)">' + Math.round(pct) + '%</span></div>';
  }

  function avatar(name, i) {
    const tones = ['', 'avatar--cyan', 'avatar--warn', 'avatar--violet', 'avatar--ok'];
    return '<span class="avatar ' + tones[i % tones.length] + '">' + esc(String(name).replace(/[^一-龥A-Za-z0-9]/g, '').slice(-1) || '?') + '</span>';
  }

  function stageBadge(key, name) {
    const tone = key === 'acute' ? 'danger' : (key === 'recover' ? 'warn' : 'ok');
    return badge(name, tone);
  }

  /* ---------- 通知 ---------- */
  function toast(title, msg, tone, ms) {
    let host = document.querySelector('.toaster');
    if (!host) { host = el('div', 'toaster'); document.body.appendChild(host); }
    const n = el('div', 'toast' + (tone ? ' toast--' + tone : ''),
      '<div class="toast__t">' + esc(title) + '</div>' + (msg ? '<div class="toast__m">' + esc(msg) + '</div>' : ''));
    host.appendChild(n);
    setTimeout(function () {
      n.style.transition = 'opacity .24s, transform .24s';
      n.style.opacity = '0'; n.style.transform = 'translateX(14px)';
      setTimeout(function () { n.remove(); }, 260);
    }, ms || 3200);
  }

  /* ---------- 弹层 ---------- */
  function modal(o) {
    let root = document.getElementById('modalRoot');
    root.innerHTML = '<div class="modal" data-modal><div class="modal__panel" role="dialog" aria-modal="true">' +
      '<div class="modal__head">' + (o.icon ? '<span style="color:var(--cyan-600);display:flex">' + icon(o.icon, 17) + '</span>' : '') +
      '<h3>' + esc(o.title) + '</h3><span class="spacer" style="flex:1"></span>' +
      '<button class="iconbtn" data-close aria-label="关闭">' + icon('x', 14) + '</button></div>' +
      '<div class="modal__body">' + o.body + '</div>' +
      '<div class="modal__foot">' + (o.foot || '<button class="btn" data-close>关闭</button>') + '</div>' +
      '</div></div>';
    root.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', close);
    });
    root.querySelector('[data-modal]').addEventListener('click', function (e) {
      if (e.target === this) close();
    });
    document.addEventListener('keydown', onEsc);
    function onEsc(e) { if (e.key === 'Escape') close(); }
    function close() {
      root.innerHTML = '';
      document.removeEventListener('keydown', onEsc);
    }
    return { close: close, root: root };
  }

  /* ---------- 导出 ---------- */
  function downloadCSV(filename, rows) {
    const bom = '\uFEFF';
    const body = rows.map(function (r) {
      return r.map(function (c) {
        const s = String(c == null ? '' : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\r\n');
    const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  /* ---------- ECharts 生命周期 ---------- */
  const charts = [];
  function mountChart(node, optionFn, key) {
    if (!node) return null;
    const inst = echarts.init(node, 'mlh-' + MLH.charts.mode(), { renderer: 'canvas' });
    inst.setOption(optionFn());
    charts.push({ inst: inst, fn: optionFn, node: node, key: key });
    return inst;
  }
  function disposeAll() {
    charts.forEach(function (c) { c.inst.dispose(); });
    charts.length = 0;
  }
  function rebuildAll() {
    charts.forEach(function (c) {
      c.inst.setOption(c.fn(), true);
    });
  }
  function resizeAll() {
    charts.forEach(function (c) { c.inst.resize(); });
  }

  return {
    icon: icon, el: el, esc: esc, fmt: fmt,
    section: section, card: card, kpi: kpi, delta: delta, badge: badge,
    statusBadge: statusBadge, meter: meter, avatar: avatar, stageBadge: stageBadge,
    toast: toast, modal: modal, downloadCSV: downloadCSV,
    mountChart: mountChart, disposeAll: disposeAll, rebuildAll: rebuildAll, resizeAll: resizeAll
  };
})();
