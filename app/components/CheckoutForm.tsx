"use client";
import { useRef, useState } from "react";
import { api, OrderView } from "../../lib/client/api";

export default function CheckoutForm({ onComplete, onBack }: { onComplete: (order: OrderView) => void; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const attempt = useRef<{ key: string; body: string }>();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(e.currentTarget);
    const payload = JSON.stringify({ customerName: form.get("customerName"), phone: form.get("phone"), address: form.get("address"), city: form.get("city"), note: form.get("note"), paymentMethod: "COD" });
    if (!attempt.current || attempt.current.body !== payload) attempt.current = { key: crypto.randomUUID(), body: payload };
    inFlight.current = true; setBusy(true); setError("");
    try {
      const result = await api<{ order: OrderView }>("orders", { method: "POST", headers: { "Idempotency-Key": attempt.current.key }, body: payload });
      onComplete(result.order);
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể đặt hàng."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <form className="commerce-form" onSubmit={submit}>
    <h4>Thông tin giao hàng</h4>
    <label>Họ và tên<input name="customerName" required minLength={2} maxLength={100} autoComplete="name" /></label>
    <label>Số điện thoại<input name="phone" type="tel" required pattern="(0|\+84)[0-9]{9}" autoComplete="tel" placeholder="0901234567" /></label>
    <label>Địa chỉ nhận hàng<input name="address" required minLength={10} maxLength={300} autoComplete="street-address" placeholder="Số nhà, đường, phường/xã" /></label>
    <label>Tỉnh / Thành phố<input name="city" required minLength={2} maxLength={80} autoComplete="address-level1" /></label>
    <label>Ghi chú<textarea name="note" maxLength={500} /></label>
    <p>Thanh toán khi nhận hàng (COD). Shop sẽ xác nhận đơn trước khi giao.</p>
    {error && <p role="alert" className="commerce-error">{error}</p>}
    <button className="btn-buy-bundle" disabled={busy} type="submit">{busy ? "Đang đặt hàng…" : "Xác nhận đặt hàng COD"}</button>
    <button type="button" onClick={onBack} disabled={busy}>Quay lại giỏ hàng</button>
  </form>;
}

