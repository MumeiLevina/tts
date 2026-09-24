import type { Metadata } from "next";
import AuthMenu from "../components/AuthMenu";
import StylistExperience from "../features/ai-stylist/components/StylistExperience";

export const metadata: Metadata = {
  title: "AI Stylist | FitCraft",
  description: "Nhận gợi ý outfit từ sản phẩm thật đang có tại FitCraft."
};

export default function StylistPage() {
  return (
    <main className="wardrobe-page">
      <nav className="wardrobe-page-nav" aria-label="Điều hướng AI Stylist">
        <a className="wardrobe-page-brand" href="/">
          <span aria-hidden="true">←</span> FitCraft <small>Tiếp tục khám phá</small>
        </a>
        <AuthMenu />
      </nav>
      <StylistExperience />
    </main>
  );
}
