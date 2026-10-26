"use client";

import { useEffect, useRef, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { parseLocaleNumber } from "../lib";

export interface DialogRequest {
  title: string;
  body: React.ReactNode;
  confirmText: string;
  tone?: "primary" | "danger";
  /** Pide un número antes de confirmar (fijar stock, fijar costo). */
  input?: { label: string; defaultValue: string; integer?: boolean };
  onConfirm: (value?: number) => void;
}

/**
 * Confirmación de la página: reemplaza los `prompt()` / `confirm()` del
 * navegador, que no dejaban ver a cuántos productos afectaba una acción.
 */
export default function ActionDialog({ request, onClose }: { request: DialogRequest | null; onClose: () => void }) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!request) return;
    setText(request.input?.defaultValue ?? "");
    const t = setTimeout(() => (request.input ? inputRef.current?.select() : confirmRef.current?.focus()), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [request, onClose]);

  if (!request) return null;

  const parsed = request.input ? parseLocaleNumber(text) : null;
  const inputError = request.input
    ? parsed === null
      ? "Escribe un número"
      : parsed < 0
      ? "No puede ser negativo"
      : request.input.integer && !Number.isInteger(parsed)
      ? "Debe ser un número entero"
      : null
    : null;

  const confirm = () => {
    if (inputError) return;
    request.onConfirm(request.input ? (parsed as number) : undefined);
    onClose();
  };

  const danger = request.tone === "danger";

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/50" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start gap-3">
          {danger && (
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 id="action-dialog-title" className="text-lg font-black text-gray-900">
              {request.title}
            </h2>
            <div className="mt-2 text-sm text-gray-700 space-y-2">{request.body}</div>
          </div>
        </div>

        {request.input && (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            <label className="block text-xs font-bold text-gray-600 mb-1" htmlFor="action-dialog-input">
              {request.input.label}
            </label>
            <input
              id="action-dialog-input"
              ref={inputRef}
              inputMode={request.input.integer ? "numeric" : "decimal"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={Boolean(inputError) || undefined}
              className={`w-full h-11 px-3 rounded-xl border-2 font-black text-lg tabular-nums focus:outline-none ${
                inputError && text !== "" ? "border-rose-400 bg-rose-50" : "border-gray-200 focus:border-brand-500"
              }`}
            />
            {inputError && text !== "" && <p className="mt-1 text-xs font-bold text-rose-600">{inputError}</p>}
          </form>
        )}

        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-xl border-2 border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={confirm}
            disabled={Boolean(inputError)}
            className={`h-11 px-5 rounded-xl font-black text-white shadow-sm disabled:opacity-50 ${
              danger ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
          >
            {request.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
