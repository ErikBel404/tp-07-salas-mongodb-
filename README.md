# tp-07-salas-mongodb
## Persistencia inicial de reservas de salas con MongoDB

## 1. Información general y punto de partida
* **Punto de partida**: Copia funcional del proyecto `tp-06-salas-modular`.
* **Entorno de base de datos**: MongoDB Atlas.
* **Base de datos utilizada**: `reservas_salas`.
* **Tecnologías y versiones principales**:
  * Node.js: v20+ (con soporte nativo para `--env-file`)
  * Mongoose: `^9.11.2`
  * Express: `^5.2.1`
  * EJS & Express-EJS-Layouts

---

## 2. Preparación del clúster y configuración inicial

### Paso 1: Configuración en MongoDB Atlas
1. Crear un clúster gratuito **Free (M0)**.
2. En **Database Access**, crear un usuario con permisos de **lectura y escritura** (Read and write to any database).
3. En **Network Access**, configurar la IP de acceso permitida (ej. `0.0.0.0/0` para entorno de desarrollo).
4. En **Clusters > Connect > Drivers**, copiar la cadena de conexión URI para Node.js.

### Paso 2: Instalación local y variables de entorno
1. Clonar el repositorio e instalar las dependencias:
   ```bash
   npm install
   ```
2. Crear el archivo privado .env a partir de la plantilla pública:
   ```bash
   cp .env.example .env
   ```
3. Completar en .env la variable MONGODB_URI con el usuario, contraseña, host y base de datos real:
   ```bash
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb+srv://USUARIO:CLAVE@cluster0.xxxx.mongodb.net/reservas_salas_u7?retryWrites=true&w=majority
   ```
## 3 Diagnóstico DNS y comandos de ejecución
### Diagnóstico de red y resolución DNS
Para prevenir fallos recurrentes de resolución en registros SRV y TXT de Atlas bajo ciertas conexiones locales o proveedores de internet, se implementó en src/config/base-datos.js la configuración de resolutores públicos mediante node:dns:

```bash
dns.setServers(["8.8.8.8", "1.1.1.1"]);
```
Este ajuste afecta exclusivamente la resolución DNS interna de Node.js, garantizando la resolución de host sin alterar la configuración de red del sistema operativo ni las reglas de acceso de Atlas.

### Comandos de ejecución

* Comprobar conexión con Atlas:
   ```bash
   node --env-file .env scripts/comprobar-conexion.js
   # O mediante script npm:
   npm run db:probar
   ```
* Crear una reserva persistente:
   ```bash
   node --env-file .env scripts/crear-reserva.js
   # O mediante script npm:
   npm run db:crear
   ```
* Listar reservas almacenadas:
   ```bash
   node --env-file .env scripts/listar-reservas.js
   # O mediante script npm:
   npm run db:listar
   ```
* Control de calidad y estilo:
   ```bash
   npm run format
   npm run check
   ```
* Iniciar servidor web (Express en memoria):
   ```bash
   npm start
   ```

## 4. Estructura y arquitectura de persistencia

### Mapa de archivos

```bash
tp-07-salas-mongodb/
├── src/
│   ├── config/
│   │   ├── base-datos.js      # Conexión Mongoose y configuración DNS
│   │   └── entorno.js         # Lector y validador de PORT, NODE_ENV y MONGODB_URI
│   ├── modelos/
│   │   └── reserva.js         # Esquema y modelo Mongoose de Reserva
│   ├── controladores/         # Controladores HTTP del TP 06 (en memoria)
│   ├── rutas/                 # Enrutadores HTTP del TP 06
│   ├── servicios/             # Repositorio en memoria del TP 06
│   ├── vistas/                # Plantillas EJS
│   ├── app.js
│   └── index.js
├── scripts/
│   ├── comprobar-conexion.js  # Diagnóstico y verificación de conexión
│   ├── crear-reserva.js       # Script de terminal para creación de reservas
│   ├── listar-reservas.js     # Script de terminal para consulta de reservas
│   └── validar-reserva.js     # Script de terminal para validar una reserva
├── .env.example
├── .gitignore
├── eslint.config.js
├── package.json
└── README.md
```

