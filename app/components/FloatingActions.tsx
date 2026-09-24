"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp, Sparkles, Phone, MessageCircle, X } from "lucide-react";

export default function FloatingActions() {
  const [showBackTop, setShowBackTop] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setShowBackTop(window.scrollY > 350);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <div className="fc-floating-bar" aria-label="Thanh tác vụ nhanh">
        {/* Nút Phòng phối đồ nhanh */}
        <a
          href="/fitting-room"
          className="fc-float-btn fc-float-stylist"
          title="Mở phòng phối đồ AI"
          aria-label="Vào phòng phối đồ AI"
        >
          <Sparkles size={19} className="sparkle-anim" />
          <span className="fc-float-tooltip">Phối đồ AI 3s</span>
        </a>

        {/* Nút Hỗ trợ / Hotline */}
        <button
          className="fc-float-btn fc-float-support"
          onClick={() => setShowSupportModal(true)}
          title="Hỗ trợ & Tư vấn"
          aria-label="Hỗ trợ khách hàng"
        >
          <MessageCircle size={19} />
          <span className="fc-float-tooltip">Hỗ trợ shop</span>
        </button>

        {/* Nút Cuộn lên đầu trang */}
        {showBackTop && (
          <button
            className="fc-float-btn fc-float-top"
            onClick={scrollToTop}
            title="Cuộn lên đầu trang"
            aria-label="Lên đầu trang"
          >
            <ArrowUp size={19} />
          </button>
        )}
      </div>

      {/* Support Quick Modal */}
      {showSupportModal && (
        <div className="fc-support-modal-backdrop" onClick={() => setShowSupportModal(false)}>
          <div className="fc-support-modal" onClick={e => e.stopPropagation()}>
            <div className="support-modal-header">
              <div className="support-icon-wrap">
                <Phone size={20} />
              </div>
              <div>
                <h3>Trung tâm hỗ trợ khách hàng</h3>
                <p>FitCraft sẵn sàng hỗ trợ bạn chọn size và giải đáp đơn hàng</p>
              </div>
              <button className="support-modal-close" onClick={() => setShowSupportModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="support-modal-body">
              <div className="support-card-item">
                <div className="support-channel-info">
                  <strong>Tổng đài tư vấn trực tiếp</strong>
                  <span>Tư vấn chất liệu, bảng size và giải quyết đơn hàng</span>
                </div>
                <a href="tel:19008888" className="btn-support-channel hotline">
                  <Phone size={15} /> 1900 8888
                </a>
              </div>

              <div className="support-card-item">
                <div className="support-channel-info">
                  <strong>Tra cứu đơn hàng của bạn</strong>
                  <span>Xem trạng thái vận chuyển và yêu cầu đổi hàng 14 ngày</span>
                </div>
                <a href="/orders" className="btn-support-channel orders">
                  Xem đơn hàng
                </a>
              </div>

              <div className="support-card-item">
                <div className="support-channel-info">
                  <strong>Trợ lý Stylist cá nhân</strong>
                  <span>Nhận gợi ý set đồ theo ngân sách và phong cách</span>
                </div>
                <a href="/fitting-room" className="btn-support-channel stylist">
                  <Sparkles size={15} /> Thử stylist AI
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
