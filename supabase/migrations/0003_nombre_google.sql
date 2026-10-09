-- Con Google el nombre llega como full_name / name en vez de nombre.
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'nombre',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  );
  return new;
end;
$$;
