"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const INTERACTIVE = ["button", "a", "label", "summary", "input", "select", "textarea"];
const IGNORED_TAGS = ["html", "body", "main", "section", "article", "header", "footer", "nav", "nextjs-portal"];

function findInteractive(el: Element | null): Element | null {
  let cur: Element | null = el;
  for (let i = 0; i < 6 && cur; i++) {
    const tag = cur.tagName.toLowerCase();
    if (INTERACTIVE.includes(tag)) return cur;
    if (cur.getAttribute("role") === "button") return cur;
    if (cur.getAttribute("onclick")) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const aria = el.getAttribute("aria-label");
  const href = el.getAttribute("href");
  const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const label = aria || text || "(sin texto)";
  return `[${tag}] "${label}"${href ? ` → ${href}` : ""}`;
}

export function ClickTracker() {
  const pathname = usePathname();
  const lastRef = useRef<{ msg: string; t: number }>({ msg: "", t: 0 });

  useEffect(() => {
    const report = (payload: Record<string, unknown>) => {
      fetch("/api/debug/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    };

    const onError = (e: ErrorEvent) => {
      report({
        message: e.message || e.error?.message || "(window.onerror sin mensaje)",
        stack: e.error?.stack,
        source: `${e.filename}:${e.lineno}:${e.colno}`,
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      report({
        message: (r && (r.message || String(r))) || "(unhandledrejection sin mensaje)",
        stack: r?.stack,
        source: "unhandledrejection",
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const tag = target.tagName?.toLowerCase();
      if (IGNORED_TAGS.includes(tag)) return;

      const interactive = findInteractive(target);
      if (!interactive) return;

      const msg = `CLICK [${pathname}] ${describe(interactive)}`;
      const now = Date.now();
      if (lastRef.current.msg === msg && now - lastRef.current.t < 800) return;
      lastRef.current = { msg, t: now };

      fetch("/api/debug/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      }).catch(() => {});
    };
    document.addEventListener("click", handler, { capture: true });
    return () => {
      document.removeEventListener("click", handler, { capture: true });
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [pathname]);

  return null;
}
