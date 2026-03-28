/* ══════════════════════════════════════════════════════
   NIKHIL TRADING JOURNAL 2026 — app.js
   All logic: data, formulas, charts, CRUD, export
══════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────
   1. INITIAL DATA  (seeded from Excel – May 25 + July)
   Fields exactly mirror the Excel columns:
   Date, Stock Symbol, Entry Price, Stop Loss, SL Size,
   Exit Price, Points Captured/Lost, Trade Type,
   Target 1-4, Capital Invested, Percentage Return,
   Profit / Loss, Reason For Trade, Risk/Reward Ratio,
   System Based Objective
────────────────────────────────────────────────────── */
const SEED_TRADES = [
  {
    date: '2025-09-01',
    symbol: 'Nifty',
    entryPrice: 210,
    stopLoss: 172,
    exitPrice: 205,
    target1: 248, target2: 286, target3: 324, target4: 362,
    tradeType: 'Buy Trade',
    capital: 35000,
    reason: 'Setup Trade',
    objective: 'Loss but No SL Hit',
  },
  {
    date: '2025-09-03',
    symbol: 'Nifty',
    entryPrice: 188,
    stopLoss: 172,
    exitPrice: null,
    target1: 204, target2: 220, target3: 236, target4: 252,
    tradeType: 'Buy Trade',
    capital: 55000,
    reason: '',
    objective: 'Missed Case',
  },
  {
    date: '2026-03-25',
    symbol: 'Nifty',
    entryPrice: 100,
    stopLoss: 80,
    exitPrice: 80,
    target1: 120, target2: 140, target3: 160, target4: 180,
    tradeType: 'Buy Trade',
    capital: 10000,
    reason: '',
    objective: '',
  },
];

/* ──────────────────────────────────────────────────────
   2. DATA STORE  (localStorage-backed)
────────────────────────────────────────────────────── */
const STORE_KEY = 'nikhil_trades_2026';

function loadTrades() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return SEED_TRADES.map(t => ({ ...t }));
}

function saveTrades(trades) {
  localStorage.setItem(STORE_KEY, JSON.stringify(trades));
}

let trades = loadTrades();

/* ──────────────────────────────────────────────────────
   3. EXCEL FORMULAS  (replicated in JS)
   These exactly mirror the spreadsheet logic.
────────────────────────────────────────────────────── */

/** SL Size = Entry Price − Stop Loss (absolute) */
function calcSLSize(entry, sl) {
  if (!isNum(entry) || !isNum(sl)) return null;
  return Math.abs(entry - sl);
}

/** Points Captured / Lost = Exit Price − Entry Price
    If no exit → treated as stop-loss hit (exit = SL) or missing */
function calcPoints(entry, exit, sl) {
  if (!isNum(entry)) return null;
  const exitVal = isNum(exit) ? exit : (isNum(sl) ? sl : null);
  if (exitVal === null) return null;
  return exitVal - entry;
}

/** Profit / Loss = (Points / Entry) × Capital */
function calcProfitLoss(entry, exit, sl, capital) {
  const pts = calcPoints(entry, exit, sl);
  if (pts === null || !isNum(entry) || !isNum(capital) || entry === 0) return null;
  return (pts / entry) * capital;
}

/** Percentage Return = Points / Entry */
function calcPctReturn(entry, exit, sl) {
  const pts = calcPoints(entry, exit, sl);
  if (pts === null || !isNum(entry) || entry === 0) return null;
  return pts / entry;
}

/** Risk : Reward Ratio = (Target1 − Entry) / (Entry − SL)
    i.e. potential reward divided by risk */
function calcRR(entry, sl, target1) {
  if (!isNum(entry) || !isNum(sl) || !isNum(target1)) return null;
  const risk   = Math.abs(entry - sl);
  const reward = Math.abs(target1 - entry);
  if (risk === 0) return null;
  return reward / risk;
}

/** Derived: Win / Loss — win if P&L ≥ 0 */
function tradeResult(pnl) {
  if (pnl === null) return 'open';
  return pnl >= 0 ? 'win' : 'loss';
}

/** Enrich a raw trade object with all calculated fields */
function enrich(t) {
  const e  = t.entryPrice,
        sl = t.stopLoss,
        ex = t.exitPrice,
        c  = t.capital,
        t1 = t.target1;

  const slSize  = calcSLSize(e, sl);
  const points  = calcPoints(e, ex, sl);
  const pnl     = calcProfitLoss(e, ex, sl, c);
  const pct     = calcPctReturn(e, ex, sl);
  const rr      = calcRR(e, sl, t1);
  const result  = tradeResult(pnl);

  return { ...t, slSize, points, pnl, pct, rr, result };
}

