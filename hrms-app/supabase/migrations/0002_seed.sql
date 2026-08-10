-- ============================================================================
-- Oklut HRMS - Seed Migration
-- Admin login: ceo@oklut.com / 1234
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
insert into public.roles (id, name, description) values
  ('00000000-0000-4000-8000-0000000000a1', 'Admin', 'Full system administrator'),
  ('00000000-0000-4000-8000-0000000000a2', 'HR', 'Human resource management'),
  ('00000000-0000-4000-8000-0000000000a3', 'Manager', 'Department manager'),
  ('00000000-0000-4000-8000-0000000000a4', 'Employee', 'Regular employee');

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (name, module, description) values
  ('dashboard.view', 'Dashboard', 'View dashboards'),
  ('employees.read', 'Employees', 'View employees'),
  ('employees.write', 'Employees', 'Create/update employees'),
  ('employees.delete', 'Employees', 'Delete employees'),
  ('departments.read', 'Departments', 'View departments'),
  ('departments.write', 'Departments', 'Manage departments'),
  ('designations.read', 'Designations', 'View designations'),
  ('designations.write', 'Designations', 'Manage designations'),
  ('attendance.read', 'Attendance', 'View attendance'),
  ('attendance.write', 'Attendance', 'Mark attendance'),
  ('attendance.manage', 'Attendance', 'Manage attendance for others'),
  ('leave.read', 'Leave', 'View leave'),
  ('leave.apply', 'Leave', 'Apply for leave'),
  ('leave.approve', 'Leave', 'Approve/reject leave'),
  ('payroll.read', 'Payroll', 'View payroll'),
  ('payroll.generate', 'Payroll', 'Generate payroll'),
  ('documents.read', 'Documents', 'View documents'),
  ('documents.upload', 'Documents', 'Upload documents'),
  ('tasks.read', 'Tasks', 'View tasks'),
  ('tasks.manage', 'Tasks', 'Assign/manage tasks'),
  ('announcements.read', 'Announcements', 'View announcements'),
  ('announcements.write', 'Announcements', 'Publish announcements'),
  ('holidays.read', 'Holidays', 'View holidays'),
  ('holidays.write', 'Holidays', 'Manage holidays'),
  ('performance.read', 'Performance', 'View performance'),
  ('performance.manage', 'Performance', 'Manage reviews and goals'),
  ('recruitment.read', 'Recruitment', 'View recruitment'),
  ('recruitment.write', 'Recruitment', 'Manage recruitment'),
  ('reports.read', 'Reports', 'View and export reports'),
  ('notifications.read', 'Notifications', 'View notifications'),
  ('audit.read', 'Audit', 'View audit logs');

-- Admin: all permissions
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-0000000000a1', id from public.permissions;

-- HR
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-0000000000a2', id from public.permissions
where name not in ('audit.read');

-- Manager
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-0000000000a3', id from public.permissions
where name in ('dashboard.view','employees.read','attendance.read','attendance.manage','leave.read','leave.approve','payroll.read','tasks.read','tasks.manage','performance.read','performance.manage','reports.read','announcements.read','holidays.read','documents.read','notifications.read');

-- Employee
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-0000000000a4', id from public.permissions
where name in ('dashboard.view','attendance.read','attendance.write','leave.read','leave.apply','documents.read','documents.upload','tasks.read','announcements.read','holidays.read','performance.read','notifications.read');

-- ---------------------------------------------------------------------------
-- Admin auth user (ceo@oklut.com / 1234)
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'ceo@oklut.com', crypt('1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"System Admin","role":"Admin"}'
) on conflict (id) do nothing;

insert into public.users (id, email, role_id, status)
values ('00000000-0000-0000-0000-000000000001', 'ceo@oklut.com',
        '00000000-0000-4000-8000-0000000000a1', 'Active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
insert into public.departments (id, name, code, description) values
  ('00000000-0000-4000-8000-0000000000d1', 'IT', 'IT', 'Information Technology'),
  ('00000000-0000-4000-8000-0000000000d2', 'HR', 'HR', 'Human Resources'),
  ('00000000-0000-4000-8000-0000000000d3', 'Design', 'DES', 'Design & Creative'),
  ('00000000-0000-4000-8000-0000000000d4', 'Finance', 'FIN', 'Finance & Accounts'),
  ('00000000-0000-4000-8000-0000000000d5', 'Marketing', 'MKT', 'Marketing & Sales');

-- ---------------------------------------------------------------------------
-- Designations
-- ---------------------------------------------------------------------------
insert into public.designations (id, name, department_id, level) values
  ('00000000-0000-4000-8000-0000000000e1', 'Software Engineer', '00000000-0000-4000-8000-0000000000d1', 3),
  ('00000000-0000-4000-8000-0000000000e2', 'Senior Software Engineer', '00000000-0000-4000-8000-0000000000d1', 4),
  ('00000000-0000-4000-8000-0000000000e3', 'Engineering Manager', '00000000-0000-4000-8000-0000000000d1', 5),
  ('00000000-0000-4000-8000-0000000000e4', 'HR Executive', '00000000-0000-4000-8000-0000000000d2', 3),
  ('00000000-0000-4000-8000-0000000000e5', 'HR Manager', '00000000-0000-4000-8000-0000000000d2', 5),
  ('00000000-0000-4000-8000-0000000000e6', 'UI Designer', '00000000-0000-4000-8000-0000000000d3', 3),
  ('00000000-0000-4000-8000-0000000000e7', 'Accountant', '00000000-0000-4000-8000-0000000000d4', 3),
  ('00000000-0000-4000-8000-0000000000e8', 'Marketing Lead', '00000000-0000-4000-8000-0000000000d5', 5);

-- ---------------------------------------------------------------------------
-- Leave types
-- ---------------------------------------------------------------------------
insert into public.leave_types (id, name, days_per_year, is_paid) values
  ('00000000-0000-4000-8000-0000000000l1', 'Casual Leave', 12, true),
  ('00000000-0000-4000-8000-0000000000l2', 'Sick Leave', 12, true),
  ('00000000-0000-4000-8000-0000000000l3', 'Earned Leave', 15, true),
  ('00000000-0000-4000-8000-0000000000l4', 'Unpaid Leave', 0, false);

-- ---------------------------------------------------------------------------
-- Holidays
-- ---------------------------------------------------------------------------
insert into public.holidays (name, date, is_optional) values
  ('Republic Day', '2026-01-26', false),
  ('Holi', '2026-03-04', false),
  ('Independence Day', '2026-08-15', false),
  ('Diwali', '2026-11-08', false),
  ('Christmas', '2026-12-25', false);

-- ---------------------------------------------------------------------------
-- Demo employees (delete these in production if desired)
-- ---------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'hr@oklut.com', crypt('1234', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Aarav Patel"}'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'employee@oklut.com', crypt('1234', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Meera Sharma"}'),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'designer@oklut.com', crypt('1234', gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"name":"Rohan Iyer"}')
on conflict (id) do nothing;

