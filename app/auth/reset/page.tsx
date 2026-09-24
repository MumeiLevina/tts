import AuthForm from "../../components/AuthForm";
export const metadata = { title: "Đặt lại mật khẩu | FitCraft", referrer: "no-referrer" as const };
export default function ResetPage({ searchParams }: { searchParams: { token?: string } }) { return <AuthForm mode="reset" token={searchParams.token || ""} />; }
