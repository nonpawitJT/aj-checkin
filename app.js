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
const hm = (t) => (t ? String(t).slice(0, 5).replace(/^0(\d)/, '$1') : '');
const toMin = (t) => { const p = String(t).split(':'); return (+p[0]) * 60 + (+p[1]); };
const mondayOf = (k) => addDays(k, -((parseD(k).getDay() + 6) % 7));
const monthLabel = (ym) => `${MONTHS[+ym.slice(5, 7) - 1]} ${be(+ym.slice(0, 4))}`;
const monthEnd = (ym) => { const p = ym.split('-').map(Number); return keyOf(new Date(p[0], p[1], 0)); };
const ymAdd = (ym, n) => { const p = ym.split('-').map(Number); const d = new Date(p[0], p[1] - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const minKey = (a, b) => (a < b ? a : b);
const fmtPhone = (p) => (p && p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}` : (p || ''));
const durText = (m) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h} ชม.${r ? ` ${r} นาที` : ''}` : `${r} นาที`; };
const shiftText = (d) => (d.off ? 'หยุด' : (d.has_shift || d.start) ? `${hm(d.start)}–${d.open_end ? 'จนลูกค้าหมด' : hm(d.end)}` : 'ยังไม่จัดกะ');
const DOW_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const thaiDay = (k) => { const d = parseD(k); return `วัน${DOW_FULL[d.getDay()]}ที่ ${d.getDate()} ${MONTHS_S[d.getMonth()]} ${String(be(d.getFullYear())).slice(-2)}`; };
const fmtStamp = (s) => { if (!s) return ''; const d = String(s).slice(0, 10), t = String(s).slice(11, 16); return `${parseD(d).getDate()} ${MONTHS_S[parseD(d).getMonth()]} ${hm(t)}`; };
const ACT_AS = (() => { try { return new URLSearchParams(location.search).get('as') || ''; } catch (e) { return ''; } })();

/* ---------------------------------------------------------------- constants */
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
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
};
const LOGO = '<img class="logo" src="logo-96.png" srcset="logo-96.png 1x, logo-192.png 2x" alt="A&amp;J group" width="44" height="44">';
const LOGO_BIG = '<img class="logo" src="logo-192.png" srcset="logo-192.png 1x, logo-512.png 2x" alt="A&amp;J group" width="104" height="104">';
const svg = (name, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

/* ---------------------------------------------------------------- state */
const S = {
  token: null, me: null, shops: [], today: null, lineName: '', mode: null,
  tab: 'today', adm: 'board', ticket: 0, badges: {}, lastLoad: 0,
  regPhone: '', reg: { shop: '', face: null },
  todayData: null, myShifts: null, hist: null, histMonth: null,
  board: null, boardDate: null,
  plan: null, weekStart: null, roster: null, rosterDate: null, actingAs: false,
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
      body: JSON.stringify({ action, args: ACT_AS ? Object.assign({}, args, { _as: ACT_AS }) : args }),
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
  S.actingAs = !!r.acting_as;
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
    else if (S.mode === 'staff' && deepLink === 'roster' && p.can_schedule) S.tab = 'roster';
    else if (S.mode === 'admin') S.adm = { today: 'board', shifts: 'roster', roster: 'roster', history: 'summary' }[deepLink] || S.adm;
    deepLink = null;
  }
  load();
}

/* ---------------------------------------------------------------- frame */
const sizeSwitch = () => `<div class="size-switch" role="group" aria-label="ขนาดตัวอักษร"><button type="button" data-act="size" data-s="md" aria-pressed="${size !== 'lg'}">ก</button><button type="button" class="lg" data-act="size" data-s="lg" aria-pressed="${size === 'lg'}">ก+</button></div>`;
function devBar() {
  if (!ACT_AS || !S.actingAs) return '';
  const who = S.me ? `${esc(S.me.nickname)}${S.me.role === 'admin' ? ' (ผู้จัดการ)' : S.me.can_schedule ? ' (ผู้จัดเวร)' : ' (พนักงาน)'}` : 'คนอื่น';
  return `<div class="devbar"><span>ทดสอบในฐานะ ${who} · บันทึกจริง</span><button type="button" data-act="dev-exit">ออก</button></div>`;
}
function topbar(sub, extra) {
  return `<header class="top">${devBar()}<div class="wrap"><div class="brand">${LOGO}<div><div class="brand-name">A&amp;J เช็คอิน</div><div class="brand-sub">${sub}</div></div></div>${extra || ''}${sizeSwitch()}</div></header>`;
}
function bare(inner) {
  $('#app').className = '';
  $('#app').innerHTML = topbar('ลงเวลาพนักงาน') + `<main class="wrap no-nav">${inner}</main>`;
}
function setApp(html) {
  const a = $('#app');
  a.className = S.mode === 'admin' ? 'admin' : 'staff';
  a.innerHTML = html;
}
const wideMq = window.matchMedia ? window.matchMedia('(min-width: 1000px)') : null;
const isWide = () => !!(wideMq && wideMq.matches);
function fatal(title, detail, retry) {
  bare(`<div class="panel errbox"><h1 class="section-title">${esc(title)}</h1>${detail ? `<p class="note">${esc(detail)}</p>` : ''}${retry ? '<button class="btn solid" type="button" data-act="reload">ลองใหม่</button>' : ''}</div>`);
}
function navItems() {
  return S.mode === 'admin'
    ? [['board', 'วันนี้', 'users'], ['roster', 'จัดเวร', 'clip'], ['notices', 'บันทึก', 'flag'], ['summary', 'สรุป', 'chart'], ['people', 'พนักงาน', 'person']]
    : [['today', 'ลงเวลา', 'clock'], ['shifts', 'กะของฉัน', 'cal'], ['history', 'ประวัติ', 'list']].concat(S.me && S.me.can_schedule ? [['roster', 'จัดเวร', 'clip']] : []);
}
function shell(content) {
  const p = S.me, admin = S.mode === 'admin';
  const sub = admin ? `ผู้จัดการ · ${esc(p.nickname)}` : `${esc(p.nickname)} · ร้าน ${esc(p.shop_code || '-')}`;
  const extra = p.role === 'admin' && p.shop_code ? `<button class="btn" type="button" data-act="mode">${admin ? 'ลงเวลาของฉัน' : 'หลังบ้าน'}</button>` : '';
  const cur = admin ? (S.adm === 'person' ? S.personBack : S.adm === 'plan' ? 'roster' : S.adm) : (S.tab === 'plan' ? 'roster' : S.tab);
  const nav = navItems().map(([k, label, ic]) => {
    const badge = admin ? S.badges[k] || 0 : 0;
    return `<button type="button" data-act="tab" data-t="${k}"${cur === k ? ' aria-current="page"' : ''}>${svg(ic)}<span>${label}</span>${badge ? `<span class="dot">${badge}</span>` : ''}</button>`;
  }).join('');
  return topbar(sub, extra) + `<main class="wrap" id="main">${content}</main><nav class="nav" aria-label="เมนู"><div class="wrap">${nav}</div></nav>`;
}
function view() { return S.mode === 'admin' ? VIEWS['adm_' + S.adm] : VIEWS['st_' + S.tab]; }
function paint() {
  setApp(shell(view().render()));
  const sel = document.querySelector('.rday[aria-pressed="true"]');
  if (sel && sel.parentElement) { const box = sel.parentElement; box.scrollLeft = sel.offsetLeft - box.offsetLeft - (box.clientWidth - sel.offsetWidth) / 2; }
}
async function load() {
  const v = view(), ticket = ++S.ticket;
  setApp(shell('<p class="loading">กำลังโหลด…</p>'));
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
            g.fillStyle = first ? '#FD9627' : '#FFFFFF';
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
    <div class="hero">${LOGO_BIG}<h1 class="view-title">สวัสดี${S.lineName ? ` ${esc(S.lineName)}` : ''}</h1>
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
  bare(`<div class="welcome center"><div class="hero">${LOGO_BIG}<h1 class="view-title">ส่งข้อมูลแล้ว</h1>
    <p>รอผู้จัดการอนุมัติ เมื่ออนุมัติแล้ว เปิดแอปนี้อีกครั้งเพื่อเริ่มลงเวลา</p></div>
    <button class="btn wide" type="button" data-act="reload-me">ตรวจสอบอีกครั้ง</button></div>`);
}
function renderInactive() {
  bare(`<div class="welcome center"><div class="hero">${LOGO_BIG}<h1 class="view-title">บัญชีนี้ถูกปิดใช้งาน</h1>
    <p>ถ้าคิดว่าไม่ถูกต้อง กรุณาติดต่อผู้จัดการร้าน</p></div></div>`);
}

