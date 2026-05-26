# Penca Mundial 2026

Aplicación web desarrollada en **Node.js** y **Express** con un frontend en
**React**. Permite administrar una única penca del Mundial 2026 con registro,
aprobación manual de jugadores, pronósticos por partido y ranking general.

Características principales:

- Registro e inicio de sesión con autenticación JWT.
- Gestión de partidos, resultados oficiales y cierre automático de predicciones 30 minutos antes del inicio.
- Sistema de puntos equilibrado para marcador exacto, diferencia, resultado, goles por equipo y ganador por penales.
- Ranking general con todos los jugadores aprobados, aunque todavía no tengan predicciones.
- Panel de administración para aprobar usuarios, cargar resultados y recalcular eliminatorias.

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
# Login con Google
GOOGLE_CLIENT_ID=<client_id_de_google>
GOOGLE_CLIENT_SECRET=<client_secret_de_google>
# Opcional si tu callback publico no se puede inferir de la request
GOOGLE_REDIRECT_URI=https://tu-dominio.com/auth/google/callback
# Idioma de los mensajes (es o en)
APP_LANG=es
Tambin puedes cambiar el idioma de las respuestas agregando `?lang=es` o `?lang=en` a cada solicitud, o enviando el encabezado `Accept-Language`.
# Credenciales para obtener fixtures desde TheSportsDB
SPORTSDB_API_KEY=<tu_api_key>
# Identificador de liga y temporada
SPORTSDB_LEAGUE_ID=<id_liga>
SPORTSDB_SEASON=<temporada>
# URL base opcional de la API
SPORTSDB_API_URL=https://www.thesportsdb.com/api/v2/json
```
Si no defines `SESSION_SECRET`, el servidor se cerrará al iniciarse.
`APP_LANG` permite elegir el idioma de las respuestas del backend. Usa `es` para español o `en` para inglés.

Para habilitar Google, crea un OAuth Client ID de tipo web en Google Cloud,
configura las variables `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, y agrega
`https://tu-dominio.com/auth/google/callback` como Authorized redirect URI. En
desarrollo puedes registrar `http://localhost:3000/auth/google/callback`. Si tu
app está detrás de un proxy o dominio custom, define `GOOGLE_REDIRECT_URI` con
la URL exacta registrada en Google.

Cada competencia puede definir `apiLeagueId` y `apiSeason` para usar valores diferentes a los de las variables globales al obtener fixtures o actualizar resultados.
Tambin puedes cambiar el idioma de las respuestas agregando `?lang=es` o `?lang=en` a cada solicitud, o enviando el encabezado `Accept-Language`.

La variable `DEFAULT_COMPETITION` define el nombre de la competencia principal.
Debes crearla desde el asistente de competencias en el panel de administración
para que pueda asignarse por defecto a nuevos usuarios y puntajes.

### Notificaciones por correo y auditoría

La aplicación puede enviar avisos automáticos cuando un jugador es aprobado o
cuando tiene pronósticos pendientes. Configura las siguientes variables de
entorno para habilitar el envío vía SMTP:

```bash
SMTP_HOST=<servidor_smtp>
SMTP_PORT=587
SMTP_SECURE=false # true si usas TLS en el puerto 465
SMTP_USER=<usuario>
SMTP_PASS=<password>
EMAIL_FROM="Penca 2026 <no-reply@tudominio.com>"
# Email que recibe nuevas solicitudes pendientes de aprobacion
ADMIN_EMAIL=<admin@tudominio.com>
```

Si las credenciales no están presentes, la aplicación registrará el intento de
envío en consola sin fallar. `ADMIN_EMAIL` recibe un aviso cuando se registra un
jugador nuevo y queda pendiente de aprobación. Para evitar alcanzar el límite de concurrencia en la
base de datos, la auditoría se mantiene desactivada por defecto. Podés habilitarla
desde el panel de administración y elegir qué tipos de cambios (usuarios,
pencas, predicciones) se registran en la colección `auditlogs` cuando esté activa,
lo que permite reconstruir el historial de cambios en caso de controversias.

También podés enviar aprobaciones y recordatorios mediante Klaviyo. Configurá la
private key en producción y dejá la public key como variable para evitar cambios
de código:

```bash
KLAVIYO_PRIVATE_KEY=<tu_private_key>
KLAVIYO_PUBLIC_API_KEY=VtZcng
KLAVIYO_REVISION=2024-10-15
APP_BASE_URL=https://tu-dominio.com
```

El backend dispara eventos `Penca Player Approved` y
`Penca Missing Predictions Reminder`; desde Klaviyo podés crear flows sobre esos
eventos para diseñar los emails finales.

### Formatos de torneo y reglas de puntuación

