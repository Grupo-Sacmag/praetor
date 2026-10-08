# Portal de actualizaciones de Actualitodo

Next.js (App Router, TypeScript) sobre Node.js 22. Publica EXE, tarifas e índices.

## Arranque local
```bash
cp .env.example .env        # editar MONGO_URI, SESSION_SECRET y rutas
npm install
node --env-file=.env scripts/create-admin.mjs admin "UnaContraseniaLarga"
npm run dev
```

## Docker
```bash
docker compose up -d --build
docker compose exec portal node scripts/create-admin.mjs admin "UnaContraseñaLarga"
```
Los volúmenes `/data/apps` y `/data/envArch` deben ser los mismos que lee la API de Actualitodo.

## Qué escribe el portal
| Acción | Disco | MongoDB (`envarchdb`) |
|---|---|---|
| Subir EXE | `APPS_DIR/<folder>/<exe>` | upsert por `Nombre` en `VERSIONS_COLLECTION` (Version, folder, exe, UltModif) |
| Subir tarifa/índice | `TARIFAS_DIR/<fileName>` | upsert por `fileName` en `files_metadata` (filePath, fileSize Long, contentType, userId, uploadTime) |

Pendiente de confirmar: nombre real de la colección de versiones y carpeta desde donde la API sirve `/download`.
