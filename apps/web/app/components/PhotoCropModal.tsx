"use client";
import { useRef, useState, useEffect } from "react";
import { IconX, IconCheck } from "@/app/components/icons";

interface Props {
  file: File;
  onConfirm: (base64: string) => void;
  onCancel: () => void;
}

// Displayed crop box size (px). Output will be OUTPUT_SIZE×OUTPUT_SIZE JPEG.
const CROP_SIZE = 280;
const OUTPUT_SIZE = 256;

export function PhotoCropModal({ file, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const min = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
      setMinScale(min);
      setScale(min);
      const w = img.naturalWidth * min;
      const h = img.naturalHeight * min;
      setOffset({ x: (CROP_SIZE - w) / 2, y: (CROP_SIZE - h) / 2 });
      setImgSrc(url);
      setReady(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Clamp so the image always fully covers the crop area
  function clamp(ox: number, oy: number, s: number) {
    const img = imgRef.current;
    if (!img) return { x: ox, y: oy };
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    return {
      x: Math.min(0, Math.max(CROP_SIZE - w, ox)),
      y: Math.min(0, Math.max(CROP_SIZE - h, oy)),
    };
  }

  // --- Mouse drag ---
  const mouseRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  function onMouseDown(e: React.MouseEvent) {
    mouseRef.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!mouseRef.current) return;
    const { sx, sy, ox, oy } = mouseRef.current;
    setOffset(clamp(ox + e.clientX - sx, oy + e.clientY - sy, scale));
  }
  function onMouseUp() { mouseRef.current = null; }

  // --- Touch drag + pinch zoom ---
  const touchRef = useRef<{
    sx: number; sy: number; ox: number; oy: number;
    dist?: number; ss?: number;
  } | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      touchRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, ox: offset.x, oy: offset.y };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      touchRef.current = { sx: 0, sy: 0, ox: offset.x, oy: offset.y, dist, ss: scale };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!touchRef.current) return;
    if (e.touches.length === 1 && touchRef.current.dist === undefined) {
      const { sx, sy, ox, oy } = touchRef.current;
      setOffset(clamp(ox + e.touches[0].clientX - sx, oy + e.touches[0].clientY - sy, scale));
    } else if (e.touches.length === 2 && touchRef.current.dist && touchRef.current.ss) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const newScale = Math.max(minScale, Math.min(touchRef.current.ss * dist / touchRef.current.dist, minScale * 4));
      setScale(newScale);
      setOffset(o => clamp(o.x, o.y, newScale));
    }
  }
  function onTouchEnd() { touchRef.current = null; }

  function onZoomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const s = parseFloat(e.target.value);
    setScale(s);
    setOffset(o => clamp(o.x, o.y, s));
  }

  function handleConfirm() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d")!;
    // Map crop-box pixels to source image pixels
    const srcX = -offset.x / scale;
    const srcY = -offset.y / scale;
    const srcW = CROP_SIZE / scale;
    const srcH = CROP_SIZE / scale;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onConfirm(canvas.toDataURL("image/jpeg", 0.8));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Ajustar foto</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Crop area */}
        <div className="flex flex-col items-center px-5 pt-5">
          <div
            className="relative overflow-hidden rounded-full cursor-grab active:cursor-grabbing bg-gray-100"
            style={{ width: CROP_SIZE, height: CROP_SIZE, touchAction: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                draggable={false}
                alt=""
                style={{
                  position: "absolute",
                  left: offset.x,
                  top: offset.y,
                  width: imgRef.current ? imgRef.current.naturalWidth * scale : "auto",
                  height: imgRef.current ? imgRef.current.naturalHeight * scale : "auto",
                  maxWidth: "none",
                  maxHeight: "none",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-400 text-sm">Carregando…</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 mb-1">Arraste para reposicionar</p>
        </div>

        {/* Zoom slider */}
        {ready && (
          <div className="px-5 pt-2 pb-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Zoom</label>
            <input
              type="range"
              min={minScale}
              max={minScale * 4}
              step={0.001}
              value={scale}
              onChange={onZoomChange}
              className="w-full accent-indigo-600"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!ready}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
          >
            <IconCheck className="w-4 h-4" />
            Confirmar
          </button>
        </div>
      </div>

      {/* Hidden canvas used only for rendering the final crop */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
