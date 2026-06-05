"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { globalSearch, type SearchHit } from "@/app/(dashboard)/search-actions";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl-K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // debounced search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const res = await globalSearch(q);
      setHits(res);
      setLoading(false);
    }, 300);
  }, [q]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  const groups = ["Parties", "Vehicles", "Slips", "Payments"] as const;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden rounded border px-1.5 text-xs sm:inline">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] max-w-lg translate-y-0 p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search parties, vehicles, slips, payments…"
              className="h-12 w-full bg-transparent text-sm outline-none"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {q.trim().length < 2 ? (
              <p className="p-3 text-sm text-muted-foreground">
                Type at least 2 characters.
              </p>
            ) : hits.length === 0 && !loading ? (
              <p className="p-3 text-sm text-muted-foreground">No matches.</p>
            ) : (
              groups.map((g) => {
                const items = hits.filter((h) => h.group === g);
                if (items.length === 0) return null;
                return (
                  <div key={g} className="mb-2">
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      {g}
                    </p>
                    {items.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => go(h.href)}
                        className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span className="font-medium">{h.label}</span>
                        <span className="text-xs text-muted-foreground">{h.sub}</span>
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