function isNum(v) { return v !== null && v !== undefined && v !== '' && !isNaN(Number(v)); }

/* ──────────────────────────────────────────────────────
   4. FORMATTING HELPERS
────────────────────────────────────────────────────── */
const fmt = {
  currency(v, d = 0) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    const n = Number(v);
    const abs = Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: d });
    return (n < 0 ? '−₹' : '₹') + abs;
  },
  pct(v) {
    if (v === null || isNaN(v)) return '—';
    return (v * 100).toFixed(2) + '%';
  },
  num(v, d = 2) {
    if (v === null || isNaN(v)) return '—';
    return Number(v).toFixed(d);
  },
  date(s) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  },
  monthKey(s) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-IN', { month:'short', year:'numeric' });
  },
};

function pnlClass(v) {
  if (v === null || isNaN(v)) return '';
  return v > 0 ? 'pnl-pos' : v < 0 ? 'pnl-neg' : 'pnl-zero';
}

/* ──────────────────────────────────────────────────────
   5. CHART INSTANCES
────────────────────────────────────────────────────── */
const charts = {};

const CHART_DEFAULTS = {
  color: '#8a93a6',
  grid: '#1f2530',
  accent: '#00e5ff',
  green: '#00e676',
  red: '#ff3d71',
  orange: '#ffab40',
  purple: '#7b61ff',
};

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function chartFont() {
  return { family: "'Space Mono', monospace", size: 10 };
}

/* ──────────────────────────────────────────────────────
   6. DASHBOARD VIEW
────────────────────────────────────────────────────── */
function renderDashboard() {
  const rich = trades.map(enrich);

  /* KPIs */
  const totalPnl   = rich.reduce((a, t) => a + (t.pnl || 0), 0);
  const wins       = rich.filter(t => t.result === 'win').length;
  const losses     = rich.filter(t => t.result === 'loss').length;
  const total      = wins + losses;
  const winRate    = total > 0 ? wins / total : 0;
  const avgPnl     = total > 0 ? totalPnl / total : 0;
  const rrVals     = rich.map(t => t.rr).filter(v => v !== null);
  const avgRR      = rrVals.length ? rrVals.reduce((a,b) => a+b,0) / rrVals.length : 0;
  const totalCap   = rich.reduce((a, t) => a + (t.capital || 0), 0);

  setText('kpiPnl',    fmt.currency(totalPnl));
  setText('kpiWin',    fmt.pct(winRate));
  setText('kpiTrades', total);
  setText('kpiAvg',    fmt.currency(avgPnl));
  setText('kpiRR',     fmt.num(avgRR, 2));
  setText('kpiCap',    fmt.currency(totalCap));
  setText('sideCapital', fmt.currency(totalCap));

  setClass('kpiPnl', pnlClass(totalPnl));
  setClass('kpiAvg', pnlClass(avgPnl));

  /* Equity Curve */
  destroyChart('equityChart');
  let running = 0;
  const sorted = [...rich].filter(t => t.date).sort((a,b) => new Date(a.date)-new Date(b.date));
  const eqLabels = sorted.map(t => fmt.date(t.date));
  const eqData   = sorted.map(t => { running += (t.pnl||0); return +running.toFixed(2); });

  charts.equityChart = new Chart(document.getElementById('equityChart'), {
    type: 'line',
    data: {
      labels: eqLabels,
      datasets: [{
        label: 'Cumulative P&L (₹)',
        data: eqData,
        borderColor: CHART_DEFAULTS.accent,
        backgroundColor: 'rgba(0,229,255,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: CHART_DEFAULTS.accent,
      }]
    },
    options: chartOptions({ x_rotation: 30 }),
  });

  /* Win/Loss Donut */
  destroyChart('winLossChart');
  charts.winLossChart = new Chart(document.getElementById('winLossChart'), {
    type: 'doughnut',
    data: {
      labels: ['Win', 'Loss'],
      datasets: [{
        data: [wins, losses],
        backgroundColor: [CHART_DEFAULTS.green, CHART_DEFAULTS.red],
        borderColor: '#111418',
        borderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: CHART_DEFAULTS.color, font: chartFont() } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } },
      },
      cutout: '65%',
    }
  });

  /* P&L by Symbol */
  destroyChart('symbolChart');
  const bySymbol = {};
  rich.forEach(t => {
    if (!t.symbol) return;
    bySymbol[t.symbol] = (bySymbol[t.symbol] || 0) + (t.pnl || 0);
  });
  const symLabels = Object.keys(bySymbol);
  const symData   = Object.values(bySymbol);

  charts.symbolChart = new Chart(document.getElementById('symbolChart'), {
    type: 'bar',
    data: {
      labels: symLabels,
      datasets: [{
        label: 'P&L (₹)',
        data: symData,
        backgroundColor: symData.map(v => v >= 0 ? 'rgba(0,230,118,0.7)' : 'rgba(255,61,113,0.7)'),
        borderRadius: 4,
      }]
    },
    options: chartOptions({}),
  });

  /* Trade Type */
  destroyChart('typeChart');
  const byType = {};
  rich.forEach(t => {
    const k = t.tradeType || 'Unknown';
    byType[k] = (byType[k] || 0) + 1;
  });
  charts.typeChart = new Chart(document.getElementById('typeChart'), {
    type: 'pie',
    data: {
      labels: Object.keys(byType),
      datasets: [{
        data: Object.values(byType),
        backgroundColor: [CHART_DEFAULTS.accent, CHART_DEFAULTS.orange, CHART_DEFAULTS.purple],
        borderColor: '#111418', borderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: CHART_DEFAULTS.color, font: chartFont() } } },
    }
  });

  /* Monthly P&L */
  destroyChart('monthChart');
  const byMonth = {};
  rich.forEach(t => {
    const k = fmt.monthKey(t.date);
    byMonth[k] = (byMonth[k] || 0) + (t.pnl || 0);
  });
  charts.monthChart = new Chart(document.getElementById('monthChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(byMonth),
      datasets: [{
        label: 'Monthly P&L (₹)',
        data: Object.values(byMonth),
        backgroundColor: Object.values(byMonth).map(v => v >= 0 ? 'rgba(0,230,118,0.7)' : 'rgba(255,61,113,0.7)'),
        borderRadius: 4,
      }]
    },
    options: chartOptions({ x_rotation: 20 }),
  });

  renderRecentTable();
}

