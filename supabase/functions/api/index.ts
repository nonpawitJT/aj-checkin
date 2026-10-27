// A&J check-in API (Supabase Edge Function "api")
// - Verifies the LINE LIFF ID token on every request
// - Stores photos in the private "photos" bucket
// - Calls the database function public.api() with the verified LINE user id
// - Replaces stored photo paths in the reply with 1-hour signed URLs
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

function serviceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const o = JSON.parse(raw);
      const v = o.default ?? Object.values(o)[0];
      if (v) return String(v);
    } catch (_) { /* ignore */ }
  }
  return Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
}

const db = createClient(SUPABASE_URL, serviceKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-line-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
  });

class UserError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------- LINE auth
let channelCache: { id: string; at: number } | null = null;

async function channelId(): Promise<string> {
  if (channelCache && Date.now() - channelCache.at < 300_000) return channelCache.id;
  const { data, error } = await db.from("settings").select("value").eq("key", "line_channel_id").maybeSingle();
  if (error) throw new Error("settings: " + error.message);
  const id = (data?.value ?? "").trim();
  channelCache = { id, at: Date.now() };
  return id;
}

type Claims = { sub: string; name: string | null; picture: string | null; exp: number };
type AuthFail = { error: string; message: string };
const tokenCache = new Map<string, Claims>();

async function verify(token: string): Promise<Claims | AuthFail> {
  const hit = tokenCache.get(token);
  if (hit && hit.exp * 1000 > Date.now() + 5_000) return hit;
  const cid = await channelId();
  if (!cid) return { error: "setup", message: "ระบบยังตั้งค่า LINE ไม่เสร็จ กรุณาแจ้งผู้ดูแล" };
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: token, client_id: cid }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.sub) {
    const desc = String(body.error_description ?? "");
    console.warn("line verify failed", res.status, desc);
    return {
      error: /expired/i.test(desc) ? "token_expired" : "auth",
      message: "ยืนยันตัวตนกับ LINE ไม่สำเร็จ กรุณาปิดแล้วเปิดแอปใหม่",
    };
  }
  const claims: Claims = {
    sub: String(body.sub),
    name: body.name ?? null,
    picture: body.picture ?? null,
    exp: Number(body.exp) || Math.floor(Date.now() / 1000) + 600,
  };
  if (tokenCache.size > 500) tokenCache.clear();
  tokenCache.set(token, claims);
  return claims;
}

// ---------------------------------------------------------------- photos
const UPLOADS: Record<string, { key: string; prefix: string }[]> = {
  punch: [{ key: "photo", prefix: "punch" }],
  register: [{ key: "face_photo", prefix: "face" }],
  adm_notice_add: [{ key: "photo", prefix: "notice" }],
};
const PHOTO_KEYS = new Set(["photo", "face_photo", "in_photo", "out_photo"]);

function decodeJpeg(s: string): Uint8Array | null {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) return null;
  const bin = atob(m[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function storePhotos(action: string, args: Record<string, unknown>) {
  for (const { key, prefix } of UPLOADS[action] ?? []) {
    const v = args[key];
    if (v == null || v === "") continue;
    if (typeof v !== "string") throw new UserError("photo", "รูปไม่ถูกต้อง ลองถ่ายใหม่");
    const bytes = decodeJpeg(v);
    if (!bytes || bytes.length > 2_000_000) throw new UserError("photo", "รูปไม่ถูกต้องหรือใหญ่เกินไป ลองถ่ายใหม่");
    const month = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 7);
    const path = `${prefix}/${month}/${crypto.randomUUID()}.jpg`;
    const { error } = await db.storage.from("photos").upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error("upload: " + error.message);
    args[key] = path;
  }
  // Any other action may not carry raw image data
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === "string" && v.startsWith("data:")) delete args[k];
  }
}

function collectPaths(node: unknown, out: Set<string>) {
  if (Array.isArray(node)) {
    for (const n of node) collectPaths(n, out);
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (PHOTO_KEYS.has(k) && typeof v === "string" && v && !v.startsWith("http")) out.add(v);
      else collectPaths(v, out);
    }
  }
}

