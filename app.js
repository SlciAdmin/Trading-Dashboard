'use strict';

/* ═══ SEED DATA ═══ */
const SEED_TRADES = [
  { date:'2025-09-01', symbol:'Nifty',     entryPrice:210, stopLoss:172, exitPrice:205,  target1:248, target2:286, target3:324, target4:362, tradeType:'Buy Trade',  capital:35000, reason:'Setup Trade',   objective:'Loss but No SL Hit' },
  { date:'2025-09-03', symbol:'Nifty',     entryPrice:188, stopLoss:172, exitPrice:null, target1:204, target2:220, target3:236, target4:252, tradeType:'Buy Trade',  capital:55000, reason:'',              objective:'Missed Case' },
  { date:'2025-09-10', symbol:'BankNifty', entryPrice:450, stopLoss:420, exitPrice:510,  target1:480, target2:510, target3:540, target4:570, tradeType:'Buy Trade',  capital:40000, reason:'Breakout Setup', objective:'Clean breakout above resistance' },
  { date:'2025-09-15', symbol:'BankNifty', entryPrice:500, stopLoss:520, exitPrice:480,  target1:460, target2:440, target3:420, target4:400, tradeType:'Sell Trade', capital:30000, reason:'Resistance Test', objective:'Short from supply zone' },
  { date:'2025-10-02', symbol:'Nifty',     entryPrice:300, stopLoss:275, exitPrice:340,  target1:325, target2:350, target3:375, target4:400, tradeType:'Buy Trade',  capital:50000, reason:'Support Bounce', objective:'Strong support level, bought dip' },
  { date:'2025-10-10', symbol:'Reliance',  entryPrice:2800,stopLoss:2750,exitPrice:2900, target1:2850,target2:2900,target3:2950,target4:3000,tradeType:'Buy Trade',  capital:60000, reason:'Momentum',      objective:'Strong trend continuation' },
  { date:'2025-10-20', symbol:'Reliance',  entryPrice:2920,stopLoss:2960,exitPrice:2870, target1:2870,target2:2820,target3:2770,target4:2720,tradeType:'Sell Trade', capital:45000, reason:'Distribution',   objective:'Topping pattern near resistance' },
  { date:'2025-11-05', symbol:'Nifty',     entryPrice:350, stopLoss:325, exitPrice:400,  target1:375, target2:400, target3:425, target4:450, tradeType:'Buy Trade',  capital:55000, reason:'Trend Pullback', objective:'Bought pullback in uptrend' },
  { date:'2025-11-15', symbol:'Nifty',     entryPrice:390, stopLoss:410, exitPrice:355,  target1:360, target2:330, target3:300, target4:270, tradeType:'Sell Trade', capital:40000, reason:'Failed Breakout','objective':'Short after failed breakout attempt' },
  { date:'2025-12-01', symbol:'BankNifty', entryPrice:480, stopLoss:455, exitPrice:530,  target1:505, target2:530, target3:555, target4:580, tradeType:'Buy Trade',  capital:50000, reason:'Gap Fill',       objective:'Gap up morning, held above EMA' },
  { date:'2025-12-12', symbol:'TCS',       entryPrice:3500,stopLoss:3450,exitPrice:3600, target1:3550,target2:3600,target3:3650,target4:3700,tradeType:'Buy Trade',  capital:35000, reason:'Earnings Play',  objective:'Pre earnings momentum trade' },
  { date:'2025-12-20', symbol:'TCS',       entryPrice:3580,stopLoss:3620,exitPrice:3510, target1:3530,target2:3480,target3:3430,target4:3380,tradeType:'Sell Trade', capital:28000, reason:'Post Earnings',  objective:'Sell the news after earnings pop' },
  { date:'2026-01-08', symbol:'Nifty',     entryPrice:400, stopLoss:375, exitPrice:450,  target1:425, target2:450, target3:475, target4:500, tradeType:'Buy Trade',  capital:60000, reason:'New Year Rally', objective:'Strong opening of year, rode momentum' },
  { date:'2026-01-22', symbol:'BankNifty', entryPrice:510, stopLoss:490, exitPrice:480,  target1:530, target2:550, target3:570, target4:590, tradeType:'Buy Trade',  capital:45000, reason:'Level Test',     objective:'Expected bounce, got stopped out' },
  { date:'2026-02-05', symbol:'Nifty',     entryPrice:420, stopLoss:400, exitPrice:480,  target1:440, target2:460, target3:480, target4:500, tradeType:'Buy Trade',  capital:50000, reason:'Budget Play',    objective:'Pre budget accumulation, hit T3' },
  { date:'2026-02-18', symbol:'Reliance',  entryPrice:3050,stopLoss:3020,exitPrice:3100, target1:3080,target2:3110,target3:3140,target4:3170,tradeType:'Buy Trade',  capital:40000, reason:'Sector Rotation',objective:'Energy sector buying, clean setup' },
  { date:'2026-03-05', symbol:'Nifty',     entryPrice:460, stopLoss:440, exitPrice:445,  target1:480, target2:500, target3:520, target4:540, tradeType:'Buy Trade',  capital:55000, reason:'Breakout Attempt',objective:'Failed breakout, stopped out near SL' },
  { date:'2026-03-15', symbol:'BankNifty', entryPrice:540, stopLoss:515, exitPrice:590,  target1:565, target2:590, target3:615, target4:640, tradeType:'Buy Trade',  capital:60000, reason:'Momentum Trade', objective:'Strong momentum, ran to T2' },
  { date:'2026-03-25', symbol:'Nifty',     entryPrice:100, stopLoss:80,  exitPrice:80,   target1:120, target2:140, target3:160, target4:180, tradeType:'Buy Trade',  capital:10000, reason:'',               objective:'' },
];

