-- ==========================================
-- FIX MISSING USER PROFILES
-- ==========================================
-- These users exist in Supabase Auth but NOT in the public.users table.
-- Run this in Supabase SQL Editor to fix them.
--
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Find each missing user and copy their FULL UID
-- 3. Replace the UIDs below with the correct ones
-- 4. Run this SQL

-- Ajit (ajit@bioamrut.com) - Replace UID below with full UID from Auth dashboard
INSERT INTO public.users (id, name, phone, role)
VALUES ('0dcaf633-38b1-44bc-8ccd-42b0280a89XX', 'Ajit', '', 'salesman')
ON CONFLICT (id) DO NOTHING;

-- Girish (girish@bioamrut.com) - Replace UID below with full UID from Auth dashboard
INSERT INTO public.users (id, name, phone, role)
VALUES ('e9ead61f-ffbf-4dfd-af48-8e2c61546106', 'Girish', '', 'salesman')
ON CONFLICT (id) DO NOTHING;

-- After running this, go to the app's Manage Users page → assign routes to these salesmen
