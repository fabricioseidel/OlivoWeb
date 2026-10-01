"use server";

import { getBranches } from "@/server/branches.service";
import { exigirRol, PERSONAL } from "@/lib/action-auth";

export async function getBranchesAction() {
  const acceso = await exigirRol(PERSONAL);
  if (!acceso.ok) return [];
  return getBranches();
}