const STORE_KEY = 'tradevault_v2';

function loadTrades() {
  try { const r = localStorage.getItem(STORE_KEY); if (r) return JSON.parse(r); } catch(e){}
  return SEED_TRADES.map(t => ({...t}));
}
function saveTrades(d) { localStorage.setItem(STORE_KEY, JSON.stringify(d)); }
let trades = loadTrades();

/* ═══ FORMULAS ═══ */
function isNum(v) { return v !== null && v !== undefined && v !== '' && !isNaN(Number(v)); }

function calcSLSize(e, sl) {
  if (!isNum(e) || !isNum(sl)) return null;
  return Math.abs(e - sl);
}
function calcPoints(e, ex, sl) {
  if (!isNum(e)) return null;
  const ev = isNum(ex) ? Number(ex) : (isNum(sl) ? Number(sl) : null);
  if (ev === null) return null;
  return ev - Number(e);
}
function calcProfitLoss(e, ex, sl, cap) {
  const pts = calcPoints(e, ex, sl);
  if (pts === null || !isNum(e) || !isNum(cap) || Number(e) === 0) return null;
  return (pts / Number(e)) * Number(cap);
}
function calcPctReturn(e, ex, sl) {
  const pts = calcPoints(e, ex, sl);
  if (pts === null || !isNum(e) || Number(e) === 0) return null;
  return pts / Number(e);
}
function calcRR(e, sl, t1) {
  if (!isNum(e) || !isNum(sl) || !isNum(t1)) return null;
  const risk = Math.abs(Number(e) - Number(sl));
  const reward = Math.abs(Number(t1) - Number(e));
  if (risk === 0) return null;
  return reward / risk;
}
function tradeResult(pnl) {
  if (pnl === null) return 'open';
  return pnl >= 0 ? 'win' : 'loss';
}
function enrich(t) {
  const {entryPrice:e, stopLoss:sl, exitPrice:ex, capital:c, target1:t1} = t;
  const slSize = calcSLSize(e,sl);
  const points = calcPoints(e,ex,sl);
  const pnl    = calcProfitLoss(e,ex,sl,c);
  const pct    = calcPctReturn(e,ex,sl);
  const rr     = calcRR(e,sl,t1);
  const result = tradeResult(pnl);
  return {...t, slSize, points, pnl, pct, rr, result};
}

/* ═══ TARGET CALCULATION (Excel Style - AUTO) ═══ */
function calcTargets(entry, sl, tradeType) {
  if (!isNum(entry) || !isNum(sl)) {
    return { t1: null, t2: null, t3: null, t4: null };
  }
  const e = Number(entry), s = Number(sl);
  const risk = Math.abs(e - s);
  const isBuy = tradeType === 'Buy Trade';
  return {
    t1: isBuy ? e + risk : e - risk,
    t2: isBuy ? e + 2 * risk : e - 2 * risk,
    t3: isBuy ? e + 3 * risk : e - 3 * risk,
    t4: isBuy ? e + 4 * risk : e - 4 * risk
  };
}

/* ═══ FORMATTERS ═══ */
const fmt = {
  currency(v, d=0) {
    if (v===null||v===undefined||isNaN(v)) return '—';
    const n=Number(v), abs=Math.abs(n).toLocaleString('en-IN',{maximumFractionDigits:d});
    return (n<0?'−₹':'₹')+abs;
  },
  pct(v) { if (v===null||isNaN(v)) return '—'; return (v*100).toFixed(2)+'%'; },
  num(v,d=2) { if (v===null||isNaN(v)) return '—'; return Number(v).toFixed(d); },
  date(s) {
    if (!s) return '—';
    const d=new Date(s); if(isNaN(d)) return s;
    return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  },
  monthKey(s) {
    if (!s) return '—';
    const d=new Date(s); if(isNaN(d)) return '—';
    return d.toLocaleDateString('en-IN',{month:'short',year:'numeric'});
  },
};
function pnlCls(v) { if(v===null||isNaN(v)) return ''; return v>0?'pos':v<0?'neg':'zero'; }
function pnlClr(v) { if(v>0) return 'var(--emerald)'; if(v<0) return 'var(--rose)'; return ''; }

