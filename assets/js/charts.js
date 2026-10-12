/* ============================================================
   动量稳衡 · 图表引擎
   ECharts 主题注册 + 各类图表配置工厂
   ============================================================ */
window.MLH = window.MLH || {};
MLH.charts = (function () {
  'use strict';

  const MONO = '"IBM Plex Mono","Cascadia Mono",Consolas,monospace';
  const SANS = '"Source Han Sans SC","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
  const STACK = MONO + ',' + SANS;

  const THEMES = {
    light: {
      ink: '#0B2E5C', ink2: '#24405F', soft: '#4B6480', muted: '#7B8CA4',
      grid: '#E4EBF3', split: '#E8EEF5', axis: '#AEBBCE',
      surface: '#FFFFFF', panel: '#EEF3F8', noise: '#ADBCCB',
      series: ['#0B2E5C', '#00A9B8', '#FF7A45', '#6B5BD2', '#1E9E6A', '#C9A227', '#7B8CA4'],
      soft_: {
        primary: 'rgba(11,46,92,0.14)', cyan: 'rgba(0,169,184,0.16)',
        warn: 'rgba(255,122,69,0.16)', violet: 'rgba(107,91,210,0.16)',
        ok: 'rgba(30,158,106,0.16)', gold: 'rgba(201,162,39,0.18)'
      }
    },
    dark: {
      ink: '#E8EFF8', ink2: '#C6D5E6', soft: '#9DB0C8', muted: '#7688A0',
      grid: '#1E3350', split: '#182B45', axis: '#2A4467',
      surface: '#0E1B2E', panel: '#13243B', noise: '#3C5068',
      series: ['#4E8AD8', '#2FD3E0', '#FF9260', '#9C8DF5', '#34C48A', '#E0BB4E', '#7688A0'],
      soft_: {
        primary: 'rgba(78,138,216,0.20)', cyan: 'rgba(47,211,224,0.20)',
        warn: 'rgba(255,146,96,0.20)', violet: 'rgba(156,141,245,0.20)',
        ok: 'rgba(52,196,138,0.20)', gold: 'rgba(224,187,78,0.22)'
      }
    }
  };

  let current = 'light';
  function pal() { return THEMES[current]; }
  function setMode(m) { current = (m === 'dark') ? 'dark' : 'light'; }
  function mode() { return current; }

  /* 注册 ECharts 主题（浅/深两套） */
  function registerThemes() {
    ['light', 'dark'].forEach(function (name) {
      const p = THEMES[name];
      echarts.registerTheme('mlh-' + name, {
        color: p.series,
        backgroundColor: 'transparent',
        textStyle: { fontFamily: STACK, color: p.soft },
        title: {
          textStyle: { color: p.ink, fontFamily: STACK, fontSize: 12, fontWeight: 700 },
          subtextStyle: { color: p.muted, fontFamily: MONO, fontSize: 10 }
        },
        legend: {
          textStyle: { color: p.soft, fontFamily: STACK, fontSize: 10.5 },
          itemWidth: 9, itemHeight: 9, itemGap: 12
        },
        tooltip: {
          backgroundColor: p.surface,
          borderColor: name === 'dark' ? '#2A4467' : '#C6D2E1',
          borderWidth: 1,
          padding: [8, 10],
          extraCssText: 'box-shadow:0 8px 24px rgba(11,46,92,.16);border-radius:3px;',
          textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 }
        },
        categoryAxis: axisBase(p),
        valueAxis: axisBase(p, true),
        timeAxis: axisBase(p),
        line: { symbolSize: 5, smooth: false, lineStyle: { width: 1.6 } },
        bar: { itemStyle: { barBorderRadius: 0 } },
        pie: { itemStyle: { borderColor: p.surface, borderWidth: 2 } }
      });
    });
  }

  function axisBase(p, split) {
    return {
      axisLine: { show: true, lineStyle: { color: p.grid, width: 1 } },
      axisTick: { show: false },
      axisLabel: { color: p.muted, fontFamily: MONO, fontSize: 10 },
      splitLine: split ? { show: true, lineStyle: { color: p.split, type: [3, 3], width: 1 } } : { show: false },
      splitArea: { show: false }
    };
  }

  /* ---------- 通用骨架 ---------- */
  function base(o) {
    const p = pal();
    const opt = {
      animationDuration: 420,
      animationEasing: 'cubicOut',
      textStyle: { fontFamily: STACK, color: p.soft, fontSize: 11 },
      grid: { left: 6, right: 10, top: 26, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: p.surface,
        borderColor: current === 'dark' ? '#2A4467' : '#C6D2E1',
        borderWidth: 1,
        padding: [8, 10],
        confine: true,
        textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 },
        axisPointer: {
          type: 'line',
          lineStyle: { color: p.axis, width: 1, type: [4, 3] },
          crossStyle: { color: p.axis }
        }
      },
      xAxis: Object.assign({ type: 'category', boundaryGap: true }, axisBase(p, false)),
      yAxis: Object.assign({ type: 'value', scale: false }, axisBase(p, true))
    };
    return Object.assign(opt, o || {});
  }
  function catAxis(data, o) {
    const p = pal();
    return Object.assign({ type: 'category', data: data, boundaryGap: true }, axisBase(p, false), o || {});
  }
  function valAxis(o) {
    const p = pal();
    return Object.assign({ type: 'value' }, axisBase(p, true), o || {});
  }
  function line(name, data, color, o) {
    return Object.assign({
      name: name, type: 'line', data: data, showSymbol: false,
      lineStyle: { width: 1.8, color: color },
      itemStyle: { color: color },
      emphasis: { focus: 'series' }
    }, o || {});
  }
  function bar(name, data, color, o) {
    return Object.assign({
      name: name, type: 'bar', data: data,
      itemStyle: { color: color, borderRadius: [2, 2, 0, 0] },
      barMaxWidth: 22
    }, o || {});
  }

  /* ============================================================
     工厂
     ============================================================ */

  /* 7 天康复数据总览：柱=训练时长, 折线=失衡预警 */
  function trend7(d) {
    const p = pal();
    return base({
      grid: { left: 6, right: 6, top: 34, bottom: 2, containLabel: true },
      legend: { data: ['训练时长', '失衡预警'], right: 0, top: 0, icon: 'roundRect' },
      xAxis: catAxis(d.days, {
        boundaryGap: true,
        axisLabel: {
          color: p.muted, fontFamily: MONO, fontSize: 10,
          formatter: function (v, i) { return v + '\n' + d.weekday[i]; },
          lineHeight: 14
        }
      }),
      yAxis: [
        valAxis({ name: '小时', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO }, splitLine: { lineStyle: { color: p.split, type: [3, 3] } } }),
        valAxis({ name: '次', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO }, splitLine: { show: false } })
      ],
      series: [
        bar('训练时长', d.hours, p.series[0], {
          itemStyle: { color: p.series[0], borderRadius: [3, 3, 0, 0], opacity: 0.92 },
          barMaxWidth: 26
        }),
        line('失衡预警', d.imbalance, p.series[2], {
          yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 6, showSymbol: true,
          lineStyle: { width: 2.2, color: p.series[2] },
          areaStyle: { color: p.soft_.warn }
        })
      ]
    });
  }

  /* 迷你火花线 */
  function spark(data, color, o) {
    const p = pal();
    return {
      animationDuration: 300,
      grid: { left: 0, right: 0, top: 2, bottom: 0 },
      xAxis: { type: 'category', show: false, boundaryGap: false, data: data.map(function (_, i) { return i; }) },
      yAxis: { type: 'value', show: false, scale: true },
      series: [{
        type: 'line', data: data, showSymbol: false, smooth: true,
        lineStyle: { width: 1.6, color: color || p.series[1] },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: (color || p.series[1]) + '3D' },
              { offset: 1, color: (color || p.series[1]) + '00' }
            ]
          }
        }
      }],
      tooltip: { show: false }
    };
  }

  /* 训练人次 / 新增患者 双柱 */
  function dailyBars(d) {
    const p = pal();
    return base({
      legend: { data: ['训练人次', '新增建档'], right: 0, top: 0, icon: 'roundRect' },
      yAxis: valAxis(),
      xAxis: catAxis(d.days),
      series: [
        bar('训练人次', d.sessions, p.series[0], { barMaxWidth: 14, itemStyle: { color: p.series[0], borderRadius: [2, 2, 0, 0] } }),
        bar('新增建档', d.newPatients, p.series[1], { barMaxWidth: 14, itemStyle: { color: p.series[1], borderRadius: [2, 2, 0, 0] } })
      ]
    });
  }

  /* 姿态稳定性 (RMSE 下降) */
  function stability(d) {
    const p = pal();
    return base({
      grid: { left: 6, right: 30, top: 22, bottom: 2, containLabel: true },
      yAxis: valAxis({ name: '°', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO }, max: 2, min: 1 }),
      xAxis: catAxis(d.days),
      series: [{
        name: '姿态偏移 RMSE', type: 'line', data: d.stability, smooth: true,
        symbol: 'circle', symbolSize: 7, showSymbol: true,
        lineStyle: { width: 2.4, color: p.series[4] },
        itemStyle: { color: p.series[4], borderColor: p.surface, borderWidth: 2 },
        areaStyle: { color: p.soft_.ok },
        label: { show: true, position: 'top', color: p.soft, fontFamily: MONO, fontSize: 10 },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: p.muted, type: [4, 3], width: 1 },
          label: { formatter: '目标 ≤1.2°', color: p.muted, fontSize: 9.5, fontFamily: MONO, position: 'insideEndTop' },
          data: [{ yAxis: 1.2 }]
        }
      }]
    });
  }

  /* 设备在线状态环 */
  function deviceDonut(k) {
    const p = pal();
    return {
      animationDuration: 500,
      tooltip: { trigger: 'item', backgroundColor: p.surface, borderColor: p.grid, textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 } },
      series: [{
        type: 'pie', radius: ['62%', '86%'], center: ['50%', '52%'], avoidLabelOverlap: true,
        itemStyle: { borderColor: p.surface, borderWidth: 2 },
        label: { show: false }, labelLine: { show: false },
        data: [
          { value: k.devices.online, name: '在线', itemStyle: { color: p.series[1] } },
          { value: k.devices.offline, name: '离线', itemStyle: { color: p.series[6] } },
          { value: k.devices.maintain, name: '维护中', itemStyle: { color: p.series[2] } },
          { value: k.devices.pending, name: '待激活', itemStyle: { color: p.grid } }
        ]
      }]
    };
  }

  /* 患者康复轨迹：BBS 折线 + RMSE 面积（双轴） */
  function patientTrend(pt) {
    const p = pal(), s = pt.series;
    return base({
      grid: { left: 6, right: 6, top: 30, bottom: 2, containLabel: true },
      legend: { data: ['BBS 平衡量表', '姿态偏移 RMSE'], right: 0, top: 0, icon: 'roundRect' },
      tooltip: {
        trigger: 'axis', confine: true, backgroundColor: p.surface, borderColor: p.grid,
        textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 }
      },
      xAxis: catAxis(s.weeks, { boundaryGap: false }),
      yAxis: [
        valAxis({ name: 'BBS', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO }, min: 15, max: 56 }),
        valAxis({ name: '°', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO }, max: 4, min: 0, splitLine: { show: false } })
      ],
      series: [
        line('BBS 平衡量表', s.bbs, p.series[1], {
          smooth: true, symbol: 'circle', symbolSize: 6, showSymbol: true,
          lineStyle: { width: 2.4, color: p.series[1] },
          itemStyle: { color: p.series[1] },
          areaStyle: { color: p.soft_.cyan },
          markLine: {
            silent: true, symbol: 'none',
            lineStyle: { color: p.series[4], type: [4, 3], width: 1 },
            label: { formatter: '跌倒低风险 45', color: p.series[4], fontSize: 9.5, fontFamily: MONO, position: 'insideEndTop' },
            data: [{ yAxis: 45 }]
          }
        }),
        line('姿态偏移 RMSE', s.rmse, p.series[2], {
          yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 5,
          lineStyle: { width: 1.8, color: p.series[2], type: [6, 3] },
          itemStyle: { color: p.series[2] }
        })
      ]
    });
  }

  /* 失衡发生频次（每千次训练动作） */
  function imbalanceFreq(pt) {
    const p = pal(), s = pt.series;
    const avg = s.imb.map(function (v, i) {
      let sum = 0, c = 0;
      for (let j = Math.max(0, i - 2); j <= i; j++) { sum += s.imb[j]; c++; }
      return +(sum / c).toFixed(2);
    });
    return base({
      grid: { left: 6, right: 8, top: 30, bottom: 2, containLabel: true },
      legend: { data: ['失衡频次', '3 周移动均值'], right: 0, top: 0, icon: 'roundRect' },
      xAxis: catAxis(s.weeks),
      yAxis: valAxis({ name: '次/千次', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO } }),
      series: [
        bar('失衡频次', s.imb, p.series[2], {
          barMaxWidth: 20,
          itemStyle: { color: p.series[2], borderRadius: [3, 3, 0, 0], opacity: 0.82 }
        }),
        line('3 周移动均值', avg, p.series[0], { smooth: true, symbol: 'none', lineStyle: { width: 2, color: p.series[0] } })
      ]
    });
  }

  /* 三阶段康复指标对比（分组柱） */
  function stageCompare(stages) {
    const p = pal();
    const dims = [
      { k: 'rmse', name: '姿态偏移 RMSE', unit: '°' },
      { k: 'sway', name: '躯干摆幅', unit: '°' },
      { k: 'recover', name: '失衡恢复耗时', unit: 's' },
      { k: 'imbalance', name: '失衡频次', unit: '‰' },
      { k: 'stability', name: '稳定度评分', unit: '' }
    ];
    return base({
      grid: { left: 6, right: 12, top: 34, bottom: 2, containLabel: true },
      legend: { data: stages.map(function (s) { return s.name; }), right: 0, top: 0, icon: 'roundRect' },
      tooltip: {
        trigger: 'axis', confine: true, backgroundColor: p.surface, borderColor: p.grid,
        textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 }
      },
      xAxis: catAxis(dims.map(function (d) { return d.name; }), {
        axisLabel: { color: p.muted, fontFamily: SANS, fontSize: 10, interval: 0, width: 62, overflow: 'break' }
      }),
      yAxis: valAxis({ name: '归一化指数', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO }, max: 100 }),
      series: stages.map(function (s, i) {
        return bar(s.name, dims.map(function (d) {
          if (d.k === 'stability') return s.idx.stability;
          // 其余指标越小越好，转换为“改善指数”
          const maxV = Math.max.apply(null, stages.map(function (x) { return x.idx[d.k]; }));
          return Math.round((1 - s.idx[d.k] / (maxV * 1.06)) * 70 + 30);
        }), p.series[i], {
          barMaxWidth: 18,
          itemStyle: { color: p.series[i], borderRadius: [2, 2, 0, 0], opacity: 0.9 }
        });
      })
    });
  }

  /* 复查雷达：三阶段 */ 
  function stageRadar(stages) {
    const p = pal();
    return {
      animationDuration: 480,
      legend: { data: stages.map(function (s) { return s.name; }), bottom: 0, icon: 'roundRect', textStyle: { color: p.soft, fontSize: 10.5, fontFamily: SANS } },
      tooltip: { backgroundColor: p.surface, borderColor: p.grid, textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 } },
      radar: {
        center: ['50%', '46%'], radius: '62%',
        indicator: [
          { name: '矫正力度', max: 100 }, { name: '约束强度', max: 100 },
          { name: '安全裕度', max: 100 }, { name: '训练负荷', max: 100 },
          { name: '自主空间', max: 100 }
        ],
        axisName: { color: p.soft, fontFamily: SANS, fontSize: 10 },
        axisLine: { lineStyle: { color: p.grid } },
        splitLine: { lineStyle: { color: p.split, type: [3, 3] } },
        splitArea: { areaStyle: { color: ['transparent'] } }
      },
      series: [{
        type: 'radar', symbolSize: 4,
        data: stages.map(function (s, i) {
          return {
            name: s.name, value: [s.idx.rmse * 22, s.idx.stability, 100 - s.idx.imbalance * 4, s.idx.bbs * 1.6, s.idx.stability * 1.05].map(function (v) { return Math.max(8, Math.min(100, Math.round(v))); }),
            lineStyle: { width: 1.8, color: p.series[i] },
            itemStyle: { color: p.series[i] },
            areaStyle: { color: p.soft_[['warn', 'cyan', 'ok'][i]] || p.soft_.primary }
          };
        })
      }]
    };
  }

  /* 卡尔曼滤波前后对比 */
  function kalmanCompare(k, opts) {
    const p = pal(), o = opts || {};
    const zoom = o.zoom || 0;                            // 0=全程, 1=前段放大
    const rng = zoom ? [0, 160] : [0, k.t.length - 1];
    const slice = function (a) { return a.slice(rng[0], rng[1] + 1); };
    return base({
      grid: { left: 6, right: 12, top: 34, bottom: 2, containLabel: true },
      legend: {
        data: ['原始 IMU 信号', '自适应 UKF 输出', '参考真值'],
        right: 0, top: 0, icon: 'roundRect'
      },
      xAxis: Object.assign(catAxis(slice(k.t), { boundaryGap: false }), {
        axisLabel: { color: p.muted, fontFamily: MONO, fontSize: 10, formatter: function (v) { return v + 's'; } }
      }),
      yAxis: valAxis({ name: '倾角 °', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO } }),
      series: [
        line('原始 IMU 信号', slice(k.raw), p.noise, {
          lineStyle: { width: 1, color: p.noise, opacity: 0.9 }, symbol: 'none', z: 1
        }),
        line('参考真值', slice(k.truth), p.muted, {
          lineStyle: { width: 1.2, color: p.muted, type: [5, 4] }, symbol: 'none', z: 2
        }),
        line('自适应 UKF 输出', slice(k.fused), p.series[1], {
          lineStyle: { width: 2.2, color: p.series[1] }, symbol: 'none', z: 3,
          areaStyle: { color: p.soft_.cyan }
        })
      ]
    });
  }

  /* 滤波残差（误差带） */
  function kalmanResidual(k) {
    const p = pal();
    const t = [], r = [];
    for (let i = 0; i < k.t.length; i++) {
      t.push(k.t[i]);
      r.push(+(k.raw[i] - k.fused[i]).toFixed(3));
    }
    return base({
      grid: { left: 6, right: 12, top: 24, bottom: 2, containLabel: true },
      legend: { data: ['原始信号残差', '滤波后残差'], right: 0, top: 0, icon: 'roundRect' },
      xAxis: catAxis(t, { boundaryGap: false, axisLabel: { color: p.muted, fontFamily: MONO, fontSize: 10, formatter: function (v) { return v + 's'; } } }),
      yAxis: valAxis({ name: '误差 °', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO } }),
      series: [
        line('原始信号残差', r, p.series[2], { symbol: 'none', lineStyle: { width: 1, color: p.series[2], opacity: 0.55 }, z: 1 }),
        line('滤波后残差', k.fused.map(function (v, i) { return +(v - k.truth[i]).toFixed(3); }), p.series[4], {
          symbol: 'none', lineStyle: { width: 1.8, color: p.series[4] }, z: 2, areaStyle: { color: p.soft_.ok }
        })
      ]
    });
  }

  /* 自适应 PID 参数整程时序（含阶段背景带） */
  function pidSeries(run) {
    const p = pal();
    const last = run.t.length - 1;
    // 阶段分界取真实类别值，确保 markArea 在类目轴上精确对齐
    const bands = [
      { i0: 0, i1: Math.round(last * 0.2), c: p.soft_.warn, name: '急性期' },
      { i0: Math.round(last * 0.2), i1: Math.round(last * 0.65), c: p.soft_.cyan, name: '恢复期' },
      { i0: Math.round(last * 0.65), i1: last, c: p.soft_.ok, name: '巩固期' }
    ];
    return base({
      grid: { left: 6, right: 12, top: 34, bottom: 20, containLabel: true },
      legend: { data: ['Kp', 'Ki', 'Kd'], right: 0, top: 0, icon: 'roundRect' },
      tooltip: {
        trigger: 'axis', confine: true, backgroundColor: p.surface, borderColor: p.grid,
        textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 },
        formatter: function (ps) {
          const st = run.stageBand[ps[0].dataIndex];
          const nm = ['急性期', '恢复期', '巩固期'][st];
          let s = '<b>' + ps[0].axisValue + ' min</b>　<span style="opacity:.7">' + nm + '</span><br/>';
          ps.forEach(function (q) { s += q.marker + ' ' + q.seriesName + '：<b>' + q.data + '</b><br/>'; });
          return s;
        }
      },
      xAxis: Object.assign(catAxis(run.t, { boundaryGap: false }), {
        axisLabel: { color: p.muted, fontFamily: MONO, fontSize: 10, interval: 29, formatter: function (v) { return v + 'm'; } }
      }),
      yAxis: valAxis({ name: '增益', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO }, max: 4 }),
      series: [
        Object.assign(line('Kp', run.kp, p.series[0], {
          symbol: 'none', lineStyle: { width: 2.2, color: p.series[0] },
          markArea: {
            silent: true,
            label: { color: p.muted, fontSize: 10, fontFamily: SANS, position: 'insideTop' },
            data: bands.map(function (b) {
              return [
                { xAxis: run.t[b.i0], name: b.name, itemStyle: { color: b.c }, label: { color: p.soft } },
                { xAxis: run.t[b.i1] }
              ];
            })
          }
        })),
        Object.assign(line('Ki', run.ki, p.series[1], { symbol: 'none', lineStyle: { width: 1.8, color: p.series[1] } })),
        Object.assign(line('Kd', run.kd, p.series[2], { symbol: 'none', lineStyle: { width: 1.8, color: p.series[2], type: [6, 3] } }))
      ]
    });
  }

  /* 响应延迟分布直方 */
  function latencyHist(h) {
    const p = pal();
    return base({
      grid: { left: 6, right: 10, top: 22, bottom: 2, containLabel: true },
      xAxis: catAxis(h.buckets, { axisLabel: { color: p.muted, fontFamily: MONO, fontSize: 10, interval: 0, rotate: 0 } }),
      yAxis: valAxis({ name: '样本数', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO } }),
      series: [{
        type: 'bar', data: h.counts, barMaxWidth: 30,
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: function (q) {
            const i = q.dataIndex;
            return i < 3 ? p.series[1] : (i < 5 ? p.series[0] : p.series[2]);
          }
        },
        label: { show: true, position: 'top', color: p.muted, fontFamily: MONO, fontSize: 9.5 },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: p.series[4], type: [4, 3] },
          label: { formatter: 'P95 142ms', color: p.series[4], fontSize: 9.5, fontFamily: MONO },
          data: [{ xAxis: h.buckets[5] }]
        }
      }]
    });
  }

  /* 多梯度初始倾角收敛曲线（可高亮单条） */
  function gradient(g, hi) {
    const p = pal();
    return base({
      grid: { left: 6, right: 14, top: 34, bottom: 2, containLabel: true },
      legend: { data: g.rows.map(function (r) { return r.angle + '°'; }), right: 0, top: 0, icon: 'roundRect', itemGap: 10 },
      tooltip: {
        trigger: 'axis', confine: true, backgroundColor: p.surface, borderColor: p.grid,
        textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 },
        formatter: function (ps) {
          let s = '<b>' + ps[0].axisValue + ' s</b><br/>';
          ps.forEach(function (q) { s += q.marker + ' ' + q.seriesName + '：<b>' + q.data + '°</b><br/>'; });
          return s;
        }
      },
      xAxis: Object.assign(catAxis(g.x, { boundaryGap: false }), {
        axisLabel: { color: p.muted, fontFamily: MONO, fontSize: 10, formatter: function (v) { return v + 's'; } }
      }),
      yAxis: valAxis({ name: '姿态倾角 °', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO }, max: 32 }),
      series: g.rows.map(function (r, i) {
        const on = hi == null || hi === r.angle;
        return line(r.angle + '°', r.series, p.series[i], {
          symbol: 'none',
          lineStyle: { width: on ? (hi === r.angle ? 2.6 : 1.7) : 1, color: p.series[i], opacity: on ? 1 : 0.24 },
          itemStyle: { color: p.series[i], opacity: on ? 1 : 0.3 },
          z: hi === r.angle ? 5 : 2
        });
      })
    });
  }

  /* 倾角 - 收敛耗时 散点 + 拟合 */
  function angleCost(g) {
    const p = pal();
    const pts = g.rows.map(function (r, i) { return { value: [r.angle, r.cost], idx: i }; });
    // 线性回归
    const n = pts.length;
    const sx = pts.reduce(function (a, b) { return a + b.value[0]; }, 0);
    const sy = pts.reduce(function (a, b) { return a + b.value[1]; }, 0);
    const sxy = pts.reduce(function (a, b) { return a + b.value[0] * b.value[1]; }, 0);
    const sxx = pts.reduce(function (a, b) { return a + b.value[0] * b.value[0]; }, 0);
    const k = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const b0 = (sy - k * sx) / n;
    const yhat = pts.map(function (q) { return k * q.value[0] + b0; });
    const ybar = sy / n;
    const sst = pts.reduce(function (a, q) { return a + Math.pow(q.value[1] - ybar, 2); }, 0);
    const sse = pts.reduce(function (a, q, i) { return a + Math.pow(q.value[1] - yhat[i], 2); }, 0);
    const r2 = 1 - sse / sst;
    const xs = [4, 32];
    return base({
      grid: { left: 6, right: 14, top: 26, bottom: 2, containLabel: true },
      tooltip: {
        trigger: 'item', backgroundColor: p.surface, borderColor: p.grid,
        textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 },
        formatter: function (q) {
          if (q.seriesType === 'scatter') return q.data.value[0] + '° → 收敛 <b>' + q.data.value[1] + ' s</b>';
          return q.seriesName;
        }
      },
      xAxis: Object.assign(valAxis({ name: '初始倾角 °', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO }, min: 3, max: 33 }), { type: 'value' }),
      yAxis: valAxis({ name: '收敛耗时 s', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO } }),
      series: [
        {
          name: '工况实测', type: 'scatter', data: pts, symbolSize: 12,
          itemStyle: { color: p.series[1], borderColor: p.surface, borderWidth: 2 },
          label: {
            show: true, position: 'right', color: p.muted, fontFamily: MONO, fontSize: 9.5,
            formatter: function (q) { return q.data.value[0] + '°'; }
          }
        },
        {
          name: '线性拟合 (R²=' + r2.toFixed(3) + ')', type: 'line', showSymbol: false,
          data: xs.map(function (x) { return [x, +(k * x + b0).toFixed(2)]; }),
          lineStyle: { width: 1.6, color: p.series[0], type: [6, 4] }, itemStyle: { color: p.series[0] }
        }
      ]
    });
  }

  /* 30 天告警堆叠 */
  function alarm30(a) {
    const p = pal();
    return base({
      grid: { left: 6, right: 10, top: 30, bottom: 2, containLabel: true },
      legend: { data: ['姿态超限', '设备异常', '通信异常', '电源预警', '参数调整'], right: 0, top: 0, icon: 'roundRect', itemGap: 10 },
      xAxis: catAxis(a.days, { axisLabel: { color: p.muted, fontFamily: MONO, fontSize: 9.5, interval: 4 } }),
      yAxis: valAxis({ name: '条', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO } }),
      series: [
        { name: '姿态超限', type: 'bar', stack: 'a', data: a.pos,  itemStyle: { color: p.series[2] }, barMaxWidth: 16 },
        { name: '设备异常', type: 'bar', stack: 'a', data: a.dev,  itemStyle: { color: p.series[0] }, barMaxWidth: 16 },
        { name: '通信异常', type: 'bar', stack: 'a', data: a.comm, itemStyle: { color: p.series[3] }, barMaxWidth: 16 },
        { name: '电源预警', type: 'bar', stack: 'a', data: a.power,itemStyle: { color: p.series[5] }, barMaxWidth: 16 },
        { name: '参数调整', type: 'bar', stack: 'a', data: a.param,itemStyle: { color: p.series[1] }, barMaxWidth: 16 }
      ]
    });
  }

  /* 性能能力雷达 */
  function perfRadar() {
    const p = pal();
    return {
      animationDuration: 480,
      tooltip: { backgroundColor: p.surface, borderColor: p.grid, textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 } },
      legend: { data: ['本项目稳衡系统', '常规单一 PID 方案'], bottom: 0, icon: 'roundRect', textStyle: { color: p.soft, fontSize: 10.5, fontFamily: SANS } },
      radar: {
        center: ['50%', '46%'], radius: '64%',
        indicator: [
          { name: '响应速度', max: 100 }, { name: '姿态精度', max: 100 },
          { name: '抗扰能力', max: 100 }, { name: '平稳性', max: 100 },
          { name: '自适应', max: 100 }, { name: '能效', max: 100 }
        ],
        axisName: { color: p.soft, fontFamily: SANS, fontSize: 10 },
        axisLine: { lineStyle: { color: p.grid } },
        splitLine: { lineStyle: { color: p.split, type: [3, 3] } },
        splitArea: { areaStyle: { color: ['transparent'] } }
      },
      series: [{
        type: 'radar', symbolSize: 4,
        data: [
          {
            name: '本项目稳衡系统', value: [92, 90, 93, 88, 96, 84],
            lineStyle: { width: 2, color: p.series[1] }, itemStyle: { color: p.series[1] },
            areaStyle: { color: p.soft_.cyan }
          },
          {
            name: '常规单一 PID 方案', value: [58, 62, 46, 48, 30, 62],
            lineStyle: { width: 1.6, color: p.series[6], type: [5, 4] }, itemStyle: { color: p.series[6] },
            areaStyle: { color: 'rgba(123,140,164,0.10)' }
          }
        ]
      }]
    };
  }

  /* 力矩跟踪误差散点云（控制品质） */
  function torqueTrack(seed) {
    const p = pal(), r = MLH.data.rng(seed || 5150), pts = [];
    for (let i = 0; i < 120; i++) {
      const cmd = +(0.04 + r() * 0.40).toFixed(3);
      const err = (r() - 0.5) * (0.008 + cmd * 0.11);
      pts.push([+cmd.toFixed(3), +(cmd + err).toFixed(3)]);
    }
    return base({
      grid: { left: 6, right: 12, top: 24, bottom: 2, containLabel: true },
      tooltip: {
        trigger: 'item', backgroundColor: p.surface, borderColor: p.grid,
        textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 },
        formatter: function (q) { return '指令 ' + q.data[0] + ' N·m<br/>实际 <b>' + q.data[1] + ' N·m</b>'; }
      },
      xAxis: valAxis({ name: '指令力矩 N·m', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO } }),
      yAxis: valAxis({ name: '实际力矩 N·m', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO } }),
      series: [
        {
          type: 'scatter', data: pts, symbolSize: 6,
          itemStyle: { color: p.series[1], opacity: 0.55 }
        },
        {
          type: 'line', showSymbol: false, data: [[0.04, 0.04], [0.46, 0.46]],
          lineStyle: { width: 1.4, color: p.series[2], type: [5, 4] }, itemStyle: { color: p.series[2] },
          tooltip: { show: false }
        }
      ]
    });
  }

  /* 训练剂量 vs 稳定度（散点，观察依从性关系） */
  function doseScatter(patients) {
    const p = pal();
    return base({
      grid: { left: 6, right: 16, top: 24, bottom: 2, containLabel: true },
      tooltip: {
        trigger: 'item', backgroundColor: p.surface, borderColor: p.grid,
        textStyle: { color: p.ink2, fontFamily: STACK, fontSize: 11.5 },
        formatter: function (q) {
          const d = q.data;
          return '<b>' + d[3] + '</b><br/>周均训练 ' + d[0] + ' h<br/>稳定度 ' + d[1] + '<br/>失衡频次 ' + d[2] + ' ‰';
        }
      },
      xAxis: valAxis({ name: '周均训练时长 h', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO } }),
      yAxis: valAxis({ name: '稳定度评分', nameTextStyle: { color: p.muted, fontSize: 10, fontFamily: MONO }, min: 55, max: 100 }),
      series: [{
        type: 'scatter',
        symbolSize: function (d) { return 10 + d[2] * 1.1; },
        data: patients.map(function (x) {
          return [+(x.hours / 12).toFixed(2), x.stability, x.imbalancePer1k, x.name];
        }),
        itemStyle: {
          color: function (q) {
            const s = patients[q.dataIndex].stage;
            return s === 'acute' ? p.series[2] : (s === 'recover' ? p.series[1] : p.series[4]);
          },
          opacity: 0.8, borderColor: p.surface, borderWidth: 1.5
        }
      }]
    });
  }

  return {
    registerThemes: registerThemes, setMode: setMode, mode: mode, pal: pal,
    MONO: MONO, SANS: SANS, STACK: STACK,
    trend7: trend7, spark: spark, dailyBars: dailyBars, stability: stability,
    deviceDonut: deviceDonut, patientTrend: patientTrend, imbalanceFreq: imbalanceFreq,
    stageCompare: stageCompare, stageRadar: stageRadar,
    kalmanCompare: kalmanCompare, kalmanResidual: kalmanResidual,
    pidSeries: pidSeries, latencyHist: latencyHist, gradient: gradient,
    angleCost: angleCost, alarm30: alarm30, perfRadar: perfRadar,
    torqueTrack: torqueTrack, doseScatter: doseScatter
  };
})();