function replacePaths(node: unknown, map: Map<string, string | null>): unknown {
  if (Array.isArray(node)) return node.map((n) => replacePaths(n, map));
  if (node && typeof node === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      o[k] = PHOTO_KEYS.has(k) && typeof v === "string" && map.has(v) ? map.get(v) : replacePaths(v, map);
    }
    return o;
  }
  return node;
}

async function signPhotos(result: unknown): Promise<unknown> {
  const paths = new Set<string>();
  collectPaths(result, paths);
  if (!paths.size) return result;
  const { data, error } = await db.storage.from("photos").createSignedUrls([...paths], 3600);
  const map = new Map<string, string | null>();
  for (const p of paths) map.set(p, null);
  if (!error && data) {
    for (const d of data) if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  }
  return replacePaths(result, map);
}

// ---------------------------------------------------------------- request log (for the dev monitor)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function logRequest(row: Record<string, unknown>) {
  const p = Promise.resolve(db.from("api_log").insert(row)).then(({ error }) => {
    if (error) console.warn("api_log insert failed", error.message);
  }).catch(() => {});
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt && typeof rt.waitUntil === "function") rt.waitUntil(p);
}

type Result = { status: number; body: Record<string, unknown> | unknown; sub?: string | null };

async function handle(action: string, args: Record<string, unknown>, token: string): Promise<Result> {
  if (!token) return { status: 401, body: { error: "auth", message: "กรุณาเปิดแอปผ่าน LINE" } };
  try {
    const claims = await verify(token);
    if ("error" in claims) return { status: claims.error === "setup" ? 503 : 401, body: claims };
    await storePhotos(action, args);
    const { data, error } = await db.rpc("api", {
      p_sub: claims.sub,
      p_name: claims.name,
      p_picture: claims.picture,
      p_action: action,
      p_args: args,
    });
    if (error) {
      if (error.code === "P0001") return { status: 400, body: { error: error.hint || "app", message: error.message }, sub: claims.sub };
      if (error.code === "23505") return { status: 409, body: { error: "duplicate", message: "ข้อมูลนี้บันทึกไปแล้ว ลองรีเฟรชหน้า" }, sub: claims.sub };
      console.error("rpc error", action, error);
      return { status: 500, body: { error: "server", message: "ระบบขัดข้อง ลองใหม่อีกครั้ง", detail: error.message }, sub: claims.sub };
    }
    return { status: 200, body: await signPhotos(data), sub: claims.sub };
  } catch (e) {
    if (e instanceof UserError) return { status: 400, body: { error: e.code, message: e.message } };
    console.error("request failed", action, e);
    return { status: 500, body: { error: "server", message: "ระบบขัดข้อง ลองใหม่อีกครั้ง", detail: String(e) } };
  }
}

// ---------------------------------------------------------------- handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method", message: "POST only" }, 405);

  let body: { action?: unknown; args?: unknown };
  try {
    body = await req.json();
  } catch (_) {
    return json({ error: "bad_request", message: "ข้อมูลไม่ถูกต้อง" }, 400);
  }
  const action = String(body?.action ?? "");
  const args: Record<string, unknown> =
    body?.args && typeof body.args === "object" && !Array.isArray(body.args) ? { ...(body.args as Record<string, unknown>) } : {};

  if (action === "ping") {
    const cid = await channelId().catch(() => "");
    return json({ ok: true, line_channel_set: Boolean(cid), time: new Date().toISOString() });
  }

  const t0 = Date.now();
  const actingAs = typeof args._as === "string" && UUID_RE.test(args._as) ? args._as : null;
  const res = await handle(action, args, req.headers.get("x-line-token") ?? "");
  const b = (res.body ?? {}) as Record<string, unknown>;
  logRequest({
    action: action.slice(0, 40),
    status: res.status,
    ms: Date.now() - t0,
    line_sub: res.sub ?? null,
    acting_as: actingAs,
    error: res.status >= 400 ? String(b.detail ?? b.message ?? b.error ?? "").slice(0, 300) : null,
  });
  if (b && typeof b === "object" && "detail" in b) delete b.detail;
  return json(res.body, res.status);
});
