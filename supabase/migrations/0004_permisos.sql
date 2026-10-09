-- Permisos explícitos sobre las tablas. Algunos proyectos de Supabase no dan acceso
-- automático a las tablas nuevas; sin esto falla "No pudimos guardar el caso".
-- Se puede ejecutar más de una vez sin problema. RLS sigue limitando qué filas ve cada uno.

grant usage on schema public to anon, authenticated, service_role;

grant select on public.perfiles to authenticated;
grant update (nombre, dni, telefono) on public.perfiles to authenticated;
grant select, insert on public.casos to authenticated;
grant update on public.casos to authenticated;          -- solo admins, por RLS
grant select, insert on public.eventos_caso to authenticated;
grant select, insert, update on public.aportes to authenticated;
grant select, update on public.configuracion to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant usage on all sequences in schema public to authenticated;

grant execute on function public.es_admin() to anon, authenticated, service_role;
