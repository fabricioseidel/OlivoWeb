"use client";

import Button from "@/components/ui/Button";
import { CheckIcon } from "@heroicons/react/24/outline";

interface SaveActionsProps {
  isAdmin: boolean;
  isSaving: boolean;
  onReload: () => void;
}

export default function SaveActions({ isAdmin, isSaving, onReload }: SaveActionsProps) {
  return (
    <div className="flex justify-end gap-3">
      {isAdmin ? (
        <>
          <Button variant="outline" onClick={onReload}>
            Recargar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Guardando...
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </>
      ) : (
        <div className="text-sm text-slate-500 py-2">Solo administradores pueden editar la configuración.</div>
      )}
    </div>
  );
}