/* ═══ CHARTS ═══ */
const CHARTS = {};
function destroyChart(id) { if(CHARTS[id]){CHARTS[id].destroy();delete CHARTS[id];} }

const CF = {
  text2: '#7B84A3', grid: '#1E2235',
  cyan: '#00D4FF', emerald: '#00C896', rose: '#FF4D6D', amber: '#F59E0B', violet: '#8B5CF6',
};

function baseOpts(xRot=0) {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{display:false},
      tooltip:{
        backgroundColor:'#181C2A', borderColor:'#2E3450', borderWidth:1,
        titleColor:'#E6EAF8', bodyColor:'#7B84A3',
        titleFont:{family:"'DM Mono',monospace",size:11},
        bodyFont:{family:"'DM Mono',monospace",size:10},
      }
    },
    scales:{
      x:{ticks:{color:CF.text2,font:{family:"'DM Mono',monospace",size:10},maxRotation:xRot,minRotation:xRot},grid:{color:CF.grid}},
      y:{ticks:{color:CF.text2,font:{family:"'DM Mono',monospace",size:10}},grid:{color:CF.grid}},
    }
  };
}

/* ═══ DASHBOARD ═══ */
function renderDashboard() {
  const rich = trades.map(enrich);
  const closed = rich.filter(t=>t.result!=='open');
  const wins   = rich.filter(t=>t.result==='win');
  const losses = rich.filter(t=>t.result==='loss');
  const total  = wins.length + losses.length;

  const totalPnl = closed.reduce((a,t)=>a+(t.pnl||0),0);
  const winRate  = total>0 ? wins.length/total : 0;
  const avgPnl   = total>0 ? totalPnl/total : 0;
  const rrVals   = rich.map(t=>t.rr).filter(v=>v!==null);
  const avgRR    = rrVals.length ? rrVals.reduce((a,b)=>a+b,0)/rrVals.length : 0;
  const totalCap = rich.reduce((a,t)=>a+(t.capital||0),0);

  set('kpiPnl',  fmt.currency(totalPnl,0)); cls('kpiPnl',pnlCls(totalPnl));
  set('kpiWin',  fmt.pct(winRate));
  set('kpiTrades', rich.length);
  set('kpiAvg',  fmt.currency(avgPnl,0));   cls('kpiAvg',pnlCls(avgPnl));
  set('kpiRR',   fmt.num(avgRR,2));
  set('kpiCap',  fmt.currency(totalCap,0));
  set('kpiPnlSub', `${wins.length}W / ${losses.length}L / ${rich.filter(t=>t.result==='open').length} Open`);
  set('kpiWinSub', `${wins.length} wins of ${total} closed`);
  set('kpiTradesSub', `${rich.length} total logged`);
  set('sideCapital', fmt.currency(totalCap,0));
  set('sideCapSub', `${rich.length} trade${rich.length!==1?'s':''} logged`);

  destroyChart('equityChart');
  const sorted = [...rich].filter(t=>t.date&&t.result!=='open').sort((a,b)=>new Date(a.date)-new Date(b.date));
  let running = 0;
  const eqLabels = sorted.map(t=>fmt.date(t.date));
  const eqData   = sorted.map(t=>{running+=(t.pnl||0); return +running.toFixed(2);});

  CHARTS.equityChart = new Chart(document.getElementById('equityChart'), {
    type:'line',
    data:{labels:eqLabels,datasets:[{
      label:'Cumulative P&L (₹)',data:eqData,
      borderColor:CF.cyan,backgroundColor:'rgba(0,212,255,0.06)',
      fill:true,tension:0.4,pointRadius:3,pointHoverRadius:5,
      pointBackgroundColor:CF.cyan,borderWidth:2,
    }]},
    options:baseOpts(30),
  });

  destroyChart('winLossChart');
  const openCount = rich.filter(t=>t.result==='open').length;
  CHARTS.winLossChart = new Chart(document.getElementById('winLossChart'), {
    type:'doughnut',
    data:{
      labels:['Win','Loss','Open'],
      datasets:[{data:[wins.length,losses.length,openCount],
        backgroundColor:[CF.emerald,CF.rose,CF.amber],
        borderColor:'#0D0F17',borderWidth:3,
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,cutout:'68%',
      plugins:{
        legend:{labels:{color:CF.text2,font:{family:"'DM Mono',monospace",size:10},padding:14}},
        tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.raw} trades`}},
      }
    }
  });

  destroyChart('symbolChart');
  const bySymbol = {};
  rich.forEach(t=>{ if(!t.symbol) return; bySymbol[t.symbol]=(bySymbol[t.symbol]||0)+(t.pnl||0); });
  CHARTS.symbolChart = new Chart(document.getElementById('symbolChart'), {
    type:'bar',
    data:{
      labels:Object.keys(bySymbol),
      datasets:[{
        label:'P&L (₹)',data:Object.values(bySymbol),
        backgroundColor:Object.values(bySymbol).map(v=>v>=0?'rgba(0,200,150,0.65)':'rgba(255,77,109,0.65)'),
        borderRadius:4,
      }]
    },
    options:{...baseOpts(),plugins:{...baseOpts().plugins,tooltip:{...baseOpts().plugins.tooltip,callbacks:{label:ctx=>` ${fmt.currency(ctx.raw,0)}`}}}},
  });

  destroyChart('typeChart');
  const byType = {};
  rich.forEach(t=>{ const k=t.tradeType||'Unknown'; byType[k]=(byType[k]||0)+1; });
  CHARTS.typeChart = new Chart(document.getElementById('typeChart'), {
    type:'doughnut',
    data:{
      labels:Object.keys(byType),
      datasets:[{data:Object.values(byType),
        backgroundColor:[CF.cyan,CF.violet,CF.amber],
        borderColor:'#0D0F17',borderWidth:3,
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,cutout:'60%',
      plugins:{
        legend:{labels:{color:CF.text2,font:{family:"'DM Mono',monospace",size:10},padding:12}},
        tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.raw}`}},
      }
    }
  });

  destroyChart('monthChart');
  const byMonth = {};
  rich.forEach(t=>{ const k=fmt.monthKey(t.date); byMonth[k]=(byMonth[k]||0)+(t.pnl||0); });
  CHARTS.monthChart = new Chart(document.getElementById('monthChart'), {
    type:'bar',
    data:{
      labels:Object.keys(byMonth),
      datasets:[{
        label:'Monthly P&L (₹)',data:Object.values(byMonth),
        backgroundColor:Object.values(byMonth).map(v=>v>=0?'rgba(0,200,150,0.65)':'rgba(255,77,109,0.65)'),
        borderRadius:4,
      }]
    },
    options:{...baseOpts(20),plugins:{...baseOpts().plugins,tooltip:{...baseOpts().plugins.tooltip,callbacks:{label:ctx=>` ${fmt.currency(ctx.raw,0)}`}}}},
  });

  renderRecentTable();
  const now = new Date();
  set('dashDate', `Updated ${now.toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}`);
}

