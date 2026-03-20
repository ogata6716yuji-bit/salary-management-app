'use strict';

// ===== State =====
let lang = 'ja';
let year = new Date().getFullYear();
let month = new Date().getMonth();
let shifts = {};
let editingDate = null;

// ===== Storage =====
function saveData() {
  try {
    localStorage.setItem('sm-shifts', JSON.stringify(shifts));
    localStorage.setItem('sm-lang', lang);
    const cfg = {
      rate:      document.getElementById('s-rate').value,
      transport: document.getElementById('s-transport').value,
      overtime:  document.getElementById('s-overtime').value,
      nightRate: document.getElementById('s-night-rate').value,
      overRate:  document.getElementById('s-over-rate').value,
    };
    localStorage.setItem('sm-settings', JSON.stringify(cfg));
  } catch(e) {}
}

function loadData() {
  try {
    const s = localStorage.getItem('sm-shifts');
    if (s) shifts = JSON.parse(s);
    const l = localStorage.getItem('sm-lang');
    if (l) lang = l;
    const cfg = localStorage.getItem('sm-settings');
    if (cfg) {
      const c = JSON.parse(cfg);
      document.getElementById('s-rate').value      = c.rate      ?? 1100;
      document.getElementById('s-transport').value = c.transport ?? 0;
      document.getElementById('s-overtime').value  = c.overtime  ?? 8;
      document.getElementById('s-night-rate').value= c.nightRate ?? 1.25;
      document.getElementById('s-over-rate').value = c.overRate  ?? 1.25;
    }
  } catch(e) {}
}

// ===== i18n =====
const T = {
  ja: {
    tabs: ['カレンダー', '月間集計', '設定'],
    langBtn: 'English',
    days: ['日', '月', '火', '水', '木', '金', '土'],
    monthFmt: (y, m) => `${y}年 ${m + 1}月`,
    hint: '日付をタップしてシフトを追加・編集',
    breakdown: '内訳',
    shiftlist: 'シフト一覧',
    listHead: ['日付', '時間', '労働時間', '給料'],
    payconf: '給与設定',
    rate: '時給 (円)',
    transport: '交通費 (円/日)',
    overtime: '残業開始 (h)',
    premconf: '割増率',
    night: '深夜 (22〜5時)',
    over: '残業',
    modalStart: '開始',
    modalEnd: '終了',
    modalBreak: '休憩 (分)',
    hourUnit: '時',
    minUnit: '分',
    save: '保存',
    del: '削除',
    cancel: 'キャンセル',
    modalTitle: (m, d) => `${m + 1}月${d}日 シフト`,
    metricDays: '勤務日数',
    metricHours: '総労働時間',
    metricPay: '月間支給額（税引前）',
    dayUnit: '日',
    bdBase: '基本給',
    bdNight: '深夜割増',
    bdOver: '残業割増',
    bdTransport: '交通費',
    bdTotal: '合計',
    noShift: 'シフトがありません',
    note: '※ 割増なしの場合は倍率を 1.0 に設定してください',
    tagNight: '深夜',
    tagOver: '残業',
    pdfBtn: 'PDFで保存',
    resetBtn: 'データを一括リセット',
    resetTitle: 'データを一括リセット',
    resetMsg: '全てのシフトデータを削除します。この操作は取り消せません。本当にリセットしますか？',
    resetConfirm: 'リセットする',
  },
  en: {
    tabs: ['Calendar', 'Monthly', 'Settings'],
    langBtn: '日本語',
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthFmt: (y, m) => {
      const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${mn[m]} ${y}`;
    },
    hint: 'Tap a date to add or edit a shift',
    breakdown: 'Breakdown',
    shiftlist: 'Shift list',
    listHead: ['Date', 'Time', 'Hours', 'Pay'],
    payconf: 'Pay settings',
    rate: 'Hourly rate (¥)',
    transport: 'Commute (¥/day)',
    overtime: 'OT starts (h)',
    premconf: 'Premium rates',
    night: 'Late night (10pm–5am)',
    over: 'Overtime',
    modalStart: 'Start',
    modalEnd: 'End',
    modalBreak: 'Break (min)',
    hourUnit: 'h',
    minUnit: 'm',
    save: 'Save',
    del: 'Delete',
    cancel: 'Cancel',
    modalTitle: (m, d) => {
      const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${mn[m]} ${d}`;
    },
    metricDays: 'Days worked',
    metricHours: 'Total hours',
    metricPay: 'Monthly pay (pre-tax)',
    dayUnit: ' days',
    bdBase: 'Base pay',
    bdNight: 'Night premium',
    bdOver: 'OT premium',
    bdTransport: 'Commute',
    bdTotal: 'Total',
    noShift: 'No shifts this month',
    note: '* Set premium rate to 1.0 to disable surcharges',
    tagNight: 'Night',
    tagOver: 'OT',
    pdfBtn: 'Save as PDF',
    resetBtn: 'Reset all data',
    resetTitle: 'Reset all data',
    resetMsg: 'This will delete all shift data. This action cannot be undone. Are you sure?',
    resetConfirm: 'Reset',
  }
};

