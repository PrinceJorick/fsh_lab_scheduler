-- All data is accessed through the server API. Browser roles have no table access.
create table public.users (
  id bigint generated always as identity primary key,
  email text not null unique,
  password text not null,
  role text not null check (role in ('Teacher', 'Admin')),
  created_at timestamptz not null default now()
);

create table public.reservations (
  id text primary key,
  lab text not null,
  date text not null,
  time_slot text not null,
  teacher_name text not null,
  subject text not null,
  grade text not null,
  students integer not null check (students between 1 and 50),
  purpose text not null,
  requester text not null references public.users(email),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index reservations_open_slot on public.reservations (lab, date, time_slot) where status <> 'declined';
create index reservations_requester_created on public.reservations (requester, created_at desc);
create index reservations_lab_created on public.reservations (lab, created_at desc);

create table public.notifications (
  id text primary key,
  type text not null,
  reservation_id text references public.reservations(id),
  from_email text not null,
  to_email text not null,
  subject text not null,
  message text not null,
  lab text,
  date text,
  time_slot text,
  status text not null,
  is_read integer not null default 0 check (is_read in (0, 1)),
  created_at timestamptz not null default now()
);
create index notifications_recipient_created on public.notifications (to_email, created_at desc);

create table public.otp_codes (
  email text primary key,
  code text not null,
  expires_at bigint not null,
  verified_at bigint
);

create table public.push_subscriptions (
  id text primary key,
  email text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);
create index push_subscriptions_email on public.push_subscriptions (email);

alter table public.users enable row level security;
alter table public.reservations enable row level security;
alter table public.notifications enable row level security;
alter table public.otp_codes enable row level security;
alter table public.push_subscriptions enable row level security;

revoke all on public.users, public.reservations, public.notifications, public.otp_codes, public.push_subscriptions from anon, authenticated;
revoke all on sequence public.users_id_seq from anon, authenticated;