function renderRecentTable() {
  const q    = (document.getElementById('dashSearch')?.value || '').toLowerCase();
  const rich = trades.map((t, i) => ({ ...enrich(t), _i: i }));
  const filt = rich.filter(t =>
    !q || (t.symbol || '').toLowerCase().includes(q) ||
    (t.date || '').includes(q) ||
    (t.reason || '').toLowerCase().includes(q)
  );

  const tbody = document.getElementById('recentTbody');
  if (!tbody) return;
  tbody.innerHTML = filt.slice(-20).reverse().map((t, n) => tradeRow(t, n + 1)).join('');
}

/* ──────────────────────────────────────────────────────
   7. JOURNAL VIEW
────────────────────────────────────────────────────── */
const JOURNAL_PAGE = 15;
let journalPage = 1;

function renderJournal() {
  journalPage = 1;
  renderJournalPage();
  populateFilters();
}

function renderJournalPage() {
  const q       = (document.getElementById('journalSearch')?.value || '').toLowerCase();
  const fMonth  = document.getElementById('filterMonth')?.value  || '';
  const fSym    = document.getElementById('filterSymbol')?.value || '';
  const fResult = document.getElementById('filterResult')?.value || '';

  const rich = trades.map((t, i) => ({ ...enrich(t), _i: i }));

  const filt = rich.filter(t => {
    if (q && !(
      (t.symbol || '').toLowerCase().includes(q) ||
      (t.date || '').includes(q) ||
      (t.reason || '').toLowerCase().includes(q)
    )) return false;
    if (fMonth  && fmt.monthKey(t.date) !== fMonth)  return false;
    if (fSym    && t.symbol !== fSym)                return false;
    if (fResult && t.result !== fResult)             return false;
    return true;
  });

  const total  = filt.length;
  const pages  = Math.max(1, Math.ceil(total / JOURNAL_PAGE));
  if (journalPage > pages) journalPage = pages;

  const slice = filt.slice((journalPage - 1) * JOURNAL_PAGE, journalPage * JOURNAL_PAGE);

  const tbody = document.getElementById('journalTbody');
  if (!tbody) return;

  tbody.innerHTML = slice.map((t, n) => journalRow(t, (journalPage - 1) * JOURNAL_PAGE + n + 1)).join('');

  /* Pagination */
  const pg = document.getElementById('journalPagination');
  if (!pg) return;
  let html = '';
  for (let p = 1; p <= pages; p++) {
    html += `<button class="pg-btn${p === journalPage ? ' active' : ''}" onclick="goPage(${p})">${p}</button>`;
  }
  pg.innerHTML = html;
}

