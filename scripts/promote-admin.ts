import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Cách dùng: npm run admin:promote -- email@example.com");
    process.exitCode = 1;
  } else {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.error("Không tìm thấy tài khoản. Hãy đăng ký tài khoản trên website trước.");
      process.exitCode = 1;
    } else {
      await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      console.log("Đã cấp quyền ADMIN cho " + user.email);
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
