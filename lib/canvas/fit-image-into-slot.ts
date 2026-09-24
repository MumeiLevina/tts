import type { CanvasSlot } from "../outfit/types";

export type FittedImageRect = { x: number; y: number; width: number; height: number; centerX: number; centerY: number; rotation: number };

/** Fit an image into a relative canvas slot without stretching or cropping. */
export function fitImageIntoSlot(image: { width: number; height: number }, canvas: { width: number; height: number }, slot: CanvasSlot): FittedImageRect {
  if (image.width <= 0 || image.height <= 0 || canvas.width <= 0 || canvas.height <= 0) throw new Error("Image and canvas dimensions must be positive.");
  const availableWidth = canvas.width * slot.maxWidth, availableHeight = canvas.height * slot.maxHeight;
  const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
  const width = image.width * scale, height = image.height * scale;
  const originX = canvas.width * slot.x, originY = canvas.height * slot.y;
  const x = slot.anchor === "center" ? originX - width / 2 : originX + (availableWidth - width) / 2;
  const y = slot.anchor === "center" ? originY - height / 2 : originY + (availableHeight - height) / 2;
  return { x, y, width, height, centerX: x + width / 2, centerY: y + height / 2, rotation: slot.rotation };
}