function goPage(p) { journalPage = p; renderJournalPage(); }

function populateFilters() {
  const months  = [...new Set(trades.map(t => fmt.monthKey(t.date)).filter(Boolean))];
  const symbols = [...new Set(trades.map(t => t.symbol).filter(Boolean))];

  const mSel = document.getElementById('filterMonth');
  const sSel = document.getElementById('filterSymbol');
  if (!mSel || !sSel) return;

  const curM = mSel.value, curS = sSel.value;

  mSel.innerHTML = '<option value="">All Months</option>' +
    months.map(m => `<option value="${m}"${m === curM ? ' selected' : ''}>${m}</option>`).join('');
  sSel.innerHTML = '<option value="">All Symbols</option>' +
    symbols.map(s => `<option value="${s}"${s === curS ? ' selected' : ''}>${s}</option>`).join('');
}

/* ──────────────────────────────────────────────────────
   8. ROW BUILDERS
────────────────────────────────────────────────────── */
function tradeRow(t, n) {
  const pnlCls = pnlClass(t.pnl);
  return `<tr>
    <td>${n}</td>
    <td>${fmt.date(t.date)}</td>
    <td><strong>${t.symbol || '—'}</strong></td>
    <td><span class="badge ${t.tradeType === 'Buy Trade' ? 'badge-buy' : 'badge-sell'}">${t.tradeType || '—'}</span></td>
    <td>${fmt.num(t.entryPrice)}</td>
    <td>${isNum(t.exitPrice) ? fmt.num(t.exitPrice) : '—'}</td>
    <td>${fmt.num(t.stopLoss)}</td>
    <td class="${pnlClass(t.points)}">${fmt.num(t.points)}</td>
    <td class="${pnlCls}">${fmt.currency(t.pnl)}</td>
    <td class="${pnlCls}">${fmt.pct(t.pct)}</td>
    <td>${fmt.currency(t.capital, 0)}</td>
    <td>${fmt.num(t.rr)}</td>
    <td>${t.reason || '—'}</td>
    <td><span class="badge ${t.result === 'win' ? 'badge-win' : t.result === 'loss' ? 'badge-loss' : ''}">${t.result || '—'}</span></td>
  </tr>`;
}

function journalRow(t, n) {
  const pnlCls = pnlClass(t.pnl);
  return `<tr>
    <td>${n}</td>
    <td>${fmt.date(t.date)}</td>
    <td><strong>${t.symbol || '—'}</strong></td>
    <td><span class="badge ${t.tradeType === 'Buy Trade' ? 'badge-buy' : 'badge-sell'}">${t.tradeType || '—'}</span></td>
    <td>${fmt.num(t.entryPrice)}</td>
    <td>${isNum(t.exitPrice) ? fmt.num(t.exitPrice) : '—'}</td>
    <td>${fmt.num(t.stopLoss)}</td>
    <td>${fmt.num(t.slSize)}</td>
    <td>${fmt.num(t.target1)}</td>
    <td>${fmt.num(t.target2)}</td>
    <td>${fmt.num(t.target3)}</td>
    <td>${fmt.num(t.target4)}</td>
    <td class="${pnlClass(t.points)}">${fmt.num(t.points)}</td>
    <td class="${pnlCls}">${fmt.currency(t.pnl)}</td>
    <td class="${pnlCls}">${fmt.pct(t.pct)}</td>
    <td>${fmt.currency(t.capital, 0)}</td>
    <td>${fmt.num(t.rr)}</td>
    <td>${t.reason || '—'}</td>
    <td><span class="badge ${t.result === 'win' ? 'badge-win' : t.result === 'loss' ? 'badge-loss' : ''}">${t.result || '—'}</span></td>
    <td>
      <button class="btn-edit" onclick="openEditView(${t._i})">Edit</button>
      <button class="btn-del"  onclick="deleteTrade(${t._i})">Del</button>
    </td>
  </tr>`;
}

