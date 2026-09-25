"use client";

import React from "react";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Heart,
  ArrowUpRight
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="fc-footer">
      {/* Footer Value Highlights Strip */}
      <div className="fc-footer-strip">
        <div className="fc-footer-container fc-strip-grid">
          <div className="fc-strip-item">
            <div className="fc-strip-icon"><Truck size={20} /></div>
            <div>
              <strong>Giao hàng toàn quốc (COD)</strong>
              <p>Đồng kiểm khi nhận, miễn phí từ 1.000.000₫</p>
            </div>
          </div>
          <div className="fc-strip-item">
            <div className="fc-strip-icon"><RotateCcw size={20} /></div>
            <div>
              <strong>Đổi trả trong 14 ngày</strong>
              <p>Hỗ trợ đổi mẫu và size linh hoạt tận nơi</p>
            </div>
          </div>
          <div className="fc-strip-item">
            <div className="fc-strip-icon"><Sparkles size={20} /></div>
            <div>
              <strong>AI Personal Stylist</strong>
              <p>Gợi ý phối đồ cá nhân hóa theo phong cách</p>
            </div>
          </div>
          <div className="fc-strip-item">
            <div className="fc-strip-icon"><ShieldCheck size={20} /></div>
            <div>
              <strong>Cam kết chất lượng</strong>
              <p>Chất liệu tự nhiên cao cấp, nguồn gốc rõ ràng</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Info */}
      <div className="fc-footer-main">
        <div className="fc-footer-container fc-footer-grid">
          {/* Brand Info */}
          <div className="fc-footer-col brand-col">
            <a href="/" className="fc-footer-logo">
              <i /> fitcraft
            </a>
            <p className="fc-footer-desc">
              Không gian khám phá trang phục và nhận gợi ý phối đồ từ những sản phẩm đang có tại FitCraft.
            </p>
            <div className="fc-footer-contact">
              <div className="fc-contact-row">
                <Phone size={15} />
                <span>Hotline: <strong>1900 8888</strong> (8:30 - 21:30)</span>
              </div>
              <div className="fc-contact-row">
                <Mail size={15} />
                <span>Email: <strong>cskh@fitcraft.vn</strong></span>
              </div>
              <div className="fc-contact-row">
                <MapPin size={15} />
                <span>FitCraft Studio: Q. Hoàn Kiếm, Hà Nội & Q.1, TP.HCM</span>
              </div>
            </div>
          </div>

          {/* Quick Links: Trải nghiệm */}
          <div className="fc-footer-col">
            <h4>Trải Nghiệm Mua Sắm</h4>
            <ul className="fc-footer-links">
              <li><a href="/fitting-room">Phòng phối đồ AI (Fitting Room) <ArrowUpRight size={13} /></a></li>
              <li><a href="/#looks">Bộ sưu tập theo dịp (Lookbook)</a></li>
              <li><a href="/#products">Menu sản phẩm có sẵn</a></li>
              <li><a href="/wardrobe">Tủ đồ cá nhân & phối đồ</a></li>
              <li><a href="/orders">Theo dõi & tra cứu đơn hàng</a></li>
            </ul>
          </div>

          {/* Quick Links: Chính sách */}
          <div className="fc-footer-col">
            <h4>Hỗ trợ mua sắm</h4>
            <ul className="fc-footer-links">
              <li><a href="/#products">Xem size và tồn kho từng sản phẩm</a></li>
              <li><a href="/orders">Theo dõi và quản lý đơn hàng</a></li>
              <li><a href="/auth/login">Đăng nhập để giữ lịch sử mua sắm</a></li>
              <li><a href="mailto:cskh@fitcraft.vn">Liên hệ hỗ trợ qua email</a></li>
              <li><a href="/admin/login">Cổng thông tin quản trị viên</a></li>
            </ul>
          </div>

          {/* Newsletter / App info */}
          <div className="fc-footer-col newsletter-col">
            <h4>Thanh toán</h4>
            <p className="fc-newsletter-sub">Hiện FitCraft nhận thanh toán khi giao hàng. Tổng tiền và phí giao hàng được xác nhận trước khi đặt đơn.</p>
            <div className="fc-payment-tags">
              <span className="fc-badge-pay">COD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="fc-footer-bottom">
        <div className="fc-footer-container fc-bottom-flex">
          <p>© {new Date().getFullYear()} FitCraft Studio. All rights reserved. Stylist cá nhân trong tầm tay.</p>
          <p className="fc-made-with">
            Được thiết kế với <Heart size={13} className="heart-icon" /> vì phong cách tự tin của bạn
          </p>
        </div>
      </div>
    </footer>
  );
}
