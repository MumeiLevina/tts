"use client";

import React, { useState, useRef } from "react";
import {
  RotateCw,
  Download,
  Share2,
  Heart,
  Upload,
  Camera,
  X,
  Sparkles,
  Check,
  Image as ImageIcon,
  Lock
} from "lucide-react";

export interface ModelAngle {
  id: string;
  label: string;
  url: string;
}

export interface TryOnPreviewCanvasProps {
  modelAngles: ModelAngle[];
  currentAngleIndex: number;
  onCycleAngle: () => void;
  userPhotoUrl?: string | null;
  onUploadUserPhoto: (file: File) => void;
  onSelectSamplePhoto?: (url: string) => void;
  isSaved: boolean;
  onToggleSave: () => void;
  onDownloadHD?: () => void;
  onShare?: () => void;
  className?: string;
}

const SAMPLE_AVATARS = [
  {
    id: "sample-1",
    label: "Ảnh mẫu Nữ (Chính diện)",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "sample-2",
    label: "Ảnh mẫu Nữ (Toàn thân)",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=85"
  },
  {
    id: "sample-3",
    label: "Ảnh mẫu Nam (Thanh lịch)",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1000&q=85"
  }
];

export const TryOnPreviewCanvas: React.FC<TryOnPreviewCanvasProps> = ({
  modelAngles,
  currentAngleIndex,
  onCycleAngle,
  userPhotoUrl,
  onUploadUserPhoto,
  onSelectSamplePhoto,
  isSaved,
  onToggleSave,
  onDownloadHD,
  onShare,
  className = ""
}) => {
  const [viewMode, setViewMode] = useState<"model" | "user">("model");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSnackbarVisible, setIsSnackbarVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasUserPhoto = Boolean(userPhotoUrl);
  const activeImage =
    viewMode === "model"
      ? modelAngles[currentAngleIndex]?.url || modelAngles[0]?.url
      : userPhotoUrl || modelAngles[0]?.url;

  const currentAngle = modelAngles[currentAngleIndex] || modelAngles[0];

  // Mode switcher handler
  const handleSelectMode = (mode: "model" | "user") => {
    if (mode === "user" && !hasUserPhoto) {
      // If user hasn't uploaded yet, open the upload modal directly
      setIsUploadModalOpen(true);
    } else {
      setViewMode(mode);
    }
  };

  // File upload input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadUserPhoto(file);
      setViewMode("user");
      setIsUploadModalOpen(false);
      setIsSnackbarVisible(true);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onUploadUserPhoto(file);
      setViewMode("user");
      setIsUploadModalOpen(false);
      setIsSnackbarVisible(true);
    }
  };

  // Pick sample photo
  const handlePickSample = (url: string) => {
    if (onSelectSamplePhoto) {
      onSelectSamplePhoto(url);
    }
    setViewMode("user");
    setIsUploadModalOpen(false);
    setIsSnackbarVisible(true);
  };

  return (
    <div
      className={`relative w-full h-full min-h-[540px] rounded-2xl overflow-hidden bg-[#d2dbd0] shadow-sm flex flex-col select-none group ${className}`}
    >
      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        aria-label="Tải ảnh toàn thân lên"
      />

      {/* Main Viewport Image */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <img
          src={activeImage}
          alt={viewMode === "model" ? "Người mẫu mặc thử FitCraft" : "Bản xem trước trên ảnh của bạn"}
          className="w-full h-full object-cover mix-blend-multiply filter saturate-[0.88] transition-opacity duration-300"
        />

        {/* Subtle Vignette Gradient Overlay for Maximum Control Contrast */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/25 via-transparent to-black/35" />
      </div>

      {/* ========================================================
          1. TOP HEADER BAR: SEGMENTED CONTROLS & STATUS BADGE
          ======================================================== */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        {/* Left: Segmented Control [👗 Người mẫu] | [✨ Ảnh của bạn] */}
        <div
          className="pointer-events-auto flex items-center bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/15 shadow-md transition-transform duration-200"
          role="tablist"
          aria-label="Chế độ xem phối đồ"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "model"}
            onClick={() => handleSelectMode("model")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 ${
              viewMode === "model"
                ? "bg-white text-ink shadow-sm"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <span>👗</span>
            <span>Người mẫu</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "user"}
            onClick={() => handleSelectMode("user")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 ${
              viewMode === "user"
                ? "bg-white text-ink shadow-sm"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Sparkles size={13} className={viewMode === "user" ? "text-coral" : "text-white/90"} />
            <span>Ảnh của bạn</span>
            {!hasUserPhoto && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-coral text-white rounded-full uppercase">
                Mới
              </span>
            )}
          </button>
        </div>

        {/* Right: Elegant Floating Glassmorphism Status Badge */}
        <div className="pointer-events-auto flex items-center gap-1.5 backdrop-blur-md bg-black/40 text-white/95 text-xs font-mono px-3 py-1.5 rounded-full border border-white/15 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>ẢNH XEM TRƯỚC</span>
        </div>
      </div>

      {/* ========================================================
          2. SLEEK DISMISSIBLE BOTTOM SNACKBAR (When in User Mode)
          ======================================================== */}
      {viewMode === "user" && isSnackbarVisible && (
        <div className="absolute bottom-16 left-4 right-4 z-20 pointer-events-none flex justify-center animate-fadeIn">
          <div className="pointer-events-auto flex items-center justify-between gap-3 bg-black/75 backdrop-blur-md text-white px-4 py-2 rounded-full border border-white/20 shadow-lg max-w-md w-full">
            <div className="flex items-center gap-2 text-xs truncate">
              <Sparkles size={14} className="text-coral flex-shrink-0" />
              <span className="truncate">
                {hasUserPhoto ? "Ảnh gốc của bạn · Chưa ghép trang phục" : "Chưa tải ảnh cá nhân"}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="text-[11px] font-bold bg-white text-ink px-2.5 py-1 rounded-full hover:bg-coral hover:text-white transition-colors duration-150 flex items-center gap-1"
              >
                <Camera size={12} />
                <span>{hasUserPhoto ? "Đổi ảnh" : "Tải ảnh"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSnackbarVisible(false)}
                className="text-white/60 hover:text-white p-0.5"
                title="Đóng thông báo"
                aria-label="Đóng"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. BOTTOM FLOATING ACTION CONTROLS
          ======================================================== */}
      {/* Bottom-Left Group: Angle, Download, Share */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-20">
        <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md p-1 rounded-full border border-white/20 shadow-md">
          {/* Rotate Angle Button (only applicable in Model mode) */}
          {viewMode === "model" && (
            <button
              type="button"
              onClick={onCycleAngle}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 active:scale-95 transition-all duration-150"
              title={`Đổi góc chụp (Hiện tại: ${currentAngle.label})`}
              aria-label="Đổi góc chụp người mẫu"
            >
              <RotateCw size={15} />
            </button>
          )}

          {/* Download HD Button */}
          {onDownloadHD && (
            <button
              type="button"
              onClick={onDownloadHD}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 active:scale-95 transition-all duration-150"
              title="Tải ảnh preview HD về máy"
              aria-label="Tải ảnh HD"
            >
              <Download size={15} />
            </button>
          )}

          {/* Share Look Button */}
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 active:scale-95 transition-all duration-150"
              title="Sao chép liên kết chia sẻ look"
              aria-label="Chia sẻ look"
            >
              <Share2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom-Right Group: Wishlist Save Button */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
        <button
          type="button"
          onClick={onToggleSave}
          className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border shadow-md active:scale-95 hover:scale-105 transition-all duration-200 ${
            isSaved
              ? "bg-coral text-white border-coral"
              : "bg-black/50 text-white border-white/20 hover:bg-black/70"
          }`}
          title={isSaved ? "Bỏ lưu khỏi yêu thích" : "Lưu vào mục yêu thích"}
          aria-label="Lưu look yêu thích"
        >
          <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* ========================================================
          4. LIGHTWEIGHT UPLOAD MODAL / DRAWER
          ======================================================== */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative border border-gray-100 animate-slideUp text-ink"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-coral/10 text-coral flex items-center justify-center">
                  <Camera size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Xem ảnh của bạn trong phòng phối</h3>
                  <p className="text-xs text-muted">
                    Ảnh hiện chỉ dùng để xem trước trên thiết bị. Chức năng ghép trang phục AI chưa được kết nối.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-full border border-gray-200 text-muted hover:text-ink flex items-center justify-center transition-colors"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-5 p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-coral bg-coral/5"
                  : "border-gray-300 hover:border-ink hover:bg-gray-50"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-ink mb-3 group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <strong className="text-sm font-semibold text-ink">
                Nhấn để tải ảnh từ máy hoặc kéo thả vào đây
              </strong>
              <p className="text-xs text-muted mt-1">
                Hỗ trợ định dạng JPG, PNG, WEBP. Khuyên dùng ảnh toàn thân đứng thẳng, chính diện.
              </p>
            </div>

            {/* Quick Sample Selector for Instant Testing */}
            <div className="mt-5">
              <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ImageIcon size={13} />
                <span>Hoặc chọn ảnh mẫu thử nghiệm nhanh:</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {SAMPLE_AVATARS.map(sample => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handlePickSample(sample.url)}
                    className="group relative h-24 rounded-lg overflow-hidden border border-gray-200 hover:border-coral transition-all text-left"
                  >
                    <img
                      src={sample.url}
                      alt={sample.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-1.5 flex items-end">
                      <span className="text-[10px] text-white font-medium leading-tight line-clamp-2">
                        {sample.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy Microcopy */}
            <div className="mt-5 flex items-center gap-2 bg-emerald-50 text-emerald-800 text-[11px] p-2.5 rounded-lg border border-emerald-100">
              <Lock size={14} className="flex-shrink-0 text-emerald-600" />
              <span>
                <strong>Bảo mật riêng tư:</strong> Ảnh của bạn được xử lý tức thời trên trình duyệt và chỉ dùng cho phiên thử đồ cá nhân.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TryOnPreviewCanvas;
