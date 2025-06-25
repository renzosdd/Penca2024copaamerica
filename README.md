# Penca Copa América 2024

Aplicación web desarrollada en **Node.js** y **Express** para administrar una 
penca de la Copa América 2024. Los usuarios pueden registrarse, realizar 
predicciones de los partidos y consultar el ranking general.

## Instalación

1. Instala las dependencias del proyecto:

```bash
npm install
```

2. Configura las variables de entorno. Crea un archivo `.env` en la raíz del
proyecto con la URL de tu base de datos MongoDB y las credenciales del administrador:

```bash
MONGODB_URI=mongodb://<usuario>:<password>@<host>/<basedatos>
DEFAULT_ADMIN_USERNAME=<usuario_admin>
DEFAULT_ADMIN_PASSWORD=<contraseña_admin>
# Opcionalmente puedes definir el puerto de la app
PORT=3000
```

3. Inicia el servidor en modo desarrollo con **nodemon**:

```bash
npm run dev
```

Para un entorno de producción puedes utilizar `npm start`.

Al iniciarse por primera vez, la aplicación comprobará que exista la base de datos
e insertará un usuario administrador por defecto si es necesario. Las credenciales
se tomarán de las variables `DEFAULT_ADMIN_USERNAME` y `DEFAULT_ADMIN_PASSWORD`
definidas en tu archivo `.env`.

## Estructura del proyecto

- **main.js** – punto de entrada de la aplicación y configuración de Express.
- **middleware/** – middlewares de autenticación y control de caché.
- **models/** – modelos de Mongoose (User, Match, Prediction, Score).
- **routes/** – rutas de la aplicación: administración, partidos, predicciones y ranking.
- **public/** – archivos estáticos (CSS, imágenes, scripts de cliente, uploads).
- **views/** – plantillas EJS para las vistas HTML.
- **matches.json** – datos de los partidos utilizados para inicializar la base.
- **updateschema.js** – script auxiliar para crear o actualizar esquemas en MongoDB.

Con esta estructura puedes navegar fácilmente por cada componente de la aplicación.

## Pruebas

Antes de ejecutar las pruebas, instala las dependencias del proyecto:

```bash
npm install
```

En entornos de integración continua puedes ejecutar el script `scripts/setup-tests.sh` o utilizar `npm ci` para garantizar instalaciones reproducibles.

Para lanzar todas las pruebas:

```bash
npm test
```
