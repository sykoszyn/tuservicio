-- Configuración editable desde /admin/configuracion (una sola fila).
create table public.configuracion (
  id int primary key default 1 check (id = 1),
  email_avisos text check (email_avisos is null or email_avisos ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  mp_alias text,
  mp_cvu text,
  mp_titular text,
  mp_link text check (mp_link is null or mp_link ~* '^https://'),
  updated_at timestamptz not null default now()
);

insert into public.configuracion (id) values (1) on conflict (id) do nothing;

alter table public.configuracion enable row level security;

create policy "config: admins ven" on public.configuracion
  for select using (public.es_admin());
create policy "config: admins editan" on public.configuracion
  for update using (public.es_admin()) with check (public.es_admin());

create trigger configuracion_updated_at
  before update on public.configuracion
  for each row execute function public.tocar_updated_at();