/* ---------------------------------------------------------------- staff views */
function clockText() { const d = new Date(); return `${d.getHours()}:${pad(d.getMinutes())}`; }
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
    if (d.open_end || !d.end) return 'ปิดร้านเมื่อลูกค้าหมด แล้วถ่ายรูปออกงาน';
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
    const shiftV = d.off ? 'วันหยุด' : d.has_shift ? `<span class="num">${shiftText(d)}</span>` : 'ยังไม่มีกะ';
    const dayShop = d.shop || p.shop_code;
    let action;
    if (!d.in) action = `<button class="btn-primary" type="button" data-act="punch" data-kind="in">${svg('cam', 26)}ถ่ายรูปเข้างาน</button>`;
    else if (!d.out) action = `<button class="btn-primary" type="button" data-act="punch" data-kind="out">${svg('cam', 26)}ถ่ายรูปปิดร้าน / ออกงาน</button><p class="note center">ตอนปิดร้าน ถ่ายให้เห็นตัวเองกับหน้าร้าน</p>`;
    else action = '<button class="btn-primary" type="button" disabled>ลงเวลาครบแล้ว</button>';
    const hint = todayHint(d);
    const note = (d.shop && d.shop !== p.shop_code ? `<div class="pass-note"><span class="tag">ไปช่วยร้าน ${esc(d.shop)}</span> วันนี้ลงเวลาที่ร้าน ${esc(d.shop)}</div>` : '')
      + (d.note ? `<div class="pass-note"><span class="tag">หมายเหตุกะ</span> ${esc(d.note)}</div>`
        : !d.has_shift ? '<div class="pass-note">ผู้จัดการยังไม่ได้จัดกะวันนี้ ลงเวลาได้ตามปกติ</div>' : '');
    return `<article class="pass" aria-label="ลงเวลาวันนี้">
      <div class="pass-top"><div class="gate-big"><span class="gk">ร้าน</span><span class="gv">${esc(dayShop || '-')}</span></div>
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
      <span class="${d.off ? 't-bad' : d.has_shift ? 'num' : 't-muted'}">${shiftText(d)}${d.shop && d.shop !== S.me.shop_code ? ` <span class="tag">ร้าน ${esc(d.shop)}</span>` : ''}</span>${d.note ? `<span class="x">${esc(d.note)}</span>` : ''}</li>`).join('');
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
      <span>${d.off ? '<span class="t-bad">หยุด</span>' : `<span class="num">${d.has_shift ? shiftText(d) : 'ไม่มีกะ'}</span>`}${d.in ? ` · เข้า <span class="num">${hm(d.in)}</span>` : ''}${d.out ? ` · ออก <span class="num">${hm(d.out)}</span>` : ''}</span>
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
    S.badges.roster = S.board.rosters_pending;
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
      r.rosters_pending ? `<button class="banner" type="button" data-act="tab" data-t="roster">ตารางเวรรออนุมัติ ${r.rosters_pending} วัน</button>` : '',
    ].join('');
    const rt = r.roster_tomorrow;
    const tomorrowBanner = date === today ? `<button class="banner ${rt === 'approved' ? 'ok' : rt === 'submitted' ? '' : 'bad'}" type="button" data-act="ros-open" data-d="${addDays(today, 1)}">ตารางเวรพรุ่งนี้: ${rt === 'approved' ? 'อนุมัติแล้ว' : rt === 'submitted' ? 'รออนุมัติ' : rt === 'draft' ? 'กำลังจัด (ยังไม่ส่ง)' : 'ยังไม่ได้จัด'}</button>` : '';
    const shops = S.shops.map((s) => {
      const list = people.filter((p) => p.shop_code === s.code);
      if (!list.length) return '';
      const working = list.filter((p) => p.day && p.day.has_shift && !p.day.off).length;
      const rows = list.map((p) => {
        const d = p.day || {};
        const times = [d.in ? `เข้า ${hm(d.in)}` : '', d.out ? `ออก ${hm(d.out)}` : ''].filter(Boolean).join(' · ');
        return `<li><button class="item" type="button" data-act="board-person" data-id="${esc(p.id)}">${avatar(p)}<span class="item-main">
          <span class="item-line"><span class="item-name">${esc(p.nickname)}</span><span class="num">${shiftText(d)}</span>${p.home_shop && p.home_shop !== p.shop_code ? `<span class="tag">มาจาก ${esc(p.home_shop)}</span>` : ''}</span>
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
      ${banners}${tomorrowBanner}${stats}
      ${shops ? `<div class="shop-grid">${shops}</div>` : '<p class="panel empty">ยังไม่มีพนักงานในระบบ ไปเพิ่มได้ที่เมนู "พนักงาน" หรือให้พนักงานเปิดแอปแล้วลงทะเบียนเอง</p>'}
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
    <div class="row-btns"><button class="btn" type="button" data-act="ros-open" data-d="${date}">ตารางเวรวันนี้</button>
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

/* ---------------------------------------------------------------- roster (จัดเวร) — shop timelines */
const ROSTER_DEFAULTS = [['06:30', '16:30', false], ['07:00', '18:00', false], ['07:30', null, true], ['10:00', '21:00', false], ['10:30', '20:30', false], ['11:00', '21:00', false], ['18:00', null, true]];
const ROSTER_STATUS = { draft: ['ร่าง ยังไม่ส่ง', ''], submitted: ['รออนุมัติ', 'warn'], approved: ['อนุมัติแล้ว', 'ok'], live: ['มีกะในระบบ', 'ok'] };
const OPEN_END = 'จนลูกค้าหมด';
const rosterTime = (i) => (i.off ? 'หยุด' : `${hm(i.start)} – ${i.open_end ? OPEN_END : hm(i.end)}`);
const hrs = (t) => { const p = String(t).split(':'); return (+p[0]) + (+p[1]) / 60; };
const decHm = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${pad(m % 60)}`; };
const decKey = (h) => { const m = Math.round(h * 60) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
function span(start, end, open) {
  const a = hrs(start);
  let b = open || !end ? 24 : hrs(end);
  if (b <= a) b += 24;
  return [a, Math.min(b, 24)];
}
const shopOf = (code) => S.shops.find((s) => s.code === code) || { code };
const shopHours = (s) => (s && s.open ? span(s.open, s.close, !s.close) : null);
const hoursText = (s) => (s && s.open ? `${hm(s.open)} – ${s.close ? hm(s.close) : OPEN_END}` : '');
/* Where a shop is open but nobody is rostered. Without opening hours we only know "nobody at all". */
function shopGaps(code, list) {
  const s = shopOf(code), h = shopHours(s);
  if (!h) return list.length ? [] : [{ a: null, b: null, all: true }];
  const iv = list.map((i) => span(i.start, i.end, i.open_end)).sort((x, y) => x[0] - y[0]);
  const out = [];
  let cur = h[0];
  iv.forEach(([a, b]) => { if (a - cur >= 0.25) out.push({ a: cur, b: Math.min(a, h[1]) }); cur = Math.max(cur, b); });
  if (h[1] - cur >= 0.25) out.push({ a: cur, b: h[1] });
  return out.filter((g) => g.b - g.a >= 0.25).map((g) => Object.assign(g, { all: !list.length, openEnd: g.b >= 24 && !s.close }));
}
const gapText = (g) => (g.a == null ? 'ทั้งวัน' : g.all ? 'ทั้งวัน' : `${decHm(g.a)} – ${g.openEnd ? OPEN_END : decHm(g.b)}`);
function axisFrom(items) {
  let lo = 6;
  items.forEach((i) => { if (!i.off && i.start) lo = Math.min(lo, Math.floor(hrs(i.start))); });
  S.shops.forEach((s) => { if (s.open) lo = Math.min(lo, Math.floor(hrs(s.open))); });
  return Math.max(0, lo);
}
const pctOf = (h, lo) => +(((h - lo) / (24 - lo)) * 100).toFixed(2);
function axisHTML(lo, cls, step, short) {
  const ticks = [];
  for (let h = lo; h <= 24; h += step || 3) ticks.push(h);
  if (ticks[ticks.length - 1] !== 24) ticks.push(24);
  return `<div class="${cls}" aria-hidden="true">${ticks.map((h, i) => `<span style="left:${pctOf(h, lo)}%"${i === 0 ? ' class="first"' : h === 24 ? ' class="last"' : ''}>${short ? h : `${h}:00`}</span>`).join('')}</div>`;
}
/* each working round becomes one segment (a person can work a second round in another shop / later) */
function segments(items) {
  const out = [];
  items.forEach((i) => {
    if (i.off) return;
    if (i.shop_code) out.push(Object.assign({}, i, { round: 1 }));
    if (i.shop2) out.push(Object.assign({}, i, { round: 2, shop_code: i.shop2, start: i.start2, end: i.end2, open_end: i.open_end2 }));
  });
  return out;
}
const byStart = (a, b) => (a.start || '').localeCompare(b.start || '') || String(a.name).localeCompare(String(b.name), 'th');
function gridLines(lo) {
  let out = '';
  for (let h = lo + 3; h < 24; h += 3) out += `<i class="tl-grid" style="left:${pctOf(h, lo)}%"></i>`;
  return out;
}
function rosterPresets() {
  const out = [], seen = new Set();
  const add = (st, en, open) => {
    const k = `${st}|${open ? '' : en}|${!!open}`;
    if (!st || seen.has(k) || out.length >= 9) return;
    seen.add(k); out.push({ start: st, end: open ? null : en, open_end: !!open });
  };
  ((S.roster && S.roster.presets) || []).forEach((x) => add(x.start, x.end, x.open_end));
  ROSTER_DEFAULTS.forEach(([st, en, open]) => add(st, en, open));
  return out;
}
const ROSTER = {
  async load() {
    if (!S.rosterDate) S.rosterDate = addDays(S.today, 1);
    S.roster = await api('ros_get', { date: S.rosterDate });
    S.today = S.roster.today || S.today;
  },
  render() { return rosterHTML(); },
};
VIEWS.adm_roster = ROSTER;
VIEWS.st_roster = ROSTER;
function dayWord(date, today) {
  if (date === today) return 'วันนี้';
  if (date === addDays(today, 1)) return 'พรุ่งนี้';
  if (date === addDays(today, -1)) return 'เมื่อวาน';
  return '';
}
function rosterHTML() {
  const r = S.roster, ro = r.roster, items = r.items || [], date = r.date, admin = r.can_approve;
  const status = ro ? ro.status : null;
  const readOnly = date < r.today && !admin;
  const word = dayWord(date, r.today);
  let meta = '';
  if (status === 'approved') meta = `อนุมัติโดย ${esc(ro.approved_by || '-')} ${esc(fmtStamp(ro.approved_at))} · พนักงานเห็นกะแล้ว`;
  else if (status === 'submitted') meta = `ส่งโดย ${esc(ro.submitted_by || '-')} ${esc(fmtStamp(ro.submitted_at))}`;
  else if (status === 'draft') meta = `แก้ล่าสุดโดย ${esc(ro.updated_by || '-')} ${esc(fmtStamp(ro.updated_at))}${ro.approved_at ? ' · <b class="t-warn">แก้หลังอนุมัติ พนักงานยังเห็นตารางเดิมจนกว่าจะอนุมัติใหม่</b>' : ''}`;
  const pill = status ? `<span class="chip ${ROSTER_STATUS[status][1]}">${ROSTER_STATUS[status][0]}</span>` : '<span class="chip">ยังไม่ได้จัด</span>';
  const dateBar = `<div class="ros-date panel">
      <button class="icon-btn" type="button" data-act="ros-day" data-d="${addDays(date, -1)}" aria-label="วันก่อนหน้า">‹</button>
      <div class="ros-date-mid"><span class="k">${word ? `${word} · ` : ''}${pill}</span><strong>${thaiDay(date)}</strong></div>
      <button class="icon-btn" type="button" data-act="ros-day" data-d="${addDays(date, 1)}" aria-label="วันถัดไป">›</button>
    </div>${meta ? `<p class="note ros-meta">${meta}</p>` : ''}`;
  const head = `<div class="view-head"><div><h1 class="view-title">จัดเวร</h1>
      <p class="note">${admin ? 'ตรวจตารางแล้วกดอนุมัติ พนักงานจะเห็นกะทันที' : 'จัดตารางของวันรุ่งขึ้น แล้วกดส่งให้ผู้จัดการตรวจ'}</p></div>
      <button class="btn" type="button" data-act="go-week">ดูทั้งสัปดาห์</button></div>`;
  const src = r.sources || {};
  if (!items.length && !ro) {
    const start = readOnly ? '<p class="panel empty">ไม่มีตารางของวันนี้</p>'
      : `<section class="panel ros-pad"><h3 class="section-title">เริ่มจัดตาราง</h3><p class="note">เลือกจุดเริ่มต้น แล้วค่อยแก้ทีละคน</p>
        <div class="row-btns">${src.yesterday ? '<button class="btn solid" type="button" data-act="ros-init" data-src="yesterday">คัดลอกจากเมื่อวาน</button>' : ''}
        ${src.lastweek ? '<button class="btn" type="button" data-act="ros-init" data-src="lastweek">คัดลอกจากวันเดียวกันสัปดาห์ก่อน</button>' : ''}
        <button class="btn" type="button" data-act="ros-init" data-src="empty">เริ่มตารางว่าง</button></div></section>`;
    return `<div class="stack">${head}${dateBar}${start}</div>`;
  }

  const lo = axisFrom(items);
  const allGaps = [];
  const wide = isWide();
  const segs = segments(items);
  const rows = S.shops.map((s, si) => {
    const list = segs.filter((i) => i.shop_code === s.code).sort(byStart);
    const gaps = shopGaps(s.code, list);
    gaps.forEach((g) => allGaps.push(`${s.code} ${gapText(g)}`));
    const h = shopHours(s);
    const lanes = Math.max(1, list.length);
    const hoursBtn = admin
      ? `<button class="tl-hours" type="button" data-act="shop-hours" data-s="${esc(s.code)}">${h ? `เปิด ${hoursText(s)}` : 'ตั้งเวลาเปิดร้าน'}</button>`
      : `<span class="tl-hours">${h ? `เปิด ${hoursText(s)}` : ''}</span>`;
    const note = gaps.length ? `<span class="tl-note bad">${gaps[0].all ? 'ไม่มีคน' : `ว่าง ${gapText(gaps[0])}`}${gaps.length > 1 ? ` +${gaps.length - 1}` : ''}</span>` : `<span class="tl-note">${list.length} คน</span>`;
    const openSeg = h ? `<span class="tl-open" style="left:${pctOf(h[0], lo)}%;width:${(pctOf(h[1], lo) - pctOf(h[0], lo)).toFixed(2)}%"></span>` : '';
    const gapEls = gaps.map((g) => {
      const a = g.a == null ? lo : g.a, b = g.b == null ? 24 : g.b;
      const attrs = readOnly ? 'disabled' : `data-act="ros-add" data-shop="${esc(s.code)}"${g.a != null ? ` data-start="${decKey(g.a)}"${g.openEnd ? ' data-open="1"' : ` data-end="${decKey(g.b)}"`}` : ''}`;
      return `<button class="tl-gap" type="button" ${attrs} style="left:${pctOf(a, lo)}%;width:${(pctOf(b, lo) - pctOf(a, lo)).toFixed(2)}%" aria-label="ร้าน ${esc(s.code)} ไม่มีคน ${gapText(g)}"><span>${g.all ? `ไม่มีคน${readOnly ? '' : ' · แตะเพื่อเพิ่ม'}` : 'ว่าง'}</span></button>`;
    }).join('');
    const bars = list.map((i, k) => {
      const [a, b] = span(i.start, i.end, i.open_end);
      const w = pctOf(b, lo) - pctOf(a, lo), room = wide ? w * 3 : w;
      const time = rosterTime(i);
      const nm = `<b>${esc(i.name)}</b>${i.round === 2 ? '<small>รอบ 2</small>' : ''}`;
      const text = room >= 40 ? `${nm} ${time}` : room >= 22 ? `${nm} ${hm(i.start)}${i.open_end ? ' →' : ''}` : nm;
      const helping = i.home_shop && i.home_shop !== i.shop_code;
      return `<button class="tl-bar${i.open_end ? ' open' : ''}${i.guest ? ' guest' : ''}" type="button" data-act="ros-edit" data-id="${esc(i.id)}"${readOnly ? ' disabled' : ''}
        style="top:${4 + k * 34}px;left:${pctOf(a, lo)}%;width:${w.toFixed(2)}%" title="${esc(`${i.name}${i.round === 2 ? ' (รอบ 2)' : ''} ${time}${helping ? ` · มาจาก ${i.home_shop}` : ''}${i.note ? ` · ${i.note}` : ''}`)}">${text}</button>`;
    }).join('');
    return `<div class="tl-shop"${si ? '' : ' style="border-top:0"'}>
      <div class="tl-head">${shopGate(s.code)}${hoursBtn}${note}</div>
      <div class="tl-lane${h ? ' timed' : ''}" style="height:${lanes * 34 + 6}px">${gridLines(lo)}${openSeg}${gapEls}${bars}</div></div>`;
  }).join('');

  const off = items.filter((i) => i.off);
  const offRow = `<div class="tl-off"><b>หยุด</b><div class="chips">${off.map((i) => `<button class="pchip" type="button" data-act="ros-edit" data-id="${esc(i.id)}"${readOnly ? ' disabled' : ''}>${esc(i.name)}</button>`).join('') || '<span class="note">ไม่มี</span>'}
      ${readOnly ? '' : '<button class="pchip add" type="button" data-act="ros-add" data-off="1">+ เพิ่มคนหยุด</button>'}</div></div>`;
  const banner = !items.length ? ''
    : allGaps.length ? `<div class="banner bad static">ร้านเปิดแต่ไม่มีคน ${allGaps.length} จุด: ${esc(allGaps.join(' · '))}</div>`
      : '<div class="banner ok static">ทุกร้านมีคนครบตามเวลาเปิด</div>';
  const notes = ro && ro.notes
    ? `<button class="ros-notes" type="button" data-act="ros-notes-edit"${readOnly ? ' disabled' : ''}>${svg('flag')}<span>${esc(ro.notes).replace(/\n/g, '<br>')}</span>${readOnly ? '' : '<em>แก้</em>'}</button>`
    : readOnly ? '' : '<button class="ros-notes empty" type="button" data-act="ros-notes-edit">+ เพิ่มประกาศ / ไฟลท์ของวันนี้</button>';
  const inRoster = new Set(items.filter((i) => i.person_id).map((i) => i.person_id));
  const missing = (r.people || []).filter((p) => !inRoster.has(p.id));
  const missingHTML = missing.length && !readOnly ? `<section class="ros-missing"><b>ยังไม่ลงตาราง</b> <span class="note">แตะชื่อเพื่อใส่</span>
    <div class="chips">${missing.map((p) => `<button class="pchip" type="button" data-act="ros-add" data-pid="${esc(p.id)}" data-shop="${esc(p.shop_code || '')}">${esc(p.nickname)}${p.shop_code ? ` <small>${esc(p.shop_code)}</small>` : ''}</button>`).join('')}</div></section>` : '';
  const emptyHint = !items.length && !readOnly && (src.yesterday || src.lastweek) ? `<div class="row-btns">${src.yesterday ? '<button class="btn" type="button" data-act="ros-init" data-src="yesterday">คัดลอกจากเมื่อวานแทน</button>' : ''}${src.lastweek ? '<button class="btn" type="button" data-act="ros-init" data-src="lastweek">คัดลอกจากสัปดาห์ก่อนแทน</button>' : ''}</div>` : '';
  const legend = `<div class="tl-legend"><span><i class="lg-bar"></i>มีคนอยู่</span><span><i class="lg-gap"></i>ร้านเปิดแต่ไม่มีคน</span><span><i class="lg-closed"></i>ร้านปิด</span><span><i class="lg-open"></i>${OPEN_END}</span></div>`;

  let main = '';
  if (readOnly) main = '';
  else if (!items.length) main = '<span class="note">เพิ่มคนในตารางก่อน แล้วค่อยส่ง</span>';
  else if (status === 'approved') main = `<span class="note">${admin ? 'อนุมัติแล้ว แก้ต่อได้ ระบบใช้ฉบับใหม่ทันที' : 'อนุมัติแล้ว ถ้าแก้ต้องส่งตรวจใหม่'}</span>`;
  else if (admin) main = '<button class="btn-primary good" type="button" data-act="ros-approve" data-confirm="แตะอีกครั้งเพื่ออนุมัติ">อนุมัติตารางนี้</button>';
  else if (status === 'submitted') main = '<span class="note">ส่งแล้ว รอผู้จัดการอนุมัติ ยังแก้ได้</span>';
  else main = '<button class="btn-primary" type="button" data-act="ros-submit">ส่งให้ผู้จัดการตรวจ</button>';
  const bar = items.length || main ? `<div class="ros-bar">
      ${items.length ? `<button class="ros-icon" type="button" data-act="ros-image">${svg('cam')}<span>รูป</span></button>
      <button class="ros-icon" type="button" data-act="ros-share">${svg('chat')}<span>LINE</span></button>` : ''}
      <div class="ros-main">${main}</div></div>` : '';
  const adminHint = admin && !S.shops.some((s) => s.open) ? '<p class="note">ตั้งเวลาเปิด–ปิดของแต่ละร้านได้ โดยแตะ "ตั้งเวลาเปิดร้าน" ข้างชื่อร้าน ระบบจะบอกช่วงที่ร้านเปิดแต่ไม่มีคน</p>' : '';

  return `<div class="stack ros">${head}${dateBar}${banner}${notes}${emptyHint}
    <section class="panel tl">${axisHTML(lo, 'tl-axis')}${rows}${offRow}</section>
    ${legend}${adminHint}${missingHTML}
    ${readOnly ? '' : '<button class="btn wide dashed" type="button" data-act="ros-add">+ เพิ่มคนในตาราง</button>'}
    ${bar}</div>`;
}
function openRosterItem(item, pre) {
  const r = S.roster, people = r.people || [];
  pre = pre || {};
  const e = item
    ? { id: item.id, pid: item.person_id || '__guest', guest: item.guest ? item.name : '', shop: item.shop_code || item.home_shop || '', off: !!item.off, start: item.start || '', end: item.end || '', open: !!item.open_end, note: item.note || '',
        r2: !!item.shop2, shop2: item.shop2 || '', start2: item.start2 || '', end2: item.end2 || '', open2: !!item.open_end2 }
    : { id: '', pid: pre.pid || '', guest: '', shop: pre.shop || '', off: !!pre.off, start: pre.start || '', end: pre.end || '', open: !!pre.open, note: '', r2: false, shop2: '', start2: '', end2: '', open2: false };
  e.presets = rosterPresets();
  if (!item && !e.off && !e.start && e.presets.length) Object.assign(e, { start: e.presets[0].start, end: e.presets[0].end || '', open: e.presets[0].open_end });
  S.edit = e;
  const used = new Set((r.items || []).filter((i) => i.person_id && (!item || i.id !== item.id)).map((i) => i.person_id));
  const opt = (p) => `<option value="${esc(p.id)}"${p.id === e.pid ? ' selected' : ''}${used.has(p.id) ? ' disabled' : ''}>${esc(p.nickname)}${used.has(p.id) ? ' (มีในตารางแล้ว)' : ''}</option>`;
  const groups = S.shops.map((s) => { const list = people.filter((p) => p.shop_code === s.code); return list.length ? `<optgroup label="ร้าน ${esc(s.code)}">${list.map(opt).join('')}</optgroup>` : ''; }).join('')
    + (people.some((p) => !p.shop_code) ? `<optgroup label="ไม่มีร้านประจำ">${people.filter((p) => !p.shop_code).map(opt).join('')}</optgroup>` : '');
  sheet(`<h3>${item ? `แก้ไข ${esc(item.name)}` : 'เพิ่มคนในตาราง'}</h3><p class="note">${thaiDay(r.date)}</p>
    <div class="field"><label for="ri-person">ชื่อ</label><select id="ri-person"><option value="">เลือกพนักงาน</option>${groups}<option value="__guest"${e.pid === '__guest' ? ' selected' : ''}>พิมพ์ชื่อเอง (ยังไม่มีในระบบ)</option></select>
      <input type="text" id="ri-guest" maxlength="30" placeholder="พิมพ์ชื่อเล่น" value="${esc(e.guest)}"></div>
    <div class="choice" id="ri-type"><button type="button" data-act="ri-type" data-v="work">ทำงาน</button><button type="button" class="off" data-act="ri-type" data-v="off">หยุด</button></div>
    <div id="ri-work" class="form">
      <div class="field"><span class="lbl">ร้าน</span><div class="shopgrid" id="ri-shops">${S.shops.map((s) => `<button type="button" data-act="ri-shop" data-s="${esc(s.code)}">${esc(s.code)}</button>`).join('')}</div></div>
      <div class="field"><span class="lbl">เวลา <span class="note">แตะกะที่ใช้บ่อย</span></span><div class="choice wide" id="ri-presets">${e.presets.map((x, i) => `<button type="button" data-act="ri-preset" data-i="${i}">${hm(x.start)} – ${x.open_end ? OPEN_END : hm(x.end)}</button>`).join('')}</div></div>
      <div class="grid2"><div class="field"><label for="ri-start">เวลาเข้า</label><input type="time" id="ri-start"></div><div class="field"><label for="ri-end">เวลาเลิก</label><input type="time" id="ri-end"></div></div>
      <label class="check"><input type="checkbox" id="ri-open"> เลิกเมื่อลูกค้าหมด (ไม่ระบุเวลาเลิก)</label>
      <label class="check r2-toggle"><input type="checkbox" id="ri-r2"> ทำ 2 รอบในวันนี้ (เช่น ไปต่ออีกร้านตอนเย็น)</label>
      <div id="ri-round2" class="form round2">
        <div class="field"><span class="lbl">ร้านรอบ 2</span><div class="shopgrid" id="ri-shops2">${S.shops.map((s) => `<button type="button" data-act="ri-shop2" data-s="${esc(s.code)}">${esc(s.code)}</button>`).join('')}</div></div>
        <div class="grid2"><div class="field"><label for="ri-start2">เข้ารอบ 2</label><input type="time" id="ri-start2"></div><div class="field"><label for="ri-end2">เลิกรอบ 2</label><input type="time" id="ri-end2"></div></div>
        <label class="check"><input type="checkbox" id="ri-open2"> รอบ 2 เลิกเมื่อลูกค้าหมด</label>
      </div>
    </div>
    <div class="field"><label for="ri-note">หมายเหตุ (ไม่ใส่ก็ได้)</label><input type="text" id="ri-note" maxlength="60" value="${esc(e.note)}" placeholder="เช่น ไฟลท์ดีเลย์"></div>
    <p class="err" id="sheet-err" role="alert"></p>
    <div class="sheet-actions">${item ? '<button class="btn danger" type="button" data-act="ri-delete" data-confirm="แตะอีกครั้งเพื่อลบ">ลบออกจากตาราง</button>' : ''}<span class="spacer"></span>
      <button class="btn" type="button" data-act="close">ยกเลิก</button><button class="btn solid" type="button" data-act="ri-save">บันทึก</button></div>`);
  syncRosterItem();
}
function syncRosterItem() {
  const e = S.edit;
  if (!e || !$('#ri-type')) return;
  $('#ri-guest').hidden = e.pid !== '__guest';
  document.querySelectorAll('#ri-type button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v === 'off') === e.off)));
  $('#ri-work').hidden = e.off;
  document.querySelectorAll('#ri-shops button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === e.shop)));
  document.querySelectorAll('#ri-presets button').forEach((b) => {
    const x = e.presets[+b.dataset.i];
    b.setAttribute('aria-pressed', String(x.start === e.start && x.open_end === e.open && (x.open_end || x.end === e.end)));
  });
  $('#ri-start').value = e.start || '';
  $('#ri-end').value = e.open ? '' : (e.end || '');
  $('#ri-open').checked = e.open;
  $('#ri-r2').checked = e.r2;
  $('#ri-round2').hidden = !e.r2;
  document.querySelectorAll('#ri-shops2 button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === e.shop2)));
  $('#ri-start2').value = e.start2 || '';
  $('#ri-end2').value = e.open2 ? '' : (e.end2 || '');
  $('#ri-open2').checked = e.open2;
}
function openNotes() {
  const ro = S.roster.roster || {};
  sheet(`<h3>ประกาศ / ไฟลท์ของวันนี้</h3><p class="note">${thaiDay(S.roster.date)} · ข้อความนี้จะอยู่ในรูปและข้อความที่ส่งเข้า LINE</p>
    <textarea id="ros-notes" maxlength="600" rows="5" placeholder="เช่น มี 6 ไฟลท์ ไม่รวม CIQ&#10;พรุ่งนี้อนามัยมาตรวจ B3 B7 B19">${esc(ro.notes || '')}</textarea>
    <p class="err" id="sheet-err" role="alert"></p>
    <div class="sheet-actions"><span class="spacer"></span><button class="btn" type="button" data-act="close">ยกเลิก</button><button class="btn solid" type="button" data-act="ros-notes">บันทึก</button></div>`);
}
function openShopHours(code) {
  const s = shopOf(code);
  S.edit = { shop: code };
  sheet(`<h3>เวลาเปิด–ปิด ร้าน ${esc(code)}</h3><p class="note">ใช้บอกว่าช่วงไหนร้านเปิดแต่ยังไม่มีคน ไม่เกี่ยวกับการลงเวลาของพนักงาน</p>
    <div class="grid2"><div class="field"><label for="sh-open">เปิด</label><input type="time" id="sh-open" value="${esc(s.open || '')}"></div>
      <div class="field"><label for="sh-close">ปิด</label><input type="time" id="sh-close" value="${esc(s.close || '')}"${s.open && !s.close ? ' disabled' : ''}></div></div>
    <label class="check"><input type="checkbox" id="sh-openend"${s.open && !s.close ? ' checked' : ''}> ปิดเมื่อลูกค้าหมด (ไม่มีเวลาปิดแน่นอน)</label>
    <p class="err" id="sheet-err" role="alert"></p>
    <div class="sheet-actions">${s.open ? '<button class="btn danger" type="button" data-act="sh-clear">ไม่ตั้งเวลา</button>' : ''}<span class="spacer"></span>
      <button class="btn" type="button" data-act="close">ยกเลิก</button><button class="btn solid" type="button" data-act="sh-save">บันทึก</button></div>`);
}
function rosterText() {
  const r = S.roster, items = r.items || [], ro = r.roster;
  const lines = [`ตารางงาน ${thaiDay(r.date)}`];
  const off = items.filter((i) => i.off).map((i) => i.name);
  if (off.length) lines.push(`หยุด: ${off.join(', ')}`);
  if (ro && ro.notes) lines.push('', ro.notes);
  S.shops.forEach((s) => {
    const list = segments(items).filter((i) => i.shop_code === s.code).sort(byStart);
    if (!list.length) return;
    lines.push('', s.code);
    list.forEach((i) => lines.push(`${i.name}  ${rosterTime(i)}${i.note ? ` (${i.note})` : ''}`));
  });
  if (!ro || ro.status !== 'approved') lines.push('', '(ฉบับร่าง ยังไม่อนุมัติ)');
  return lines.join('\n');
}
async function rosterImage() {
  const r = S.roster, items = r.items || [], ro = r.roster || {};
  try { await Promise.all(['400 30px Sarabun', '600 30px Sarabun', '700 30px Sarabun', '700 30px "Chakra Petch"'].map((f) => document.fonts.load(f))); } catch (e) { /* ignore */ }
  const logo = await new Promise((res) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = 'logo-192.png'; });
  const W = 1080, P = 44, GAP = 24, colW = (W - P * 2 - GAP) / 2;
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  const F = (w, s) => `${w} ${s}px Sarabun, "Noto Sans Thai", sans-serif`;
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
  const wrap = (text, font, maxW) => {
    g.font = font;
    const out = [];
    String(text).split('\n').forEach((par) => {
      const parts = seg ? Array.from(seg.segment(par), (x) => x.segment) : Array.from(par);
      let line = '';
      parts.forEach((w) => { if (g.measureText(line + w).width > maxW && line) { out.push(line); line = w.trimStart(); } else line += w; });
      out.push(line);
    });
    return out;
  };
  const off = items.filter((i) => i.off).map((i) => i.name);
  const offLines = off.length ? wrap(`หยุด: ${off.join(', ')}`, F(700, 32), W - P * 2) : [];
  const noteLines = ro.notes ? wrap(ro.notes, F(400, 30), W - P * 2 - 40) : [];
  const blocks = S.shops.map((s) => ({ code: s.code, list: segments(items).filter((i) => i.shop_code === s.code).sort(byStart) })).filter((b) => b.list.length);
  blocks.forEach((b) => { b.h = 74 + b.list.length * 50 + 14; });
  const HEAD = 190;
  let y0 = HEAD + 8 + 30;
  if (offLines.length) y0 += offLines.length * 46 + 14;
  if (noteLines.length) y0 += noteLines.length * 44 + 40 + 24;
  const cols = [y0, y0];
  blocks.forEach((b) => { const c = cols[0] <= cols[1] ? 0 : 1; b.x = P + c * (colW + GAP); b.y = cols[c]; cols[c] += b.h + GAP; });
  const H = Math.max(cols[0], cols[1]) + 56;
  cv.width = W; cv.height = H;
  const rr = (x, y, w, h, rad, fill, stroke) => {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, rad); else g.rect(x, y, w, h);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
  };
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#0F74B8'; g.fillRect(0, 0, W, HEAD);
  g.fillStyle = '#FD9627'; g.fillRect(0, HEAD, W, 8);
  if (logo) g.drawImage(logo, P, 36, 118, 118);
  g.fillStyle = '#FFFFFF'; g.font = F(700, 56); g.textBaseline = 'alphabetic';
  g.fillText('ตารางงาน', P + 140, 96);
  g.font = F(700, 38); g.fillStyle = '#E3F1FB'; g.fillText(thaiDay(r.date), P + 140, 148);
  const st = ro.status && items.length ? ro.status : 'draft';
  const pill = st === 'approved' ? 'อนุมัติแล้ว' : st === 'submitted' ? 'รออนุมัติ' : 'ฉบับร่าง';
  g.font = F(700, 28);
  const pw = g.measureText(pill).width + 40;
  rr(W - P - pw, 44, pw, 52, 26, st === 'approved' ? '#0B6B3E' : '#FD9627');
  g.fillStyle = st === 'approved' ? '#FFFFFF' : '#0A2647'; g.fillText(pill, W - P - pw + 20, 80);
  if (st === 'approved' && ro.approved_by) {
    g.font = F(400, 24); g.fillStyle = '#E3F1FB';
    const t = `โดย ${ro.approved_by} ${fmtStamp(ro.approved_at)}`;
    g.fillText(t, W - P - g.measureText(t).width, 132);
  }
  let y = HEAD + 8 + 30;
  if (offLines.length) {
    g.font = F(700, 32);
    offLines.forEach((ln, i) => { g.fillStyle = i === 0 ? '#A3241B' : '#0B1B2E'; g.fillText(ln, P, y + 34 + i * 46); });
    y += offLines.length * 46 + 14;
  }
  if (noteLines.length) {
    const bh = noteLines.length * 44 + 40;
    rr(P, y, W - P * 2, bh, 16, '#FFF4E8', '#F6C892');
    g.font = F(400, 30); g.fillStyle = '#5A3200';
    noteLines.forEach((ln, i) => g.fillText(ln, P + 20, y + 52 + i * 44 - 8));
    y += bh + 24;
  }
  blocks.forEach((b) => {
    rr(b.x, b.y, colW, b.h, 18, '#F5F9FD', '#C4D5E4');
    g.font = '700 32px "Chakra Petch", Sarabun, sans-serif';
    const cw = g.measureText(b.code).width + 28;
    rr(b.x + 16, b.y + 14, cw, 46, 10, '#FD9627');
    g.fillStyle = '#0A2647'; g.fillText(b.code, b.x + 30, b.y + 49);
    g.font = F(400, 24); g.fillStyle = '#3A4A5E';
    const cnt = `${b.list.length} คน`;
    g.fillText(cnt, b.x + colW - 18 - g.measureText(cnt).width, b.y + 46);
    b.list.forEach((i, k) => {
      const ly = b.y + 74 + k * 50 + 34;
      const time = rosterTime(i);
      let fs = 30;
      g.font = F(700, fs);
      while (fs > 20 && g.measureText(time).width + 160 > colW - 36) { fs -= 2; g.font = F(700, fs); }
      const tw = g.measureText(time).width;
      g.fillStyle = '#0F74B8'; g.fillText(time, b.x + colW - 18 - tw, ly);
      g.font = F(600, 30); g.fillStyle = '#0B1B2E';
      let name = i.name;
      while (g.measureText(name).width > colW - 50 - tw && name.length > 2) name = name.slice(0, -1);
      g.fillText(name + (name !== i.name ? '…' : ''), b.x + 18, ly);
    });
  });
  g.font = F(400, 24); g.fillStyle = '#5A6B7E';
  g.fillText(`A&J group · ${st === 'approved' ? 'ตารางที่อนุมัติแล้ว' : 'ฉบับร่าง ยังไม่อนุมัติ'}`, P, H - 24);
  return cv.toDataURL('image/png');
}

/* ---------------------------------------------------------------- week overview: which shop has nobody, and when */
const WEEK_ST = { approved: ['อนุมัติแล้ว', 'ok'], submitted: ['รออนุมัติ', 'warn'], draft: ['ร่าง', 'draft'], live: ['มีกะในระบบ', 'ok'] };
const WEEK = {
  async load() {
    if (!S.weekStart) S.weekStart = mondayOf(S.rosterDate || S.today);
    S.plan = await api('ros_week', { date: S.weekStart });
    if (S.plan.shops && S.plan.shops.length) S.shops = S.plan.shops;
    S.today = S.plan.today || S.today;
  },
  render() { return weekHTML(S.plan); },
};
VIEWS.adm_plan = WEEK;
VIEWS.st_plan = WEEK;
function weekLabel(days) {
  const a = parseD(days[0]), b = parseD(days[days.length - 1]);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MONTHS_S[b.getMonth()]} ${be(b.getFullYear())}` : `${a.getDate()} ${MONTHS_S[a.getMonth()]} – ${b.getDate()} ${MONTHS_S[b.getMonth()]} ${be(b.getFullYear())}`;
}
function weekHTML(r) {
  const days = (r.days || []).map((d) => Object.assign({}, d, { items: d.items || [] }));
  const today = r.today;
  const lo = axisFrom([].concat(...days.map((d) => d.items)));
  const working = (d, code) => segments(d.items).filter((i) => i.shop_code === code).sort(byStart);
  const lanes = {};
  S.shops.forEach((s) => { lanes[s.code] = Math.max(1, ...days.map((d) => working(d, s.code).length)); });
  const head = days.map((d) => {
    const dt = parseD(d.date), st = d.status ? WEEK_ST[d.status] : null;
    let gaps = 0;
    if (d.status) S.shops.forEach((s) => { gaps += shopGaps(s.code, working(d, s.code)).length; });
    return `<button class="wk-head${d.date === today ? ' today' : ''}" type="button" data-act="ros-open" data-d="${d.date}">
      <b>${d.date === today ? 'วันนี้ ' : ''}${DOW[dt.getDay()]}. ${dt.getDate()} ${MONTHS_S[dt.getMonth()]}</b>
      <span class="wk-st ${st ? st[1] : 'none'}"><i></i>${st ? st[0] : 'ยังไม่จัด'}</span>
      <span class="wk-gap ${!d.status ? '' : gaps ? 'bad' : 'ok'}">${!d.status ? 'แตะเพื่อเริ่มจัด' : gaps ? `ว่าง ${gaps} จุด` : 'ครบทุกร้าน'}</span>
      ${axisHTML(lo, 'wk-axis', 6, true)}</button>`;
  }).join('');
  const rows = S.shops.map((s) => {
    const h = shopHours(s), height = lanes[s.code] * 18 + 6;
    const cells = days.map((d) => {
      const cls = `wk-cell${d.date === today ? ' today' : ''}`;
      if (!d.status) return `<button class="${cls} none" type="button" data-act="ros-open" data-d="${d.date}" aria-label="${esc(`${s.code} ${d.date} ยังไม่จัด`)}"><span class="wk-lane" style="height:${height}px"></span></button>`;
      const list = working(d, s.code);
      const gaps = shopGaps(s.code, list);
      const openSeg = h ? `<span class="tl-open" style="left:${pctOf(h[0], lo)}%;width:${(pctOf(h[1], lo) - pctOf(h[0], lo)).toFixed(2)}%"></span>` : '';
      const gapEls = gaps.map((g) => {
        const a = g.a == null ? lo : g.a, b = g.b == null ? 24 : g.b;
        return `<span class="wk-gapbar" style="left:${pctOf(a, lo)}%;width:${(pctOf(b, lo) - pctOf(a, lo)).toFixed(2)}%">${g.all ? 'ไม่มีคน' : ''}</span>`;
      }).join('');
      const bars = list.map((i, k) => {
        const [a, b] = span(i.start, i.end, i.open_end);
        return `<span class="wk-bar${i.open_end ? ' open' : ''}" style="top:${3 + k * 18}px;left:${pctOf(a, lo)}%;width:${(pctOf(b, lo) - pctOf(a, lo)).toFixed(2)}%">${esc(i.name)}</span>`;
      }).join('');
      const title = list.map((i) => `${i.name} ${rosterTime(i)}`).concat(gaps.map((g) => `ว่าง ${gapText(g)}`)).join('\n') || 'ไม่มีคน';
      return `<button class="${cls}" type="button" data-act="ros-open" data-d="${d.date}" title="${esc(`${s.code}\n${title}`)}"><span class="wk-lane${h ? ' timed' : ''}" style="height:${height}px">${openSeg}${gapEls}${bars}</span></button>`;
    }).join('');
    return `<div class="wk-code">${shopGate(s.code)}</div>${cells}`;
  }).join('');
  const offRow = `<div class="wk-code wk-offlbl">หยุด</div>${days.map((d) => `<div class="wk-off${d.date === today ? ' today' : ''}">${esc(d.items.filter((i) => i.off).map((i) => i.name).join(', '))}</div>`).join('')}`;
  const keys = days.map((d) => d.date);
  return `<div class="stack">
    <button class="btn quiet" type="button" data-act="tab" data-t="roster" style="justify-self:start">‹ กลับไปจัดเวร</button>
    <div class="view-head"><div><h1 class="view-title">ร้านไหนว่างช่วงไหน</h1><p class="note">แต่ละช่องคือหนึ่งวันของร้าน แถบฟ้าคือคนที่อยู่ แถบส้มคือร้านเปิดแต่ไม่มีคน แตะช่องเพื่อเปิดตารางวันนั้น</p></div>
      <div class="datenav" style="min-width:min(100%,24rem)"><button class="icon-btn" type="button" data-act="plan-week" data-d="-7" aria-label="สัปดาห์ก่อน">‹</button>
        <div class="datenav-label"><span class="k">สัปดาห์</span><strong>${keys.length ? weekLabel(keys) : ''}</strong></div>
        <button class="icon-btn" type="button" data-act="plan-week" data-d="7" aria-label="สัปดาห์ถัดไป">›</button></div></div>
    <div class="tl-legend"><span><i class="lg-bar"></i>มีคนอยู่</span><span><i class="lg-gap"></i>ร้านเปิดแต่ไม่มีคน</span><span><i class="lg-closed"></i>ร้านปิด</span><span>แกนเวลาในช่อง ${lo}:00 → 24:00</span></div>
    <div class="panel wk-scroll"><div class="wk-grid"><div class="wk-corner">ร้าน</div>${head}${rows}${offRow}</div></div>
    ${S.shops.some((s) => !s.open) ? '<p class="note">ร้านที่ยังไม่ได้ตั้งเวลาเปิด–ปิด ระบบเตือนได้แค่ตอนที่ไม่มีคนเลยทั้งวัน</p>' : ''}
  </div>`;
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
      <span class="item-line"><span class="item-name">${esc(p.nickname)}</span>${p.role === 'admin' ? '<span class="tag">ผู้จัดการ</span>' : ''}${p.can_schedule ? '<span class="tag">ผู้จัดเวร</span>' : ''}${p.is_test ? '<span class="tag test">ทดสอบ</span>' : ''}${p.is_demo ? '<span class="tag test">ตัวอย่าง</span>' : ''}</span>
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
      ${groups ? `<div class="shop-grid">${groups}</div>` : ''}
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
    <label class="check"><input type="checkbox" id="pe-sched"${p && p.can_schedule ? ' checked' : ''}> ให้จัดเวรได้ (ผู้จัดเวร เช่น พี่ไหม)</label>
    ${p ? `<p class="note">${p.linked ? `ผูก LINE แล้ว${p.line_name ? ` (${esc(p.line_name)})` : ''}` : 'ยังไม่ได้เปิดแอป ให้พนักงานเปิดแอปแล้วกรอกเบอร์นี้'}</p>` : '<p class="note">เพิ่มแล้วให้พนักงานเปิดแอปใน LINE แล้วกรอกเบอร์นี้ ระบบจะผูกให้เอง ไม่ต้องรออนุมัติ</p>'}
    <p class="err" id="sheet-err" role="alert"></p>
    <div class="sheet-actions">${p && p.linked && !isMe ? '<button class="btn quiet" type="button" data-act="unlink" data-confirm="แตะอีกครั้งเพื่อยกเลิก">ยกเลิกการผูก LINE</button>' : ''}
      ${p ? `<button class="btn quiet" type="button" data-act="person-open" data-id="${esc(p.id)}" data-back="people">ดูประวัติ</button>` : ''}<span class="spacer"></span>
      <button class="btn" type="button" data-act="close">ยกเลิก</button><button class="btn solid" type="button" data-act="person-save">บันทึก</button></div>`);
}
async function savePerson(p, overrides) {
  return api('adm_person_save', Object.assign({
    id: p.id, nickname: p.nickname, full_name: p.full_name || '', phone: p.phone, shop_code: p.shop_code || '', role: p.role, status: p.status, can_schedule: !!p.can_schedule,
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
function copyText(text, done) {
  const fallback = () => sheet(`<h3>คัดลอกข้อความ</h3><p class="note">กดค้างที่ข้อความ เลือกทั้งหมดแล้วคัดลอก</p><textarea id="copy-area" rows="10" readonly>${esc(text)}</textarea><div class="sheet-actions"><button class="btn" type="button" data-act="close">ปิด</button></div>`);
  try { navigator.clipboard.writeText(text).then(() => toast(done || 'คัดลอกแล้ว ไปวางใน Excel ได้เลย'), fallback); } catch (e) { fallback(); }
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
        const dd = (S.todayData && S.todayData.day) || {};
        const photo = await makePhoto(f, [`${word} · ${S.me.nickname} · ร้าน ${dd.shop || S.me.shop_code || '-'}`, dLong(S.today)]);
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

  'plan-week': (el) => { S.weekStart = addDays(S.weekStart, +el.dataset.d); load(); },
  'go-week': () => { S.weekStart = mondayOf(S.rosterDate || S.today); if (S.mode === 'admin') S.adm = 'plan'; else S.tab = 'plan'; window.scrollTo(0, 0); load(); },
  'ros-notes-edit': () => openNotes(),
  'shop-hours': (el) => openShopHours(el.dataset.s),
  'sh-save': (el) => busy(el, async () => {
    const open = $('#sh-open').value, openEnd = $('#sh-openend').checked, close = openEnd ? '' : $('#sh-close').value;
    if (!open) return sheetErr('กรุณาใส่เวลาเปิด หรือกด "ไม่ตั้งเวลา"');
    if (!openEnd && !close) return sheetErr('กรุณาใส่เวลาปิด หรือติ๊ก "ปิดเมื่อลูกค้าหมด"');
    try { const r = await api('adm_shop_hours', { code: S.edit.shop, open, close, open_end: openEnd }); S.shops = r.shops; closeSheet(); paint(); toast('บันทึกเวลาเปิด–ปิดแล้ว'); } catch (e) { sheetErr(e.message); }
  }),
  'sh-clear': (el) => busy(el, async () => {
    try { const r = await api('adm_shop_hours', { code: S.edit.shop, open: '' }); S.shops = r.shops; closeSheet(); paint(); toast('ยกเลิกเวลาเปิด–ปิดแล้ว'); } catch (e) { sheetErr(e.message); }
  }),
  'dev-exit': () => { try { const u = new URL(location.href); u.searchParams.delete('as'); location.href = u.toString(); } catch (e) { location.href = location.pathname; } },

  'ros-open': (el) => { closeSheet(); S.rosterDate = el.dataset.d; if (S.mode === 'admin') S.adm = 'roster'; else S.tab = 'roster'; window.scrollTo(0, 0); load(); },
  'ros-day': (el) => { S.rosterDate = el.dataset.d; load(); },
  'ros-init': (el) => busy(el, async () => {
    try { S.roster = await api('ros_init', { date: S.roster.date, source: el.dataset.src }); paint(); toast(el.dataset.src === 'empty' ? 'เริ่มตารางว่างแล้ว' : 'คัดลอกแล้ว แก้ทีละคนได้เลย'); } catch (e) { toast(e.message); }
  }),
  'ros-notes': (el) => busy(el, async () => {
    try { S.roster = await api('ros_notes', { date: S.roster.date, notes: $('#ros-notes').value }); closeSheet(); paint(); toast('บันทึกประกาศแล้ว'); } catch (e) { sheetErr(e.message); }
  }),
  'ros-add': (el) => {
    const d = el.dataset;
    openRosterItem(null, { pid: d.pid || '', shop: d.shop || '', off: d.off === '1', start: d.start || '', end: d.end || '', open: d.open === '1' });
    if (S.edit && d.shop && !d.pid) S.edit.shopLocked = true;
  },
  'ros-edit': (el) => { const it = (S.roster.items || []).find((x) => x.id === el.dataset.id); if (it) openRosterItem(it); },
  'ri-type': (el) => {
    const e = S.edit;
    e.off = el.dataset.v === 'off';
    if (!e.off && !e.start && e.presets.length) Object.assign(e, { start: e.presets[0].start, end: e.presets[0].end || '', open: e.presets[0].open_end });
    syncRosterItem();
  },
  'ri-shop': (el) => { S.edit.shop = el.dataset.s; syncRosterItem(); },
  'ri-shop2': (el) => { S.edit.shop2 = el.dataset.s; syncRosterItem(); },
  'ri-preset': (el) => { const x = S.edit.presets[+el.dataset.i]; Object.assign(S.edit, { start: x.start, end: x.end || '', open: x.open_end }); syncRosterItem(); },
  'ri-save': (el) => busy(el, async () => {
    const e = S.edit;
    e.note = $('#ri-note').value.trim(); e.guest = $('#ri-guest').value.trim();
    e.start = $('#ri-start').value; if (!e.open) e.end = $('#ri-end').value;
    if (e.r2) { e.start2 = $('#ri-start2').value; if (!e.open2) e.end2 = $('#ri-end2').value; }
    if (!e.pid) return sheetErr('กรุณาเลือกชื่อพนักงาน');
    if (e.pid === '__guest' && !e.guest) return sheetErr('กรุณาพิมพ์ชื่อ');
    if (!e.off) {
      if (!e.shop) return sheetErr('กรุณาเลือกร้าน');
      if (!e.start) return sheetErr('กรุณาใส่เวลาเข้า');
      if (!e.open && !e.end) return sheetErr('กรุณาใส่เวลาเลิก หรือติ๊ก "เลิกเมื่อลูกค้าหมด"');
      if (e.r2) {
        if (e.open) return sheetErr('รอบแรกเลือก "เลิกเมื่อลูกค้าหมด" ไว้ จะมีรอบ 2 ไม่ได้');
        if (!e.shop2) return sheetErr('กรุณาเลือกร้านของรอบ 2');
        if (!e.start2) return sheetErr('กรุณาใส่เวลาเข้าของรอบ 2');
        if (!e.open2 && !e.end2) return sheetErr('กรุณาใส่เวลาเลิกของรอบ 2 หรือติ๊ก "รอบ 2 เลิกเมื่อลูกค้าหมด"');
      }
    }
    const r2 = !e.off && e.r2;
    try {
      S.roster = await api('ros_item_save', {
        date: S.roster.date, id: e.id, person_id: e.pid === '__guest' ? '' : e.pid, guest_name: e.pid === '__guest' ? e.guest : '',
        shop_code: e.off ? '' : e.shop, off: e.off, start: e.off ? '' : e.start, end: e.off || e.open ? '' : e.end, open_end: !e.off && e.open, note: e.note,
        shop2: r2 ? e.shop2 : '', start2: r2 ? e.start2 : '', end2: r2 && !e.open2 ? e.end2 : '', open_end2: r2 && e.open2,
      });
      closeSheet(); paint(); toast('บันทึกแล้ว');
    } catch (err) { sheetErr(err.message); }
  }),
  'ri-delete': (el) => busy(el, async () => {
    try { S.roster = await api('ros_item_delete', { id: S.edit.id }); closeSheet(); paint(); toast('ลบออกจากตารางแล้ว'); } catch (err) { sheetErr(err.message); }
  }),
  'ros-submit': (el) => busy(el, async () => {
    try { S.roster = await api('ros_submit', { date: S.roster.date }); paint(); toast('ส่งให้ผู้จัดการตรวจแล้ว'); } catch (e) { toast(e.message); }
  }),
  'ros-approve': (el) => busy(el, async () => {
    try { S.roster = await api('ros_approve', { date: S.roster.date }); paint(); toast('อนุมัติแล้ว พนักงานเห็นกะแล้ว'); } catch (e) { toast(e.message); }
  }),
  'ros-image': (el) => busy(el, async () => {
    try {
      const url = await rosterImage(), inLine = !!(window.liff && liff.isInClient && liff.isInClient());
      sheet(`<h3>รูปตารางงาน</h3><img class="photo-big" src="${url}" alt="ตารางงาน ${esc(thaiDay(S.roster.date))}">
        <p class="note">${inLine ? 'กดค้างที่รูป แล้วเลือกบันทึกหรือส่งต่อในกลุ่ม LINE' : 'คลิกขวาที่รูปเพื่อคัดลอก หรือกดดาวน์โหลด'}</p>
        <div class="sheet-actions">${inLine ? '' : `<a class="btn solid" href="${url}" download="ตารางงาน-${S.roster.date}.png">ดาวน์โหลดรูป</a>`}<button class="btn" type="button" data-act="close">ปิด</button></div>`);
    } catch (e) { console.error('roster image', e); toast('ทำรูปไม่สำเร็จ ลองอีกครั้ง'); }
  }),
  'ros-share': () => {
    const canPick = !!(window.liff && liff.isApiAvailable && liff.isApiAvailable('shareTargetPicker'));
    sheet(`<h3>ข้อความตารางเวร</h3>
      <p class="note">${canPick ? 'กด "เลือกกลุ่ม LINE แล้วส่ง" แล้วติ๊กกลุ่มร้านที่จะส่ง ข้อความจะส่งในชื่อ LINE ของคุณ' : 'กด "คัดลอกข้อความ" แล้วไปวางในกลุ่ม LINE เอง'}</p>
      <textarea id="copy-area" rows="12" readonly>${esc(rosterText())}</textarea>
      <div class="sheet-actions"><button class="btn" type="button" data-act="close">ปิด</button><span class="spacer"></span>
        <button class="btn${canPick ? '' : ' solid'}" type="button" data-act="ros-copy">คัดลอกข้อความ</button>
        ${canPick ? '<button class="btn solid" type="button" data-act="ros-pick">เลือกกลุ่ม LINE แล้วส่ง</button>' : ''}</div>`);
  },
  'ros-copy': () => {
    const ta = $('#copy-area'), text = ta ? ta.value : rosterText();
    const manual = () => { if (ta) { ta.focus(); ta.select(); } toast('กดค้างที่ข้อความ แล้วเลือกคัดลอก'); };
    try { navigator.clipboard.writeText(text).then(() => toast('คัดลอกแล้ว ไปวางในกลุ่ม LINE ได้เลย'), manual); } catch (e) { manual(); }
  },
  'ros-pick': async (el) => {
    el.disabled = true;
    try {
      const res = await liff.shareTargetPicker([{ type: 'text', text: rosterText() }]);
      if (res) { closeSheet(); toast('ส่งเข้า LINE แล้ว'); }
    } catch (e) { toast('ส่งไม่สำเร็จ ใช้ปุ่มคัดลอกข้อความแทน'); }
    el.disabled = false;
  },


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
      shop_code: $('#pe-shop').value, role: $('#pe-role').value, status: p ? $('#pe-status').value : 'active', can_schedule: $('#pe-sched').checked,
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
  else if (id === 'ri-person' && S.edit) {
    S.edit.pid = v;
    const pp = ((S.roster && S.roster.people) || []).find((x) => x.id === v);
    if (pp && pp.shop_code && !S.edit.id && !S.edit.shopLocked) S.edit.shop = pp.shop_code;
    syncRosterItem();
  }
  else if (id === 'ri-start' && S.edit) { S.edit.start = v; syncRosterItem(); }
  else if (id === 'ri-end' && S.edit) { S.edit.end = v; if (v) S.edit.open = false; syncRosterItem(); }
  else if (id === 'ri-open' && S.edit) { S.edit.open = ev.target.checked; syncRosterItem(); }
  else if (id === 'ri-r2' && S.edit) {
    const e = S.edit;
    e.r2 = ev.target.checked;
    if (e.r2 && !e.start2) e.start2 = e.open ? '' : (e.end || '');
    syncRosterItem();
  }
  else if (id === 'ri-start2' && S.edit) { S.edit.start2 = v; syncRosterItem(); }
  else if (id === 'ri-end2' && S.edit) { S.edit.end2 = v; if (v) S.edit.open2 = false; syncRosterItem(); }
  else if (id === 'ri-open2' && S.edit) { S.edit.open2 = ev.target.checked; syncRosterItem(); }
  else if (id === 'sh-openend') { const c = $('#sh-close'); if (c) { c.disabled = ev.target.checked; if (ev.target.checked) c.value = ''; } }
});

/* keep the clock and data fresh */
setInterval(() => { const c = $('#clock'); if (c) c.textContent = clockText(); }, 10000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.me && S.me.status === 'active' && modal.hidden && Date.now() - S.lastLoad > 120000) load();
});

boot();
})();