function renderRecentTable() {
  const q    = (document.getElementById('dashSearch')?.value||'').toLowerCase();
  const rich = trades.map((t,i)=>({...enrich(t),_i:i}));
  const filt = rich.filter(t=>
    !q || (t.symbol||'').toLowerCase().includes(q) || (t.date||'').includes(q) || (t.reason||'').toLowerCase().includes(q)
  );
  const tbody = document.getElementById('recentTbody'); if(!tbody) return;
  tbody.innerHTML = filt.slice(-20).reverse().map((t,n)=>tradeRow(t,n+1)).join('');
}

/* ═══ JOURNAL ═══ */
const PAGE_SIZE = 15;
let jPage = 1;

function renderJournal() { jPage=1; renderJournalPage(); populateFilters(); }

function renderJournalPage() {
  const q   = (document.getElementById('journalSearch')?.value||'').toLowerCase();
  const fM  = document.getElementById('filterMonth')?.value||'';
  const fS  = document.getElementById('filterSymbol')?.value||'';
  const fR  = document.getElementById('filterResult')?.value||'';
  const rich = trades.map((t,i)=>({...enrich(t),_i:i}));
  const filt = rich.filter(t=>{
    if(q&&!((t.symbol||'').toLowerCase().includes(q)||(t.date||'').includes(q)||(t.reason||'').toLowerCase().includes(q))) return false;
    if(fM && fmt.monthKey(t.date)!==fM) return false;
    if(fS && t.symbol!==fS) return false;
    if(fR && t.result!==fR) return false;
    return true;
  });
  const total=filt.length, pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  if(jPage>pages) jPage=pages;
  const slice = filt.slice((jPage-1)*PAGE_SIZE, jPage*PAGE_SIZE);
  const tbody = document.getElementById('journalTbody'); if(!tbody) return;
  tbody.innerHTML = slice.map((t,n)=>journalRow(t,(jPage-1)*PAGE_SIZE+n+1)).join('');
  const pg = document.getElementById('journalPagination'); if(!pg) return;
  let html = '';
  for(let p=1;p<=pages;p++) html+=`<button class="pg-btn${p===jPage?' active':''}" onclick="goPage(${p})">${p}</button>`;
  html += `<span class="pg-info">${total} trade${total!==1?'s':''}</span>`;
  pg.innerHTML = html;
}

function goPage(p) { jPage=p; renderJournalPage(); }

function populateFilters() {
  const months  = [...new Set(trades.map(t=>fmt.monthKey(t.date)).filter(Boolean))];
  const symbols = [...new Set(trades.map(t=>t.symbol).filter(Boolean))];
  const mSel=document.getElementById('filterMonth'), sSel=document.getElementById('filterSymbol');
  if(!mSel||!sSel) return;
  const curM=mSel.value, curS=sSel.value;
  mSel.innerHTML = '<option value="">All Months</option>' + months.map(m=>`<option value="${m}"${m===curM?' selected':''}>${m}</option>`).join('');
  sSel.innerHTML = '<option value="">All Symbols</option>' + symbols.map(s=>`<option value="${s}"${s===curS?' selected':''}>${s}</option>`).join('');
}

