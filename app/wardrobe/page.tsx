import PersonalWardrobe from "../components/PersonalWardrobe";
import AuthMenu from "../components/AuthMenu";
export const metadata = { title: "Tủ đồ của tôi | FitCraft" };
export default function WardrobePage() {
  return <main className="wardrobe-page"><nav className="wardrobe-page-nav" aria-label="Điều hướng tủ đồ"><a className="wardrobe-page-brand" href="/"><span aria-hidden="true">←</span> FitCraft <small>Tiếp tục khám phá</small></a><AuthMenu /></nav><PersonalWardrobe /></main>;
}
