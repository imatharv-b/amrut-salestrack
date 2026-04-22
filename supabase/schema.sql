-- Amrut SalesTrack Schema
-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Routes
CREATE TABLE public.routes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text
);

-- 2. Users (Profiles linked to auth.users)
CREATE TABLE public.users (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    role text CHECK (role IN ('salesman', 'manager')) NOT NULL,
    route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. Stores (Dealers)
CREATE TABLE public.stores (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
    village text,
    gps_lat float8,
    gps_lng float8,
    contact_person text,
    phone text,
    dealer_category text CHECK (dealer_category IN ('A', 'B', 'C')),
    credit_limit numeric DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 4. Visits
CREATE TABLE public.visits (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    salesman_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    visited_date date NOT NULL,
    remarks text,
    photo_url text, -- Future use for bucket storage linking
    created_at timestamptz DEFAULT now()
);

-- 5. Invoices
CREATE TABLE public.invoices (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    invoice_number text NOT NULL,
    invoice_date date NOT NULL,
    total_amount numeric NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

-- 6. Collections
CREATE TABLE public.collections (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    salesman_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    amount numeric NOT NULL,
    payment_mode text CHECK (payment_mode IN ('cash', 'upi')),
    payment_date date NOT NULL,
    remarks text,
    invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- 7. Outstanding Balance View
CREATE VIEW public.outstanding_balance AS
SELECT 
    s.id AS store_id,
    s.name AS store_name,
    s.route_id,
    COALESCE(inv.total_invoiced, 0) AS total_invoiced,
    COALESCE(col.total_collected, 0) AS total_collected,
    (COALESCE(inv.total_invoiced, 0) - COALESCE(col.total_collected, 0)) AS outstanding_balance,
    s.credit_limit
FROM public.stores s
LEFT JOIN (
    SELECT store_id, SUM(total_amount) AS total_invoiced FROM public.invoices GROUP BY store_id
) inv ON inv.store_id = s.id
LEFT JOIN (
    SELECT store_id, SUM(amount) AS total_collected FROM public.collections GROUP BY store_id
) col ON col.store_id = s.id;


-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Helper Function to fetch user role safely
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_route() RETURNS uuid AS $$
    SELECT route_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Manager Policies (Full Access)
CREATE POLICY "Manager Full Access Routes" ON public.routes FOR ALL TO authenticated USING (public.get_user_role() = 'manager');
CREATE POLICY "Manager Full Access Stores" ON public.stores FOR ALL TO authenticated USING (public.get_user_role() = 'manager');
CREATE POLICY "Manager Full Access Visits" ON public.visits FOR ALL TO authenticated USING (public.get_user_role() = 'manager');
CREATE POLICY "Manager Full Access Invoices" ON public.invoices FOR ALL TO authenticated USING (public.get_user_role() = 'manager');
CREATE POLICY "Manager Full Access Collections" ON public.collections FOR ALL TO authenticated USING (public.get_user_role() = 'manager');

-- Users Policies (Fixing RLS Recursion)
CREATE POLICY "Authenticated users can read profiles" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers can modify profiles" ON public.users FOR ALL TO authenticated USING (public.get_user_role() = 'manager');


-- Salesman can see their own route
CREATE POLICY "Salesman read assigned route" ON public.routes FOR SELECT TO authenticated USING (id = public.get_user_route());

-- Salesman can only see stores belonging to their own route
CREATE POLICY "Salesman read their route stores" ON public.stores FOR SELECT TO authenticated USING (route_id = public.get_user_route());

-- Salesman can insert/read visits for stores on their route
CREATE POLICY "Salesman read own visits" ON public.visits FOR SELECT TO authenticated USING (salesman_id = auth.uid());
CREATE POLICY "Salesman insert visits" ON public.visits FOR INSERT TO authenticated WITH CHECK (
    salesman_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND route_id = public.get_user_route())
);

-- Salesman can insert/read collections for stores on their route
CREATE POLICY "Salesman read own collections" ON public.collections FOR SELECT TO authenticated USING (salesman_id = auth.uid());
CREATE POLICY "Salesman insert collections" ON public.collections FOR INSERT TO authenticated WITH CHECK (
    salesman_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND route_id = public.get_user_route())
);

-- ==========================================
-- SEED DATA (For local testing / staging)
-- ==========================================
-- Note: Replace 'uuid' references with actual UUIDs generated to maintain referential integrity.
-- To work correctly, first insert user credentials into auth.users (outside this script).

DO $$ 
DECLARE 
    r_gondia uuid := uuid_generate_v4();
    r_tirora uuid := uuid_generate_v4();
    r_amgaon uuid := uuid_generate_v4();
    -- Pseudo auth UUIDs for seed demo
    u_manager uuid := '00000000-0000-0000-0000-000000000001';
    u_salesman1 uuid := '00000000-0000-0000-0000-000000000002';
    u_salesman2 uuid := '00000000-0000-0000-0000-000000000003';
BEGIN
    -- Insert Routes
    INSERT INTO public.routes (id, name, description) VALUES
    (r_gondia, 'GONDIA-HQ', 'City and surrounding Goregaon area'),
    (r_tirora, 'TIRORA', 'Tirora and adjacent villages'),
    (r_amgaon, 'AMGAON-SAL', 'Amgaon and Salekasa taluka');

    -- Insert Profiles (Assuming auth.users already has these IDs)
    -- In practice, you'll need Supabase auth.users created first for FK to work
    -- We comment this insert so script doesn't fail on foreign key `auth.users` on blank DB
    /*
    INSERT INTO public.users (id, name, phone, role, route_id) VALUES
    (u_manager, 'Rajesh Patil (Mgr)', '9876543210', 'manager', NULL),
    (u_salesman1, 'Sunil Gawande', '9000000001', 'salesman', r_gondia),
    (u_salesman2, 'Kiran Deshmukh', '9000000002', 'salesman', r_tirora);
    */

    -- Insert 10 Stores
    INSERT INTO public.stores (id, name, route_id, village, gps_lat, gps_lng, contact_person, phone, dealer_category, credit_limit) VALUES
    (uuid_generate_v4(), 'Shri Ganesh Krishi Kendra', r_gondia, 'Goregaon', 21.3122, 80.0888, 'Ramesh B', '9111', 'A', 500000),
    (uuid_generate_v4(), 'Mauli Krishi Seva', r_gondia, 'Gondia City', 21.4552, 80.1982, 'Vikas p', '9112', 'A', 200000),
    (uuid_generate_v4(), 'Sai Agro Center', r_gondia, 'Gondia Rural', 21.4650, 80.2000, 'Kishor', '9113', 'B', 150000),
    
    (uuid_generate_v4(), 'Balaji Agro Services', r_tirora, 'Tirora', 21.4011, 79.9877, 'Suresh Thakre', '9114', 'A', 300000),
    (uuid_generate_v4(), 'Krishi Mitra Center', r_tirora, 'Sukdi', 21.4111, 79.9911, 'Manoj D', '9115', 'B', 100000),
    (uuid_generate_v4(), 'Jai Kisan Fertilizer', r_tirora, 'Arjuni', 21.4300, 79.9500, 'Gopal N', '9116', 'C', 50000),
    
    (uuid_generate_v4(), 'Amrut Dealers Amgaon', r_amgaon, 'Amgaon', 21.3833, 80.3588, 'Nitin Deshpande', '9117', 'A', 400000),
    (uuid_generate_v4(), 'Kisaan Sewa Kendra', r_amgaon, 'Salekasa', 21.5200, 80.0500, 'Prakash M', '9118', 'B', 150000),
    (uuid_generate_v4(), 'Shivaji Agro Sales', r_amgaon, 'Deori', 21.0500, 80.4600, 'Ajay Singh', '9119', 'A', 500000),
    (uuid_generate_v4(), 'Mahalaxmi Krishi', r_amgaon, 'Sadak Arjuni', 21.1300, 80.0600, 'Deepesh R', '9120', 'C', 40000);
END $$;