function t() { return T[lang]; }

// ===== Time helpers =====
function toMins(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}
function fmtTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
function pad2(n) { return String(n).padStart(2, '0'); }

// 数字入力から "HH:MM" を取得
function getTimeVal(hId, mId) {
  const h = Math.min(23, Math.max(0, parseInt(document.getElementById(hId).value) || 0));
  const m = Math.min(59, Math.max(0, parseInt(document.getElementById(mId).value) || 0));
  return `${pad2(h)}:${pad2(m)}`;
}

// "HH:MM" を時・分に分解してセット
function setTimeVal(hId, mId, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  document.getElementById(hId).value = h;
  document.getElementById(mId).value = m;
}

// ===== Settings =====
function getSettings() {
  return {
    rate:      parseFloat(document.getElementById('s-rate').value)       || 1100,
    transport: parseFloat(document.getElementById('s-transport').value)  || 0,
    overtime:  parseFloat(document.getElementById('s-overtime').value)   || 8,
    nightRate: parseFloat(document.getElementById('s-night-rate').value) || 1.25,
    overRate:  parseFloat(document.getElementById('s-over-rate').value)  || 1.25,
  };
}

// 設定変更時に自動保存
document.addEventListener('DOMContentLoaded', () => {
  ['s-rate','s-transport','s-overtime','s-night-rate','s-over-rate'].forEach(id => {
    document.getElementById(id).addEventListener('change', saveData);
  });
});

// ===== Calc =====
function calcShift(s) {
  const cfg = getSettings();
  let totalMins = toMins(s.end) - toMins(s.start);
  if (totalMins <= 0) totalMins += 1440;
  const work = Math.max(0, totalMins - (s.break || 0));
  const workH = work / 60;
  const overH = Math.max(0, workH - cfg.overtime);
  const normalH = workH - overH;

  let nightMins = 0;
  const startAbs = toMins(s.start);
  for (let i = 0; i < totalMins; i++) {
    const h = Math.floor(((startAbs + i) % 1440) / 60);
    if (h >= 22 || h < 5) nightMins++;
  }
  const nightH = nightMins / 60;
  const dayH = normalH - nightH;

  const base       = dayH * cfg.rate;
  const nightExtra = nightH * cfg.rate * cfg.nightRate;
  const overExtra  = overH  * cfg.rate * cfg.overRate;
  const total      = Math.round(base + nightExtra + overExtra + cfg.transport);

  return {
    work, workH, overH, nightH,
    base:       Math.round(base),
    nightExtra: Math.round(nightExtra),
    overExtra:  Math.round(overExtra),
    total
  };
}

// ===== Lang =====
function toggleLang() {
  lang = lang === 'ja' ? 'en' : 'ja';
  applyLang();
  saveData();
}

function applyLang() {
  const l = t();
  document.getElementById('lang-toggle').textContent   = l.langBtn;
  document.getElementById('tab-cal-lbl').textContent   = l.tabs[0];
  document.getElementById('tab-sum-lbl').textContent   = l.tabs[1];
  document.getElementById('tab-set-lbl').textContent   = l.tabs[2];
  document.getElementById('cal-hint').textContent      = l.hint;
  document.getElementById('lbl-breakdown').textContent = l.breakdown;
  document.getElementById('lbl-shiftlist').textContent = l.shiftlist;
  document.getElementById('lbl-payconf').textContent   = l.payconf;
  document.getElementById('lbl-rate').textContent      = l.rate;
  document.getElementById('lbl-transport').textContent = l.transport;
  document.getElementById('lbl-overtime').textContent  = l.overtime;
  document.getElementById('lbl-premconf').textContent  = l.premconf;
  document.getElementById('lbl-night').textContent     = l.night;
  document.getElementById('lbl-over').textContent      = l.over;
  document.getElementById('m-lbl-start').textContent   = l.modalStart;
  document.getElementById('m-lbl-end').textContent     = l.modalEnd;
  document.getElementById('m-lbl-break').textContent   = l.modalBreak;
  document.getElementById('m-btn-save').textContent    = l.save;
  document.getElementById('modal-del').textContent     = l.del;
  document.getElementById('m-btn-cancel').textContent  = l.cancel;
  document.getElementById('lbl-note').textContent      = l.note;
  document.getElementById('pdf-btn-lbl').textContent   = l.pdfBtn;
  document.getElementById('reset-btn-lbl').textContent = l.resetBtn;

  renderCal();
  if (document.getElementById('page-summary').classList.contains('active')) renderSummary();
}

