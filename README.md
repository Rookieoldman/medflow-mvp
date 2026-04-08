# Medflow MVP

Aplicación web para **coordinar traslados de pacientes** a pruebas (RM, TC, etc.) entre **técnicos**, **celadores** y **administración**. Pensada como MVP demostrable en entorno hospitalario.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **PostgreSQL** + **Prisma**
- **NextAuth.js** (credenciales + JWT)
- **Tailwind CSS 4**
- **Notificaciones push** (Web Push / PWA, opcional)

El código de la aplicación vive en **`apps/web`**.

## Requisitos

- Node.js 20+
- PostgreSQL 14+

## Puesta en marcha (local)

### 1. Base de datos

Crea una base PostgreSQL y anota la URL de conexión.

### 2. Variables de entorno

En **`apps/web`**, copia y ajusta el entorno (puedes partir de `.env.example` en la raíz del repo):

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de PostgreSQL (incluye `?schema=public` si aplica) |
| `NEXTAUTH_SECRET` | Secreto fuerte (generar con `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | En local suele ser `http://localhost:3000` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Opcional: clave pública VAPID para push |
| `VAPID_PRIVATE_KEY` | Opcional: clave privada VAPID (servidor) |
| `VAPID_SUBJECT` | Opcional: p. ej. `mailto:contacto@hospital.org` |

Para generar claves VAPID de desarrollo:

```bash
cd apps/web && node scripts/generate-vapid.mjs
```

Si no configuras VAPID, la app funciona; solo se omiten las notificaciones push.

### 3. Instalar dependencias y migrar

```bash
cd apps/web
npm install
npx prisma migrate deploy
# o en desarrollo, tras cambios de esquema:
npx prisma migrate dev
```

### 4. Usuarios

Los usuarios se gestionan desde el panel **Admin** (crear usuario con rol y contraseña). No hay seed por defecto en el repositorio.

### 5. Arrancar

```bash
cd apps/web
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Tests

```bash
cd apps/web
npm test
```

### Build de producción (local)

```bash
cd apps/web
npm run build
npm start
```

## Roles y flujo resumido

| Rol | Uso principal |
|-----|----------------|
| **TECNICO** | Crea solicitudes de traslado; marca cuando el paciente entra en sala de prueba (`EN_PRUEBA`). |
| **CELADOR** | Ve la cola, se asigna traslados, firma si aplica, pausa/reanuda, libera a cola, finaliza tras la prueba. |
| **ADMIN** | Usuarios, visibilidad de traslados y estadísticas. |

Los estados del traslado y el historial de eventos quedan registrados en base de datos.

## Estructura relevante

```
apps/web/
├── prisma/schema.prisma   # Modelo de datos
├── public/sw.js           # Service worker (PWA)
├── src/app/               # Rutas (celador, tecnico, admin, api)
├── src/lib/               # Utilidades, event bus, webpush, etc.
└── vitest.config.ts       # Tests unitarios (reglas de negocio)
```

## ¿Es ya un MVP?

Sí, como **MVP funcional**: login por roles, flujo de traslado extremo a extremo, lista en tiempo casi real (SSE + polling), PWA/push opcional, reglas de acceso en ficha celador e incidencias.

Faltan piezas típicas de **producto maduro** antes de producción clínica real: auditoría formal, retención/legal de firmas en PDF, integración con HIS, hardening completo, etc.

## Despliegue a producción (orientación hospitalaria)

1. **Entorno**: HTTPS obligatorio; `NEXTAUTH_URL` y `NEXTAUTH_SECRET` de producción únicos y secretos rotados.
2. **Base de datos**: PostgreSQL gestionado, backups, acceso restringido por red.
3. **Variables**: Nunca commitear `.env`; usar secret manager del proveedor.
4. **Revisión**: Política de contraseñas, usuarios desactivables (`active`), revisar exposición de APIs (`/api/*`).
5. **RGPD / datos clínicos**: Evaluación de tratamiento de datos personales, acuerdos con el centro, tiempo de retención y acceso a firmas.
6. **Push**: Dominio y certificados correctos; VAPID y permisos según política del hospital.

Este documento no sustituye el análisis de seguridad ni el DPIA del centro.

## Licencia y uso

Uso interno / proyecto propio; ajusta la licencia según tu organización.
