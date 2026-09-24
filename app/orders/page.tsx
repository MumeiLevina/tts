import OrderDashboard from "../components/OrderDashboard";

export const metadata = {
  title: "Đơn hàng của bạn | FitCraft",
  description: "Trung tâm quản lý, theo dõi lộ trình đơn hàng và đổi trả sản phẩm thời trang FitCraft."
};

export default function OrdersPage() {
  return <OrderDashboard />;
}