// ===== Tab =====
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((el, i) => {
    el.classList.toggle('active', ['cal','summary','settings'][i] === tab);
  });
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  if (tab === 'summary') renderSummary();
}

// ===== Month =====
function changeMonth(d) {
  month += d;
  if (month > 11) { month = 0; year++; }
  if (month < 0)  { month = 11; year--; }
  renderCal();
  if (document.getElementById('page-summary').classList.contains('active')) renderSummary();
}

// ===== Calendar =====
function renderCal() {
  const l = t();
  const label = l.monthFmt(year, month);
  document.getElementById('month-label').textContent  = label;
  document.getElementById('month-label2').textContent = label;

  document.getElementById('cal-head').innerHTML = l.days
    .map((d, i) => `<th class="${i===0?'sun':i===6?'sat':''}">${d}</th>`)
    .join('');

  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = new Date();

  let html = '<tr>';
  let col  = 0;

  for (let i = 0; i < firstDow; i++) { html += '<td></td>'; col++; }

  for (let d = 1; d <= daysInMonth; d++) {
    if (col === 7) { html += '</tr><tr>'; col = 0; }

    const key     = `${year}-${pad2(month+1)}-${pad2(d)}`;
    const s       = shifts[key];
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const dow     = new Date(year, month, d).getDay();
    const numCls  = dow === 0 ? 'sun' : dow === 6 ? 'sat' : '';
    const hasNight = s && (toMins(s.start) >= 22*60 || toMins(s.end) <= 5*60 || toMins(s.end) < toMins(s.start));

    html += `<td>
      <div class="day-cell${s ? ' has-shift' : ''}${isToday ? ' today' : ''}" onclick="openModal('${key}')">
        <div class="day-num ${numCls}">${d}</div>
        ${s ? `<div class="shift-chip${hasNight ? ' night' : ''}">${s.start}–${s.end}</div>` : ''}
      </div>
    </td>`;
    col++;
  }
  html += '</tr>';
  document.getElementById('cal-body').innerHTML = html;
}

// ===== Summary =====
function renderSummary() {
  const l   = t();
  const cfg = getSettings();
  const prefix      = `${year}-${pad2(month+1)}-`;
  const monthShifts = Object.entries(shifts).filter(([k]) => k.startsWith(prefix));

  let totalWork = 0, totalPay = 0;
  let totalBase = 0, totalNightEx = 0, totalOverEx = 0;
  const days = monthShifts.length;
  let rows = '';

  document.getElementById('list-head').innerHTML = l.listHead.map(h => `<th>${h}</th>`).join('');

  monthShifts.sort((a, b) => a[0] > b[0] ? 1 : -1).forEach(([key, s]) => {
    const c = calcShift(s);
    totalWork    += c.work;
    totalPay     += c.total;
    totalBase    += c.base;
    totalNightEx += c.nightExtra;
    totalOverEx  += c.overExtra;

    const d       = parseInt(key.split('-')[2]);
    const dow     = l.days[new Date(year, month, d).getDay()];
    const dateStr = lang === 'ja' ? `${d}日(${dow})` : `${dow} ${d}`;

    rows += `<tr>
      <td>${dateStr}</td>
      <td>${s.start}–${s.end}${c.nightH > 0 ? `<span class="tag night">${l.tagNight}</span>` : ''}${c.overH > 0 ? `<span class="tag over">${l.tagOver}</span>` : ''}</td>
      <td>${fmtTime(c.work)}</td>
      <td>¥${c.total.toLocaleString()}</td>
    </tr>`;
  });

  document.getElementById('metrics').innerHTML = `
    <div class="metric">
      <div class="metric-label">${l.metricDays}</div>
      <div class="metric-val">${days}${l.dayUnit}</div>
    </div>
    <div class="metric">
      <div class="metric-label">${l.metricHours}</div>
      <div class="metric-val">${fmtTime(totalWork)}</div>
    </div>
    <div class="metric wide">
      <div class="metric-label">${l.metricPay}</div>
      <div class="metric-val accent">¥${totalPay.toLocaleString()}</div>
    </div>
  `;

  const transport = cfg.transport * days;
  document.getElementById('breakdown-detail').innerHTML = `
    <div class="breakdown-row"><span>${l.bdBase}</span><span>¥${totalBase.toLocaleString()}</span></div>
    ${totalNightEx ? `<div class="breakdown-row"><span>${l.bdNight}</span><span>¥${totalNightEx.toLocaleString()}</span></div>` : ''}
    ${totalOverEx  ? `<div class="breakdown-row"><span>${l.bdOver}</span><span>¥${totalOverEx.toLocaleString()}</span></div>`  : ''}
    ${transport    ? `<div class="breakdown-row"><span>${l.bdTransport}</span><span>¥${transport.toLocaleString()}</span></div>`: ''}
    <div class="breakdown-row"><span>${l.bdTotal}</span><span>¥${totalPay.toLocaleString()}</span></div>
  `;

  document.getElementById('shift-list').innerHTML = rows ||
    `<tr><td colspan="4" style="color:var(--text-muted);text-align:center;padding:20px;">${l.noShift}</td></tr>`;
}

