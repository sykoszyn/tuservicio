# TuServicio

Plataforma para bajar facturas de internet, TV y celular en Argentina (Telecentro, Personal, Flow, Movistar, Claro).
**Gratis.** Si la persona consigue pagar menos y quiere/puede, hace un aporte voluntario. Nunca obligatorio.

## Cómo funciona

1. La persona crea su cuenta y sube la factura (foto o PDF) con número de cliente, DNI y titular.
2. Claude lee la factura: monto, plan, promos vencidas, aumentos y cargos extra, y arma un ahorro estimado
   y un guion para hablar con el área de retención.
3. Dos caminos: **"Gestionalo por mí"** (autoriza a que el equipo contacte a la empresa) o **"Hacelo vos"** con el guion.
4. Se registra el monto nuevo y se muestra el ahorro mensual/anual.
5. Solo si hubo ahorro aparece un bloque de aporte voluntario (Mercado Pago o alias), con el botón "Ahora no puedo" al mismo nivel.

## Stack

- Next.js 16 (App Router), Tailwind 4 → Vercel
- Supabase: Auth (email + contraseña o link mágico), Postgres con RLS, Storage privado para las facturas
- Claude API (`claude-opus-5-5`, salida estructurada) para leer las facturas

## Puesta en marcha

1. **Supabase**: creá un proyecto y en *SQL Editor* ejecutá `supabase/migrations/0001_init.sql`
   (tablas, RLS, bucket `facturas`).
   En *Authentication → URL Configuration* poné tu dominio como Site URL y agregá
   `https://TU-DOMINIO/auth/callback` (y `http://localhost:3000/auth/callback`) en Redirect URLs.
2. **Variables**: copiá `.env.example` a `.env.local` y completalas.
3. **Local**: `npm install && npm run dev`.
4. **Vercel**: importá el repo y cargá las mismas variables en *Settings → Environment Variables*.
5. **Hacete admin** (después de registrarte):
   ```sql
   update public.perfiles set es_admin = true
   where id = (select id from auth.users where email = 'vos@mail.com');
   ```
   El panel de gestión queda en `/admin`.

## Seguridad y datos

- RLS: cada usuario solo ve sus casos y archivos; los cambios de estado y montos los hace el servidor o un admin.
- `es_admin` no es editable por el usuario (permiso por columna).
- Al modelo se le manda la factura, el titular y el número de cliente. El DNI no se envía.
- La `SUPABASE_SERVICE_ROLE_KEY` se usa solo en el servidor.