/* ═══ ROW BUILDERS ═══ */
function tradeRow(t, n) {
  const pc = pnlCls(t.pnl);
  return `<tr>
    <td style="color:var(--text3)">${n}</td>
    <td>${fmt.date(t.date)}</td>
    <td class="col-main">${t.symbol||'—'}</td>
    <td><span class="badge ${t.tradeType==='Buy Trade'?'badge-buy':'badge-sell'}">${t.tradeType||'—'}</span></td>
    <td>${fmt.num(t.entryPrice,2)}</td>
    <td>${isNum(t.exitPrice)?fmt.num(t.exitPrice,2):'<span style="color:var(--text3)">Open</span>'}</td>
    <td>${fmt.num(t.stopLoss,2)}</td>
    <td class="${pnlCls(t.points)}">${fmt.num(t.points,2)}</td>
    <td class="${pc}">${fmt.currency(t.pnl,0)}</td>
    <td class="${pc}">${fmt.pct(t.pct)}</td>
    <td>${fmt.currency(t.capital,0)}</td>
    <td>${fmt.num(t.rr,2)}</td>
    <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${t.reason||'—'}</td>
    <td><span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-open'}">${t.result==='open'?'Open':t.result==='win'?'Win':'Loss'}</span></td>
  </tr>`;
}

function journalRow(t, n) {
  const pc = pnlCls(t.pnl);
  return `<tr>
    <td style="color:var(--text3)">${n}</td>
    <td>${fmt.date(t.date)}</td>
    <td class="col-main">${t.symbol||'—'}</td>
    <td><span class="badge ${t.tradeType==='Buy Trade'?'badge-buy':'badge-sell'}">${t.tradeType||'—'}</span></td>
    <td>${fmt.num(t.entryPrice,2)}</td>
    <td>${isNum(t.exitPrice)?fmt.num(t.exitPrice,2):'<span style="color:var(--text3)">Open</span>'}</td>
    <td>${fmt.num(t.stopLoss,2)}</td>
    <td>${fmt.num(t.slSize,2)}</td>
    <td>${fmt.num(t.target1,2)}</td>
    <td>${fmt.num(t.target2,2)}</td>
    <td>${fmt.num(t.target3,2)}</td>
    <td>${fmt.num(t.target4,2)}</td>
    <td class="${pnlCls(t.points)}">${fmt.num(t.points,2)}</td>
    <td class="${pc}">${fmt.currency(t.pnl,0)}</td>
    <td class="${pc}">${fmt.pct(t.pct)}</td>
    <td>${fmt.currency(t.capital,0)}</td>
    <td>${fmt.num(t.rr,2)}</td>
    <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis">${t.reason||'—'}</td>
    <td><span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-open'}">${t.result==='open'?'Open':t.result==='win'?'Win':'Loss'}</span></td>
    <td>
      <button class="btn-edit-sm" onclick="openEditView(${t._i})">Edit</button>
      <button class="btn-del-sm"  onclick="deleteTrade(${t._i})">Del</button>
    </td>
  </tr>`;
}

/* ═══ FORM ═══ */
function openEditView(idx) {
  const t = trades[idx]; if(!t) return;
  switchView('add', document.querySelector('[data-view="add"]'));
  document.getElementById('formTitle').textContent = 'Edit Trade';
  document.getElementById('editIndex').value = idx;
  setv('fDate',t.date||''); setv('fSymbol',t.symbol||''); setv('fType',t.tradeType||'');
  setv('fCapital',t.capital??''); setv('fEntry',t.entryPrice??''); setv('fSL',t.stopLoss??'');
  setv('fExit',t.exitPrice??''); setv('fT1',t.target1??''); setv('fT2',t.target2??'');
  setv('fT3',t.target3??''); setv('fT4',t.target4??'');
  setv('fReason',t.reason||''); setv('fObjective',t.objective||'');
  calcPnl();
}

function cancelEdit() { clearForm(); switchView('journal',document.querySelector('[data-view="journal"]')); }

function clearForm() {
  ['fDate','fSymbol','fType','fCapital','fEntry','fSL','fExit','fT1','fT2','fT3','fT4','fReason','fObjective'].forEach(id=>setv(id,''));
  document.getElementById('editIndex').value = '-1';
  document.getElementById('formTitle').textContent = 'Add New Trade';
  ['calcSLSize','calcPoints','calcPnL','calcPct','calcRR'].forEach(id=>{ const e=document.getElementById(id); if(e){e.textContent='—';e.style.color='';} });
}