// ===== Modal =====
function openModal(key) {
  editingDate = key;
  const s     = shifts[key];
  const l     = t();
  const parts = key.split('-');
  const d     = parseInt(parts[2]);
  const m     = parseInt(parts[1]) - 1;

  document.getElementById('modal-title').textContent = l.modalTitle(m, d);
  setTimeVal('m-start-h', 'm-start-m', s ? s.start : '10:00');
  setTimeVal('m-end-h',   'm-end-m',   s ? s.end   : '18:00');
  document.getElementById('m-break').value  = s ? s.break : 0;
  document.getElementById('modal-del').style.display = s ? '' : 'none';
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

function saveShift() {
  shifts[editingDate] = {
    start: getTimeVal('m-start-h', 'm-start-m'),
    end:   getTimeVal('m-end-h',   'm-end-m'),
    break: parseInt(document.getElementById('m-break').value) || 0,
  };
  saveData();
  closeModal();
  renderCal();
}

function deleteShift() {
  delete shifts[editingDate];
  saveData();
  closeModal();
  renderCal();
}

// ===== Init =====
loadData();
applyLang();

// ===== PDF Export =====
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const l   = t();
  const cfg = getSettings();
  const prefix      = `${year}-${pad2(month+1)}-`;
  const monthShifts = Object.entries(shifts).filter(([k]) => k.startsWith(prefix));
  const monthLabel  = l.monthFmt(year, month);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // フォント設定（日本語対応のためUTF-8）
  doc.setFont('helvetica');

  const pw = 210, pl = 15, pr = 195, contentW = pr - pl;
  let y = 20;

  // ===== タイトル =====
  doc.setFillColor(26, 46, 90);
  doc.rect(0, 0, 210, 14, 'F');
  doc.setTextColor(245, 200, 66);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SALARY MANAGER', pl, 9.5);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(monthLabel, pr, 9.5, { align: 'right' });

  y = 24;

  // ===== サマリーカード =====
  let totalWork = 0, totalPay = 0, totalBase = 0, totalNightEx = 0, totalOverEx = 0;
  const days = monthShifts.length;
  const rowData = [];

  monthShifts.sort((a, b) => a[0] > b[0] ? 1 : -1).forEach(([key, s]) => {
    const c = calcShift(s);
    totalWork    += c.work;
    totalPay     += c.total;
    totalBase    += c.base;
    totalNightEx += c.nightExtra;
    totalOverEx  += c.overExtra;
    const d   = parseInt(key.split('-')[2]);
    const dow = l.days[new Date(year, month, d).getDay()];
    const dateStr = lang === 'ja' ? `${d}(${dow})` : `${dow} ${d}`;
    rowData.push([dateStr, `${s.start}-${s.end}`, fmtTime(c.work), `\xA5${c.total.toLocaleString()}`]);
  });

  const transport = cfg.transport * days;

  // サマリーボックス
  const boxW = (contentW - 6) / 3;
  const boxes = [
    { label: lang === 'ja' ? '\u52E4\u52D9\u65E5\u6570' : 'Days worked', val: `${days}${l.dayUnit}` },
    { label: lang === 'ja' ? '\u7DCF\u52B4\u50CD\u6642\u9593' : 'Total hours', val: fmtTime(totalWork) },
    { label: lang === 'ja' ? '\u6708\u9593\u652F\u7D66\u984D' : 'Monthly pay', val: `\xA5${totalPay.toLocaleString()}` },
  ];
  boxes.forEach((b, i) => {
    const bx = pl + i * (boxW + 3);
    doc.setFillColor(244, 246, 251);
    doc.roundedRect(bx, y, boxW, 18, 2, 2, 'F');
    doc.setTextColor(107, 123, 164);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(b.label, bx + boxW / 2, y + 6, { align: 'center' });
    doc.setTextColor(26, 46, 90);
    doc.setFontSize(i === 2 ? 11 : 12);
    doc.setFont('helvetica', 'bold');
    doc.text(b.val, bx + boxW / 2, y + 14, { align: 'center' });
  });
  y += 24;

  // ===== 内訳 =====
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 123, 164);
  doc.text(lang === 'ja' ? '\u5185\u8A33' : 'BREAKDOWN', pl, y);
  y += 4;
  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.3);
  doc.line(pl, y, pr, y);
  y += 4;

  const bdRows = [
    [lang === 'ja' ? '\u57FA\u672C\u7D66' : 'Base pay', `\xA5${totalBase.toLocaleString()}`],
  ];
  if (totalNightEx) bdRows.push([lang === 'ja' ? '\u6DF1\u591C\u5272\u5897' : 'Night premium', `\xA5${totalNightEx.toLocaleString()}`]);
  if (totalOverEx)  bdRows.push([lang === 'ja' ? '\u6B8B\u696D\u5272\u5897' : 'OT premium',    `\xA5${totalOverEx.toLocaleString()}`]);
  if (transport)    bdRows.push([lang === 'ja' ? '\u4EA4\u901A\u8CBB'     : 'Commute',        `\xA5${transport.toLocaleString()}`]);
  bdRows.push([lang === 'ja' ? '\u5408\u8A08' : 'Total', `\xA5${totalPay.toLocaleString()}`]);

  bdRows.forEach((row, i) => {
    const isTotal = i === bdRows.length - 1;
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setFontSize(isTotal ? 9 : 8);
    doc.setTextColor(isTotal ? 26 : 80, isTotal ? 46 : 90, isTotal ? 90 : 120);
    if (isTotal) {
      doc.setDrawColor(26, 46, 90);
      doc.setLineWidth(0.4);
      doc.line(pl, y - 1, pr, y - 1);
    }
    doc.text(row[0], pl + 2, y + 4);
    doc.text(row[1], pr - 2, y + 4, { align: 'right' });
    y += 7;
  });
  y += 4;

  // ===== シフト一覧テーブル =====
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(107, 123, 164);
  doc.text(lang === 'ja' ? '\u30B7\u30D5\u30C8\u4E00\u89A7' : 'SHIFT LIST', pl, y);
  y += 4;

  // テーブルヘッダー
  doc.setFillColor(26, 46, 90);
  doc.rect(pl, y, contentW, 7, 'F');
  doc.setTextColor(245, 200, 66);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  const cols = l.listHead;
  const colW = [30, 50, 40, contentW - 120];
  const colX = [pl + 2, pl + 32, pl + 82, pl + 122];
  cols.forEach((h, i) => doc.text(h, colX[i], y + 5));
  y += 7;

  // テーブル行
  rowData.forEach((row, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(244, 246, 251);
      doc.rect(pl, y, contentW, 6.5, 'F');
    }
    doc.setTextColor(26, 46, 90);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    row.forEach((cell, i) => doc.text(String(cell), colX[i], y + 4.5));
    y += 6.5;
  });

  if (rowData.length === 0) {
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.text(l.noShift, pl + contentW / 2, y + 8, { align: 'center' });
    y += 16;
  }

  // ===== フッター =====
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(26, 46, 90);
    doc.rect(0, 287, 210, 10, 'F');
    doc.setTextColor(180, 180, 200);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Salary Manager', pl, 293);
    doc.text(`${i} / ${pageCount}`, pr, 293, { align: 'right' });
  }

  // 保存
  const fname = lang === 'ja'
    ? `給料_${year}年${month+1}月.pdf`
    : `salary_${year}_${pad2(month+1)}.pdf`;
  doc.save(fname);
}

// ===== Reset =====
function confirmReset() {
  const l = t();
  document.getElementById('reset-modal-title').textContent = l.resetTitle;
  document.getElementById('reset-modal-msg').textContent   = l.resetMsg;
  document.getElementById('reset-confirm-btn').textContent = l.resetConfirm;
  document.getElementById('reset-cancel-btn').textContent  = l.cancel;
  document.getElementById('reset-modal').classList.add('open');
}

function closeResetModal() {
  document.getElementById('reset-modal').classList.remove('open');
}

function handleResetOverlayClick(e) {
  if (e.target === document.getElementById('reset-modal')) closeResetModal();
}

function executeReset() {
  shifts = {};
  try { localStorage.removeItem('sm-shifts'); } catch(e) {}
  closeResetModal();
  renderCal();
  if (document.getElementById('page-summary').classList.contains('active')) renderSummary();
}
