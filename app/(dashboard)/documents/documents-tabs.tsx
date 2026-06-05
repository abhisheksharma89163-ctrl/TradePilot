"use client";

import { useState } from "react";
import { Camera, ClipboardPaste } from "lucide-react";
import { DocumentUploader } from "./uploader";
import { PasteEntry } from "./paste-entry";
import { cn } from "@/lib/utils";

export function DocumentsTabs() {
  const [tab, setTab] = useState<"upload" | "paste">("upload");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border p-1">
        <button
          onClick={() => setTab("upload")}
          className={cn(
            "flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "upload"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Camera className="h-4 w-4" />
          Upload photos
        </button>
        <button
          onClick={() => setTab("paste")}
          className={cn(
            "flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "paste"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste text
        </button>
      </div>

      {tab === "upload" ? <DocumentUploader /> : <PasteEntry />}
    </div>
  );
}
