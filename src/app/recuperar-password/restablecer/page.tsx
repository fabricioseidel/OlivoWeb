import { Suspense } from "react";
import RestablecerClient from "./RestablecerClient";

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="size-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
    </div>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RestablecerClient />
    </Suspense>
  );
}
