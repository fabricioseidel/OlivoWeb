import { supabaseServer } from "@/lib/supabase-server";
import { logger } from "@/utils/logger";

export type AuditEntry = {
  action: string;
  entity: string;
  entityId?: string | number | null;
  actor?: string | null;
  details?: Record<string, unknown>;
};

/**
 * Registra una operación sensible en audit_logs. Nunca lanza: una falla de
 * auditoría no debe romper la operación de negocio (se loguea el error).
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await supabaseServer.from("audit_logs").insert({
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId != null ? String(entry.entityId) : null,
      actor: entry.actor ?? "system",
      details: entry.details ?? null,
    });
    if (error) logger.error("[Audit] No se pudo registrar:", entry.action, error.message);
  } catch (err) {
    logger.error("[Audit] Error inesperado:", err);
  }
}
