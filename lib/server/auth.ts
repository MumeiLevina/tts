import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { db } from "./db";

const AUTH_DAYS = 30;
export const authCookieName = "fitcraft_auth";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

function derivePassword(password: string, salt: Buffer, length: number) {
  return new Promise<Buffer>((resolve, reject) => scryptCallback(password, salt, length, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, derived) => error ? reject(error) : resolve(derived)));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await derivePassword(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, saltHex, digestHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(saltHex || "") || !/^[a-f0-9]{128}$/.test(digestHex || "")) return false;
  const expected = Buffer.from(digestHex, "hex");
  const actual = await derivePassword(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export async function getAuthenticatedUser(rawToken?: string) {
  if (!rawToken || !/^[a-f0-9]{64}$/.test(rawToken)) return null;
  const authSession = await db.authSession.findFirst({
    where: { id: hashToken(rawToken), expiresAt: { gt: new Date() } },
    include: { user: { include: { session: true } } }
  });
  if (!authSession?.user.session) return null;
  return { id: authSession.user.id, email: authSession.user.email, name: authSession.user.name, role: authSession.user.role, sessionId: authSession.user.session.id };
}

export async function createAuthSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.authSession.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } });
  const older = await db.authSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip: 9, select: { id: true } });
  if (older.length) await db.authSession.deleteMany({ where: { id: { in: older.map(item => item.id) } } });
  await db.authSession.create({ data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + AUTH_DAYS * 86400000) } });
  return token;
}

export async function revokeAuthSession(rawToken?: string) {
  if (rawToken && /^[a-f0-9]{64}$/.test(rawToken)) await db.authSession.deleteMany({ where: { id: hashToken(rawToken) } });
}

export async function mergeGuestSession(guestSessionId: string | null, userSessionId: string) {
  if (!guestSessionId || guestSessionId === userSessionId) return;
  await db.$transaction(async tx => {
    const guest = await tx.session.findUnique({ where: { id: guestSessionId } });
    if (!guest || guest.userId) return;
    const lines = await tx.cartItem.findMany({ where: { sessionId: guestSessionId }, include: { variant: true } });
    for (const line of lines) {
      const current = await tx.cartItem.findUnique({ where: { sessionId_variantId: { sessionId: userSessionId, variantId: line.variantId } } });
      const quantity = Math.min(20, line.variant.stock, (current?.quantity || 0) + line.quantity);
      if (quantity > 0) await tx.cartItem.upsert({
        where: { sessionId_variantId: { sessionId: userSessionId, variantId: line.variantId } },
        create: { sessionId: userSessionId, variantId: line.variantId, quantity }, update: { quantity }
      });
    }
    const wishes = await tx.wishlistItem.findMany({ where: { sessionId: guestSessionId } });
    const accountSession = await tx.session.findUnique({ where: { id: userSessionId }, select: { userId: true } });
    // Carry legacy guest favorites into the account-backed wardrobe on login.
    if (accountSession?.userId) for (const wish of wishes) await tx.userWardrobe.upsert({
      where: { userId_productId: { userId: accountSession.userId, productId: wish.productId } },
      create: { userId: accountSession.userId, productId: wish.productId }, update: {}
    });
    for (const wish of wishes) await tx.wishlistItem.upsert({
      where: { sessionId_productId: { sessionId: userSessionId, productId: wish.productId } },
      create: { sessionId: userSessionId, productId: wish.productId }, update: {}
    });
    await tx.order.updateMany({ where: { sessionId: guestSessionId }, data: { sessionId: userSessionId } });
    await tx.wardrobeItem.updateMany({ where: { sessionId: guestSessionId }, data: { sessionId: userSessionId } });
    await tx.outfit.updateMany({ where: { sessionId: guestSessionId }, data: { sessionId: userSessionId } });
    await tx.cartItem.deleteMany({ where: { sessionId: guestSessionId } });
    await tx.wishlistItem.deleteMany({ where: { sessionId: guestSessionId } });
    await tx.session.delete({ where: { id: guestSessionId } });
  });
}

export async function guestSessionIdFromCookie(rawToken?: string) {
  if (!rawToken || !/^[a-f0-9]{64}$/.test(rawToken)) return null;
  const id = hashToken(rawToken);
  const session = await db.session.findFirst({ where: { id, userId: null } });
  return session?.id || null;
}

export async function createResetToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    db.passwordResetToken.create({ data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + 20 * 60000) } })
  ]);
  return token;
}

export async function resetPassword(token: string, password: string) {
  const id = hashToken(token);
  const record = await db.passwordResetToken.findFirst({ where: { id, usedAt: null, expiresAt: { gt: new Date() } } });
  if (!record) return false;
  const passwordHash = await hashPassword(password);
  await db.$transaction(async tx => {
    const consumed = await tx.passwordResetToken.updateMany({ where: { id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (!consumed.count) throw new Error("RESET_TOKEN_ALREADY_USED");
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.authSession.deleteMany({ where: { userId: record.userId } });
  });
  return true;
}

export const authCookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: AUTH_DAYS * 86400 };
