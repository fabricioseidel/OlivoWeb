"use server";

import { getBranches, getDefaultBranch } from "@/server/branches.service";

export async function getBranchesAction() {
  return getBranches();
}

export async function getDefaultBranchAction() {
  return getDefaultBranch();
}
