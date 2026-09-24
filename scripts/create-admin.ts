import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword, normalizeEmail } from "../lib/server/auth";

const db = new PrismaClient();

async function main() {
  const emailInput = process.argv[2] || "admin@example.com";
  const passwordInput = process.argv[3] || "Admin@123456";
  const nameInput = process.argv[4] || "Administrator";

  const email = normalizeEmail(emailInput);
  const passwordHash = await hashPassword(passwordInput);

  const existing = await db.user.findUnique({
    where: { email },
    include: { session: true }
  });

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: {
        role: "ADMIN",
        passwordHash,
        name: existing.name || nameInput
      }
    });

    if (!existing.session) {
      await db.session.create({
        data: {
          id: randomBytes(32).toString("hex"),
          userId: existing.id,
          expiresAt: new Date("2099-12-31T23:59:59.000Z")
        }
      });
    }

    console.log(`Đã cập nhật thành công tài khoản admin: ${email}`);
  } else {
    const user = await db.user.create({
      data: {
        email,
        name: nameInput,
        role: "ADMIN",
        passwordHash,
        session: {
          create: {
            id: randomBytes(32).toString("hex"),
            expiresAt: new Date("2099-12-31T23:59:59.000Z")
          }
        }
      }
    });

    console.log(`Đã tạo thành công tài khoản admin: ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error("Lỗi khi tạo tài khoản admin:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
