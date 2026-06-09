-- ==========================================
-- MONTHLY TOUR PLANS
-- ==========================================

-- 1. Create monthly_tour_plans table
CREATE TABLE IF NOT EXISTS public.monthly_tour_plans (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    salesman_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    route_id uuid REFERENCES public.routes(id) ON DELETE CASCADE,
    plan_month integer NOT NULL CHECK (plan_month >= 1 AND plan_month <= 12),
    plan_year integer NOT NULL,
    assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(salesman_id, route_id, plan_month, plan_year)
);

-- Enable RLS
ALTER TABLE public.monthly_tour_plans ENABLE ROW LEVEL SECURITY;

-- Policies for monthly_tour_plans
CREATE POLICY "Manager full access tour_plans" ON public.monthly_tour_plans FOR ALL TO authenticated USING (public.get_user_role() = 'manager');
CREATE POLICY "Salesman read own tour_plans" ON public.monthly_tour_plans FOR SELECT TO authenticated USING (salesman_id = auth.uid());

-- Optional: Drop daily_route_assignments if not needed anymore, or keep it.
-- DROP TABLE IF EXISTS public.daily_route_assignments;
