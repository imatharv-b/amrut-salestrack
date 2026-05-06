-- ==========================================
-- FIX: Visit Insert RLS Policy
-- ==========================================
-- PROBLEM: The "Salesman insert visits" policy only allows inserting visits
-- for stores whose route_id is in user_routes. But salesmen are now assigned
-- daily routes via daily_route_assignments, which may include routes NOT in
-- user_routes. This causes silent insert failures.
--
-- FIX: Allow inserts for stores on ANY route the salesman has access to,
-- including both permanent routes (user_routes) AND daily assignments.
-- ==========================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Salesman insert visits" ON public.visits;

-- Create a new policy that allows inserts for stores on:
-- 1. Salesman's permanent routes (user_routes), OR
-- 2. Salesman's daily assigned routes (daily_route_assignments for today)
CREATE POLICY "Salesman insert visits" ON public.visits FOR INSERT TO authenticated WITH CHECK (
    salesman_id = auth.uid() AND 
    EXISTS (
        SELECT 1 FROM public.stores WHERE id = store_id AND (
            route_id IN (SELECT public.get_user_routes())
            OR
            route_id IN (
                SELECT route_id FROM public.daily_route_assignments 
                WHERE salesman_id = auth.uid() 
                AND assigned_date = CURRENT_DATE
            )
        )
    )
);

-- Also fix collections insert policy (same issue)
DROP POLICY IF EXISTS "Salesman insert collections" ON public.collections;

CREATE POLICY "Salesman insert collections" ON public.collections FOR INSERT TO authenticated WITH CHECK (
    salesman_id = auth.uid() AND 
    EXISTS (
        SELECT 1 FROM public.stores WHERE id = store_id AND (
            route_id IN (SELECT public.get_user_routes())
            OR
            route_id IN (
                SELECT route_id FROM public.daily_route_assignments 
                WHERE salesman_id = auth.uid() 
                AND assigned_date = CURRENT_DATE
            )
        )
    )
);