insert into public.employees (
  id, employee_code, user_id, first_name, last_name, email, phone, gender, date_of_birth,
  city, state, joining_date, employment_type, department_id, designation_id, status
) values
  ('00000000-0000-0000-0000-000000000010', 'EMP-0001', '00000000-0000-0000-0000-000000000010',
   'Aarav', 'Patel', 'hr@oklut.com', '+91 98450 10001', 'Male', '1992-04-12',
   'Hyderabad', 'Telangana', '2023-06-01', 'Full-time',
   '00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000e5', 'Active'),
  ('00000000-0000-0000-0000-000000000020', 'EMP-0002', '00000000-0000-0000-0000-000000000020',
   'Meera', 'Sharma', 'employee@oklut.com', '+91 98450 10002', 'Female', '1995-08-04',
   'Hyderabad', 'Telangana', '2024-02-15', 'Full-time',
   '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000e1', 'Active'),
  ('00000000-0000-0000-0000-000000000030', 'EMP-0003', '00000000-0000-0000-0000-000000000030',
   'Rohan', 'Iyer', 'designer@oklut.com', '+91 98450 10003', 'Male', '1990-12-19',
   'Bangalore', 'Karnataka', '2025-10-01', 'Full-time',
   '00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000e6', 'Active')
on conflict (id) do nothing;

-- payroll profiles for seeded employees
insert into public.payroll_profiles (employee_id, basic_salary, hra, allowances, bonus, pf_percent, tax_percent, bank_name, bank_account, ifsc_code) values
  ('00000000-0000-0000-0000-000000000010', 80000, 32000, 12000, 10000, 12, 5, 'HDFC Bank', '5021001XXXX', 'HDFC0001234'),
  ('00000000-0000-0000-0000-000000000020', 60000, 24000, 10000, 8000, 12, 5, 'ICICI Bank', '6022002XXXX', 'ICIC0005678'),
  ('00000000-0000-0000-0000-000000000030', 55000, 22000, 9000, 6000, 12, 5, 'SBI Bank', '1023003XXXX', 'SBIN0009012');

-- users profiles for demo employees
insert into public.users (id, email, role_id, employee_id, status) values
  ('00000000-0000-0000-0000-000000000010', 'hr@oklut.com', '00000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000010', 'Active'),
  ('00000000-0000-0000-0000-000000000020', 'employee@oklut.com', '00000000-0000-4000-8000-0000000000a4', '00000000-0000-0000-0000-000000000020', 'Active'),
  ('00000000-0000-0000-0000-000000000030', 'designer@oklut.com', '00000000-0000-4000-8000-0000000000a4', '00000000-0000-0000-0000-000000000030', 'Active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Sample job openings
-- ---------------------------------------------------------------------------
insert into public.job_openings (id, title, department_id, location, openings_count, description, requirements, employment_type, status, published) values
  ('00000000-0000-4000-8000-0000000000j1', 'PHP Developer', '00000000-0000-4000-8000-0000000000d1', 'Hyderabad', 2,
   'Develop robust server-side logic, integrate front-end elements and build reusable, testable code.',
   '2+ years of PHP (Laravel)\nSolid HTML, CSS, JavaScript\nPostgreSQL/MySQL experience', 'Full-time', 'Open', true),
  ('00000000-0000-4000-8000-0000000000j2', 'UI Designer', '00000000-0000-4000-8000-0000000000d3', 'Hyderabad', 1,
   'Design clean, modern interfaces for our platform. Build design systems and prototypes.',
   '2+ years UI/UX design\nFigma proficiency\nStrong portfolio', 'Full-time', 'Open', true);

insert into public.candidates (id, job_opening_id, name, email, phone, status, source) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000j1', 'Kavya Reddy', 'kavya@email.com', '+91 90000 11111', 'screening', 'Website'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000j2', 'Siddharth Rao', 'sidd@email.com', '+91 90000 22222', 'applied', 'Referral');