/* ──────────────────────────────────────────────────────
   9. ADD / EDIT TRADE FORM
────────────────────────────────────────────────────── */
function openEditView(idx) {
  const t = trades[idx];
  if (!t) return;

  switchView('add', document.querySelector('[data-view="add"]'));
  setText('formTitle', 'Edit Trade');
  document.getElementById('editIndex').value = idx;

  setVal('fDate',      t.date || '');
  setVal('fSymbol',    t.symbol || '');
  setVal('fType',      t.tradeType || '');
  setVal('fCapital',   t.capital ?? '');
  setVal('fEntry',     t.entryPrice ?? '');
  setVal('fSL',        t.stopLoss ?? '');
  setVal('fExit',      t.exitPrice ?? '');
  setVal('fT1',        t.target1 ?? '');
  setVal('fT2',        t.target2 ?? '');
  setVal('fT3',        t.target3 ?? '');
  setVal('fT4',        t.target4 ?? '');
  setVal('fReason',    t.reason || '');
  setVal('fObjective', t.objective || '');

  calcPnl();
}

function cancelEdit() {
  clearForm();
  switchView('journal', document.querySelector('[data-view="journal"]'));
}

function clearForm() {
  ['fDate','fSymbol','fType','fCapital','fEntry','fSL','fExit',
   'fT1','fT2','fT3','fT4','fReason','fObjective'].forEach(id => setVal(id, ''));
  document.getElementById('editIndex').value = '-1';
  setText('formTitle', 'Add New Trade');
  ['calcSLSize','calcPoints','calcPnL','calcPct','calcRR'].forEach(id => setText(id, '—'));
}

function saveTrade() {
  const date   = getVal('fDate');
  const symbol = getVal('fSymbol').trim();
  const type   = getVal('fType');
  const cap    = parseFloat(getVal('fCapital'));
  const entry  = parseFloat(getVal('fEntry'));
  const sl     = parseFloat(getVal('fSL'));

  if (!date)   return showToast('Please enter a date.', 'error');
  if (!symbol) return showToast('Please enter a stock symbol.', 'error');
  if (!type)   return showToast('Please select a trade type.', 'error');
  if (isNaN(entry)) return showToast('Please enter a valid entry price.', 'error');
  if (isNaN(sl))    return showToast('Please enter a valid stop loss.', 'error');

  const trade = {
    date,
    symbol,
    tradeType: type,
    capital:    isNaN(cap) ? null : cap,
    entryPrice: entry,
    stopLoss:   sl,
    exitPrice:  parseFloat(getVal('fExit'))  || null,
    target1:    parseFloat(getVal('fT1'))    || null,
    target2:    parseFloat(getVal('fT2'))    || null,
    target3:    parseFloat(getVal('fT3'))    || null,
    target4:    parseFloat(getVal('fT4'))    || null,
    reason:     getVal('fReason'),
    objective:  getVal('fObjective'),
  };

  const idx = parseInt(document.getElementById('editIndex').value);

  if (idx >= 0) {
    trades[idx] = trade;
    showToast('Trade updated successfully!', 'success');
  } else {
    trades.push(trade);
    showToast('Trade added successfully!', 'success');
  }

  saveTrades(trades);
  clearForm();
  renderAll();
  switchView('journal', document.querySelector('[data-view="journal"]'));
}

function deleteTrade(idx) {
  if (!confirm('Delete this trade? This cannot be undone.')) return;
  trades.splice(idx, 1);
  saveTrades(trades);
  showToast('Trade deleted.', 'success');
  renderAll();
}

/* ──────────────────────────────────────────────────────
   10. LIVE CALCULATION (mirrors Excel formulas in form)
────────────────────────────────────────────────────── */
function calcPnl() {
  const entry  = parseFloat(getVal('fEntry'));
  const sl     = parseFloat(getVal('fSL'));
  const exit   = parseFloat(getVal('fExit'));
  const cap    = parseFloat(getVal('fCapital'));
  const t1     = parseFloat(getVal('fT1'));

  const slSize = calcSLSize(entry, sl);
  const points = calcPoints(entry, isNaN(exit) ? null : exit, isNaN(sl) ? null : sl);
  const pnl    = calcProfitLoss(entry, isNaN(exit) ? null : exit, isNaN(sl) ? null : sl, cap);
  const pct    = calcPctReturn(entry, isNaN(exit) ? null : exit, isNaN(sl) ? null : sl);
  const rr     = calcRR(entry, sl, t1);

  const slEl   = document.getElementById('calcSLSize');
  const ptEl   = document.getElementById('calcPoints');
  const pnlEl  = document.getElementById('calcPnL');
  const pctEl  = document.getElementById('calcPct');
  const rrEl   = document.getElementById('calcRR');

  if (slEl)  { slEl.textContent  = slSize  !== null ? fmt.num(slSize)   : '—'; }
  if (ptEl)  { ptEl.textContent  = points  !== null ? fmt.num(points)   : '—'; ptEl.style.color = points !== null ? (points >= 0 ? 'var(--green)' : 'var(--red)') : ''; }
  if (pnlEl) { pnlEl.textContent = pnl     !== null ? fmt.currency(pnl) : '—'; pnlEl.style.color = pnl !== null ? (pnl >= 0 ? 'var(--green)' : 'var(--red)') : ''; }
  if (pctEl) { pctEl.textContent = pct     !== null ? fmt.pct(pct)      : '—'; pctEl.style.color = pct !== null ? (pct >= 0 ? 'var(--green)' : 'var(--red)') : ''; }
  if (rrEl)  { rrEl.textContent  = rr      !== null ? fmt.num(rr)       : '—'; }
}

