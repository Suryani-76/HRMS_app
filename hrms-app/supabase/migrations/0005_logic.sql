-- Phase 2 Logic Updates for OKLUT Roadmap

-- 1. Attendance Deduction Trigger
create or replace function public.process_attendance_deduction()
returns trigger language plpgsql as $$
declare
  v_start_time time := '09:00:00'; -- Standard start time
  v_check_in_time time;
  v_minutes_late int;
  v_basic_salary numeric;
  v_daily_rate numeric;
  v_deduction numeric := 0;
  v_pay_period text;
begin
  -- Only process if check_in is provided
  if new.check_in is not null then
    -- Get local time from check_in timestamp
    v_check_in_time := (new.check_in AT TIME ZONE 'Asia/Kolkata')::time;
    
    if v_check_in_time > v_start_time then
      -- Calculate minutes late
      v_minutes_late := extract(epoch from (v_check_in_time - v_start_time))/60;
      
      -- Get employee's basic salary
      select basic_salary into v_basic_salary
      from public.payroll_profiles
      where employee_id = new.employee_id;
      
      if found then
        -- Daily rate = basic_salary / 30
        v_daily_rate := v_basic_salary / 30;
        
        -- Rule: 30 mins late -> 1/4 day salary deducted
        if v_minutes_late >= 30 and v_minutes_late < 60 then
          v_deduction := v_daily_rate * 0.25;
        -- Rule: 1 hour late -> additional fixed deduction (500) + 1/4 day
        elsif v_minutes_late >= 60 then
          v_deduction := (v_daily_rate * 0.25) + 500;
        end if;
        
        -- Add deduction to payroll for the current month
        if v_deduction > 0 then
          v_pay_period := to_char(new.date, 'YYYY-MM');
          
          -- Try to update existing payroll draft
          update public.payroll
          set deductions = deductions + v_deduction,
              updated_at = now()
          where employee_id = new.employee_id and pay_period = v_pay_period and status = 'draft';
        end if;
      end if;
    end if;
  end if;
  
  return new;
end;
$$;

drop trigger if exists trg_attendance_deduction on public.attendance;
create trigger trg_attendance_deduction
  after insert or update of check_in on public.attendance
  for each row execute function public.process_attendance_deduction();

-- 2. Performance Auto-Exit Flagging
create or replace function public.check_performance_exits()
returns void language plpgsql as $$
begin
  -- Notify HR about employees reaching Level 3 (decline)
  insert into public.notifications (user_id, employee_id, type, title, message, link)
  select 
    u.id, 
    e.id,
    'warning', 
    'Performance Alert: ' || e.first_name || ' ' || e.last_name,
    'Employee has reached Performance Level 3 (decline). Review for potential exit according to policy.',
    '/employees/' || e.id
  from public.employees e
  cross join public.users u
  join public.roles r on u.role_id = r.id
  where r.name = 'HR'
  and exists (
    select 1 from public.performance_reviews pr
    where pr.employee_id = e.id
    and pr.cycle_level = 3
    and pr.created_at >= (now() - interval '30 days')
  )
  on conflict do nothing;
end;
$$;
