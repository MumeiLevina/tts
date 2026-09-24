import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { z, ZodError } from "zod";
import { db } from "./db";
import { authCookieName, getAuthenticatedUser } from "./auth";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export async function body<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_JSON", "Thiếu nội dung yêu cầu.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > 65536) {
      await reader.cancel();
      throw new ApiError(413, "BODY_TOO_LARGE", "Nội dung vượt quá 64 KB. Hãy sử dụng URL ảnh.");
    }
    chunks.push(chunk.value);
  }
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ApiError(400, "INVALID_JSON", "JSON không hợp lệ."); }
  return schema.parse(value);
}

export function isAllowedOrigin(origin: string | null, requestUrl: { origin: string; port?: string }): boolean {
  if (!origin) return true;
  const expected = process.env.APP_ORIGIN || requestUrl.origin;
  if (origin === expected || origin === requestUrl.origin) return true;
  try {
    const originUrl = new URL(origin);
    const expectedUrl = new URL(expected);
    const isLoopback = (host: string) => ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host);
    if (isLoopback(originUrl.hostname) && (isLoopback(expectedUrl.hostname) || isLoopback(new URL(requestUrl.origin).hostname))) {
      return (originUrl.port || (originUrl.protocol === "https:" ? "443" : "80")) ===
             (expectedUrl.port || (expectedUrl.protocol === "https:" ? "443" : "80"));
    }
  } catch {
    return false;
  }
  return false;
}

export type RequestUser = { id: string; email: string; name: string; role: string };
type Context = { sessionId: string; user: RequestUser | null };
export function endpoint(handler: (req: NextRequest, ctx: Context) => Promise<unknown>, options: { session?: boolean; admin?: boolean; auth?: boolean; successStatus?: number } = {}) {
  return async (req: NextRequest) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        const origin = req.headers.get("origin");
        if (!isAllowedOrigin(origin, req.nextUrl) || req.headers.get("sec-fetch-site") === "cross-site")
          throw new ApiError(403, "INVALID_ORIGIN", "Nguồn yêu cầu không được phép.");
      }
      let sessionId = "";
      let token: string | undefined;
      const authenticated = await getAuthenticatedUser(req.cookies.get(authCookieName)?.value);
      if (options.auth && !authenticated) throw new ApiError(401, "UNAUTHORIZED", "Đăng nhập để lưu sản phẩm vào tủ đồ cá nhân.");
      if (options.admin && authenticated?.role !== "ADMIN") {
        const key = process.env.ADMIN_API_KEY;
        const supplied = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
        const hash = (v: string) => createHash("sha256").update(v).digest();
        const validKey = Boolean(key && key.length >= 32 && supplied && timingSafeEqual(hash(key), hash(supplied)));
        if (!validKey) throw new ApiError(authenticated ? 403 : 401, authenticated ? "FORBIDDEN" : "UNAUTHORIZED", authenticated ? "Tài khoản không có quyền quản trị." : "Bạn cần đăng nhập bằng tài khoản quản trị.");
      }
      if (options.session) {
        const cookie = req.cookies.get("fitcraft_session")?.value;
        const id = cookie && /^[a-f0-9]{64}$/.test(cookie) ? createHash("sha256").update(cookie).digest("hex") : "";
        const existing = id ? await db.session.findFirst({ where: { id, userId: null } }) : null;
        if (authenticated) sessionId = authenticated.sessionId;
        else if (existing && existing.expiresAt > new Date()) sessionId = existing.id;
        else {
          token = randomBytes(32).toString("hex");
          sessionId = createHash("sha256").update(token).digest("hex");
          await db.session.create({ data: { id: sessionId, expiresAt: new Date(Date.now() + 30 * 86400000) } });
        }
      }
      const value = await handler(req, { sessionId, user: authenticated ? { id: authenticated.id, email: authenticated.email, name: authenticated.name, role: authenticated.role } : null });
      const response = NextResponse.json(value, { status: options.successStatus || 200, headers: { "Cache-Control": "no-store" } });
      if (token) response.cookies.set("fitcraft_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
      return response;
    } catch (error) {
      if (error instanceof ZodError) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ.", details: error.flatten() } }, { status: 400 });
      if (error instanceof ApiError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
      console.error("API failure", error instanceof Error ? error.message : "Unknown error");
      return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Không thể xử lý yêu cầu. Vui lòng thử lại." } }, { status: 500 });
    }
  };
}
