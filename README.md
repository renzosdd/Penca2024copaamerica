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
proyecto con al menos la URL de tu base de datos MongoDB:

```bash
MONGODB_URI=mongodb://<usuario>:<password>@<host>/<basedatos>
# Opcionalmente puedes definir el puerto de la app
PORT=3000
# Credenciales del administrador por defecto
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=Penca2024Ren
```

3. Inicia el servidor en modo desarrollo con **nodemon**:

```bash
npm run dev
```

Para un entorno de producción puedes utilizar `npm start`.

Al iniciarse por primera vez, la aplicación comprobará que exista la base de datos
e insertará un usuario administrador por defecto si es necesario. Las credenciales

- **Usuario:** `admin`
- **Contraseña:** `Penca2024Ren`

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
