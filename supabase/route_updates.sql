-- ==========================================
-- ROUTE UPDATES & DAILY ASSIGNMENTS
-- ==========================================

-- 1. Create user_routes table (Many-to-Many for Salesmen and Routes)
CREATE TABLE IF NOT EXISTS public.user_routes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    route_id uuid REFERENCES public.routes(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, route_id)
);

-- 2. Create daily_route_assignments table
CREATE TABLE IF NOT EXISTS public.daily_route_assignments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    salesman_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    route_id uuid REFERENCES public.routes(id) ON DELETE CASCADE,
    assigned_date date NOT NULL,
    assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(salesman_id, route_id, assigned_date)
);

-- Enable RLS
ALTER TABLE public.user_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_route_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for user_routes
CREATE POLICY "Manager full access user_routes" ON public.user_routes FOR ALL TO authenticated USING (public.get_user_role() = 'manager');
CREATE POLICY "Salesman read own user_routes" ON public.user_routes FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Policies for daily_route_assignments
CREATE POLICY "Manager full access daily_assignments" ON public.daily_route_assignments FOR ALL TO authenticated USING (public.get_user_role() = 'manager');
CREATE POLICY "Salesman read own daily_assignments" ON public.daily_route_assignments FOR SELECT TO authenticated USING (salesman_id = auth.uid());

-- Migrate existing legacy routes to the new user_routes table
INSERT INTO public.user_routes (user_id, route_id)
SELECT id, route_id FROM public.users WHERE route_id IS NOT NULL AND role = 'salesman'
ON CONFLICT DO NOTHING;

-- Update Helper Function for Multiple Routes
CREATE OR REPLACE FUNCTION public.get_user_routes() RETURNS setof uuid AS $$
    SELECT route_id FROM public.user_routes WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Drop old policies that restrict to single route and replace with multiple route support
DROP POLICY IF EXISTS "Salesman insert visits" ON public.visits;
CREATE POLICY "Salesman insert visits" ON public.visits FOR INSERT TO authenticated WITH CHECK (
    salesman_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND route_id IN (SELECT public.get_user_routes()))
);

DROP POLICY IF EXISTS "Salesman insert collections" ON public.collections;
CREATE POLICY "Salesman insert collections" ON public.collections FOR INSERT TO authenticated WITH CHECK (
    salesman_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND route_id IN (SELECT public.get_user_routes()))
);

-- Also update salesman read assigned route to use multiple routes
DROP POLICY IF EXISTS "Salesman read assigned route" ON public.routes;
CREATE POLICY "Salesman read assigned route" ON public.routes FOR SELECT TO authenticated USING (
    id IN (SELECT public.get_user_routes())
);
