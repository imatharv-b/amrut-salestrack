-- ==========================================
-- ATTENDANCE TABLE
-- ==========================================
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.attendance (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    salesman_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    date date NOT NULL,
    check_in_time text NOT NULL,
    status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    lat float8,
    lng float8,
    remarks text,
    approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    
    -- One attendance record per salesman per day
    UNIQUE(salesman_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Manager can do everything with attendance
CREATE POLICY "Manager Full Access Attendance" 
    ON public.attendance FOR ALL TO authenticated 
    USING (public.get_user_role() = 'manager');

-- Salesman can read their own attendance records
CREATE POLICY "Salesman read own attendance" 
    ON public.attendance FOR SELECT TO authenticated 
    USING (salesman_id = auth.uid());

-- Salesman can insert their own attendance (mark present)
CREATE POLICY "Salesman insert own attendance" 
    ON public.attendance FOR INSERT TO authenticated 
    WITH CHECK (salesman_id = auth.uid() AND public.get_user_role() = 'salesman');
