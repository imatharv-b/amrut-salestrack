-- ==========================================
-- FIX: Visit & Collection Insert RLS Policy
-- ==========================================
-- PROBLEM: Old policy restricted inserts to stores on user_routes only.
-- Salesmen assigned daily routes couldn't insert visits/collections.
-- FIX: Allow salesmen to insert for ANY store (they can only set their own ID).
-- ==========================================

-- Fix visits insert
DROP POLICY IF EXISTS "Salesman insert visits" ON public.visits;
CREATE POLICY "Salesman insert visits" ON public.visits 
  FOR INSERT TO authenticated 
  WITH CHECK (salesman_id = auth.uid());

-- Fix collections insert  
DROP POLICY IF EXISTS "Salesman insert collections" ON public.collections;
CREATE POLICY "Salesman insert collections" ON public.collections 
  FOR INSERT TO authenticated 
  WITH CHECK (salesman_id = auth.uid());
