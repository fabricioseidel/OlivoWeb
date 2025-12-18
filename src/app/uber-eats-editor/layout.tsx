"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function UberEatsEditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session as any)?.user?.role || (session as any)?.role;
      if (userRole !== "ADMIN" && userRole !== "SELLER") {
        router.push("/");
        router.refresh();
      }
    } else if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/uber-eats-editor");
      router.refresh();
    }
  }, [session, status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const userRole = (session as any)?.user?.role || (session as any)?.role;
  if (userRole !== "ADMIN" && userRole !== "SELLER") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