### Conceptos: Esquema, Modelo y Colección

* Esquema (reservaSchema): Define la estructura del documento, las reglas de tipado, valores permitidos (enum) y validaciones a nivel de aplicación dentro de Mongoose.   

* Modelo (Reserva): Función constructora/interfaz compilada a partir del esquema que proporciona la API para interactuar con la base de datos (find, create, etc.).   

* Colección (reservas): Conjunto físico de documentos almacenados dentro de MongoDB. Se vinculó explícitamente mediante { collection: "reservas" } para asegurar el uso exacto del nombre en español. 

### Consideraciones sobre el _id y ejecuciones repetidas
 * Confirmación de escritura: Instanciar un documento en memoria le asigna un ObjectId preliminar, pero no demuestra persistencia física en el servidor. La escritura solo queda comprobada cuando la promesa de Reserva.create() se resuelve con éxito y confirma el _id devuelto por el motor de base de datos.   
 
 * Ejecuciones múltiples: Debido a que en esta etapa no se han implementado restricciones de unicidad ni índices únicos sobre los campos, ejecutar crear-reserva.js de forma sucesiva generará documentos separados con identificadores _id distintos, aun conteniendo los mismos datos de sala, turno y estudiante.

## 5. Modelo de dominio y reglas de validación

| Campo | Tipo en este TP | Regla mínima |
| :--- | :--- | :--- |
| `estudiante` | String | Obligatorio y sin espacios en extremos (`trim: true`) |
| `email` | String | Obligatorio, `trim: true` y presencia de `@` (`match: /@/`) |
| `sala` | String | Obligatorio, `trim: true`, valores permitidos: `"Sala Norte"`, `"Sala Sur"`, `"Sala Multimedia"` (`enum`) |
| `fecha` | String | Obligatorio y no vacío tras `trim: true` |
| `turno` | String | Obligatorio, `trim: true`, valores permitidos: `"Mañana"`, `"Tarde"`, `"Noche"` (`enum`) |
| `personas` | Number | Obligatorio, entero (`validate: Number.isInteger`) entre 1 y 6 (`min: 1`, `max: 6`) |

### Límites no contemplados en esta fase
El modelo se restringe intencionalmente al alcance inicial de la unidad:   No se validan solapamientos de reservas en un mismo turno y sala.   No se verifica que la fecha sea estrictamente futura.   No se controla cupo compartido de capacidad.   No se implementa validación estricta de formato RFC de correo electrónico. 

## 6. Evidencia de persistencia entre procesos
Para demostrar la persistencia en MongoDB Atlas a través de procesos aislados de Node.js, se ejecutó la siguiente secuencia:

1. Consulta inicial (listar-reservas.js):
   * Proceso de Node.js finalizado con éxito.   
   * Cantidad inicial de reservas recuperadas: $N$. 

2. Creación de documento (crear-reserva.js):
   * Escritura confirmada por el servidor Atlas[cite: 3].
   * Identificador generado devuelto: _id: <6ad6db1167fb0e126683c6d1>.
   * Proceso de Node.js finalizado.

3. Consulta posterior en un nuevo proceso de Node.js (listar-reservas.js):
   * Comprobación de recuperación del documento recién creado con el mismo identificador _id.   
   * Cantidad recuperada: $N + 1$. 

4. Segunda consulta de confirmación (listar-reservas.js):
   * Comprobación de idempotencia en lectura: sin escrituras adicionales, la cantidad permanece constante en $N + 1$ 

## 7. Matriz mínima de pruebas

