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
# Idioma de los mensajes (es o en)
APP_LANG=es
Tambin puedes cambiar el idioma de las respuestas agregando `?lang=es` o `?lang=en` a cada solicitud, o enviando el encabezado `Accept-Language`.
# Credenciales para obtener fixtures desde API-Football
FOOTBALL_API_KEY=<tu_api_key>
# Identificador de liga y temporada
FOOTBALL_LEAGUE_ID=<id_liga>
FOOTBALL_SEASON=<temporada>
# URL base opcional de la API
FOOTBALL_API_URL=https://v3.football.api-sports.io
# Intervalo mínimo entre actualizaciones de resultados (ms)
FOOTBALL_UPDATE_INTERVAL=3600000
```
Si no defines `SESSION_SECRET`, el servidor se cerrará al iniciarse.
El valor `MAX_PENCAS_PER_USER` controla cuántas pencas puede integrar cada usuario,
útil si planeas varias competiciones en paralelo.

`APP_LANG` permite elegir el idioma de las respuestas del backend. Usa `es` para español o `en` para inglés.

Cada competencia puede definir `apiLeagueId` y `apiSeason` para usar valores diferentes a los de las variables globales al obtener fixtures o actualizar resultados.
Tambin puedes cambiar el idioma de las respuestas agregando `?lang=es` o `?lang=en` a cada solicitud, o enviando el encabezado `Accept-Language`.

La variable `DEFAULT_COMPETITION` define el nombre de la competencia principal.
Debes crearla desde el asistente de competencias en el panel de administración
para que pueda asignarse por defecto a nuevos usuarios y puntajes.

3. Inicia el servidor en modo desarrollo con **nodemon**:

```bash
npm run dev
```

Si modificas el frontend de React, genera los archivos estáticos con:

```bash
cd frontend && npm run build
```

## Bracket MUI Prototype

El proyecto incluye un componente de prueba que utiliza la librería
`@g-loot/react-tournament-brackets` con estilos de **MUI**. Para visualizarlo
en el dashboard necesitas instalar las dependencias adicionales del frontend:

```bash
cd frontend
npm install @mui/material @emotion/react @emotion/styled \
  @g-loot/react-tournament-brackets
```

Luego inicia el servidor de desarrollo de Vite:

```bash
npm run dev
```

Al entrar al panel se mostrará un bloque llamado *Bracket Prototype* con la
llave de eliminatorias.

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

Los owners cuentan con un panel propio disponible en `/owner` para administrar sus pencas. Desde allí pueden aprobar o rechazar solicitudes de ingreso y revisar el ranking de cada penca.

Con esta estructura puedes navegar fácilmente por cada componente de la aplicación.

### Asistente de competencias

Dentro del panel de administración (`/admin/edit`) encontrarás la sección **Competencias**. Haz clic en el botón **Nueva competencia** para abrir el asistente. Allí podrás indicar la cantidad de grupos y equipos por grupo o cargar un archivo de fixture. El asistente ahora envía la lista de partidos generados al backend, por lo que los nombres de los equipos se guardan automáticamente.

Si generas los encuentros de la fase de grupos desde aquí sin usar un fixture externo, la aplicación añadirá automáticamente las llaves de eliminación. Para torneos con 4 grupos se crean los cruces de cuartos, semifinales, tercer puesto y final. En competencias con más de cuatro grupos también se generan los enfrentamientos de “Ronda de 32”.

Para replicar el Mundial 2026 utiliza el archivo `worldcup2026.json` incluido en la raíz del repositorio al momento de cargar el fixture. Las banderas de los equipos usan `/images/default.png` a menos que exista una imagen específica. Configura además `DEFAULT_COMPETITION=Mundial 2026` en tu archivo `.env` para que la aplicación asigne ese torneo por defecto.

## Administración de resultados

Los administradores registran los marcadores finales desde `/admin/edit` dentro
del acordeón de cada competencia. Allí pueden ver y actualizar todos los
encuentros de forma agrupada. Al guardar un resultado la aplicación actualiza
automáticamente la llave del knockout. El endpoint
`/admin/recalculate-bracket` (botón *Recalcular bracket* en el panel) queda como
opción de respaldo para recalcular manualmente si fuera necesario.
También puedes usar `/admin/update-results/<competencia>` para obtener marcadores directamente desde API‑Football. La frecuencia de actualización se controla con la variable `FOOTBALL_UPDATE_INTERVAL`.
El comando utilizará los valores `apiLeagueId` y `apiSeason` definidos en la competencia.

### Ejemplo de uso

1. Ingresa el resultado de cada encuentro y guarda los cambios.
2. La llave del knockout se recalculará automáticamente al guardar.
3. Consulta `/bracket` para ver los enfrentamientos actualizados.

## Nuevos endpoints

- `GET /groups` – devuelve las tablas de posiciones actuales.
- `GET /bracket` – muestra la llave del knockout según la última recalculación.
- `POST /admin/recalculate-bracket` – fuerza el nuevo cálculo del bracket con
  los resultados cargados.
- `POST /admin/update-results/:competition` – obtiene los resultados desde la API-Football.
- `GET /api/owner` – devuelve las pencas administradas por el owner autenticado.
- `GET /competitions/:competition/matches` – lista los partidos de la competencia indicada.

## Pruebas


Antes de ejecutar las pruebas asegúrate de instalar todas las dependencias de
desarrollo. Para obtener una instalación reproducible ejecuta `npm ci` en la raíz
del proyecto. El frontend no incluye `package-lock.json`, por lo que allí debes
usar `npm install`:

```bash
npm ci
cd frontend && npm install
```

En entornos de integración continua puedes ejecutar el script `scripts/setup-tests.sh`,
que utilizará `npm ci` o `npm install` según corresponda para garantizar instalaciones
reproducibles.

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
