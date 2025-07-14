# Penca Copa América 2024

Aplicación web desarrollada en **Node.js** y **Express** con un frontend en
**React**. Permite administrar una penca de la Copa América 2024. Los usuarios
pueden registrarse, realizar predicciones de los partidos y consultar el
ranking general.

Esta aplicación requiere Node.js 18 o superior para utilizar la función `fetch` en el backend.

## Instalación

1. Instala las dependencias del proyecto:

```bash
npm install
```

2. Configura las variables de entorno. Crea un archivo `.env` en la raíz del
proyecto con la URL de tu base de datos MongoDB y las credenciales del administrador.
La base de datos por defecto debe llamarse `pencas`:

```bash
# Ejemplo de conexión local
MONGODB_URI=mongodb://localhost:27017/pencas
DEFAULT_ADMIN_USERNAME=<usuario_admin>
DEFAULT_ADMIN_PASSWORD=<contraseña_admin>
DEFAULT_COMPETITION=<nombre>
SESSION_SECRET=<tu_clave>
# Opcionalmente puedes definir el puerto de la app
PORT=3000
# Límite de pencas que un usuario puede unir (3 por defecto)
MAX_PENCAS_PER_USER=3
# Credenciales para obtener fixtures desde API-Football
FOOTBALL_API_KEY=<tu_api_key>
# Identificador de liga y temporada
FOOTBALL_LEAGUE_ID=<id_liga>
FOOTBALL_SEASON=<temporada>
# URL base opcional de la API
FOOTBALL_API_URL=https://v3.football.api-sports.io
```
Si no defines `SESSION_SECRET`, el servidor se cerrará al iniciarse.
El valor `MAX_PENCAS_PER_USER` controla cuántas pencas puede integrar cada usuario,
útil si planeas varias competiciones en paralelo.

3. Inicia el servidor en modo desarrollo con **nodemon**:

```bash
npm run dev
```

Si modificas el frontend de React, genera los archivos estáticos con:

```bash
cd frontend && npm run build
```

En Vercel la compilación del frontend se realiza automáticamente durante el despliegue con `npm run vercel-build` y la carpeta `frontend/dist` queda disponible en producción.


Para un entorno de producción puedes utilizar `npm start`.

Al iniciarse por primera vez, la aplicación comprobará que exista la base de datos
e insertará un usuario administrador por defecto si es necesario. Las credenciales
se tomarán de las variables `DEFAULT_ADMIN_USERNAME` y `DEFAULT_ADMIN_PASSWORD`
definidas en tu archivo `.env`.

## Estructura del proyecto

- **main.js** – punto de entrada de la aplicación y configuración de Express.
- **middleware/** – middlewares de autenticación y control de caché.
- **models/** – modelos de Mongoose (User, Match, Prediction, Score, Penca).
- **routes/** – rutas de la aplicación: administración, partidos, predicciones, ranking y pencas.
- **public/** – archivos estáticos (CSS e imágenes).
- **frontend/** – frontend de React compilado con Vite.
- **matches.json** – datos de ejemplo de los partidos que pueden cargarse desde las rutas de administración.
- **updateschema.js** – script auxiliar para crear o actualizar esquemas en MongoDB.

Los partidos ya no se insertan automáticamente al iniciar la aplicación. Debes cargarlos manualmente desde el panel de administración.

El esquema `Penca` permite organizar competiciones privadas. Los usuarios se unen con un código y el propietario decide aprobar o eliminar participantes.

Con esta estructura puedes navegar fácilmente por cada componente de la aplicación.

## Administración de resultados

Los administradores registran los marcadores finales desde `/admin/edit` en el
apartado **Matches**. Cada vez que se guarda un resultado el sistema actualiza
de forma automática las llaves de eliminación directa. También existe el
endpoint `/admin/recalculate-bracket` (botón *Recalcular bracket* en el panel)
para forzar manualmente el recálculo si fuera necesario.

### Ejemplo de uso

1. Ingresa el resultado de cada encuentro y guarda los cambios.
2. La llave del knockout se recalculará automáticamente al guardar.
3. Consulta `/bracket` para ver los enfrentamientos actualizados.

## Nuevos endpoints

- `GET /groups` – devuelve las tablas de posiciones actuales.
- `GET /bracket` – muestra la llave del knockout según la última recalculación.
- `POST /admin/recalculate-bracket` – fuerza el nuevo cálculo del bracket con
  los resultados cargados.

## Pruebas


Antes de ejecutar las pruebas asegúrate de instalar todas las dependencias de
desarrollo. Para obtener una instalación reproducible puedes utilizar `npm ci`
tanto en la raíz del proyecto como dentro de `frontend/`:

```bash
npm ci
cd frontend && npm ci
```

En entornos de integración continua puedes ejecutar el script `scripts/setup-tests.sh` o utilizar `npm ci` para garantizar instalaciones reproducibles.

Para lanzar todas las pruebas:

```bash
npm test
```

## Desarrollo

Todo el código sigue las reglas del estilo **Google‑2025**. Si modificas los
componentes de React, recuerda reconstruir el frontend para que Express pueda
servir la última versión:

```bash
cd frontend && npm run build
```
