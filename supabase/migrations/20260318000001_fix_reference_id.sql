/* Migration: Fix inventory movements reference_id */
/* Date: 2026-03-18 */

-- Permitir que reference_id acepte tanto UUIDs como BIGINTs (como texto)
ALTER TABLE public.inventory_movements 
ALTER COLUMN reference_id TYPE TEXT USING reference_id::text;
