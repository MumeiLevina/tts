import type { Metadata } from "next";
import AuthMenu from "../components/AuthMenu";
import StylistExperience from "../features/ai-stylist/components/StylistExperience";
import { featureFlags } from "../../lib/server/features";

export const metadata: Metadata = {
  title: "AI Stylist | FitCraft",
  description: "Nhận gợi ý outfit từ sản phẩm thật đang có tại FitCraft."
};

export default async function StylistPage() {
  const { aiStylist } = await featureFlags();
  if (!aiStylist) return <main className="feature-gate"><div className="feature-gate-card"><span>ĐANG HOÀN THIỆN</span><h1>AI Stylist đang tạm ẩn.</h1><p>Đội ngũ FitCraft đang cải thiện chất lượng gợi ý. Bạn vẫn có thể chọn các bộ phối đã được studio chuẩn bị sẵn.</p><div><a className="cta-primary" href="/#looks">Xem các bộ phối</a><a className="feature-gate-link" href="/">Về trang chủ</a></div></div></main>;
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
