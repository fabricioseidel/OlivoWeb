"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";

export default function ShopShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && (
        <header className="sticky top-0 z-50 bg-white shadow">
          <Navbar />
        </header>
      )}
      <main className={`flex-1 ${isAdmin ? "" : "bg-white pb-20 md:pb-0"}`}>
        {children}
      </main>
      {!isAdmin && <BottomNav />}
    </div>
  );
}
