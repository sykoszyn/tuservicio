-- Ingreso desde la Mini App de Lemon (Sign In With Ethereum).

-- Billetera de Lemon asociada a cada cuenta (null para quienes entran con Google).
alter table public.perfiles add column if not exists wallet text unique;

-- Nonces de un solo uso para el login con Lemon. Solo los usa el servidor (service role).
create table if not exists public.lemon_nonces (
  nonce text primary key,
  usado boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.lemon_nonces enable row level security;
grant all on public.lemon_nonces to service_role;