/* ──────────────────────────────────────────────────────
   11. ANALYTICS VIEW
────────────────────────────────────────────────────── */
function renderAnalytics() {
  const rich = trades.map(enrich);

  const wins       = rich.filter(t => t.result === 'win');
  const losses     = rich.filter(t => t.result === 'loss');
  const total      = wins.length + losses.length;
  const totalPnl   = rich.reduce((a, t) => a + (t.pnl||0), 0);
  const winRate    = total > 0 ? wins.length / total : 0;
  const avgWin     = wins.length  ? wins.reduce((a,t) => a+(t.pnl||0),0)  / wins.length  : 0;
  const avgLoss    = losses.length? losses.reduce((a,t) => a+(t.pnl||0),0)/ losses.length : 0;
  const rrVals     = rich.map(t=>t.rr).filter(v=>v!==null);
  const avgRR      = rrVals.length ? rrVals.reduce((a,b)=>a+b,0)/rrVals.length : 0;
  const maxWin     = wins.length   ? Math.max(...wins.map(t=>t.pnl))   : 0;
  const maxLoss    = losses.length ? Math.min(...losses.map(t=>t.pnl)) : 0;
  const totalCap   = rich.reduce((a,t)=>a+(t.capital||0),0);
  const expectancy = winRate * avgWin + (1-winRate) * avgLoss;

  /* Streak */
  let curStreak = 0, maxStreak = 0, cur = 0;
  rich.filter(t=>t.result !== 'open').forEach(t => {
    if (t.result === 'win') { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 0;
    curStreak = cur;
  });

  const statsData = [
    { label: 'Total Trades',     val: total,                  color: '' },
    { label: 'Win Rate',         val: fmt.pct(winRate),       color: winRate >= .5 ? 'var(--green)' : 'var(--red)' },
    { label: 'Total P&L',        val: fmt.currency(totalPnl), color: pnlColor(totalPnl) },
    { label: 'Avg Win',          val: fmt.currency(avgWin),   color: 'var(--green)' },
    { label: 'Avg Loss',         val: fmt.currency(avgLoss),  color: 'var(--red)' },
    { label: 'Avg R:R Ratio',    val: fmt.num(avgRR),         color: avgRR >= 1 ? 'var(--green)' : 'var(--orange)' },
    { label: 'Best Trade',       val: fmt.currency(maxWin),   color: 'var(--green)' },
    { label: 'Worst Trade',      val: fmt.currency(maxLoss),  color: 'var(--red)' },
    { label: 'Expectancy / Trade', val: fmt.currency(expectancy), color: pnlColor(expectancy) },
    { label: 'Max Win Streak',   val: maxStreak,              color: 'var(--accent)' },
    { label: 'Capital Deployed', val: fmt.currency(totalCap), color: '' },
    { label: 'Total Wins',       val: wins.length,            color: 'var(--green)' },
    { label: 'Total Losses',     val: losses.length,          color: 'var(--red)' },
    { label: 'Open Trades',      val: rich.filter(t=>t.result==='open').length, color: 'var(--orange)' },
  ];

  const grid = document.getElementById('statsGrid');
  if (grid) {
    grid.innerHTML = statsData.map(s => `
      <div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-val" style="color:${s.color || 'var(--text)'}">${s.val}</div>
      </div>`).join('');
  }

  /* Report Table */
  const tbody = document.getElementById('reportTbody');
  if (tbody) {
    const rows = [];
    for (let i = 0; i < statsData.length; i += 2) {
      const a = statsData[i], b = statsData[i+1] || {};
      rows.push(`<tr>
        <td>${a.label}</td>
        <td style="color:${a.color||'var(--text)'}">${a.val}</td>
        <td>${b.label||''}</td>
        <td style="color:${b.color||'var(--text)'}">${b.val||''}</td>
      </tr>`);
    }
    tbody.innerHTML = rows.join('');
  }

  /* Heatmap */
  renderHeatmap(rich);

  /* R:R Distribution */
  destroyChart('rrChart');
  const rrBuckets = [0, 0.5, 1, 1.5, 2, 2.5, 3];
  const rrCounts  = new Array(rrBuckets.length).fill(0);
  rrVals.forEach(v => {
    for (let i = rrBuckets.length - 1; i >= 0; i--) {
      if (v >= rrBuckets[i]) { rrCounts[i]++; break; }
    }
  });

  charts.rrChart = new Chart(document.getElementById('rrChart'), {
    type: 'bar',
    data: {
      labels: rrBuckets.map((b, i) => `${b}${i < rrBuckets.length-1 ? '–'+rrBuckets[i+1] : '+'}`),
      datasets: [{
        label: '# Trades',
        data: rrCounts,
        backgroundColor: 'rgba(0,229,255,0.6)',
        borderRadius: 4,
      }]
    },
    options: chartOptions({}),
  });
}

function pnlColor(v) {
  if (v > 0) return 'var(--green)';
  if (v < 0) return 'var(--red)';
  return '';
}

function renderHeatmap(rich) {
  const wrap = document.getElementById('heatmapWrap');
  if (!wrap) return;

  const byDate = {};
  rich.forEach(t => {
    if (!t.date) return;
    const k = t.date.substring(0, 10);
    byDate[k] = (byDate[k] || 0) + (t.pnl || 0);
  });

  const dates = Object.keys(byDate).sort();
  if (!dates.length) { wrap.innerHTML = '<div style="color:var(--text3);font-size:11px">No trade data for heatmap</div>'; return; }

  const vals = Object.values(byDate);
  const max  = Math.max(...vals.map(Math.abs)) || 1;

  wrap.innerHTML = dates.map(d => {
    const v   = byDate[d];
    const intensity = Math.min(1, Math.abs(v) / max);
    const bg  = v > 0
      ? `rgba(0,230,118,${0.15 + intensity * 0.7})`
      : v < 0
        ? `rgba(255,61,113,${0.15 + intensity * 0.7})`
        : 'rgba(255,255,255,0.05)';
    const label = fmt.date(d) + ': ' + fmt.currency(v);
    return `<div class="hm-day" style="background:${bg}">
      ${new Date(d).getDate()}
      <div class="hm-tip">${label}</div>
    </div>`;
  }).join('');
}

/* ──────────────────────────────────────────────────────
   12. CHART OPTIONS HELPER
────────────────────────────────────────────────────── */
function chartOptions({ x_rotation = 0 } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#181c23',
        borderColor: '#2a3040',
        borderWidth: 1,
        titleColor: '#e8eaf0',
        bodyColor: '#8a93a6',
        titleFont: chartFont(),
        bodyFont: chartFont(),
      }
    },
    scales: {
      x: {
        ticks: {
          color: CHART_DEFAULTS.color,
          font: chartFont(),
          maxRotation: x_rotation,
          minRotation: x_rotation,
        },
        grid: { color: CHART_DEFAULTS.grid },
      },
      y: {
        ticks: { color: CHART_DEFAULTS.color, font: chartFont() },
        grid: { color: CHART_DEFAULTS.grid },
      }
    }
  };
}

