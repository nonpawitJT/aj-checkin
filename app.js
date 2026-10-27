/* A&J เช็คอิน — LINE (LIFF) web app
   Staff: ลงเวลาด้วยรูปถ่าย, ดูกะ, ดูประวัติ
   Admin: การเข้างานวันนี้, จัดกะ, บันทึกความผิด, สรุป, พนักงาน */
(() => {
'use strict';

const CFG = window.APP_CONFIG || {};
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------------------------------------------------------- dates */
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const MONTHS_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const pad = (n) => String(n).padStart(2, '0');
const parseD = (k) => { const p = String(k).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (k, n) => { const d = parseD(k); d.setDate(d.getDate() + n); return keyOf(d); };
const be = (y) => y + 543;
const dShort = (k) => { const d = parseD(k); return `${DOW[d.getDay()]}. ${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };
const dLong = (k) => `${dShort(k)} ${be(parseD(k).getFullYear())}`;
const dSlash = (k) => { const d = parseD(k); return `${d.getDate()}/${d.getMonth() + 1}/${String(be(d.getFullYear())).slice(-2)}`; };
const hm = (t) => (t ? String(t).slice(0, 5).replace(/^0(\d)/, '$1').replace(':', '.') : '');
const toMin = (t) => { const p = String(t).split(':'); return (+p[0]) * 60 + (+p[1]); };
const mondayOf = (k) => addDays(k, -((parseD(k).getDay() + 6) % 7));
const monthLabel = (ym) => `${MONTHS[+ym.slice(5, 7) - 1]} ${be(+ym.slice(0, 4))}`;
const monthEnd = (ym) => { const p = ym.split('-').map(Number); return keyOf(new Date(p[0], p[1], 0)); };
const ymAdd = (ym, n) => { const p = ym.split('-').map(Number); const d = new Date(p[0], p[1] - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const minKey = (a, b) => (a < b ? a : b);
const fmtPhone = (p) => (p && p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}` : (p || ''));
const durText = (m) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h} ชม.${r ? ` ${r} นาที` : ''}` : `${r} นาที`; };
const shiftText = (d) => (d.off ? 'หยุด' : (d.has_shift || d.start) ? `${hm(d.start)}–${hm(d.end)}` : 'ยังไม่จัดกะ');

/* ---------------------------------------------------------------- constants */
const PRESETS = [['07:00', '17:00'], ['07:20', '20:20'], ['08:20', '20:20'], ['09:20', '19:20'], ['10:20', '20:20']];
const CAT = { close_early: 'ปิดร้านก่อนเวลา', late: 'มาสาย', absent: 'ขาดงานไม่แจ้งล่วงหน้า', other: 'อื่นๆ' };
const ICON = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .8 3.2 2.6 3.6 5.2"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  person: '<circle cx="10" cy="8" r="4"/><path d="M3 21c1-4 3.8-6 7-6s6 2 7 6M19 8v6M16 11h6"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
};
const svg = (name, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

/* ---------------------------------------------------------------- state */
const S = {
  token: null, me: null, shops: [], today: null, lineName: '', mode: null,
  tab: 'today', adm: 'board', ticket: 0, badges: {}, lastLoad: 0,
  regPhone: '', reg: { shop: '', face: null },
  todayData: null, myShifts: null, hist: null, histMonth: null,
  board: null, boardDate: null,
  plan: null, weekStart: null, planDay: null,
  notices: null, noticeMonth: null, noticeFilter: 'all',
  summary: null, period: null,
  personData: null, personId: null, personBack: 'summary', personPeriod: null,
  peopleData: null, pending: null, edit: null, form: null,
};
let size = 'md';
try { size = localStorage.getItem('aj-size') || 'md'; } catch (e) { /* ignore */ }
document.documentElement.dataset.size = size;

/* ---------------------------------------------------------------- API */
class AppError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
let reloginStarted = false;
async function api(action, args = {}) {
  let res;
  try {
    res = await fetch(CFG.API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-line-token': S.token || '' },
      body: JSON.stringify({ action, args }),
    });
  } catch (e) {
    throw new AppError('network', 'เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
  }
  let body = {};
  try { body = await res.json(); } catch (e) { /* ignore */ }
  if (!res.ok) {
    if (body.error === 'token_expired') relogin();
    throw new AppError(body.error || 'server', body.message || 'ระบบขัดข้อง ลองใหม่อีกครั้ง');
  }
  return body;
}
function relogin() {
  if (reloginStarted) return;
  reloginStarted = true;
  try { if (sessionStorage.getItem('aj-relogin')) return; sessionStorage.setItem('aj-relogin', '1'); } catch (e) { /* ignore */ }
  setTimeout(() => {
    if (window.liff && liff.isInClient()) location.reload();
    else if (window.liff) { try { liff.logout(); } catch (e) { /* ignore */ } liff.login({ redirectUri: location.href }); }
  }, 600);
}

/* ---------------------------------------------------------------- boot */
async function boot() {
  if (!CFG.LIFF_ID || !CFG.API_URL) return fatal('ยังไม่ได้ตั้งค่าแอป', 'กรุณาแจ้งผู้ดูแลระบบ');
  if (!window.liff) return fatal('โหลด LINE ไม่สำเร็จ', 'ตรวจอินเทอร์เน็ตแล้วเปิดแอปใหม่อีกครั้ง', true);
  try {
    await liff.init({ liffId: CFG.LIFF_ID });
  } catch (e) {
    return fatal('เปิดผ่าน LINE ไม่สำเร็จ', (e && e.message) || '', true);
  }
  if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return; }
  S.token = liff.getIDToken();
  if (!S.token) return fatal('LINE ไม่ได้ส่งข้อมูลยืนยันตัวตน', 'ต้องติ๊กสิทธิ์ openid ในการตั้งค่า LIFF');
  await loadMe();
}
async function loadMe() {
  bare('<p class="loading">กำลังโหลด…</p>');
  let r;
  try { r = await api('me'); } catch (e) { return fatal('เข้าระบบไม่สำเร็จ', e.message, true); }
  try { sessionStorage.removeItem('aj-relogin'); } catch (e) { /* ignore */ }
  S.shops = r.shops || [];
  S.today = r.today;
  S.lineName = r.line_name || '';
  S.me = r.person;
  route();
}
// Rich menu buttons open the app with ?tab=today|shifts|history
let deepLink = null;
try { deepLink = new URLSearchParams(location.search).get('tab'); } catch (e) { /* ignore */ }
function route() {
  const p = S.me;
  if (!p) return renderPhone('');
  if (p.status === 'pending') return renderPending();
  if (p.status === 'inactive') return renderInactive();
  if (p.role !== 'admin') S.mode = 'staff';
  else if (!S.mode || (S.mode === 'staff' && !p.shop_code)) S.mode = 'admin';
  if (deepLink) {
    if (S.mode === 'staff' && ['today', 'shifts', 'history'].includes(deepLink)) S.tab = deepLink;
    else if (S.mode === 'admin') S.adm = { today: 'board', shifts: 'plan', history: 'summary' }[deepLink] || S.adm;
    deepLink = null;
  }
  load();
}

/* ---------------------------------------------------------------- frame */
const sizeSwitch = () => `<div class="size-switch" role="group" aria-label="ขนาดตัวอักษร"><button type="button" data-act="size" data-s="md" aria-pressed="${size !== 'lg'}">ก</button><button type="button" class="lg" data-act="size" data-s="lg" aria-pressed="${size === 'lg'}">ก+</button></div>`;
function topbar(sub, extra) {
  return `<header class="top"><div class="wrap"><div class="brand"><span class="mark">A&amp;J</span><div><div class="brand-name">A&amp;J เช็คอิน</div><div class="brand-sub">${sub}</div></div></div>${extra || ''}${sizeSwitch()}</div></header>`;
}
function bare(inner) {
  $('#app').innerHTML = topbar('ลงเวลาพนักงาน') + `<main class="wrap no-nav">${inner}</main>`;
}
function fatal(title, detail, retry) {
  bare(`<div class="panel errbox"><h1 class="section-title">${esc(title)}</h1>${detail ? `<p class="note">${esc(detail)}</p>` : ''}${retry ? '<button class="btn solid" type="button" data-act="reload">ลองใหม่</button>' : ''}</div>`);
}
function navItems() {
  return S.mode === 'admin'
    ? [['board', 'วันนี้', 'users'], ['plan', 'จัดกะ', 'cal'], ['notices', 'บันทึก', 'flag'], ['summary', 'สรุป', 'chart'], ['people', 'พนักงาน', 'person']]
    : [['today', 'ลงเวลา', 'clock'], ['shifts', 'กะของฉัน', 'cal'], ['history', 'ประวัติ', 'list']];
}
function shell(content) {
  const p = S.me, admin = S.mode === 'admin';
  const sub = admin ? `ผู้จัดการ · ${esc(p.nickname)}` : `${esc(p.nickname)} · ร้าน ${esc(p.shop_code || '-')}`;
  const extra = p.role === 'admin' && p.shop_code ? `<button class="btn" type="button" data-act="mode">${admin ? 'ลงเวลาของฉัน' : 'หลังบ้าน'}</button>` : '';
  const cur = admin ? (S.adm === 'person' ? S.personBack : S.adm) : S.tab;
  const nav = navItems().map(([k, label, ic]) => {
    const badge = admin ? S.badges[k] || 0 : 0;
    return `<button type="button" data-act="tab" data-t="${k}"${cur === k ? ' aria-current="page"' : ''}>${svg(ic)}<span>${label}</span>${badge ? `<span class="dot">${badge}</span>` : ''}</button>`;
  }).join('');
  return topbar(sub, extra) + `<main class="wrap" id="main">${content}</main><nav class="nav" aria-label="เมนู"><div class="wrap">${nav}</div></nav>`;
}
function view() { return S.mode === 'admin' ? VIEWS['adm_' + S.adm] : VIEWS['st_' + S.tab]; }
function paint() { $('#app').innerHTML = shell(view().render()); }
async function load() {
  const v = view(), ticket = ++S.ticket;
  $('#app').innerHTML = shell('<p class="loading">กำลังโหลด…</p>');
  try {
    await v.load();
    if (ticket !== S.ticket) return;
    S.lastLoad = Date.now();
    paint();
  } catch (e) {
    if (ticket !== S.ticket) return;
    $('#main').innerHTML = `<div class="panel errbox"><p class="err">${esc(e.message)}</p><button class="btn solid" type="button" data-act="retry">ลองใหม่</button></div>`;
  }
}
function goTab(t) {
  if (S.mode === 'admin') S.adm = t; else S.tab = t;
  window.scrollTo(0, 0);
  load();
}

/* ---------------------------------------------------------------- shared bits */
function avatar(p, cls) {
  const src = p.face_photo || p.line_picture;
  const ini = esc(String(p.nickname || '?').replace(/^[เแโใไ]/, '').charAt(0));
  return src ? `<span class="avatar ${cls || ''}"><img src="${esc(src)}" alt="" loading="lazy"></span>` : `<span class="avatar ${cls || ''}">${ini}</span>`;
}
const shopGate = (code) => (code ? `<span class="gate">${esc(code)}</span>` : '');
function stateChip(d) {
  switch (d.state) {
    case 'done': return `<span class="chip done">ออกงาน ${hm(d.out)}</span>`;
    case 'in': return d.late ? `<span class="chip warn">สาย ${d.late} นาที · เข้า ${hm(d.in)}</span>` : `<span class="chip ok">เข้างานแล้ว ${hm(d.in)}</span>`;
    case 'noout': return '<span class="chip bad">ไม่ได้ลงเวลาออก</span>';
    case 'off': return '<span class="chip">วันหยุด</span>';
    case 'no_shift': return '<span class="chip">ไม่มีกะ</span>';
    case 'absent': return '<span class="chip bad">ไม่ได้เข้างาน</span>';
    case 'missing': return '<span class="chip bad">ยังไม่เข้างาน</span>';
    case 'wait': return '<span class="chip">รอเข้างาน</span>';
    default: return '';
  }
}
function dayNotes(d) {
  const out = [];
  if (d.late) out.push(`<span class="t-warn">สาย ${d.late} นาที</span>`);
  if (d.early) out.push(`<span class="t-warn">ออกก่อน ${d.early} นาที</span>`);
  if (d.state === 'noout') out.push('<span class="t-bad">ไม่ได้ลงเวลาออก</span>');
  if (d.state === 'absent') out.push('<span class="t-bad">ไม่ได้เข้างาน</span>');
  if (d.in_note || d.out_note) out.push('<span class="t-muted">ผู้จัดการแก้เวลา</span>');
  return out.join(' · ');
}
function monthsBack(n) {
  const cur = (S.today || keyOf(new Date())).slice(0, 7), out = [];
  for (let i = 0; i < n; i++) out.push(ymAdd(cur, -i));
  return out;
}
function periodOptions() {
  const y = S.today.slice(0, 4);
  return monthsBack(12).map((m) => [`m:${m}`, monthLabel(m)]).concat([[`y:${y}`, `ทั้งปี ${be(+y)}`], ['r:12', '12 เดือนล่าสุด']]);
}
function periodRange(v) {
  const [k, x] = String(v).split(':');
  if (k === 'm') return { from: `${x}-01`, to: minKey(monthEnd(x), S.today) };
  if (k === 'y') return { from: `${x}-01-01`, to: S.today };
  return { from: `${ymAdd(S.today.slice(0, 7), -11)}-01`, to: S.today };
}
const periodSelect = (id, val) => `<select id="${id}">${periodOptions().map(([v, l]) => `<option value="${v}"${v === val ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
function eventItem(e, opts = {}) {
  const tag = e.kind === 'auto' ? '<span class="tag">ระบบจับเอง</span>'
    : e.decision === 'excused' ? '<span class="tag">แจ้งแล้ว / ลา</span>' : `<span class="tag">บันทึกโดย ${esc(e.by || '-')}</span>`;
  const label = e.category === 'absent' && e.decision === 'excused' ? 'ขาดงาน (แจ้งล่วงหน้าแล้ว)' : CAT[e.category] || e.category;
  const mins = e.minutes ? ` ${e.minutes} นาที` : '';
  const thumb = e.photo ? `<button class="ev-thumb" type="button" data-act="view-photo" data-src="${esc(e.photo)}" data-cap="${esc(label)}"><img src="${esc(e.photo)}" alt="รูปหลักฐาน" loading="lazy"></button>` : '';
  const del = e.kind === 'manual' ? `<button class="btn quiet" type="button" data-act="notice-del" data-id="${esc(e.id)}" data-confirm="แตะอีกครั้งเพื่อลบ">ลบ</button>` : '';
  return `<li class="ev"><div class="item-main">
      <div class="item-line"><b>${dShort(e.date)}</b>${opts.hideName ? '' : `<span class="item-name">${esc(e.nickname)}</span>${shopGate(e.shop_code)}`}</div>
      <div class="item-line"><span class="cat ${e.decision === 'excused' ? '' : esc(e.category)}">${esc(label)}${mins}</span>${tag}</div>
      ${e.detail ? `<div class="item-sub">${esc(e.detail)}</div>` : ''}${del ? `<div>${del}</div>` : ''}
    </div>${thumb}</li>`;
}

/* ---------------------------------------------------------------- photos */
const camUser = $('#cam-user'), pickAny = $('#pick-any');
let photoCb = null;
function pickPhoto(input, cb) { photoCb = cb; input.value = ''; input.click(); }
[camUser, $('#cam-env'), pickAny].forEach((inp) => inp.addEventListener('change', () => {
  const f = inp.files && inp.files[0], cb = photoCb;
  photoCb = null;
  if (f && cb) cb(f);
}));
function makePhoto(file, lines) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      try {
        const sc = Math.min(1, 720 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const g = cv.getContext('2d');
        g.drawImage(img, 0, 0, w, h);
        if (lines && lines.length) {
          const fs = Math.max(14, Math.round(w / 26)), band = fs * (1.4 + lines.length * 1.5);
          const grd = g.createLinearGradient(0, h - band, 0, h);
          grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.82)');
          g.fillStyle = grd; g.fillRect(0, h - band, w, band);
          lines.forEach((t, i) => {
            const first = i === 0;
            g.fillStyle = first ? '#FF9440' : '#FFFFFF';
            g.font = `${first ? 700 : 600} ${first ? Math.round(fs * 1.2) : fs}px Sarabun, sans-serif`;
            g.fillText(t, Math.round(fs * 0.8), h - fs * 0.75 - (lines.length - 1 - i) * fs * 1.5);
          });
        }
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.72));
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}

/* ---------------------------------------------------------------- first-time screens */
function renderPhone(err) {
  bare(`<div class="welcome">
    <div class="hero"><span class="mark">A&amp;J</span><h1 class="view-title">สวัสดี${S.lineName ? ` ${esc(S.lineName)}` : ''}</h1>
      <p class="note">ครั้งแรกให้กรอกเบอร์โทรของคุณ เพื่อผูกกับบัญชี LINE นี้ ครั้งต่อไปเปิดแอปได้เลย</p></div>
    <form class="panel form" style="padding:18px" id="phone-form" novalidate>
      <div class="field"><label for="ph">เบอร์โทรศัพท์</label><input type="tel" id="ph" inputmode="numeric" autocomplete="tel" placeholder="08x-xxx-xxxx" value="${esc(fmtPhone(S.regPhone))}"></div>
      <p class="err" id="ph-err" role="alert">${esc(err)}</p>
      <button class="btn-primary" type="submit">ถัดไป</button>
    </form></div>`);
}
function renderRegister() {
  const shops = S.shops.map((s) => `<button type="button" data-act="reg-shop" data-s="${esc(s.code)}" aria-pressed="${S.reg.shop === s.code}">${esc(s.code)}</button>`).join('');
  bare(`<div class="welcome">
    <div><h1 class="view-title">ลงทะเบียนพนักงานใหม่</h1><p class="note">เบอร์ <span class="num">${esc(fmtPhone(S.regPhone))}</span> ยังไม่มีในระบบ กรอกข้อมูลแล้วรอผู้จัดการอนุมัติ</p></div>
    <form class="panel form" style="padding:18px" id="reg-form" novalidate>
      <div class="field"><label for="rg-nick">ชื่อเล่น</label><input type="text" id="rg-nick" maxlength="20" autocomplete="nickname"></div>
      <div class="field"><label for="rg-full">ชื่อ-นามสกุล</label><input type="text" id="rg-full" maxlength="60" autocomplete="name"></div>
      <div class="field"><span class="lbl">ร้านประจำ</span><div class="shopgrid" id="rg-shops">${shops}</div></div>
      <div class="field"><span class="lbl">รูปหน้าตรง</span>
        <div class="face-pick"><span class="avatar" id="rg-face-prev">${S.reg.face ? `<img src="${S.reg.face}" alt="">` : svg('cam', 34)}</span>
        <button class="btn" type="button" data-act="reg-face">${S.reg.face ? 'ถ่ายใหม่' : 'ถ่ายรูปหน้าตรง'}</button></div>
        <p class="help">ใช้เทียบกับรูปตอนลงเวลา</p></div>
      <p class="err" id="rg-err" role="alert"></p>
      <button class="btn-primary" type="submit">ส่งข้อมูล</button>
      <button class="btn quiet" type="button" data-act="reg-back">เปลี่ยนเบอร์โทร</button>
    </form></div>`);
}
function renderPending() {
  bare(`<div class="welcome center"><div class="hero"><span class="mark">A&amp;J</span><h1 class="view-title">ส่งข้อมูลแล้ว</h1>
    <p>รอผู้จัดการอนุมัติ เมื่ออนุมัติแล้ว เปิดแอปนี้อีกครั้งเพื่อเริ่มลงเวลา</p></div>
    <button class="btn wide" type="button" data-act="reload-me">ตรวจสอบอีกครั้ง</button></div>`);
}
function renderInactive() {
  bare(`<div class="welcome center"><div class="hero"><span class="mark">A&amp;J</span><h1 class="view-title">บัญชีนี้ถูกปิดใช้งาน</h1>
    <p>ถ้าคิดว่าไม่ถูกต้อง กรุณาติดต่อผู้จัดการร้าน</p></div></div>`);
}

/* ---------------------------------------------------------------- staff views */
function clockText() { const d = new Date(); return `${d.getHours()}.${pad(d.getMinutes())}`; }
function slot(kind, d) {
  const t = d[kind], photo = d[kind + '_photo'], label = kind === 'in' ? 'เข้างาน' : 'ออกงาน';
  if (!t) return `<div class="slot"><div class="shot ph">${svg('cam', 34)}</div><div><span class="k">${label}</span><span class="slot-v num">—</span></div></div>`;
  const img = photo
    ? `<button class="shot" type="button" data-act="view-photo" data-src="${esc(photo)}" data-cap="${label} ${hm(t)} น."><img src="${esc(photo)}" alt="รูป${label}"></button>`
    : '<div class="shot ph">ไม่มีรูป</div>';
  const timed = d.has_shift && !d.off;
  const sub = kind === 'in'
    ? (d.late ? `<span class="t-warn">สาย ${d.late} นาที</span>` : timed ? '<span class="t-ok">ตรงเวลา</span>' : '')
    : (d.early ? `<span class="t-warn">ออกก่อน ${d.early} นาที</span>` : timed ? 'ครบกะ' : '');
  return `<div class="slot">${img}<div><span class="k">${label}</span><span class="slot-v num">${hm(t)}</span>${sub ? `<br><span>${sub}</span>` : ''}</div></div>`;
}
function todayHint(d) {
  if (!d.has_shift || d.off || !d.start) return '';
  const now = new Date(), n = now.getHours() * 60 + now.getMinutes();
  if (!d.in) {
    const diff = n - toMin(d.start);
    return diff > 0 ? `<span class="t-warn">เลยเวลาเข้ากะมา ${durText(diff)}</span>` : diff === 0 ? 'ถึงเวลาเข้ากะพอดี' : `อีก ${durText(-diff)} ถึงเวลาเข้ากะ`;
  }
  if (!d.out) {
    let end = toMin(d.end); if (end <= toMin(d.start)) end += 1440;
    const left = end - n;
    return left > 0 ? `อีก ${durText(left)} ถึงเวลาปิดร้าน` : `ถึงเวลาปิดร้านแล้ว`;
  }
  return '';
}
const VIEWS = {};
VIEWS.st_today = {
  async load() { S.todayData = await api('today'); S.today = S.todayData.date || S.today; },
  render() {
    const p = S.me, d = (S.todayData && S.todayData.day) || {};
    const shiftV = d.off ? 'วันหยุด' : d.has_shift ? `<span class="num">${hm(d.start)}–${hm(d.end)}</span>` : 'ยังไม่มีกะ';
    let action;
    if (!d.in) action = `<button class="btn-primary" type="button" data-act="punch" data-kind="in">${svg('cam', 26)}ถ่ายรูปเข้างาน</button>`;
    else if (!d.out) action = `<button class="btn-primary" type="button" data-act="punch" data-kind="out">${svg('cam', 26)}ถ่ายรูปปิดร้าน / ออกงาน</button><p class="note center">ตอนปิดร้าน ถ่ายให้เห็นตัวเองกับหน้าร้าน</p>`;
    else action = '<button class="btn-primary" type="button" disabled>ลงเวลาครบแล้ว</button>';
    const hint = todayHint(d);
    const note = d.note ? `<div class="pass-note"><span class="tag">หมายเหตุกะ</span> ${esc(d.note)}</div>`
      : !d.has_shift ? '<div class="pass-note">ผู้จัดการยังไม่ได้จัดกะวันนี้ ลงเวลาได้ตามปกติ</div>' : '';
    return `<article class="pass" aria-label="ลงเวลาวันนี้">
      <div class="pass-top"><div class="gate-big"><span class="gk">ร้าน</span><span class="gv">${esc(p.shop_code || '-')}</span></div>
        <div class="pass-who"><div class="pass-name">${esc(p.nickname)}</div><div class="k">${dLong(S.today)}</div></div>
        <div class="pass-clock"><span class="k">ตอนนี้</span><span class="v" id="clock">${clockText()}</span></div></div>
      <div class="pass-info"><div><span class="k">กะวันนี้</span><span class="v">${shiftV}</span></div>
        <div><span class="k">สถานะ</span>${stateChip(d) || '<span class="chip">—</span>'}</div></div>
      ${note}<div class="perf" aria-hidden="true"></div>
      <div class="slots">${slot('in', d)}${slot('out', d)}</div>
      <div class="pass-action">${action}${hint ? `<p class="hint">${hint}</p>` : ''}</div></article>
      <p class="note center" style="margin-top:12px">ระบบใช้เวลาตอนกดยืนยัน ไม่ใช่เวลาในมือถือ</p>`;
  },
};
VIEWS.st_shifts = {
  async load() { S.myShifts = await api('my_shifts'); S.today = S.myShifts.today || S.today; },
  render() {
    const r = S.myShifts;
    const rows = (r.days || []).map((d) => `<li class="day-row${d.date === r.today ? ' today' : ''}"><span class="d">${d.date === r.today ? 'วันนี้' : dShort(d.date)}</span>
      <span class="${d.off ? 't-bad' : d.has_shift ? 'num' : 't-muted'}">${shiftText(d)}</span>${d.note ? `<span class="x">${esc(d.note)}</span>` : ''}</li>`).join('');
    return `<div class="stack"><div><h1 class="view-title">กะของฉัน</h1><p class="note">14 วันข้างหน้า ถ้ามีการเปลี่ยนกะตามไฟลท์ จะเห็นที่นี่ทันที</p></div><ol class="panel list">${rows}</ol></div>`;
  },
};
VIEWS.st_history = {
  async load() {
    if (!S.histMonth) S.histMonth = S.today.slice(0, 7);
    S.hist = await api('my_history', { month: S.histMonth });
  },
  render() {
    const r = S.hist, t = r.totals || {};
    const opts = monthsBack(6).map((m) => `<option value="${m}"${m === S.histMonth ? ' selected' : ''}>${monthLabel(m)}</option>`).join('');
    const rows = (r.days || []).slice().reverse().map((d) => `<li class="day-row${d.date === r.today ? ' today' : ''}"><span class="d">${dShort(d.date)}</span>
      <span>${d.off ? '<span class="t-bad">หยุด</span>' : `<span class="num">${d.has_shift ? `${hm(d.start)}–${hm(d.end)}` : 'ไม่มีกะ'}</span>`}${d.in ? ` · เข้า <span class="num">${hm(d.in)}</span>` : ''}${d.out ? ` · ออก <span class="num">${hm(d.out)}</span>` : ''}</span>
      ${dayNotes(d) ? `<span class="x">${dayNotes(d)}</span>` : ''}</li>`).join('');
    return `<div class="stack"><div class="view-head"><h1 class="view-title">ประวัติของฉัน</h1>
      <div class="field" style="min-width:12rem"><label class="vh" for="hist-month">เดือน</label><select id="hist-month">${opts}</select></div></div>
      <div class="tiles"><div class="panel tile"><span class="k">มาทำงาน</span><span class="v">${t.worked || 0}</span>วัน</div>
        <div class="panel tile ${t.late_n ? 'warn' : ''}"><span class="k">มาสาย</span><span class="v">${t.late_n || 0}</span>ครั้ง · ${t.late_m || 0} นาที</div>
        <div class="panel tile ${t.early_n ? 'warn' : ''}"><span class="k">ออกก่อนเวลา</span><span class="v">${t.early_n || 0}</span>ครั้ง</div></div>
      ${rows ? `<ol class="panel list">${rows}</ol>` : '<p class="panel empty">ยังไม่มีข้อมูลในเดือนนี้</p>'}</div>`;
  },
};

/* ---------------------------------------------------------------- admin: today board */
VIEWS.adm_board = {
  async load() {
    S.board = await api('adm_board', { date: S.boardDate || '' });
    S.today = S.board.today;
    S.badges.people = S.board.pending_people;
    S.badges.notices = S.board.pending_absences;
  },
  render() {
    const r = S.board, date = r.date, today = r.today, people = r.people || [];
    const c = { in: 0, late: 0, miss: 0, done: 0, off: 0, plan: 0 };
    people.forEach((p) => {
      const d = p.day || {};
      if (d.state === 'in') c.in++;
      if (d.late) c.late++;
      if (d.state === 'missing' || d.state === 'absent') c.miss++;
      if (d.state === 'done' || d.state === 'noout') c.done++;
      if (d.off) c.off++;
      if (d.has_shift && !d.off) c.plan++;
    });
    const stat = (v, k, cls) => `<div class="stat ${v ? cls : ''}"><span class="stat-v">${v}</span><span class="stat-k">${k}</span></div>`;
    const stats = date > today
      ? `<div class="panel stats" style="grid-template-columns:1fr 1fr">${stat(c.plan, 'เข้ากะตามตาราง', '')}${stat(c.off, 'หยุด', '')}</div>`
      : `<div class="panel stats">${stat(c.in, date === today ? 'กำลังทำงาน' : 'ไม่ลงออก', 'ok')}${stat(c.late, 'มาสาย', 'warn')}${stat(c.miss, date === today ? 'ยังไม่เข้า' : 'ไม่มา', 'bad')}${stat(c.done, 'ออกแล้ว', '')}</div>`;
    const banners = [
      r.pending_people ? `<button class="banner" type="button" data-act="tab" data-t="people">มีพนักงานใหม่รออนุมัติ ${r.pending_people} คน</button>` : '',
      r.pending_absences ? `<button class="banner bad" type="button" data-act="tab" data-t="notices">มีวันขาดงานรอยืนยัน ${r.pending_absences} รายการ</button>` : '',
    ].join('');
    const shops = S.shops.map((s) => {
      const list = people.filter((p) => p.shop_code === s.code);
      if (!list.length) return '';
      const working = list.filter((p) => p.day && p.day.has_shift && !p.day.off).length;
      const rows = list.map((p) => {
        const d = p.day || {};
        const times = [d.in ? `เข้า ${hm(d.in)}` : '', d.out ? `ออก ${hm(d.out)}` : ''].filter(Boolean).join(' · ');
        return `<li><button class="item" type="button" data-act="board-person" data-id="${esc(p.id)}">${avatar(p)}<span class="item-main">
          <span class="item-line"><span class="item-name">${esc(p.nickname)}</span><span class="num">${shiftText(d)}</span></span>
          <span class="item-line">${stateChip(d)}${times && d.state !== 'done' ? `<span class="item-sub num">${times}</span>` : d.state === 'done' ? `<span class="item-sub num">เข้า ${hm(d.in)}</span>` : ''}</span>
          ${d.note ? `<span class="item-sub">${esc(d.note)}</span>` : ''}</span></button></li>`;
      }).join('');
      return `<section class="panel"><div class="shop-head">${shopGate(s.code)}<span class="note">เข้ากะ ${working} จาก ${list.length} คน</span></div><ul class="list">${rows}</ul></section>`;
    }).join('');
    return `<div class="stack">
      <div class="datenav"><button class="icon-btn" type="button" data-act="board-day" data-d="-1" aria-label="วันก่อนหน้า">‹</button>
        <div class="datenav-label"><span class="k">${date === today ? 'วันนี้' : date < today ? 'ย้อนหลัง' : 'ล่วงหน้า'}</span><strong>${dLong(date)}</strong></div>
        <button class="icon-btn" type="button" data-act="board-day" data-d="1" aria-label="วันถัดไป">›</button></div>
      ${date !== today ? '<button class="btn quiet" type="button" data-act="board-day" data-d="0">กลับมาวันนี้</button>' : ''}
      ${banners}${stats}
      ${shops || '<p class="panel empty">ยังไม่มีพนักงานในระบบ ไปเพิ่มได้ที่เมนู "พนักงาน" หรือให้พนักงานเปิดแอปแล้วลงทะเบียนเอง</p>'}
      <p class="note center">แตะชื่อเพื่อดูรูป แก้เวลา หรือบันทึกความผิด</p></div>`;
  },
};
function openBoardPerson(id) {
  const p = (S.board.people || []).find((x) => x.id === id);
  if (!p) return;
  const d = p.day || {}, date = S.board.date;
  const fig = (k, label) => (d[k + '_photo'] ? `<figure><button class="shot" type="button" data-act="view-photo" data-src="${esc(d[k + '_photo'])}" data-cap="${label} ${hm(d[k])} น."><img src="${esc(d[k + '_photo'])}" alt="รูป${label}"></button><figcaption>${label} ${hm(d[k])} น.</figcaption></figure>`
    : `<figure><div class="shot ph">${d[k] ? 'ไม่มีรูป' : 'ยังไม่ลงเวลา'}</div><figcaption>${label}${d[k] ? ` ${hm(d[k])} น.` : ''}</figcaption></figure>`);
  sheet(`<h3>${esc(p.nickname)} · ร้าน ${esc(p.shop_code)}</h3><p class="note">${dLong(date)} · กะ ${shiftText(d)}</p>
    <div class="photos2">${fig('in', 'เข้างาน')}${fig('out', 'ออกงาน')}</div>
    ${dayNotes(d) ? `<p>${dayNotes(d)}</p>` : ''}
    <div class="row-btns"><button class="btn" type="button" data-act="punch-edit" data-id="${esc(p.id)}" data-kind="in">แก้เวลาเข้า</button>
      <button class="btn" type="button" data-act="punch-edit" data-id="${esc(p.id)}" data-kind="out">แก้เวลาออก</button></div>
    <div class="row-btns"><button class="btn" type="button" data-act="board-shift" data-id="${esc(p.id)}">จัดกะวันนี้</button>
      <button class="btn" type="button" data-act="person-open" data-id="${esc(p.id)}" data-back="board">ดูประวัติ</button></div>
    <button class="btn solid wide" type="button" data-act="notice-new" data-pid="${esc(p.id)}" data-date="${date}">บันทึกความผิด</button>
    <div class="sheet-actions"><button class="btn" type="button" data-act="close">ปิด</button></div>`);
}
function openPunchEdit(id, kind) {
  const p = (S.board.people || []).find((x) => x.id === id), d = (p && p.day) || {}, date = S.board.date;
  const label = kind === 'in' ? 'เวลาเข้างาน' : 'เวลาออกงาน';
  const cur = d[kind] || (kind === 'in' ? d.start : d.end) || '';
  S.edit = { id, kind, date };
  sheet(`<h3>แก้${label}</h3><p class="note">${esc(p.nickname)} · ${dLong(date)}</p>
    <div class="field"><label for="pf-time">${label}</label><input type="time" id="pf-time" value="${esc(String(cur).slice(0, 5))}"></div>
    <p class="note">ใช้ตอนพนักงานลืมลงเวลา หรือมือถือมีปัญหา ระบบจะจดว่าผู้จัดการเป็นคนแก้</p>
    <p class="err" id="sheet-err" role="alert"></p>
    <div class="sheet-actions">${d[kind] ? '<button class="btn danger" type="button" data-act="punch-clear" data-confirm="แตะอีกครั้งเพื่อลบ">ลบเวลานี้</button>' : ''}<span class="spacer"></span>
      <button class="btn" type="button" data-act="close">ยกเลิก</button><button class="btn solid" type="button" data-act="punch-save">บันทึก</button></div>`);
}

/* ---------------------------------------------------------------- admin: shift planner */
VIEWS.adm_plan = {
  async load() {
    if (!S.weekStart) S.weekStart = mondayOf(S.today);
    if (!S.planDay || S.planDay < S.weekStart || S.planDay > addDays(S.weekStart, 6)) {
      S.planDay = S.today >= S.weekStart && S.today <= addDays(S.weekStart, 6) ? S.today : S.weekStart;
    }
    const r = await api('adm_shifts', { from: S.weekStart, days: 7 });
    r.map = {};
    (r.shifts || []).forEach((s) => { r.map[`${s.person_id}|${s.date}`] = s; });
    S.plan = r;
  },
  render() {
    const r = S.plan, days = Array.from({ length: 7 }, (_, i) => addDays(S.weekStart, i));
    const a = parseD(days[0]), b = parseD(days[6]);
    const label = a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MONTHS_S[b.getMonth()]} ${be(b.getFullYear())}` : `${a.getDate()} ${MONTHS_S[a.getMonth()]} – ${b.getDate()} ${MONTHS_S[b.getMonth()]} ${be(b.getFullYear())}`;
    const strip = days.map((k) => {
      const n = (r.people || []).filter((p) => { const s = r.map[`${p.id}|${k}`]; return s && !s.off; }).length;
      const d = parseD(k);
      return `<button type="button" data-act="plan-day" data-d="${k}" aria-pressed="${k === S.planDay}" class="${k === r.today ? 'today' : ''}"><span>${DOW[d.getDay()]}.</span><b>${d.getDate()}</b><small>${n} คน</small></button>`;
    }).join('');
    const groups = S.shops.map((s) => {
      const list = (r.people || []).filter((p) => p.shop_code === s.code);
      if (!list.length) return '';
      return `<section class="panel"><div class="shop-head">${shopGate(s.code)}</div><ul class="list">${list.map((p) => {
        const sh = r.map[`${p.id}|${S.planDay}`];
        const cls = !sh ? 'unset' : sh.off ? 'off' : toMin(sh.start) < 540 ? 'morning' : 'evening';
        const txt = !sh ? '+ จัดกะ' : sh.off ? 'หยุด' : `${hm(sh.start)}–${hm(sh.end)}`;
        return `<li class="item" style="cursor:default;align-items:center"><span class="item-main"><span class="item-name">${esc(p.nickname)}</span>${sh && sh.note ? `<span class="item-sub">${esc(sh.note)}</span>` : ''}</span>
          <button class="shift-btn ${cls}" type="button" data-act="plan-shift" data-id="${esc(p.id)}">${txt}</button></li>`;
      }).join('')}</ul></section>`;
    }).join('');
    return `<div class="stack"><div><h1 class="view-title">จัดกะ</h1><p class="note">แตะปุ่มกะเพื่อเปลี่ยนเวลา หรือให้หยุด พนักงานเห็นกะใหม่ทันที</p></div>
      <div class="datenav"><button class="icon-btn" type="button" data-act="plan-week" data-d="-7" aria-label="สัปดาห์ก่อน">‹</button>
        <div class="datenav-label"><span class="k">สัปดาห์</span><strong>${label}</strong></div>
        <button class="icon-btn" type="button" data-act="plan-week" data-d="7" aria-label="สัปดาห์ถัดไป">›</button></div>
      <div class="days">${strip}</div>
      <h2 class="section-title">${dLong(S.planDay)}</h2>
      ${groups || '<p class="panel empty">ยังไม่มีพนักงานที่ทำงานอยู่</p>'}
      <button class="btn wide" type="button" data-act="plan-copy" data-confirm="แตะอีกครั้งเพื่อคัดลอก (เติมเฉพาะวันที่ยังว่าง)">คัดลอกกะจากสัปดาห์ก่อนมาสัปดาห์นี้</button></div>`;
  },
};
function openShiftSheet(id, date, cur, name, onDone) {
  const fb = cur && !cur.off && cur.start ? cur : { start: '10:20', end: '20:20' };
  S.edit = { id, date, off: !!(cur && cur.off), start: fb.start, end: fb.end, has: !!cur, onDone };
  sheet(`<h3>กะของ ${esc(name)}</h3><p class="note">${dLong(date)}</p>
    <div class="choice wide" id="ed-presets">${PRESETS.map((p, i) => `<button type="button" class="mono" data-act="preset" data-i="${i}">${hm(p[0])}–${hm(p[1])}</button>`).join('')}<button type="button" class="off" data-act="preset-off">หยุด</button></div>
    <div class="grid2"><div class="field"><label for="ed-start">เข้ากะ</label><input type="time" id="ed-start"></div><div class="field"><label for="ed-end">เลิกกะ</label><input type="time" id="ed-end"></div></div>
    <div class="field"><label for="ed-note">หมายเหตุ / ไฟลท์ (ไม่ใส่ก็ได้)</label><input type="text" id="ed-note" maxlength="60" placeholder="เช่น ไฟลท์ TG 660 ดีเลย์" value="${esc((cur && cur.note) || '')}"></div>
    <p class="err" id="sheet-err" role="alert"></p>
    <div class="sheet-actions">${cur ? '<button class="btn quiet" type="button" data-act="shift-clear">ล้างกะนี้</button>' : ''}<span class="spacer"></span>
      <button class="btn" type="button" data-act="close">ยกเลิก</button><button class="btn solid" type="button" data-act="shift-save">บันทึกกะ</button></div>`);
  syncShift();
}
function syncShift() {
  const e = S.edit, st = $('#ed-start'), en = $('#ed-end');
  if (!e || !st) return;
  st.value = e.start; en.value = e.end; st.disabled = en.disabled = e.off;
  document.querySelectorAll('#ed-presets button').forEach((b) => {
    const on = b.dataset.act === 'preset-off' ? e.off : (!e.off && PRESETS[+b.dataset.i][0] === e.start && PRESETS[+b.dataset.i][1] === e.end);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

/* ---------------------------------------------------------------- admin: notices */
VIEWS.adm_notices = {
  async load() {
    if (!S.noticeMonth) S.noticeMonth = S.today.slice(0, 7);
    S.notices = await api('adm_notices', { from: `${S.noticeMonth}-01`, to: minKey(monthEnd(S.noticeMonth), S.today) });
    S.badges.notices = (S.notices.pending || []).length;
  },
  render() {
    const r = S.notices;
    const pend = (r.pending || []).map((x) => `<li class="ev" style="grid-template-columns:1fr"><div class="item-main">
        <div class="item-line"><b>${dShort(x.date)}</b><span class="item-name">${esc(x.nickname)}</span>${shopGate(x.shop_code)}</div>
        <div class="item-sub">กะ ${hm(x.start)}–${hm(x.end)} ไม่ได้ลงเวลาเข้างาน</div>
        <div class="row-btns"><button class="btn danger" type="button" data-act="absent" data-v="recorded" data-pid="${esc(x.person_id)}" data-date="${x.date}">ขาด ไม่แจ้ง</button>
          <button class="btn" type="button" data-act="absent" data-v="excused" data-pid="${esc(x.person_id)}" data-date="${x.date}">แจ้งแล้ว / ลา</button></div></div></li>`).join('');
    const filters = [['all', 'ทั้งหมด'], ['close_early', CAT.close_early], ['late', CAT.late], ['absent', 'ขาดงาน'], ['other', CAT.other]]
      .map(([k, l]) => `<button type="button" data-act="notice-filter" data-f="${k}" aria-pressed="${S.noticeFilter === k}">${l}</button>`).join('');
    const evs = (r.events || []).filter((e) => S.noticeFilter === 'all' || e.category === S.noticeFilter);
    const opts = monthsBack(12).map((m) => `<option value="${m}"${m === S.noticeMonth ? ' selected' : ''}>${monthLabel(m)}</option>`).join('');
    return `<div class="stack"><div class="view-head"><h1 class="view-title">บันทึกความผิด</h1>
        <button class="btn solid" type="button" data-act="notice-new">+ บันทึกความผิด</button></div>
      ${pend ? `<section class="panel"><div class="shop-head"><b class="t-bad">ขาดงาน รอยืนยัน (${r.pending.length})</b></div><ul class="list">${pend}</ul></section>` : ''}
      <div class="field"><label for="notice-month">เดือน</label><select id="notice-month">${opts}</select></div>
      <div class="filters" role="group" aria-label="ประเภท">${filters}</div>
      ${evs.length ? `<ul class="panel list">${evs.map((e) => eventItem(e)).join('')}</ul>` : '<p class="panel empty">ไม่มีรายการในเดือนนี้</p>'}
      <p class="note">มาสาย และ ปิดร้านก่อนเวลา ระบบจับเองจากเวลาถ่ายรูปเทียบกับกะ เรื่องอื่นกด "+ บันทึกความผิด"</p></div>`;
  },
};
async function ensurePeople() {
  S.peopleData = await api('adm_people');
  return S.peopleData.people || [];
}
async function openNoticeForm(pre) {
  sheet('<p class="loading">กำลังโหลด…</p>');
  let people;
  try { people = (await ensurePeople()).filter((p) => p.status === 'active' && p.shop_code); }
  catch (e) { sheet(`<p class="err">${esc(e.message)}</p><div class="sheet-actions"><button class="btn" type="button" data-act="close">ปิด</button></div>`); return; }
  S.form = { pid: pre.pid || '', date: pre.date || S.today, cat: pre.cat || '', photo: null };
  const opts = S.shops.map((s) => {
    const list = people.filter((p) => p.shop_code === s.code);
    return list.length ? `<optgroup label="ร้าน ${esc(s.code)}">${list.map((p) => `<option value="${esc(p.id)}"${p.id === S.form.pid ? ' selected' : ''}>${esc(p.nickname)}</option>`).join('')}</optgroup>` : '';
  }).join('');
  sheet(`<h3>บันทึกความผิด</h3>
    <div class="field"><label for="nf-person">พนักงาน</label><select id="nf-person"><option value="">เลือกพนักงาน</option>${opts}</select></div>
    <div class="field"><label for="nf-date">วันที่เกิดเรื่อง</label><input type="date" id="nf-date" value="${S.form.date}" max="${S.today}"></div>
    <div class="field"><span class="lbl">ประเภท</span><div class="choice wide" id="nf-cats">${Object.entries(CAT).map(([k, l]) => `<button type="button" data-act="nf-cat" data-c="${k}" aria-pressed="${S.form.cat === k}">${l}</button>`).join('')}</div></div>
    <div class="field" id="nf-min-wrap"${S.form.cat === 'late' || S.form.cat === 'close_early' ? '' : ' hidden'}><label for="nf-min">กี่นาที (ถ้ารู้)</label><input type="number" id="nf-min" inputmode="numeric" min="0" step="1"></div>
    <div class="field"><label for="nf-detail">รายละเอียด</label><textarea id="nf-detail" maxlength="500" placeholder="เช่น ปิดร้าน 19.40 รีบไปส่งเงิน"></textarea></div>
    <div class="field"><span class="lbl">รูปหลักฐาน (ไม่บังคับ)</span><div class="face-pick"><span class="avatar" id="nf-prev">${svg('cam', 30)}</span><button class="btn" type="button" data-act="nf-photo">แนบรูป</button></div></div>
    <p class="err" id="sheet-err" role="alert"></p>
    <div class="sheet-actions"><button class="btn" type="button" data-act="close">ยกเลิก</button><button class="btn solid" type="button" data-act="nf-save">บันทึก</button></div>`);
}

/* ---------------------------------------------------------------- admin: summary & person */
VIEWS.adm_summary = {
  async load() {
    if (!S.period) S.period = `m:${S.today.slice(0, 7)}`;
    S.summary = await api('adm_summary', periodRange(S.period));
  },
  render() {
    const rows = S.summary.rows || [];
    const cell = (n, m) => `${n ? `<b class="t-warn">${n}</b>` : '0'}${m ? `<span class="k">${m} นาที</span>` : ''}`;
    const body = rows.map((x) => `<tr data-act="person-open" data-id="${esc(x.person_id)}" data-back="summary">
      <td><b>${esc(x.nickname)}</b>${x.status === 'inactive' ? '<span class="k">ลาออกแล้ว</span>' : ''}</td><td>${shopGate(x.shop_code)}</td>
      <td class="r">${x.worked}</td><td class="r">${cell(x.late_n, x.late_m)}</td><td class="r">${cell(x.early_n, x.early_m)}</td>
      <td class="r">${x.absent_n ? `<b class="t-bad">${x.absent_n}</b>` : '0'}${x.pending_absent ? `<span class="k">รอยืนยัน ${x.pending_absent}</span>` : ''}</td>
      <td class="r">${x.other_n ? `<b class="t-bad">${x.other_n}</b>` : '0'}</td></tr>`).join('');
    return `<div class="stack"><div><h1 class="view-title">สรุปพิจารณาความดีความชอบ</h1><p class="note">แตะชื่อเพื่อดูรายละเอียดทุกครั้ง</p></div>
      <div class="field"><label for="sum-period">ช่วงเวลา</label>${periodSelect('sum-period', S.period)}</div>
      ${rows.length ? `<div class="panel table-scroll"><table class="t"><thead><tr><th>ชื่อ</th><th>ร้าน</th><th class="r">ทำงาน (วัน)</th><th class="r">สาย (ครั้ง)</th><th class="r">ปิดก่อนเวลา</th><th class="r">ขาดไม่แจ้ง</th><th class="r">อื่นๆ</th></tr></thead><tbody>${body}</tbody></table></div>`
        : '<p class="panel empty">ยังไม่มีข้อมูลในช่วงนี้</p>'}
      ${rows.length ? '<button class="btn wide" type="button" data-act="sum-copy">คัดลอกไปวางใน Excel</button>' : ''}</div>`;
  },
};
VIEWS.adm_person = {
  async load() {
    if (!S.personPeriod) S.personPeriod = S.period || `m:${S.today.slice(0, 7)}`;
    S.personData = await api('adm_person_detail', Object.assign({ id: S.personId }, periodRange(S.personPeriod)));
  },
  render() {
    const r = S.personData, p = r.person, s = r.summary || {};
    const tile = (k, v, unit, cls) => `<div class="panel tile ${v ? cls : ''}"><span class="k">${k}</span><span class="v">${v || 0}</span>${unit}</div>`;
    const days = (r.days || []).map((d) => `<tr><td class="num">${dSlash(d.date)}</td><td class="num">${d.off ? 'หยุด' : d.has_shift ? `${hm(d.start)}-${hm(d.end)}` : '-'}</td><td class="num">${hm(d.in)}</td><td class="num">${hm(d.out)}</td><td>${dayNotes(d)}</td></tr>`).join('');
    return `<div class="stack"><button class="btn quiet" type="button" data-act="person-back" style="justify-self:start">‹ กลับ</button>
      <div class="item" style="cursor:default;padding:0">${avatar(p, 'lg')}<div class="item-main"><div class="item-line"><h1 class="view-title">${esc(p.nickname)}</h1>${shopGate(p.shop_code)}</div>
        ${p.full_name ? `<span class="item-sub">${esc(p.full_name)}</span>` : ''}<span class="item-sub num">${esc(fmtPhone(p.phone))}</span>
        ${p.status === 'inactive' ? '<span class="chip">ปิดใช้งาน</span>' : ''}</div></div>
      <div class="field"><label for="person-period">ช่วงเวลา</label>${periodSelect('person-period', S.personPeriod)}</div>
      <div class="tiles">${tile('มาทำงาน', s.worked, 'วัน', '')}${tile('มาสาย', s.late_n, `ครั้ง · ${s.late_m || 0} นาที`, 'warn')}${tile('ปิดก่อนเวลา', s.early_n, `ครั้ง · ${s.early_m || 0} นาที`, 'warn')}
        ${tile('ขาดไม่แจ้ง', s.absent_n, 'วัน', 'bad')}${tile('แจ้งลา', s.excused_n, 'วัน', '')}${tile('อื่นๆ', s.other_n, 'ครั้ง', 'bad')}</div>
      <button class="btn solid wide" type="button" data-act="notice-new" data-pid="${esc(p.id)}">+ บันทึกความผิดของ ${esc(p.nickname)}</button>
      <h2 class="section-title">รายการทั้งหมด</h2>
      ${(r.events || []).length ? `<ul class="panel list">${r.events.map((e) => eventItem(e, { hideName: true })).join('')}</ul>` : '<p class="panel empty">ไม่มีรายการในช่วงนี้</p>'}
      <h2 class="section-title">ลงเวลารายวัน</h2>
      ${days ? `<div class="panel table-scroll"><table class="t"><thead><tr><th>ว/ด/ป</th><th>กะ</th><th>เข้า</th><th>ออก</th><th>หมายเหตุ</th></tr></thead><tbody>${days}</tbody></table></div>` : '<p class="panel empty">ยังไม่มีการลงเวลา</p>'}</div>`;
  },
};
function openPerson(id, back) {
  S.personId = id;
  S.personBack = back || S.adm;
  S.personPeriod = back === 'summary' ? S.period : null;
  S.adm = 'person';
  closeSheet();
  window.scrollTo(0, 0);
  load();
}

/* ---------------------------------------------------------------- admin: people */
VIEWS.adm_people = {
  async load() {
    S.peopleData = await api('adm_people');
    S.badges.people = (S.peopleData.people || []).filter((p) => p.status === 'pending').length;
  },
  render() {
    const all = S.peopleData.people || [];
    const pending = all.filter((p) => p.status === 'pending'), active = all.filter((p) => p.status === 'active'), inactive = all.filter((p) => p.status === 'inactive');
    const row = (p) => `<li><button class="item" type="button" data-act="person-edit" data-id="${esc(p.id)}">${avatar(p)}<span class="item-main">
      <span class="item-line"><span class="item-name">${esc(p.nickname)}</span>${p.role === 'admin' ? '<span class="tag">ผู้จัดการ</span>' : ''}</span>
      <span class="item-sub num">${esc(fmtPhone(p.phone))}</span><span class="item-sub">${p.linked ? 'เปิดแอปแล้ว' : 'ยังไม่ได้เปิดแอป'}</span></span></button></li>`;
    const pend = pending.map((p) => `<li class="ev" style="grid-template-columns:auto 1fr">${avatar(p, 'lg')}<div class="item-main">
        <div class="item-line"><span class="item-name">${esc(p.nickname)}</span>${shopGate(p.shop_code)}</div>
        ${p.full_name ? `<span class="item-sub">${esc(p.full_name)}</span>` : ''}<span class="item-sub num">${esc(fmtPhone(p.phone))}</span>
        ${p.line_name ? `<span class="item-sub">LINE: ${esc(p.line_name)}</span>` : ''}
        <div class="row-btns"><button class="btn good" type="button" data-act="approve" data-id="${esc(p.id)}">อนุมัติ</button>
          <button class="btn danger" type="button" data-act="reject" data-id="${esc(p.id)}" data-confirm="แตะอีกครั้งเพื่อไม่อนุมัติ">ไม่อนุมัติ</button></div></div></li>`).join('');
    const groups = S.shops.map((s) => {
      const list = active.filter((p) => p.shop_code === s.code);
      return list.length ? `<section class="panel"><div class="shop-head">${shopGate(s.code)}<span class="note">${list.length} คน</span></div><ul class="list">${list.map(row).join('')}</ul></section>` : '';
    }).join('');
    const noShop = active.filter((p) => !p.shop_code);
    return `<div class="stack"><div class="view-head"><h1 class="view-title">พนักงาน</h1><button class="btn solid" type="button" data-act="person-new">+ เพิ่มพนักงาน</button></div>
      ${pend ? `<section class="panel"><div class="shop-head"><b class="t-warn">รออนุมัติ (${pending.length})</b></div><ul class="list">${pend}</ul></section>` : ''}
      ${groups}
      ${noShop.length ? `<section class="panel"><div class="shop-head"><b>ผู้จัดการ / ไม่มีร้านประจำ</b></div><ul class="list">${noShop.map(row).join('')}</ul></section>` : ''}
      ${inactive.length ? `<details class="panel"><summary class="shop-head" style="cursor:pointer"><b>ปิดใช้งานแล้ว (${inactive.length})</b></summary><ul class="list">${inactive.map(row).join('')}</ul></details>` : ''}
      <p class="note">พนักงานใหม่เปิดแอปแล้วลงทะเบียนเองได้ หรือกด "+ เพิ่มพนักงาน" ใส่ชื่อกับเบอร์ไว้ก่อน แล้วให้พนักงานเปิดแอปกรอกเบอร์เดียวกัน</p></div>`;
  },
};
function openPersonEdit(id) {
  const p = id ? (S.peopleData.people || []).find((x) => x.id === id) : null;
  const isMe = p && p.id === S.me.id;
  const shopOpts = `<option value="">ไม่มีร้านประจำ</option>` + S.shops.map((s) => `<option value="${esc(s.code)}"${p && p.shop_code === s.code ? ' selected' : ''}>${esc(s.code)}</option>`).join('');
  S.edit = { id: p ? p.id : '' };
  sheet(`<h3>${p ? `แก้ไขข้อมูล ${esc(p.nickname)}` : 'เพิ่มพนักงานใหม่'}</h3>
    <div class="grid2"><div class="field"><label for="pe-nick">ชื่อเล่น</label><input type="text" id="pe-nick" maxlength="20" value="${esc(p ? p.nickname : '')}"></div>
      <div class="field"><label for="pe-shop">ร้านประจำ</label><select id="pe-shop">${shopOpts}</select></div></div>
    <div class="field"><label for="pe-full">ชื่อ-นามสกุล (ไม่ใส่ก็ได้)</label><input type="text" id="pe-full" maxlength="60" value="${esc(p ? p.full_name || '' : '')}"></div>
    <div class="field"><label for="pe-phone">เบอร์โทร (ใช้เข้าแอป)</label><input type="tel" id="pe-phone" inputmode="numeric" maxlength="12" value="${esc(p ? fmtPhone(p.phone) : '')}" placeholder="08x-xxx-xxxx"></div>
    <div class="grid2"><div class="field"><label for="pe-role">สิทธิ์</label><select id="pe-role"${isMe ? ' disabled' : ''}><option value="staff">พนักงาน</option><option value="admin"${p && p.role === 'admin' ? ' selected' : ''}>ผู้จัดการ</option></select></div>
      <div class="field"><label for="pe-status">สถานะ</label><select id="pe-status"${isMe || !p ? ' disabled' : ''}><option value="active">ทำงานอยู่</option><option value="inactive"${p && p.status === 'inactive' ? ' selected' : ''}>ปิดใช้งาน (ลาออก)</option>${p && p.status === 'pending' ? '<option value="pending" selected>รออนุมัติ</option>' : ''}</select></div></div>
    ${p ? `<p class="note">${p.linked ? `ผูก LINE แล้ว${p.line_name ? ` (${esc(p.line_name)})` : ''}` : 'ยังไม่ได้เปิดแอป ให้พนักงานเปิดแอปแล้วกรอกเบอร์นี้'}</p>` : '<p class="note">เพิ่มแล้วให้พนักงานเปิดแอปใน LINE แล้วกรอกเบอร์นี้ ระบบจะผูกให้เอง ไม่ต้องรออนุมัติ</p>'}
    <p class="err" id="sheet-err" role="alert"></p>
    <div class="sheet-actions">${p && p.linked && !isMe ? '<button class="btn quiet" type="button" data-act="unlink" data-confirm="แตะอีกครั้งเพื่อยกเลิก">ยกเลิกการผูก LINE</button>' : ''}
      ${p ? `<button class="btn quiet" type="button" data-act="person-open" data-id="${esc(p.id)}" data-back="people">ดูประวัติ</button>` : ''}<span class="spacer"></span>
      <button class="btn" type="button" data-act="close">ยกเลิก</button><button class="btn solid" type="button" data-act="person-save">บันทึก</button></div>`);
}
async function savePerson(p, overrides) {
  return api('adm_person_save', Object.assign({
    id: p.id, nickname: p.nickname, full_name: p.full_name || '', phone: p.phone, shop_code: p.shop_code || '', role: p.role, status: p.status,
  }, overrides));
}

/* ---------------------------------------------------------------- sheet & toast */
const modal = $('#modal'), sheetEl = $('#sheet');
let lastFocus = null;
function sheet(html) {
  if (modal.hidden) lastFocus = document.activeElement;
  sheetEl.innerHTML = html;
  modal.hidden = false;
}
function closeSheet() {
  modal.hidden = true; sheetEl.innerHTML = ''; S.edit = null; S.pending = null; S.form = null;
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}
function sheetErr(msg) { const el = $('#sheet-err'); if (el) el.textContent = msg; else toast(msg); }
modal.addEventListener('click', (e) => { if (e.target === modal) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeSheet(); });
let toastTimer = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3400); }
async function busy(btn, fn) {
  const label = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'กำลังบันทึก…'; }
  try { return await fn(); } finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = label; } }
}
function copyText(text) {
  const fallback = () => sheet(`<h3>คัดลอกตาราง</h3><p class="note">กดค้างแล้วเลือกคัดลอก แล้วไปวางใน Excel</p><textarea id="copy-area" rows="8" readonly>${esc(text)}</textarea><div class="sheet-actions"><button class="btn" type="button" data-act="close">ปิด</button></div>`);
  try { navigator.clipboard.writeText(text).then(() => toast('คัดลอกแล้ว ไปวางใน Excel ได้เลย'), fallback); } catch (e) { fallback(); }
}

