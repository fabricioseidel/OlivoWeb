"use client";

import { use } from "react";
import UserForm from "@/components/admin/UserForm";

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <UserForm userId={id} />;
}
