import type { Metadata } from "next";
import "./globals.css";
import "./premium-redesign.css";
import WardrobeProvider from "./components/WardrobeProvider";
import RevealController from "./components/RevealController";
export const metadata: Metadata={
  title:{default:"FitCraft | Phối đồ theo gu của bạn",template:"%s | FitCraft"},
  description:"Khám phá thời trang, lưu tủ đồ cá nhân và phối những bộ đồ phù hợp từ sản phẩm đang có trong shop.",
  openGraph:{title:"FitCraft | Phối đồ theo gu của bạn",description:"Tủ đồ cá nhân và stylist thời trang trong một trải nghiệm mua sắm.",type:"website",locale:"vi_VN"}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi" suppressHydrationWarning><body><a className="skip-link" href="#main-content">Đi thẳng đến nội dung</a><RevealController/><WardrobeProvider><div id="main-content">{children}</div></WardrobeProvider></body></html>}
