-- Phase 4: Cron observability — log every scheduled job run.
-- Cron routes insert via service role (bypasses RLS).
-- Admin dashboard reads via regular auth (covered by SELECT policy below).

create table cron_logs (
  id                 uuid        primary key default gen_random_uuid(),
  job_name           text        not null,
  ran_at             timestamptz not null default now(),
  success            boolean     not null,
  records_processed  int,
  error_message      text
);

-- Fast "latest run per job" lookup used by the admin health panel.
create index cron_logs_job_name_ran_at_idx
  on cron_logs (job_name, ran_at desc);

alter table cron_logs enable row level security;

-- Admin staff (admin / instructor / treasurer) can read the log.
-- Inserts come from service-role routes that bypass RLS — no INSERT policy needed.
create policy "Admin staff can read cron logs"
  on cron_logs for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin', 'instructor', 'treasurer')
    )
  );
