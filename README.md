# TuServicio

Plataforma para bajar facturas de internet, TV y celular en Argentina (Telecentro, Personal, Flow, Movistar, Claro).
**Gratis.** Si la persona consigue pagar menos y quiere/puede, hace un aporte voluntario. Nunca obligatorio.

## Cómo funciona

1. La persona crea su cuenta y sube la factura (foto o PDF) con número de cliente, DNI y titular.
2. La factura entra directo a la cola de `/admin` como "Negociando". Ahí ves la foto o el PDF, el número de cliente,
   el DNI, el WhatsApp y un guion para el área de retención, y hablás con la empresa.
3. Cargás el monto nuevo y un mensaje; la persona lo ve en su cuenta.
   *(Opcional: con `ANTHROPIC_API_KEY`, Claude lee la factura antes, detecta promos vencidas y cargos extra, y le da
   a la persona un guion para hacerlo sola.)*
4. Se registra el monto nuevo y se muestra el ahorro mensual/anual.
5. Solo si hubo ahorro aparece un bloque de aporte voluntario (Mercado Pago o alias), con el botón "Ahora no puedo" al mismo nivel.

## Stack

- Next.js 16 (App Router), Tailwind 4 → Vercel
- Supabase: Auth (solo Google), Postgres con RLS, Storage privado para las facturas
- Opcional: Claude API (`claude-opus-5-5`) para leer las facturas automáticamente

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
6. **Configuración** (`/admin/configuracion`): tu email para avisos y el alias/CVU para aportes.
   Ejecutá antes `supabase/migrations/0002_configuracion.sql`.

## Login con Google

1. Google Cloud Console → proyecto nuevo → *Google Auth Platform* (pantalla de consentimiento): tipo **Externo**,
   nombre de la app, email de soporte, y en dominios autorizados `supabase.co` y `vercel.app`.
2. *Clientes → Crear cliente* → **Aplicación web**. En *URIs de redireccionamiento autorizados* pegá
   `https://TU-PROYECTO.supabase.co/auth/v1/callback` (está en Supabase → Authentication → Providers → Google).
3. Supabase → Authentication → Providers → **Google** → activalo y pegá el Client ID y Client Secret.
4. Ejecutá `supabase/migrations/0003_nombre_google.sql` (toma el nombre de la cuenta de Google).
5. En Google, *Público* → **Publicar la app** para que pueda entrar cualquier persona.

Como el ingreso es solo con Google, en Supabase → Authentication → Sign In / Providers conviene **desactivar
"Email"** para que nadie pueda crear cuentas con email y contraseña por fuera de la app.

## Ajustes rápidos

En `src/lib/datos.ts`:
- `PLAZO_RESPUESTA`: lo que se le promete a la gente (hoy "hasta 5 días hábiles").
- `MAX_CASOS_ABIERTOS`: cuántas facturas en gestión puede tener una persona a la vez (hoy 5).

## Avisos por email (Resend)

1. Creá una cuenta gratis en https://resend.com **con el mismo email donde querés recibir los avisos**.
2. *API Keys → Create API Key* (permiso "Sending access"). Copiala.
3. En Vercel: *Settings → Environment Variables* → `RESEND_API_KEY` = la clave → *Redeploy*.
4. En `/admin/configuracion` cargá ese email, guardá y tocá "Enviar email de prueba".

Sin dominio propio, Resend usa el remitente `onboarding@resend.dev` y **solo puede mandar al email con el que
creaste la cuenta**, que es justo lo que necesitás para los avisos. Si después tenés dominio, verificalo en Resend
y poné `EMAIL_REMITENTE`.

## Seguridad y datos

- RLS: cada usuario solo ve sus casos y archivos; los cambios de estado y montos los hace el servidor o un admin.
- `es_admin` no es editable por el usuario (permiso por columna).
- Al modelo se le manda la factura, el titular y el número de cliente. El DNI no se envía.
- La `SUPABASE_SERVICE_ROLE_KEY` se usa solo en el servidor.
