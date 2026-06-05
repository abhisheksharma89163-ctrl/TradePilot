"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveSignature, removeSignature } from "./actions";
import { Button } from "@/components/ui/button";

/**
 * Reads a signature image, makes the near-white background transparent,
 * trims it down to a reasonable size, and returns a small PNG data URL.
 */
function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 420;
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i]!, g = px[i + 1]!, b = px[i + 2]!;
        // near-white -> transparent
        if (r > 225 && g > 225 && b > 225) px[i + 3] = 0;
      }
      ctx.putImageData(data, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = URL.createObjectURL(file);
  });
}

export function SignatureUploader({ current }: { current: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setBusy(true);
    try {
      const dataUrl = await processImage(file);
      setPreview(dataUrl);
      const res = await saveSignature(dataUrl);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save");
        setPreview(current);
        return;
      }
      toast.success("Signature saved");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    const res = await removeSignature();
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Failed");
    setPreview(null);
    toast.success("Signature removed");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex h-28 w-72 items-center justify-center rounded-md border bg-muted/30">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Signature" className="max-h-24 max-w-[16rem] object-contain" />
        ) : (
          <span className="text-sm text-muted-foreground">No signature yet</span>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload signature
        </Button>
        {preview && (
          <Button variant="ghost" disabled={busy} onClick={clear}>
            <Trash2 className="h-4 w-4 text-destructive" />
            Remove
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="max-w-md text-xs text-muted-foreground">
        Tip: sign on white paper and photograph it, or crop your signature image
        to just the signature. The white background is removed automatically, so
        only your signature shows above the line on PDFs.
      </p>
    </div>
  );
}
