-- ============================================================
-- HRMS: Create demo login accounts in Supabase Auth
-- Run this in Supabase SQL Editor if you can't login.
-- Safe to re-run (uses ON CONFLICT DO UPDATE).
-- ============================================================

-- Admin: ceo@oklut.com / 1234
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'ceo@oklut.com',
  crypt('1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"System Admin","role":"Admin"}',
  '', '', '', ''
) on conflict (id) do update set
  encrypted_password = crypt('1234', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now();

insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
values (
  gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"ceo@oklut.com","email_verified":true}',
  'email', now(), now()
) on conflict (provider_id, provider) do nothing;

-- HR: hr@oklut.com / 1234
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'hr@oklut.com',
  crypt('1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Aarav Patel"}',
  '', '', '', ''
) on conflict (id) do update set
  encrypted_password = crypt('1234', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now();

insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
values (
  gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010',
  '{"sub":"00000000-0000-0000-0000-000000000010","email":"hr@oklut.com","email_verified":true}',
  'email', now(), now()
) on conflict (provider_id, provider) do nothing;

-- Employee: employee@oklut.com / 1234
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'employee@oklut.com',
  crypt('1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Meera Sharma"}',
  '', '', '', ''
) on conflict (id) do update set
  encrypted_password = crypt('1234', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now();

insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
values (
  gen_random_uuid(), '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000020',
  '{"sub":"00000000-0000-0000-0000-000000000020","email":"employee@oklut.com","email_verified":true}',
  'email', now(), now()
) on conflict (provider_id, provider) do nothing;

-- Designer: designer@oklut.com / 1234
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'designer@oklut.com',
  crypt('1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Rohan Iyer"}',
  '', '', '', ''
) on conflict (id) do update set
  encrypted_password = crypt('1234', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now();

insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
values (
  gen_random_uuid(), '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000030',
  '{"sub":"00000000-0000-0000-0000-000000000030","email":"designer@oklut.com","email_verified":true}',
  'email', now(), now()
) on conflict (provider_id, provider) do nothing;

-- Verify: should return 4 rows
select id, email, email_confirmed_at from auth.users
where email in ('ceo@oklut.com','hr@oklut.com','employee@oklut.com','designer@oklut.com');
