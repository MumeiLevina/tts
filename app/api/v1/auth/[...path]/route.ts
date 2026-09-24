import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { z, ZodError } from "zod";
import { db } from "../../../../../lib/server/db";
import { ApiError, body, isAllowedOrigin } from "../../../../../lib/server/http";
import { authCookie, authCookieName, createAuthSession, createResetToken, getAuthenticatedUser, guestSessionIdFromCookie, hashPassword, mergeGuestSession, normalizeEmail, resetPassword, revokeAuthSession, verifyPassword } from "../../../../../lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const credentials = z.object({ email: z.string().trim().email().max(254), password: z.string().min(8).max(128) }).strict();
const registerInput = credentials.extend({ name: z.string().trim().min(2).max(80) }).strict();
const resetInput = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(8).max(128) }).strict();
const dummyHash = hashPassword(randomBytes(24).toString("hex"));
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: NextRequest, key: string, max = 8) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const id = `${ip}:${key}`;
  const now = Date.now();
  if (attempts.size > 5000) for (const [storedKey, value] of Array.from(attempts)) if (value.resetAt < now) attempts.delete(storedKey);
  const record = attempts.get(id);
  if (!record || record.resetAt < now) { attempts.set(id, { count: 1, resetAt: now + 15 * 60000 }); return; }
  record.count++;
  if (record.count > max) throw new ApiError(429, "TOO_MANY_ATTEMPTS", "Bạn đã thử quá nhiều lần. Vui lòng quay lại sau 15 phút.");
}

function guardOrigin(req: NextRequest) {
  if (["GET", "HEAD"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin, req.nextUrl) || req.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "INVALID_ORIGIN", "Nguồn yêu cầu không được phép.");
}

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

function authenticated(value: unknown, token: string, status = 200) {
  const response = json(value, status);
  response.cookies.set(authCookieName, token, authCookie);
  return response;
}

async function sendResetEmail(email: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_FROM_EMAIL;
  if (!apiKey || !from) return false;
  const origin = process.env.APP_ORIGIN || "http://localhost:3000";
  const link = `${origin}/auth/reset?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: "Đặt lại mật khẩu FitCraft", html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu FitCraft.</p><p><a href="${link}">Đặt lại mật khẩu</a></p><p>Liên kết hết hạn sau 20 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>` })
  });
  if (!response.ok) throw new Error(`RESET_EMAIL_${response.status}`);
  return true;
}

async function dispatch(req: NextRequest, context: { params: { path: string[] } }) {
  try {
    guardOrigin(req);
    const action = context.params.path.join("/");

    if (req.method === "GET" && action === "me") {
      const user = await getAuthenticatedUser(req.cookies.get(authCookieName)?.value);
      return json({ user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null });
    }

    if (req.method === "POST" && action === "register") {
      const input = await body(req, registerInput);
      const email = normalizeEmail(input.email);
      rateLimit(req, `register:${email}`, 5);
      const passwordHash = await hashPassword(input.password);
      let user;
      try {
        user = await db.user.create({ data: {
          email, name: input.name, passwordHash,
          session: { create: { id: randomBytes(32).toString("hex"), expiresAt: new Date("2099-12-31T23:59:59.000Z") } }
        }, include: { session: true } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ApiError(409, "EMAIL_EXISTS", "Email này đã được đăng ký.");
        throw error;
      }
      const guestId = await guestSessionIdFromCookie(req.cookies.get("fitcraft_session")?.value);
      await mergeGuestSession(guestId, user.session!.id);
      const token = await createAuthSession(user.id);
      return authenticated({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }, token, 201);
    }

    if (req.method === "POST" && action === "login") {
      const input = await body(req, credentials);
      const email = normalizeEmail(input.email);
      rateLimit(req, `login:${email}`);
      const user = await db.user.findUnique({ where: { email }, include: { session: true } });
      const valid = await verifyPassword(input.password, user?.passwordHash || await dummyHash);
      if (!user || !valid || !user.session) throw new ApiError(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
      const guestId = await guestSessionIdFromCookie(req.cookies.get("fitcraft_session")?.value);
      await mergeGuestSession(guestId, user.session.id);
      const token = await createAuthSession(user.id);
      return authenticated({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }, token);
    }

    if (req.method === "POST" && action === "logout") {
      await revokeAuthSession(req.cookies.get(authCookieName)?.value);
      const response = json({ ok: true });
      response.cookies.set(authCookieName, "", { ...authCookie, maxAge: 0 });
      response.cookies.set("fitcraft_session", "", { ...authCookie, maxAge: 0 });
      return response;
    }

    if (req.method === "POST" && action === "forgot-password") {
      const { email: rawEmail } = await body(req, z.object({ email: z.string().trim().email().max(254) }).strict());
      const email = normalizeEmail(rawEmail);
      rateLimit(req, `forgot:${email}`, 4);
      const user = await db.user.findUnique({ where: { email } });
      const token = user ? await createResetToken(user.id) : randomBytes(32).toString("hex");
      if (user) {
        try { await sendResetEmail(user.email, token); }
        catch (error) { console.error("Password reset email failed", error instanceof Error ? error.message : "Unknown error"); }
      }
      const developmentToken = process.env.NODE_ENV !== "production" ? token : undefined;
      return json({ message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.", developmentToken });
    }

    if (req.method === "POST" && action === "reset-password") {
      const input = await body(req, resetInput);
      rateLimit(req, "reset", 8);
      if (!await resetPassword(input.token, input.password)) throw new ApiError(400, "INVALID_RESET_TOKEN", "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      const response = json({ ok: true, message: "Mật khẩu đã được cập nhật. Bạn có thể đăng nhập lại." });
      response.cookies.set(authCookieName, "", { ...authCookie, maxAge: 0 });
      return response;
    }

    throw new ApiError(404, "NOT_FOUND", "API xác thực không tồn tại.");
  } catch (error) {
    if (error instanceof ZodError) return json({ error: { code: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ.", details: error.flatten() } }, 400);
    if (error instanceof ApiError) return json({ error: { code: error.code, message: error.message } }, error.status);
    console.error("Auth failure", error instanceof Error ? error.message : "Unknown error");
    return json({ error: { code: "INTERNAL_ERROR", message: "Không thể xử lý yêu cầu. Vui lòng thử lại." } }, 500);
  }
}

export { dispatch as GET, dispatch as POST };
