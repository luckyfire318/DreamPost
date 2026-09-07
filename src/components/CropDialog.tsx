import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Area = { x: number; y: number; width: number; height: number };

async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92),
  );
}

type Props = {
  open: boolean;
  src: string | null;
  aspect?: number;
  title?: string;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
};

/** ratio === 0 means "free" — drag any edge or corner to shape the crop box. */
const RATIOS = [
  { label: "Free", value: 0 },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

const MIN = 32;
const HANDLES = [
  { id: "nw", style: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
  { id: "n", style: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize" },
  { id: "ne", style: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
  { id: "e", style: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
  { id: "se", style: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
  { id: "s", style: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize" },
  { id: "sw", style: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
  { id: "w", style: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
] as const;

type Handle = (typeof HANDLES)[number]["id"];

export function CropDialog({ open, src, aspect = 0, title = "Crop image", onCancel, onDone }: Props) {
  const [ratio, setRatio] = useState(aspect);
  const [busy, setBusy] = useState(false);
  const [box, setBox] = useState<Area>({ x: 0, y: 0, width: 0, height: 0 });
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ mode: "move" | Handle; x: number; y: number; box: Area } | null>(null);

  const reset = useCallback(
    (w: number, h: number, r: number) => {
      let cw = w;
      let ch = h;
      if (r > 0) {
        if (w / h > r) cw = h * r;
        else ch = w / r;
      }
      setBox({ x: (w - cw) / 2, y: (h - ch) / 2, width: cw, height: ch });
    },
    [],
  );

  useEffect(() => {
    if (open) setRatio(aspect);
  }, [open, aspect, src]);

  function measure() {
    const img = imgRef.current;
    if (!img) return;
    const w = img.clientWidth;
    const h = img.clientHeight;
    setFrame({ width: w, height: h });
    reset(w, h, ratio);
  }

  function pickRatio(r: number) {
    setRatio(r);
    if (frame.width) reset(frame.width, frame.height, r);
  }

  function start(e: React.PointerEvent, mode: "move" | Handle) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, x: e.clientX, y: e.clientY, box };
  }

  function move(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const { width: FW, height: FH } = frame;
    let { x, y, width, height } = d.box;

    if (d.mode === "move") {
      x = Math.min(Math.max(0, x + dx), FW - width);
      y = Math.min(Math.max(0, y + dy), FH - height);
    } else {
      const m = d.mode;
      let right = x + width;
      let bottom = y + height;
      if (m.includes("w")) x = Math.min(Math.max(0, x + dx), right - MIN);
      if (m.includes("e")) right = Math.max(Math.min(FW, right + dx), x + MIN);
      if (m.includes("n")) y = Math.min(Math.max(0, y + dy), bottom - MIN);
      if (m.includes("s")) bottom = Math.max(Math.min(FH, bottom + dy), y + MIN);
      width = right - x;
      height = bottom - y;

      if (ratio > 0) {
        if (m === "n" || m === "s") width = height * ratio;
        else height = width / ratio;
        if (width > FW) {
          width = FW;
          height = width / ratio;
        }
        if (height > FH) {
          height = FH;
          width = height * ratio;
        }
        if (m.includes("w")) x = right - width;
        if (m.includes("n")) y = bottom - height;
        x = Math.min(Math.max(0, x), FW - width);
        y = Math.min(Math.max(0, y), FH - height);
      }
    }
    setBox({ x, y, width, height });
  }

  function end() {
    dragRef.current = null;
  }

  async function apply() {
    const img = imgRef.current;
    if (!src || !img || !box.width) return;
    const sx = img.naturalWidth / frame.width;
    const sy = img.naturalHeight / frame.height;
    setBusy(true);
    try {
      onDone(
        await cropToBlob(src, {
          x: box.x * sx,
          y: box.y * sy,
          width: box.width * sx,
          height: box.height * sy,
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex h-72 w-full items-center justify-center overflow-hidden rounded-xl bg-muted">
          {src ? (
            <div className="relative select-none" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
              <img
                ref={imgRef}
                src={src}
                alt="Crop preview"
                onLoad={measure}
                draggable={false}
                className="max-h-72 max-w-full select-none object-contain"
              />
              {box.width > 0 ? (
                <div
                  onPointerDown={(e) => start(e, "move")}
                  className="absolute cursor-move border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                  style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
                >
                  {HANDLES.map((h) => (
                    <span
                      key={h.id}
                      onPointerDown={(e) => start(e, h.id)}
                      className={`absolute h-4 w-4 rounded-full border-2 border-primary bg-background ${h.style}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {RATIOS.map((r) => (
              <Button
                key={r.label}
                type="button"
                size="sm"
                variant={ratio === r.value ? "default" : "outline"}
                onClick={() => pickRatio(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Drag inside the frame to move it, or drag any corner/edge handle to resize your crop.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button onClick={apply} disabled={busy} type="button">
            {busy ? "Cropping…" : "Use image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}