function saveTrade() {
  const date=getv('fDate'), symbol=getv('fSymbol').trim(), type=getv('fType');
  const cap=parseFloat(getv('fCapital')), entry=parseFloat(getv('fEntry')), sl=parseFloat(getv('fSL'));
  if(!date)       return toast('Please enter a date.','error');
  if(!symbol)     return toast('Please enter a stock symbol.','error');
  if(!type)       return toast('Please select a trade type.','error');
  if(isNaN(entry))return toast('Please enter a valid entry price.','error');
  if(isNaN(sl))   return toast('Please enter a valid stop loss.','error');
  
  // Auto-calculate targets before saving
  const targets = calcTargets(entry, sl, type);
  
  const trade = {
    date, symbol, tradeType:type,
    capital:isNaN(cap)?null:cap, entryPrice:entry, stopLoss:sl,
    exitPrice:parseFloat(getv('fExit'))||null,
    target1: targets.t1, target2: targets.t2, target3: targets.t3, target4: targets.t4,
    reason:getv('fReason'), objective:getv('fObjective'),
  };
  const idx = parseInt(document.getElementById('editIndex').value);
  if(idx>=0) { trades[idx]=trade; toast('Trade updated successfully!','success'); }
  else       { trades.push(trade); toast('Trade added successfully!','success'); }
  saveTrades(trades); clearForm(); renderAll();
  switchView('journal',document.querySelector('[data-view="journal"]'));
}

function deleteTrade(idx) {
  if(!confirm('Delete this trade? This cannot be undone.')) return;
  trades.splice(idx,1); saveTrades(trades);
  toast('Trade deleted.','success'); renderAll();
}

/* ═══ UPDATED CALC PNL (With Auto Targets) ═══ */
function calcPnl() {
  const entry = parseFloat(getv('fEntry'));
  const sl = parseFloat(getv('fSL'));
  const exit = parseFloat(getv('fExit'));
  const cap = parseFloat(getv('fCapital'));
  const tradeType = getv('fType');
  
  // ✅ AUTO CALCULATE TARGETS (Excel Style)
  const targets = calcTargets(entry, sl, tradeType);
  setv('fT1', targets.t1 !== null ? targets.t1.toFixed(2) : '');
  setv('fT2', targets.t2 !== null ? targets.t2.toFixed(2) : '');
  setv('fT3', targets.t3 !== null ? targets.t3.toFixed(2) : '');
  setv('fT4', targets.t4 !== null ? targets.t4.toFixed(2) : '');
  
  // Existing calculations
  const slSize = calcSLSize(entry, sl);
  const points = calcPoints(entry, isNaN(exit) ? null : exit, isNaN(sl) ? null : sl);
  const pnl = calcProfitLoss(entry, isNaN(exit) ? null : exit, isNaN(sl) ? null : sl, cap);
  const pct = calcPctReturn(entry, isNaN(exit) ? null : exit, isNaN(sl) ? null : sl);
  const rr = calcRR(entry, sl, targets.t1);

  const setCalc = (id, val, fmt_fn, clr_fn) => {
    const e = document.getElementById(id); 
    if (!e) return;
    e.textContent = val !== null ? fmt_fn(val) : '—';
    e.style.color = val !== null && clr_fn ? clr_fn(val) : 'var(--cyan)';
  };
  
  setCalc('calcSLSize', slSize, v => fmt.num(v, 2), null);
  setCalc('calcPoints', points, v => fmt.num(v, 2), pnlClr);
  setCalc('calcPnL', pnl, v => fmt.currency(v, 0), pnlClr);
  setCalc('calcPct', pct, v => fmt.pct(v), pnlClr);
  setCalc('calcRR', rr, v => fmt.num(v, 2), null);
}