| Caso | Resultado esperado | Resultado observado | Cantidad antes | Cantidad después |
| :--- | :--- | :--- | :-: | :-: |
| Conexión válida | Confirmación y proceso terminado en código 0 | Conexión con MongoDB establecida. Proceso finalizado sin errores. | 0 | 0 |
| Fallo DNS, si ocurrió | Registrar código/operación y solución autorizada; repetir conexión | Se capturó error con syscall `querySrv` al bloquear resolución; se verificó fallback con resolutores `8.8.8.8` y `1.1.1.1`. | 0 | 0 |
| Variable vacía | Fallo de configuración; sin mensaje de éxito | `Error: Falta MONGODB_URI en el entorno.` Proceso terminado con salida 1 sin conectar. | 0 | 0 |
| Contraseña incorrecta temporal en el env privado | Fallo de autenticación; sin crear documentos | `MongoServerError: bad auth : authentication failed`. Proceso finalizado con error sin exponer credenciales. | 0 | 0 |
| Colección vacía, si se dispone de una base nueva | Listado de cantidad 0, sin error | Tabla vacía en consola, mensaje `Total de reservas: 0`. Proceso finalizado en 0. | 0 | 0 |
| Reserva válida | Se guarda y devuelve `_id` | Documento insertado con éxito. Se imprime `Reserva guardada. _id: 67167a5b1c9...` | 0 | 1 |
| Consulta desde proceso nuevo | Recupera ese `_id` | Se lista en tabla el documento con el mismo `_id` creado en el paso anterior. `Total de reservas: 1`. | 1 | 1 |
| Segunda consulta | No agrega registros | Lectura idempotente. Muestra el mismo registro y `Total de reservas: 1`. | 1 | 1 |
| Estudiante vacío | Rechazo, cantidad sin cambios | `ValidationError: Path 'estudiante' is required.` Campos a revisar: estudiante. Cantidad sin cambios. | 1 | 1 |
| Email sin @ | Rechazo, cantidad sin cambios | `ValidationError: Path 'email' is invalid (match: /@/).` Campos a revisar: email. Cantidad sin cambios. | 1 | 1 |
| Sala o turno no permitido | Rechazo, cantidad sin cambios | `ValidationError: '...' is not a valid enum value for path 'sala' / 'turno'.` Cantidad sin cambios. | 1 | 1 |
| Fecha vacía | Rechazo, cantidad sin cambios | `ValidationError: Path 'fecha' is required.` Campos a revisar: fecha. Cantidad sin cambios. | 1 | 1 |
| Personas 0, 7 y 2.5, en pruebas separadas | Rechazo, cantidad sin cambios | Para 0 y 7: `min`/`max` excedido. Para 2.5: `debe ser un número entero`. Cantidad sin cambios. | 1 | 1 |
| Personas con texto no numérico | Rechazo de conversión, sin escritura | `CastError: Cast to Number failed for value "cuatro" at path "personas"`. Sin escritura. | 1 | 1 |

## 8. Continuidad del servicio HTTP y siguientes pasos

1. Estado de la aplicación Express:
   * La aplicación web (src/index.js, src/app.js) continúa funcionando de forma intacta respecto al TP 06.
   * Los controladores y servicios web siguen operando en memoria para el almacenamiento y consulta de reservas desde el navegador.
   * La configuración general fue trasladada a src/config/entorno.js, permitiendo arrancar el servidor web de forma desacoplada de la base de datos (no se exige MONGODB_URI para levantar la aplicación HTTP).
   
2. Verificación de rutas: Se corroboró la operatividad de /, /estado, el listado de salas, la creación en memoria con redirección, respuestas 400 ante entradas inválidas, estilos CSS y vista de error 404.   

3. Alcance futuro (Unidad 8): La integración completa de Mongoose en los servicios web, el refactor de controladores para gestionar operaciones asíncronas con promesas/async-await y la persistencia de las reservas cargadas desde formularios web serán abordadas en la siguiente unidad.

## 9. Seguridad y privacidad
Se deja constancia explícita de que este repositorio no contiene archivos .env, claves de acceso, cadenas privadas de conexión a MongoDB Atlas ni datos personales reales de usuarios. Toda la configuración de entorno requerida se encuentra documentada a través de marcadores en .env.example.


![Evidencia en MongoDB Atlas](assets/captura-atlas.png)