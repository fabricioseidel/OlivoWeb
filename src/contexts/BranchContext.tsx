"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { getBranchesAction } from "@/actions/branches";
import type { Branch } from "@/types";

const STORAGE_KEY = "admin.branchId.v1";

interface BranchContextType {
  branches: Branch[];
  currentBranch: Branch | null;
  setBranch: (branch: Branch) => void;
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getBranchesAction()
      .then((list) => {
        setBranches(list);

        // Restore persisted choice, fall back to default branch
        const savedId =
          typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEY)
            : null;
        const restored = savedId ? list.find((b) => b.id === savedId) : null;
        const defaultBranch = list.find((b) => b.is_default) ?? list[0];
        setCurrentBranch(restored ?? defaultBranch ?? null);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const setBranch = useCallback((branch: Branch) => {
    setCurrentBranch(branch);
    try {
      localStorage.setItem(STORAGE_KEY, branch.id);
    } catch {
      /* noop */
    }
  }, []);

  return (
    <BranchContext.Provider value={{ branches, currentBranch, setBranch, isLoading }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used within BranchProvider");
  return ctx;
}
