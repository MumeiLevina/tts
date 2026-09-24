"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fitImageIntoSlot } from "../../../../lib/canvas/fit-image-into-slot";
import { loadCanvasImage } from "../../../../lib/canvas/image-loader";
import { slotsFor } from "../../../../lib/canvas/outfit-layouts";
import type { OutfitSlot, ResolvedOutfit, ResolvedProduct } from "../../../../lib/outfit/types";
import styles from "./OutfitCanvas.module.css";

type Props = { outfit: ResolvedOutfit; width?: number; height?: number; className?: string };
type Layer = { product: ResolvedProduct; slot: ReturnType<typeof slotsFor>[number] };

function FallbackImage({ product }: { product: ResolvedProduct }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.imageUrl]);
  return <figure>{failed ? <div className={styles.imageFallback}>Ảnh đang cập nhật</div> : <img src={product.imageUrl} alt={product.name} onError={() => setFailed(true)} />}<figcaption>{product.name}</figcaption></figure>;
}

export default function OutfitCanvas({ outfit, width = 720, height = 900, className = "" }: Props) {
  const frameRef = useRef<HTMLDivElement>(null), canvasRef = useRef<HTMLCanvasElement>(null), generation = useRef(0);
  const [size, setSize] = useState({ width, height }), [state, setState] = useState<"loading" | "ready" | "partial" | "fallback">("loading");
  const products = useMemo(() => [outfit.items.top, outfit.items.bottom, outfit.items.dress, outfit.items.jumpsuit, outfit.items.outerwear, outfit.items.shoes, ...outfit.items.accessories].filter((item): item is ResolvedProduct => Boolean(item)), [outfit]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !("ResizeObserver" in window)) return;
    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.max(1, Math.min(width, entry.contentRect.width));
      setSize({ width: Math.round(nextWidth), height: Math.round(nextWidth * height / width) });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current, version = ++generation.current, controller = new AbortController();
    const context = canvas?.getContext("2d");
    if (!canvas || !context) { setState("fallback"); return () => controller.abort(); }
    setState("loading");
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(size.width * dpr); canvas.height = Math.round(size.height * dpr);
    canvas.style.aspectRatio = `${size.width} / ${size.height}`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = "#f3f0e9"; context.fillRect(0, 0, size.width, size.height);
    const used = new Map<OutfitSlot, number>();
    const layers: Layer[] = products.map(product => {
      const index = used.get(product.category) || 0, slots = slotsFor(outfit.layout, product.category);
      used.set(product.category, index + 1);
      return { product, slot: slots[Math.min(index, slots.length - 1)] };
    }).sort((a, b) => a.slot.zIndex - b.slot.zIndex);
    void Promise.allSettled(layers.map(async layer => ({ layer, image: await loadCanvasImage(layer.product.renderImageUrl, controller.signal) }))).then(results => {
      if (controller.signal.aborted || version !== generation.current) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, size.width, size.height);
      context.fillStyle = "#f3f0e9"; context.fillRect(0, 0, size.width, size.height);
      const loaded = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
      if (!loaded.length) { setState("fallback"); return; }
      for (const { layer, image } of loaded) {
        const rect = fitImageIntoSlot({ width: image.naturalWidth, height: image.naturalHeight }, size, layer.slot);
        context.save(); context.translate(rect.centerX, rect.centerY); context.rotate(rect.rotation * Math.PI / 180);
        context.shadowColor = "rgba(38, 43, 39, .13)"; context.shadowBlur = Math.max(8, size.width * .018); context.shadowOffsetY = Math.max(3, size.width * .006);
        context.drawImage(image, -rect.width / 2, -rect.height / 2, rect.width, rect.height); context.restore();
      }
      setState(loaded.length === layers.length ? "ready" : "partial");
    });
    return () => { controller.abort(); ++generation.current; };
  }, [outfit.layout, products, size]);

  return <div ref={frameRef} className={`${styles.frame} ${className}`} aria-busy={state === "loading"}>
    <canvas ref={canvasRef} className={styles.canvas} hidden={state === "fallback"} role="img" aria-label={`Ảnh flat-lay của ${outfit.name}`} />
    {state === "fallback" && <div><p className={styles.fallbackNotice} role="status">Chưa thể tạo ảnh flat-lay. Danh sách sản phẩm vẫn hiển thị đầy đủ.</p><div className={styles.fallback} role="img" aria-label={`Danh sách ảnh sản phẩm của ${outfit.name}`}>{products.map(product => <FallbackImage product={product} key={product.id} />)}</div></div>}
    {state === "loading" && <span className={styles.status} role="status">Đang xếp ảnh sản phẩm…</span>}
    {state === "partial" && <span className={styles.status} role="status">Một ảnh chưa tải được; các món còn lại vẫn được hiển thị.</span>}
  </div>;
}
