-- TuServicio: esquema inicial
-- Ejecutalo en Supabase → SQL Editor (o con `supabase db push`).

-- ───────────────────────── Perfiles ─────────────────────────
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  dni text check (dni is null or dni ~ '^[0-9]{7,8}$'),
  telefono text,
  es_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse.
create function public.crear_perfil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, new.raw_user_meta_data ->> 'nombre');
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

create function public.es_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((select es_admin from public.perfiles where id = auth.uid()), false);
$$;

-- ───────────────────────── Casos ─────────────────────────
-- Un caso = una factura que queremos bajar.
create table public.casos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  empresa text not null check (empresa in ('telecentro', 'personal', 'flow', 'movistar', 'claro', 'otra')),
  servicio text not null check (servicio in ('internet', 'tv', 'celular', 'telefonia_fija', 'combo')),
  numero_cliente text not null check (char_length(numero_cliente) between 1 and 40),
  dni_titular text not null check (dni_titular ~ '^[0-9]{7,8}$'),
  titular text not null check (char_length(titular) between 2 and 120),
  telefono_contacto text,
  archivo_path text not null,
  -- El usuario nos autoriza a gestionar en su nombre (si no, solo le damos el guion).
  autoriza_gestion boolean not null default false,
  estado text not null default 'recibido'
    check (estado in ('recibido', 'analizando', 'analizado', 'en_negociacion', 'ahorro_conseguido', 'sin_ahorro', 'cancelado')),
  monto_actual numeric(12, 2),
  monto_nuevo numeric(12, 2),
  analisis jsonb,
  error_analisis text,
  mensaje_operador text,      -- lo ve el usuario
  notas_internas text,        -- solo admins
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index casos_user_id_idx on public.casos (user_id, created_at desc);
create index casos_estado_idx on public.casos (estado, created_at);

create function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger casos_updated_at
  before update on public.casos
  for each row execute function public.tocar_updated_at();

-- Historial visible para el usuario.
create table public.eventos_caso (
  id bigint generated always as identity primary key,
  caso_id uuid not null references public.casos (id) on delete cascade,
  estado text not null,
  mensaje text,
  created_at timestamptz not null default now()
);

create index eventos_caso_caso_idx on public.eventos_caso (caso_id, created_at);

-- ───────────────────────── Aportes voluntarios ─────────────────────────
-- Nunca obligatorios. El usuario puede avisar que aportó (o no hacerlo nunca).
create table public.aportes (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  monto numeric(12, 2) not null check (monto > 0),
  confirmado boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── RLS ─────────────────────────
alter table public.perfiles enable row level security;
alter table public.casos enable row level security;
alter table public.eventos_caso enable row level security;
alter table public.aportes enable row level security;

-- Perfiles: cada uno ve y edita el suyo (menos es_admin); admins ven todos.
create policy "perfil propio: ver" on public.perfiles
  for select using (id = auth.uid() or public.es_admin());
create policy "perfil propio: editar" on public.perfiles
  for update using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.perfiles from authenticated, anon;
grant update (nombre, dni, telefono) on public.perfiles to authenticated;

-- Casos: el usuario crea y ve los suyos. Los cambios de estado/montos los
-- hace el servidor (service role) o un admin.
create policy "casos: ver propios" on public.casos
  for select using (user_id = auth.uid() or public.es_admin());
create policy "casos: crear propios" on public.casos
  for insert with check (
    user_id = auth.uid()
    and estado = 'recibido'
    and analisis is null
    and monto_nuevo is null
    and archivo_path like auth.uid()::text || '/%'
  );
create policy "casos: admins editan" on public.casos
  for update using (public.es_admin()) with check (public.es_admin());

create policy "eventos: ver de mis casos" on public.eventos_caso
  for select using (
    public.es_admin()
    or exists (select 1 from public.casos c where c.id = caso_id and c.user_id = auth.uid())
  );
create policy "eventos: admins crean" on public.eventos_caso
  for insert with check (public.es_admin());

create policy "aportes: ver propios" on public.aportes
  for select using (user_id = auth.uid() or public.es_admin());
create policy "aportes: declarar propios" on public.aportes
  for insert with check (
    user_id = auth.uid()
    and confirmado = false
    and exists (select 1 from public.casos c where c.id = caso_id and c.user_id = auth.uid())
  );
create policy "aportes: admins confirman" on public.aportes
  for update using (public.es_admin()) with check (public.es_admin());

-- ───────────────────────── Storage ─────────────────────────
-- Bucket privado. Cada usuario sube a la carpeta <su uid>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'facturas', 'facturas', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "facturas: subir a mi carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'facturas' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "facturas: ver las mías" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'facturas'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin())
  );

create policy "facturas: borrar las mías" on storage.objects
  for delete to authenticated
  using (bucket_id = 'facturas' and (storage.foldername(name))[1] = auth.uid()::text);

-- Para hacerte admin (después de registrarte):
--   update public.perfiles set es_admin = true where id = (select id from auth.users where email = 'vos@mail.com');