Las pencas ahora admiten distintos formatos (`Grupos + Eliminación`, `Liga`,
`Eliminación directa` o `Personalizado`) y guardan la configuración asociada en
los campos `tournamentMode` y `modeSettings`. El cálculo de puntos utiliza un
esquema equilibrado pensado para el Mundial 2026:

- 8 puntos por acertar el marcador exacto.
- 5 puntos por acertar la diferencia de goles sin marcador exacto.
- 3 puntos por acertar el resultado (victoria/empate).
- 1 punto por cada equipo con cantidad de goles correcta cuando no hubo marcador exacto.
- 1 punto extra por acertar el ganador por penales si el partido termina empatado tras alargue.
- 7 puntos de tope cuando el marcador no es exacto.

El detalle de la puntuación aparece en el botón de información dentro de cada
penca para que todos los participantes tengan las reglas a un clic.

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
- **routes/** – rutas de la aplicación: administración, partidos, predicciones y ranking.
- **public/** – archivos estáticos (CSS e imágenes).
- **frontend/** – frontend de React compilado con Vite.
- **matches.json** – datos de ejemplo de los partidos que pueden cargarse desde las rutas de administración.
- **updateschema.js** – script auxiliar para crear o actualizar esquemas en MongoDB.

Los partidos ya no se insertan automáticamente al iniciar la aplicación. Debes cargarlos manualmente desde el panel de administración.

Los usuarios registrados quedan pendientes hasta que el equipo de administración aprueba su acceso. Solo los jugadores aprobados pueden cargar pronósticos y aparecer en el ranking.

Con esta estructura puedes navegar fácilmente por cada componente de la aplicación.

### Asistente de competencias

Dentro del panel de administración (`/admin/edit`) encontrarás la sección **Competencias**. Haz clic en el botón **Nueva competencia** para abrir el asistente. Allí podrás indicar la cantidad de grupos y equipos por grupo o cargar un archivo de fixture. El asistente ahora envía la lista de partidos generados al backend, por lo que los nombres de los equipos se guardan automáticamente.

Si generas los encuentros de la fase de grupos desde aquí sin usar un fixture externo, la aplicación añadirá automáticamente las llaves de eliminación. Para torneos con 4 grupos se crean los cruces de cuartos, semifinales, tercer puesto y final. En competencias con más de cuatro grupos también se generan los enfrentamientos de “Ronda de 32”.

Para replicar el Mundial 2026 utiliza el archivo `worldcup2026.json` incluido en la raíz del repositorio al momento de cargar el fixture. Las banderas de los equipos usan `/images/default.png` a menos que exista una imagen específica. Configura además `DEFAULT_COMPETITION=Mundial 2026` en tu archivo `.env` para que la aplicación asigne ese torneo por defecto.

## Administración de resultados

Los administradores registran los marcadores finales desde `/admin/edit` dentro
del panel de resultados. Allí pueden ver los encuentros agrupados, cargar el
marcador real y guardar. Al guardar un resultado la aplicación actualiza
automáticamente la llave del knockout. El endpoint `/admin/recalculate-bracket`
(botón *Recalcular eliminatorias* en el panel) queda como opción de respaldo
para recalcular manualmente si fuera necesario.

### Ejemplo de uso

1. Ingresa el resultado de cada encuentro y guarda los cambios.
2. La llave del knockout se recalculará automáticamente al guardar.
3. Consulta `/bracket` para ver los enfrentamientos actualizados.

Desde el panel también podés reiniciar la competencia con el fixture oficial:
la acción exige escribir `REINICIAR`, borra partidos, resultados y predicciones,
y vuelve a importar `worldcup2026.json` para arrancar desde cero.

## Nuevos endpoints

- `GET /auth/google` – inicia el login o registro con Google.
- `GET /auth/google/callback` – recibe el callback OAuth de Google y crea o enlaza el usuario.
- `GET /groups` – devuelve las tablas de posiciones actuales.
- `GET /bracket` – muestra la llave del knockout según la última recalculación.
- `POST /admin/recalculate-bracket` – fuerza el nuevo cálculo del bracket con
  los resultados cargados.
- `GET /competitions/:competition/matches` – lista los partidos de la competencia indicada.

## Ideas para próximas iteraciones

- Crear dashboards en tiempo real con WebSockets para reflejar cambios en los marcadores al instante.
- Permitir configuraciones de scoring avanzadas por penca (bonos por ronda, resultados parciales) mediante presets.
- Integrar notificaciones push y recordatorios antes de cada partido para mejorar el engagement móvil.
- Añadir un historial visual de auditoría en el panel de administración para rastrear aprobaciones, cambios de fixture y edición de resultados.
- Incorporar un modo “simulador” que genere estadísticas hipotéticas de clasificación al ingresar predicciones.

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