/* ═══ ANALYTICS ═══ */
function renderAnalytics() {
  const rich   = trades.map(enrich);
  const wins   = rich.filter(t=>t.result==='win');
  const losses = rich.filter(t=>t.result==='loss');
  const closed = wins.length + losses.length;
  const totalPnl = rich.reduce((a,t)=>a+(t.pnl||0),0);
  const winRate  = closed>0 ? wins.length/closed : 0;
  const avgWin   = wins.length   ? wins.reduce((a,t)=>a+(t.pnl||0),0)/wins.length : 0;
  const avgLoss  = losses.length ? losses.reduce((a,t)=>a+(t.pnl||0),0)/losses.length : 0;
  const rrVals   = rich.map(t=>t.rr).filter(v=>v!==null);
  const avgRR    = rrVals.length ? rrVals.reduce((a,b)=>a+b,0)/rrVals.length : 0;
  const maxWin   = wins.length   ? Math.max(...wins.map(t=>t.pnl))   : 0;
  const maxLoss  = losses.length ? Math.min(...losses.map(t=>t.pnl)) : 0;
  const totalCap = rich.reduce((a,t)=>a+(t.capital||0),0);
  const expectancy = winRate*avgWin + (1-winRate)*avgLoss;

  let streak=0,maxStreak=0,curStreak=0;
  rich.filter(t=>t.result!=='open').forEach(t=>{
    if(t.result==='win'){streak++;maxStreak=Math.max(maxStreak,streak);}else streak=0;
    curStreak=streak;
  });

  const profitFactor = losses.length && Math.abs(avgLoss)>0 ? Math.abs(avgWin*wins.length / (avgLoss*losses.length)) : null;

  const data = [
    {label:'Total Trades Logged', val:rich.length, clr:''},
    {label:'Closed Trades',       val:closed, clr:''},
    {label:'Open Positions',      val:rich.filter(t=>t.result==='open').length, clr:'var(--amber)'},
    {label:'Win Rate',            val:fmt.pct(winRate), clr:winRate>=.5?'var(--emerald)':'var(--rose)'},
    {label:'Total P&L',           val:fmt.currency(totalPnl,0), clr:pnlClr(totalPnl)},
    {label:'Expectancy / Trade',  val:fmt.currency(expectancy,0), clr:pnlClr(expectancy)},
    {label:'Avg Win',             val:fmt.currency(avgWin,0), clr:'var(--emerald)'},
    {label:'Avg Loss',            val:fmt.currency(avgLoss,0), clr:'var(--rose)'},
    {label:'Best Trade',          val:fmt.currency(maxWin,0), clr:'var(--emerald)'},
    {label:'Worst Trade',         val:fmt.currency(maxLoss,0), clr:'var(--rose)'},
    {label:'Avg R:R Ratio',       val:fmt.num(avgRR,2), clr:avgRR>=1?'var(--emerald)':'var(--amber)'},
    {label:'Profit Factor',       val:profitFactor!==null?profitFactor.toFixed(2):'—', clr:profitFactor>=1?'var(--emerald)':'var(--rose)'},
    {label:'Max Win Streak',      val:maxStreak, clr:'var(--cyan)'},
    {label:'Capital Deployed',    val:fmt.currency(totalCap,0), clr:''},
  ];

  const grid=document.getElementById('statsGrid'); if(grid){
    grid.innerHTML = data.map(s=>`
      <div class="stat-card">
        <div class="stat-label">${s.label}</div>
        <div class="stat-val" style="color:${s.clr||'var(--text)'}">${s.val}</div>
      </div>`).join('');
  }

  const tbody=document.getElementById('reportTbody'); if(tbody){
    const rows=[];
    for(let i=0;i<data.length;i+=2){
      const a=data[i],b=data[i+1]||{};
      rows.push(`<tr>
        <td style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.08em">${a.label}</td>
        <td style="font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;color:${a.clr||'var(--text)'}">${a.val}</td>
        <td style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.08em">${b.label||''}</td>
        <td style="font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;color:${b.clr||'var(--text)'}">${b.val||''}</td>
      </tr>`);
    }
    tbody.innerHTML = rows.join('');
  }

  renderHeatmap(rich);

  destroyChart('rrChart');
  const buckets=[0,0.5,1,1.5,2,2.5,3];
  const counts=new Array(buckets.length).fill(0);
  rrVals.forEach(v=>{ for(let i=buckets.length-1;i>=0;i--){ if(v>=buckets[i]){counts[i]++;break;} } });
  CHARTS.rrChart = new Chart(document.getElementById('rrChart'),{
    type:'bar',
    data:{
      labels:buckets.map((b,i)=>`${b}${i<buckets.length-1?'–'+buckets[i+1]:'+'}`),
      datasets:[{label:'# Trades',data:counts,backgroundColor:'rgba(0,212,255,0.55)',borderRadius:4}]
    },
    options:baseOpts(),
  });
}

function renderHeatmap(rich) {
  const wrap=document.getElementById('heatmapWrap'); if(!wrap) return;
  const byDate={};
  rich.forEach(t=>{ if(!t.date) return; const k=t.date.substring(0,10); byDate[k]=(byDate[k]||0)+(t.pnl||0); });
  const dates=Object.keys(byDate).sort();
  if(!dates.length){ wrap.innerHTML='<div style="color:var(--text3);font-size:11px;padding:12px">No data yet — add trades to see the heatmap.</div>'; return; }
  const max = Math.max(...Object.values(byDate).map(Math.abs)) || 1;
  wrap.innerHTML = dates.map(d=>{
    const v=byDate[d], int=Math.min(1,Math.abs(v)/max);
    const bg = v>0 ? `rgba(0,200,150,${0.12+int*0.75})` : v<0 ? `rgba(255,77,109,${0.12+int*0.75})` : 'rgba(255,255,255,0.04)';
    return `<div class="hm-cell" style="background:${bg}">${new Date(d).getDate()}<div class="hm-tip">${fmt.date(d)}: ${fmt.currency(v,0)}</div></div>`;
  }).join('');
}