/* ---------------------------------------------------------------- actions */
const ACT = {
  reload: () => location.reload(),
  retry: () => load(),
  'reload-me': () => loadMe(),
  size: (el) => { size = el.dataset.s; try { localStorage.setItem('aj-size', size); } catch (e) { /* ignore */ } document.documentElement.dataset.size = size; document.querySelectorAll('[data-act="size"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === size))); },
  mode: () => { S.mode = S.mode === 'admin' ? 'staff' : 'admin'; window.scrollTo(0, 0); load(); },
  tab: (el) => { closeSheet(); goTab(el.dataset.t); },
  close: () => closeSheet(),
  'view-photo': (el) => sheet(`<img class="photo-big" src="${esc(el.dataset.src)}" alt="${esc(el.dataset.cap || 'รูป')}"><p class="note center">${esc(el.dataset.cap || '')}</p><div class="sheet-actions"><button class="btn" type="button" data-act="close">ปิด</button></div>`),

  'reg-shop': (el) => { S.reg.shop = el.dataset.s; document.querySelectorAll('#rg-shops button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === S.reg.shop))); },
  'reg-face': (el) => pickPhoto(camUser, async (f) => {
    try {
      S.reg.face = await makePhoto(f, []);
      $('#rg-face-prev').innerHTML = `<img src="${S.reg.face}" alt="">`;
      el.textContent = 'ถ่ายใหม่';
    } catch (e) { toast('เปิดรูปนี้ไม่ได้ ลองถ่ายใหม่'); }
  }),
  'reg-back': () => renderPhone(''),

  punch: (el) => {
    const kind = el.dataset.kind, word = kind === 'in' ? 'เข้างาน' : 'ออกงาน';
    pickPhoto(camUser, async (f) => {
      sheet('<p class="loading">กำลังเตรียมรูป…</p>');
      try {
        const photo = await makePhoto(f, [`${word} · ${S.me.nickname} · ร้าน ${S.me.shop_code || '-'}`, dLong(S.today)]);
        S.pending = { kind, photo };
        sheet(`<h3>ยืนยัน${word}</h3><img class="photo-big" src="${photo}" alt="รูปที่ถ่าย"><p class="note">ระบบจะบันทึกเวลาตอนกดยืนยัน</p>
          <p class="err" id="sheet-err" role="alert"></p>
          <div class="sheet-actions"><button class="btn" type="button" data-act="punch" data-kind="${kind}">ถ่ายใหม่</button><button class="btn solid" type="button" data-act="punch-confirm">ยืนยัน${word}</button></div>`);
      } catch (e) { closeSheet(); toast('เปิดรูปนี้ไม่ได้ ลองถ่ายใหม่'); }
    });
  },
  'punch-confirm': (el) => busy(el, async () => {
    const q = S.pending; if (!q) return;
    try {
      const r = await api('punch', { kind: q.kind, photo: q.photo });
      S.todayData = r; closeSheet(); paint();
      const d = r.day || {};
      toast(q.kind === 'in' ? `บันทึกเข้างาน ${hm(d.in)} น. แล้ว${d.late ? ` (สาย ${d.late} นาที)` : ''}` : `บันทึกออกงาน ${hm(d.out)} น. แล้ว${d.early ? ` (ก่อนเวลา ${d.early} นาที)` : ''}`);
    } catch (e) { sheetErr(e.message); }
  }),

  'board-day': (el) => { const d = +el.dataset.d; S.boardDate = d === 0 ? null : addDays(S.boardDate || S.today, d); if (S.boardDate === S.today) S.boardDate = null; load(); },
  'board-person': (el) => openBoardPerson(el.dataset.id),
  'board-shift': (el) => {
    const p = S.board.people.find((x) => x.id === el.dataset.id), d = p.day || {};
    const cur = d.has_shift ? { off: d.off, start: d.start, end: d.end, note: d.note } : null;
    openShiftSheet(p.id, S.board.date, cur, p.nickname, () => load());
  },
  'punch-edit': (el) => openPunchEdit(el.dataset.id, el.dataset.kind),
  'punch-save': (el) => busy(el, async () => {
    const e = S.edit, t = $('#pf-time').value;
    if (!t) return sheetErr('กรุณาใส่เวลา');
    try { await api('adm_punch_fix', { person_id: e.id, date: e.date, kind: e.kind, time: t }); closeSheet(); toast('แก้เวลาแล้ว'); load(); } catch (err) { sheetErr(err.message); }
  }),
  'punch-clear': (el) => busy(el, async () => {
    const e = S.edit;
    try { await api('adm_punch_fix', { person_id: e.id, date: e.date, kind: e.kind, clear: true }); closeSheet(); toast('ลบเวลาแล้ว'); load(); } catch (err) { sheetErr(err.message); }
  }),

  'plan-week': (el) => { const d = +el.dataset.d; S.weekStart = addDays(S.weekStart, d); S.planDay = addDays(S.planDay, d); load(); },
  'plan-day': (el) => { S.planDay = el.dataset.d; paint(); },
  'plan-shift': (el) => {
    const p = S.plan.people.find((x) => x.id === el.dataset.id), sh = S.plan.map[`${p.id}|${S.planDay}`];
    openShiftSheet(p.id, S.planDay, sh || null, p.nickname, (res) => {
      const key = `${p.id}|${res.date}`;
      if (res.clear) delete S.plan.map[key]; else S.plan.map[key] = { person_id: p.id, date: res.date, off: res.off, start: res.start, end: res.end, note: res.note };
      paint();
    });
  },
  'plan-copy': (el) => busy(el, async () => {
    try { const r = await api('adm_shift_copy', { from: S.weekStart }); toast(r.copied ? `คัดลอกแล้ว ${r.copied} ช่อง` : 'ไม่มีช่องว่างให้คัดลอก'); load(); } catch (e) { toast(e.message); }
  }),
  preset: (el) => { const p = PRESETS[+el.dataset.i]; Object.assign(S.edit, { off: false, start: p[0], end: p[1] }); syncShift(); },
  'preset-off': () => { S.edit.off = !S.edit.off; syncShift(); },
  'shift-save': (el) => busy(el, async () => {
    const e = S.edit;
    e.start = $('#ed-start').value; e.end = $('#ed-end').value;
    const note = $('#ed-note').value.trim();
    if (!e.off && (!e.start || !e.end || e.start === e.end)) return sheetErr('ใส่เวลาเข้ากะและเลิกกะให้ครบ');
    try {
      await api('adm_shift_set', { person_id: e.id, date: e.date, off: e.off, start: e.start, end: e.end, note });
      const done = e.onDone; closeSheet(); toast('บันทึกกะแล้ว');
      if (done) done({ date: e.date, off: e.off, start: e.off ? null : e.start, end: e.off ? null : e.end, note });
    } catch (err) { sheetErr(err.message); }
  }),
  'shift-clear': (el) => busy(el, async () => {
    const e = S.edit;
    try { await api('adm_shift_set', { person_id: e.id, date: e.date, clear: true }); const done = e.onDone; closeSheet(); toast('ล้างกะแล้ว'); if (done) done({ date: e.date, clear: true }); } catch (err) { sheetErr(err.message); }
  }),

  absent: (el) => busy(el, async () => {
    try {
      await api('adm_notice_add', { person_id: el.dataset.pid, date: el.dataset.date, category: 'absent', decision: el.dataset.v, detail: el.dataset.v === 'excused' ? 'แจ้งล่วงหน้าแล้ว / ลา' : '' });
      toast(el.dataset.v === 'excused' ? 'บันทึกว่าแจ้งแล้ว / ลา' : 'บันทึกขาดงานไม่แจ้งแล้ว');
      load();
    } catch (e) { toast(e.message); }
  }),
  'notice-filter': (el) => { S.noticeFilter = el.dataset.f; paint(); },
  'notice-new': (el) => openNoticeForm({ pid: el.dataset.pid || '', date: el.dataset.date || '' }),
  'nf-cat': (el) => {
    S.form.cat = el.dataset.c;
    document.querySelectorAll('#nf-cats button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === S.form.cat)));
    $('#nf-min-wrap').hidden = !(S.form.cat === 'late' || S.form.cat === 'close_early');
  },
  'nf-photo': () => pickPhoto(pickAny, async (f) => {
    try { S.form.photo = await makePhoto(f, []); $('#nf-prev').innerHTML = `<img src="${S.form.photo}" alt="">`; } catch (e) { toast('เปิดรูปนี้ไม่ได้'); }
  }),
  'nf-save': (el) => busy(el, async () => {
    const f = S.form, pid = $('#nf-person').value, date = $('#nf-date').value, detail = $('#nf-detail').value.trim();
    if (!pid) return sheetErr('กรุณาเลือกพนักงาน');
    if (!date) return sheetErr('กรุณาเลือกวันที่');
    if (!f.cat) return sheetErr('กรุณาเลือกประเภท');
    if (f.cat === 'other' && !detail) return sheetErr('ประเภทอื่นๆ ต้องเขียนรายละเอียด');
    const minutes = $('#nf-min').value;
    try {
      await api('adm_notice_add', { person_id: pid, date, category: f.cat, minutes: minutes || '', detail, photo: f.photo || '' });
      closeSheet(); toast('บันทึกแล้ว');
      if (S.mode === 'admin' && (S.adm === 'notices' || S.adm === 'person')) load();
    } catch (e) { sheetErr(e.message); }
  }),
  'notice-del': (el) => busy(el, async () => {
    try { await api('adm_notice_delete', { id: el.dataset.id }); toast('ลบแล้ว'); load(); } catch (e) { toast(e.message); }
  }),

  'person-open': (el) => openPerson(el.dataset.id, el.dataset.back),
  'person-back': () => { S.adm = S.personBack || 'summary'; window.scrollTo(0, 0); load(); },
  'sum-copy': () => {
    const rows = (S.summary.rows || []).map((x) => [x.nickname, x.shop_code || '', x.worked, x.late_n, x.late_m, x.early_n, x.early_m, x.absent_n, x.excused_n, x.other_n].join('\t'));
    const opt = periodOptions().find(([v]) => v === S.period);
    copyText([`สรุป ${opt ? opt[1] : ''}`, ['ชื่อ', 'ร้าน', 'ทำงาน (วัน)', 'สาย (ครั้ง)', 'สาย (นาที)', 'ปิดก่อนเวลา (ครั้ง)', 'ปิดก่อนเวลา (นาที)', 'ขาดไม่แจ้ง', 'แจ้งลา', 'อื่นๆ'].join('\t')].concat(rows).join('\n'));
  },

  'person-new': () => openPersonEdit(''),
  'person-edit': (el) => openPersonEdit(el.dataset.id),
  'person-save': (el) => busy(el, async () => {
    const id = S.edit.id, p = id ? S.peopleData.people.find((x) => x.id === id) : null;
    const data = {
      id, nickname: $('#pe-nick').value.trim(), full_name: $('#pe-full').value.trim(), phone: $('#pe-phone').value.replace(/\D/g, ''),
      shop_code: $('#pe-shop').value, role: $('#pe-role').value, status: p ? $('#pe-status').value : 'active',
    };
    if (!data.nickname) return sheetErr('กรุณาใส่ชื่อเล่น');
    if (!/^0\d{9}$/.test(data.phone)) return sheetErr('เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0');
    if (data.role === 'staff' && !data.shop_code) return sheetErr('กรุณาเลือกร้านประจำ');
    try { await api('adm_person_save', data); closeSheet(); toast(id ? 'บันทึกแล้ว' : `เพิ่ม ${data.nickname} แล้ว`); load(); } catch (e) { sheetErr(e.message); }
  }),
  approve: (el) => busy(el, async () => {
    const p = S.peopleData.people.find((x) => x.id === el.dataset.id);
    try { await savePerson(p, { status: 'active' }); toast(`อนุมัติ ${p.nickname} แล้ว`); load(); } catch (e) { toast(e.message); }
  }),
  reject: (el) => busy(el, async () => {
    const p = S.peopleData.people.find((x) => x.id === el.dataset.id);
    try { await savePerson(p, { status: 'inactive' }); toast('ไม่อนุมัติแล้ว'); load(); } catch (e) { toast(e.message); }
  }),
  unlink: (el) => busy(el, async () => {
    try { await api('adm_person_unlink', { id: S.edit.id }); closeSheet(); toast('ยกเลิกการผูก LINE แล้ว'); load(); } catch (e) { sheetErr(e.message); }
  }),
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.disabled) return;
  if (el.dataset.confirm && !el.dataset.armed) {
    el.dataset.orig = el.textContent;
    el.textContent = el.dataset.confirm;
    el.dataset.armed = '1';
    setTimeout(() => { if (el.isConnected && el.dataset.armed) { delete el.dataset.armed; el.textContent = el.dataset.orig; } }, 4000);
    return;
  }
  if (el.dataset.armed) { delete el.dataset.armed; el.textContent = el.dataset.orig; }
  const fn = ACT[el.dataset.act];
  if (fn) fn(el, ev);
});
document.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const id = ev.target.id;
  const btn = ev.target.querySelector('button[type="submit"]');
  if (id === 'phone-form') {
    const phone = $('#ph').value.replace(/\D/g, '');
    if (!/^0\d{9}$/.test(phone)) { $('#ph-err').textContent = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0'; return; }
    S.regPhone = phone;
    await busy(btn, async () => {
      try {
        const r = await api('link_phone', { phone });
        if (r.person) { S.me = r.person; route(); } else { S.regPhone = r.phone || phone; renderRegister(); }
      } catch (e) { const el = $('#ph-err'); if (el) el.textContent = e.message; }
    });
  } else if (id === 'reg-form') {
    const nickname = $('#rg-nick').value.trim(), full = $('#rg-full').value.trim(), err = $('#rg-err');
    if (!nickname) { err.textContent = 'กรุณาใส่ชื่อเล่น'; return; }
    if (!S.reg.shop) { err.textContent = 'กรุณาเลือกร้านประจำ'; return; }
    if (!S.reg.face) { err.textContent = 'กรุณาถ่ายรูปหน้าตรง'; return; }
    await busy(btn, async () => {
      try {
        const r = await api('register', { phone: S.regPhone, nickname, full_name: full, shop_code: S.reg.shop, face_photo: S.reg.face });
        S.me = r.person; route();
      } catch (e) { const el = $('#rg-err'); if (el) el.textContent = e.message; }
    });
  }
});
document.addEventListener('change', (ev) => {
  const id = ev.target.id, v = ev.target.value;
  if (id === 'hist-month') { S.histMonth = v; load(); }
  else if (id === 'notice-month') { S.noticeMonth = v; load(); }
  else if (id === 'sum-period') { S.period = v; load(); }
  else if (id === 'person-period') { S.personPeriod = v; load(); }
  else if ((id === 'ed-start' || id === 'ed-end') && S.edit) { S.edit[id === 'ed-start' ? 'start' : 'end'] = v; syncShift(); }
});

/* keep the clock and data fresh */
setInterval(() => { const c = $('#clock'); if (c) c.textContent = clockText(); }, 10000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.me && S.me.status === 'active' && modal.hidden && Date.now() - S.lastLoad > 120000) load();
});

boot();
})();