/* ──────────────────────────────────────────────────────
   13. EXPORT
────────────────────────────────────────────────────── */
function exportCSV() {
  const headers = [
    'Date','Symbol','Trade Type','Entry Price','Stop Loss','SL Size',
    'Exit Price','Points Captured/Lost','Target 1','Target 2','Target 3','Target 4',
    'Capital Invested','Profit/Loss','Percentage Return','R:R Ratio',
    'Reason For Trade','System Based Objective','Result'
  ];

  const rows = trades.map(t => {
    const r = enrich(t);
    return [
      r.date, r.symbol, r.tradeType, r.entryPrice, r.stopLoss,
      r.slSize !== null ? r.slSize.toFixed(2) : '',
      r.exitPrice ?? '',
      r.points !== null ? r.points.toFixed(2) : '',
      r.target1 ?? '', r.target2 ?? '', r.target3 ?? '', r.target4 ?? '',
      r.capital ?? '',
      r.pnl !== null ? r.pnl.toFixed(2) : '',
      r.pct !== null ? (r.pct * 100).toFixed(4) : '',
      r.rr  !== null ? r.rr.toFixed(2)  : '',
      r.reason ?? '', r.objective ?? '', r.result,
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(',');
  });

  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `trading_journal_nikhil_${today()}.csv`);
  showToast('CSV exported!', 'success');
}

