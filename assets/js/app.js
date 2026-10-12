/* ============================================================
   动量稳衡 · 应用外壳（导航 / 路由 / 主题 / 时钟）
   ============================================================ */
window.MLH = window.MLH || {};

MLH.app = (function () {
  'use strict';
  const U = MLH.ui;

  const ORDER = ['dashboard', 'monitor', 'patient', 'algorithm', 'alarm', 'admin'];
  const GROUPS = [
    { label: '总览', items: ['dashboard'] },
    { label: '运行监测', items: ['monitor'] },
    { label: '康复数据', items: ['patient'] },
    { label: '算法分析', items: ['algorithm'] },
    { label: '系统管理', items: ['alarm', 'admin'] }
  ];

  const context = { device: 'DMH-2025-017', role: '康复师 · 韩*敏' };
  let viewEl = null;
  let cur = null;
  let clockTimer = null;

  /* ---------- 侧边导航 ---------- */
  function buildNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = GROUPS.map(function (g) {
      return '<div class="nav__group"><div class="nav__label">' + g.label + '</div>' +
        g.items.map(function (k) {
          const v = MLH.views[k];
          const badgeCount = k === 'alarm' ? '<span class="nav__badge">' + MLH.data.alerts.filter(function (a) {
            return ['处理中', '待充电', '观察中'].indexOf(a.status) >= 0;
          }).length + '</span>' : '<span class="nav__code">' + v.code + '</span>';
          return '<a class="nav__item" data-key="' + k + '" href="#/' + k + '">' +
            U.icon(v.icon, 16) + '<span>' + v.title + '</span>' + badgeCount + '</a>';
        }).join('') + '</div>';
    }).join('');
  }

  /* ---------- 顶栏 ---------- */
  function buildTopbar() {
    const bar = document.getElementById('topbar');
    bar.innerHTML =
      '<div class="topbar__title"><h1 id="tb-title">—</h1><span id="tb-code">—</span></div>' +
      '<div class="topbar__spacer"></div>' +
      '<div class="topbar__field">' + U.icon('chip', 14) +
      '<label for="tb-dev">设备</label>' +
      '<select id="tb-dev">' +
      MLH.data.devices.slice(0, 4).map(function (d) {
        return '<option value="' + d.id + '"' + (d.id === context.device ? ' selected' : '') + '>' +
          d.id + ' · ' + d.model + '</option>';
      }).join('') + '</select></div>' +
      '<div class="livepill"><span class="dot dot--ok is-beating"></span>实时通道在线 · 50 Hz</div>' +
      '<div class="livepill" id="tb-clock">--:--:--</div>' +
      '<button class="iconbtn" id="tb-theme" title="切换深浅色（默认跟随当前主题）">' + U.icon('sun', 15) + '</button>' +
      '<button class="iconbtn" id="tb-refresh" title="刷新当前视图数据">' + U.icon('refresh', 15) + '</button>';

    bar.querySelector('#tb-dev').addEventListener('change', function (e) {
      context.device = e.target.value;
      U.toast('已切换监测设备', context.device + ' · 视图数据已同步', 'info');
      navigate(curKey(), true);
    });
    bar.querySelector('#tb-theme').addEventListener('click', function () {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
    bar.querySelector('#tb-refresh').addEventListener('click', function () {
      navigate(curKey(), true);
      U.toast('视图已刷新', '重新拉取最新一帧数据', 'ok');
    });
  }

  function startClock() {
    const n = document.getElementById('tb-clock');
    const tick = function () {
      const d = new Date();
      const p = function (x) { return x < 10 ? '0' + x : x; };
      n.textContent = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
        p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    };
    tick();
    clockTimer = setInterval(tick, 1000);
  }

  /* ---------- 主题 ---------- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    MLH.charts.setMode(t);
    const btn = document.getElementById('tb-theme');
    if (btn) btn.innerHTML = U.icon(t === 'dark' ? 'moon' : 'sun', 15);
    try { localStorage.setItem('mlh-theme', t); } catch (e) {}
    navigate(curKey(), true);
  }

  /* ---------- 路由 ---------- */
  function curKey() {
    const h = (location.hash || '').replace('#/', '').replace('#', '');
    return ORDER.indexOf(h) >= 0 ? h : ORDER[0];
  }

  function navigate(key, force) {
    const host = viewEl || document.getElementById('view');
    if (!force && key === cur && host.firstChild) return;
    const prev = cur && MLH.views[cur];
    if (prev && prev.unmount) prev.unmount();
    U.disposeAll();

    cur = key;
    const v = MLH.views[key];
    document.getElementById('tb-title').textContent = v.title;
    document.getElementById('tb-code').textContent = v.code + ' · ' + v.subtitle;
    document.querySelectorAll('.nav__item').forEach(function (n) {
      n.classList.toggle('is-active', n.dataset.key === key);
    });

    host.dataset.view = key;
    host.innerHTML = '';
    host.scrollTop = 0;
    v.render(host);
    v.mount(host);
  }

  /* ---------- 启动 ---------- */
  function boot() {
    viewEl = document.getElementById('view');
    /* 主题：默认浅色（与当前 IDE 主题一致）；?theme=dark 可直达深色，支持本地记忆 */
    let t = 'light';
    try { t = localStorage.getItem('mlh-theme') || 'light'; } catch (e) {}
    const m = /[?&]theme=(dark|light)/.exec(location.search || '');
    if (m) t = m[1];
    document.documentElement.dataset.theme = t;
    MLH.charts.setMode(t);
    MLH.charts.registerThemes();

    buildNav();
    buildTopbar();
    startClock();
    const btn = document.getElementById('tb-theme');
    if (btn) btn.innerHTML = U.icon(t === 'dark' ? 'moon' : 'sun', 15);

    /* 侧栏页脚 */
    const f = document.getElementById('side-foot');
    f.innerHTML = '<span>' + MLH.data.meta.version + '</span><span>' + MLH.data.meta.firmware + '</span>';

    /* 实时引擎 */
    MLH.live.start();

    window.addEventListener('hashchange', function () { navigate(curKey()); });
    let rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { U.resizeAll(); }, 140);
    });

    /* 键盘：数字键 1–6 快速切换模块 */
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const i = parseInt(e.key, 10);
      if (i >= 1 && i <= ORDER.length) { location.hash = '#/' + ORDER[i - 1]; }
    });

    navigate(curKey());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return { navigate: navigate, setTheme: setTheme, context: context, ORDER: ORDER };
})();