/* ═══ EXPORT ═══ */
function exportCSV() {
  const headers = ['Date','Symbol','Trade Type','Entry Price','Stop Loss','SL Size','Exit Price',
    'Points','Target 1','Target 2','Target 3','Target 4','Capital (INR)','P&L (INR)','Return %','R:R Ratio',
    'Reason','Notes','Result'];
  const rows = trades.map(t=>{
    const r=enrich(t);
    return [r.date,r.symbol,r.tradeType,r.entryPrice,r.stopLoss,
      r.slSize!==null?r.slSize.toFixed(2):'',r.exitPrice??'',
      r.points!==null?r.points.toFixed(2):'',
      r.target1??'',r.target2??'',r.target3??'',r.target4??'',
      r.capital??'',r.pnl!==null?r.pnl.toFixed(2):'',
      r.pct!==null?(r.pct*100).toFixed(4):'',r.rr!==null?r.rr.toFixed(2):'',
      r.reason??'',r.objective??'',r.result,
    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',');
  });
  const csv = [headers.join(','),...rows].join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`tradevault_export_${new Date().toISOString().substring(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('CSV exported!','success');
}

/* ═══ VIEW ROUTING ═══ */
const VIEW_META = {
  dashboard:{title:'Dashboard',badge:'Overview'},
  journal:  {title:'Trade Journal',badge:'All Trades'},
  add:      {title:'Add Trade',badge:'New Entry'},
  report:   {title:'Analytics',badge:'Performance'},
};
function switchView(name, navEl) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const v=document.getElementById(`view-${name}`); if(v) v.classList.add('active');
  const nav=navEl||document.querySelector(`[data-view="${name}"]`); if(nav) nav.classList.add('active');
  const meta=VIEW_META[name]||{title:name,badge:''};
  set('topbarTitle',meta.title); set('topbarBadge',meta.badge);
  if(window.innerWidth<900) document.getElementById('sidebar').classList.remove('open');
  if(name==='dashboard') renderDashboard();
  if(name==='journal')   renderJournal();
  if(name==='report')    renderAnalytics();
  return false;
}

/* ═══ MODAL ═══ */
function openModal(idx) {
  const t=enrich({...trades[idx],_i:idx});
  document.getElementById('modalTitle').innerHTML = `<span style="color:var(--cyan)">${t.symbol||'—'}</span> &nbsp;·&nbsp; ${fmt.date(t.date)}`;
  const fields = [
    ['Date',t.date?fmt.date(t.date):'—'],['Symbol',t.symbol||'—'],
    ['Trade Type',t.tradeType||'—'],['Result',`<span class="badge ${t.result==='win'?'badge-win':t.result==='loss'?'badge-loss':'badge-open'}">${t.result==='open'?'Open':t.result==='win'?'Win':'Loss'}</span>`],
    ['Entry Price',fmt.num(t.entryPrice,2)],['Exit Price',isNum(t.exitPrice)?fmt.num(t.exitPrice,2):'Open'],
    ['Stop Loss',fmt.num(t.stopLoss,2)],['SL Size',fmt.num(t.slSize,2)],
    ['Points',`<span class="${pnlCls(t.points)}">${fmt.num(t.points,2)}</span>`],
    ['P&L (₹)',`<span class="${pnlCls(t.pnl)}">${fmt.currency(t.pnl,0)}</span>`],
    ['Return %',`<span class="${pnlCls(t.pct)}">${fmt.pct(t.pct)}</span>`],
    ['Capital',fmt.currency(t.capital,0)],['R:R Ratio',fmt.num(t.rr,2)],['Target 1',fmt.num(t.target1,2)],
    ['Target 2',fmt.num(t.target2,2)],['Target 3',fmt.num(t.target3,2)],
  ];
  document.getElementById('modalBody').innerHTML = `<div class="modal-grid">${fields.map(([l,v])=>`<div><div class="modal-field-label">${l}</div><div class="modal-field-val">${v}</div></div>`).join('')}</div>`;
  document.getElementById('modalDeleteBtn').onclick = ()=>{ closeModal(); deleteTrade(idx); };
  document.getElementById('modalEditBtn').onclick   = ()=>{ closeModal(); openEditView(idx); };
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

/* ═══ SIDEBAR ═══ */
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

/* ═══ TOAST ═══ */
let toastTimer;
function toast(msg, type='') {
  const t=document.getElementById('toast'); if(!t) return;
  t.textContent=msg; t.className=`toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}

/* ═══ HELPERS ═══ */
function el(id) { return document.getElementById(id); }
function set(id,val) { const e=el(id); if(e) e.textContent=val; }
function cls(id,c) { const e=el(id); if(e){ e.className=''; if(c) e.classList.add(c); } }
function setv(id,val) { const e=el(id); if(e) e.value=val; }
function getv(id) { const e=el(id); return e?e.value:''; }
function renderAll() {
  const a=document.querySelector('.view.active'); if(!a) return;
  const n=a.id.replace('view-','');
  if(n==='dashboard') renderDashboard();
  if(n==='journal')   renderJournal();
  if(n==='report')    renderAnalytics();
}

/* ═══ INIT ═══ */
document.addEventListener('DOMContentLoaded',()=>{
  const today = new Date().toISOString().substring(0,10);
  const fd = document.getElementById('fDate'); if(fd) fd.value=today;
  renderDashboard();
  populateFilters();
});