function exportReport() {
  window.print();
}

function downloadBlob(blob, name) {
  const a  = document.createElement('a');
  a.href   = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function today() {
  return new Date().toISOString().substring(0, 10).replace(/-/g, '');
}

/* ──────────────────────────────────────────────────────
   14. VIEW ROUTING
────────────────────────────────────────────────────── */
const VIEW_TITLES = {
  dashboard: 'Dashboard',
  journal:   'Trade Journal',
  add:       'Add Trade',
  report:    'Analytics Report',
};

function switchView(name, navEl) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const v = document.getElementById(`view-${name}`);
  if (v) v.classList.add('active');

  const nav = navEl || document.querySelector(`[data-view="${name}"]`);
  if (nav) nav.classList.add('active');

  setText('topbarTitle', VIEW_TITLES[name] || name);

  // Close sidebar on mobile
  if (window.innerWidth < 900) {
    document.getElementById('sidebar').classList.remove('open');
  }

  // Trigger renders
  if (name === 'dashboard') renderDashboard();
  if (name === 'journal')   renderJournal();
  if (name === 'report')    renderAnalytics();

  return false;
}

/* ──────────────────────────────────────────────────────
   15. MODAL
────────────────────────────────────────────────────── */
function openModal(idx) {
  const t = enrich({ ...trades[idx], _i: idx });

  document.getElementById('modalTitle').textContent = `${t.symbol || '—'} — ${fmt.date(t.date)}`;

  const fields = [
    ['Date',             fmt.date(t.date)],
    ['Symbol',           t.symbol || '—'],
    ['Trade Type',       t.tradeType || '—'],
    ['Entry Price',      fmt.num(t.entryPrice)],
    ['Exit Price',       isNum(t.exitPrice) ? fmt.num(t.exitPrice) : '—'],
    ['Stop Loss',        fmt.num(t.stopLoss)],
    ['SL Size',          fmt.num(t.slSize)],
    ['Points',           fmt.num(t.points)],
    ['Profit / Loss',    fmt.currency(t.pnl)],
    ['% Return',         fmt.pct(t.pct)],
    ['Capital',          fmt.currency(t.capital)],
    ['R:R Ratio',        fmt.num(t.rr)],
    ['Target 1',         fmt.num(t.target1)],
    ['Target 2',         fmt.num(t.target2)],
    ['Target 3',         fmt.num(t.target3)],
    ['Target 4',         fmt.num(t.target4)],
    ['Reason',           t.reason || '—'],
    ['Objective/Notes',  t.objective || '—'],
  ];

  document.getElementById('modalBody').innerHTML =
    `<div class="modal-body-grid">${fields.map(([l,v]) =>
      `<div class="modal-field">
        <div class="modal-field-label">${l}</div>
        <div class="modal-field-val">${v}</div>
      </div>`).join('')}</div>`;

  document.getElementById('modalDeleteBtn').onclick = () => { closeModal(); deleteTrade(idx); };
  document.getElementById('modalEditBtn').onclick   = () => { closeModal(); openEditView(idx); };

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

/* ──────────────────────────────────────────────────────
   16. SIDEBAR TOGGLE
────────────────────────────────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ──────────────────────────────────────────────────────
   17. TOAST
────────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ──────────────────────────────────────────────────────
   18. DOM HELPERS
────────────────────────────────────────────────────── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setClass(id, cls) {
  const el = document.getElementById(id);
  if (el) { el.className = ''; if (cls) el.classList.add(cls); }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

/* ──────────────────────────────────────────────────────
   19. RENDER ALL  (called after any data change)
────────────────────────────────────────────────────── */
function renderAll() {
  const active = document.querySelector('.view.active');
  if (!active) return;
  const name = active.id.replace('view-', '');
  if (name === 'dashboard') renderDashboard();
  if (name === 'journal')   renderJournal();
  if (name === 'report')    renderAnalytics();
}

/* ──────────────────────────────────────────────────────
   20. INIT
────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Set today's date as default in form
  const today_ = new Date().toISOString().substring(0, 10);
  const fDate  = document.getElementById('fDate');
  if (fDate) fDate.value = today_;

  // Initial render
  renderDashboard();
  populateFilters();
});