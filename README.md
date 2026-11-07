# Laboratorio: Serverless con Azure Static Web Apps + GitHub Actions

Sitio estático interactivo (formularios y preguntas) cuya lógica corre en **Azure Functions serverless**. Se despliega con **GitHub Actions** usando el **token de despliegue** de Static Web Apps, así que **no necesitas crear un Service Principal (SPN)**. Funciona con **Azure for Students** y **GitHub gratis**.

## Objetivos de aprendizaje

Al terminar podrás:

1. Explicar qué es serverless, FaaS y los triggers.
2. Observar en vivo el **cold start**, el comportamiento **stateless** y el **escalado** de una función.
3. Separar contenido estático (CDN) de lógica (funciones) en Azure Static Web Apps.
4. Localizar y monitorear las funciones administradas con **Application Insights**: invocaciones, duración, errores e instancias.
5. Construir un pipeline CI/CD con pruebas, despliegue a producción y **entornos de preview por Pull Request**.
6. Desplegar en Azure **sin SPN**, entendiendo por qué el token de despliegue es una credencial de alcance limitado.

## Arquitectura

```
                    ┌──────────── Azure Static Web Apps (plan Free) ────────────┐
 Navegador ──HTTPS──▶  /           → contenido estático (src/)                   │
                    │  /api/*      → Azure Functions administradas (api/)        │
                    └────────────────────────────────────────────────────────────┘
                                         ▲
 git push / PR ──▶ GitHub Actions ──▶ npm test ──▶ static-web-apps-deploy (token)
```

| Endpoint | Método | Qué enseña |
|---|---|---|
| `/api/info` | GET | Cold start, stateless (contador en memoria), escalado (`instanceId`) |
| `/api/questions` | GET | La función entrega datos **sin** las respuestas |
| `/api/answer` | POST | Lógica de negocio en el servidor (el cliente no puede hacer trampa) |
| `/api/certificate` | POST | Formulario procesado y validado en el servidor |

## Estructura del repositorio

```
.
├── .github/workflows/azure-static-web-apps.yml  # Pipeline: test → deploy → close preview
├── src/                                         # Sitio estático (app_location)
│   ├── index.html  app.js  styles.css
│   ├── config.js                                # URL base de la API (vacía en Azure)
│   └── staticwebapp.config.json                 # Runtime de la API (node:20) y rutas
├── api/                                         # Azure Functions (api_location)
│   ├── host.json  package.json
│   ├── src/functions/   info.js  questions.js  answer.js  certificate.js
│   ├── src/lib/         questions.js (banco de preguntas)  quiz.js (lógica pura)
│   └── test/quiz.test.js                        # Pruebas que corren en el pipeline
└── floci/                                       # (Anexo) El mismo lab en un simulador local de AWS
    ├── docker-compose.yml                       # Arranca Floci en localhost:4566
    └── lambda/          info.js  questions.js  answer.js  certificate.js  http.js
```

---

## Requisitos

- Cuenta de **GitHub** (gratis).
- Suscripción **Azure for Students** activa ([portal.azure.com](https://portal.azure.com)).
- Opcional para trabajar localmente: Node.js 20, [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local) y Azure CLI.

> **¿Por qué no hay SPN?** Las suscripciones de estudiante normalmente no permiten registrar aplicaciones en Microsoft Entra ID, que es lo que exige `azure/login` con un Service Principal. Static Web Apps ofrece un **token de despliegue**: solo sirve para publicar contenido en **esa** app; no puede crear, borrar ni leer otros recursos de tu suscripción.

---

## Parte 1 — Crear el repositorio

1. Crea un repositorio nuevo **vacío** en GitHub (público o privado), por ejemplo `serverless-lab`. No marques "Add a README" ni `.gitignore`.
2. Descomprime `serverless-lab.zip`; se crea la carpeta `serverless-lab/`. Ojo: contiene archivos ocultos (`.github/`, `.gitignore`) que el explorador puede no mostrar, pero están ahí.
3. Inicializa el repositorio y súbelo a la rama `main`:

   ```bash
   unzip serverless-lab.zip
   cd serverless-lab
   git init -b main
   git add .
   git commit -m "Laboratorio serverless inicial"
   git remote add origin https://github.com/<tu-usuario>/serverless-lab.git
   git push -u origin main
   ```

   El primer pipeline **fallará en el job de deploy** porque aún no existe el secreto. Es esperado: obsérvalo en la pestaña **Actions** y nota que el job `test` sí pasó.

## Parte 2 — Crear la Static Web App (portal)

1. En el portal: **Crear un recurso → Static Web App**.
2. Completa:
   - **Suscripción:** Azure for Students.
   - **Grupo de recursos:** nuevo, `rg-serverless-lab`.
   - **Nombre:** `swa-serverless-<tus-iniciales>`.
   - **Plan:** **Free**.
   - **Región:** `East US 2` (si tu suscripción la bloquea, prueba `Central US` o `West Europe`).
   - **Origen de implementación (Source):** **Other**.
3. **Revisar y crear → Crear.**

> Elegimos **Other** a propósito: así tú controlas el workflow de este repositorio y aprendes dónde vive el token. Si eliges *GitHub*, Azure crea su propio workflow y secreto (también sin SPN); en ese caso borra uno de los dos workflows para no desplegar dos veces.

### Alternativa con Azure CLI (opcional)

```bash
az login
az group create -n rg-serverless-lab -l eastus2
az staticwebapp create -n swa-serverless-abc -g rg-serverless-lab -l eastus2 --sku Free
az staticwebapp secrets list -n swa-serverless-abc -g rg-serverless-lab --query "properties.apiKey" -o tsv
```

## Parte 3 — Conectar GitHub con el token de despliegue

1. En la Static Web App: **Información general → Administrar token de implementación** (*Manage deployment token*) → **Copiar**.
2. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
   - **Name:** `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - **Secret:** pega el token.

   Con GitHub CLI: `gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN` (te pedirá pegarlo).
3. En **Actions**, abre la última ejecución fallida → **Re-run all jobs** (o haz un commit nuevo).
4. Cuando termine, abre la **URL** que aparece en *Información general* de la Static Web App.

✅ **Checkpoint:** el sitio carga y el indicador superior dice *"API en línea · instancia …"*.

## Parte 4 — Recorre el sitio

Haz las 5 pestañas en orden: **Conceptos → Laboratorio en vivo → Preguntas → Pipeline → Certificado**. El certificado se emite si tienes ≥ 70 % y su código lo genera la función.

## Parte 5 — Experimentos guiados

| # | Experimento | Qué observar | Concepto |
|---|---|---|---|
| 1 | Deja el sitio sin uso ~20 min y pulsa **Invocar /api/info** | `coldStart: true` y mayor latencia en la 1.ª llamada | Cold start |
| 2 | Anota `invocationsOnThisInstance`, haz un commit cualquiera y vuelve a invocar | El contador vuelve a 1 | Stateless |
| 3 | Pulsa **Ráfaga** varias veces | Número de `instanceId` distintos | Escalado |
| 4 | Abre DevTools → Network y responde una pregunta | La respuesta correcta **no** está en `/api/questions` | Lógica en el servidor |

## Parte 6 — Ver las funciones con Application Insights

Si buscas un recurso *Function App* en el portal, no lo encontrarás. Las funciones de este laboratorio son **administradas**: viven dentro de la Static Web App y Azure opera la infraestructura que las ejecuta. Para verlas se activa **Application Insights**, que registra cada invocación de cada función.

1. En la Static Web App abre el menú **Application Insights**, marca **Sí** en *Habilitar Application Insights* y pulsa **Guardar**. Se crea un recurso de Application Insights en el mismo grupo de recursos.
2. Genera tráfico: recorre el sitio, responde preguntas y pulsa **Ráfaga** varias veces. Los datos tardan unos minutos en aparecer.
3. Provoca un error controlado:

   ```bash
   curl -X POST https://<tu-app>.azurestaticapps.net/api/answer -H "Content-Type: application/json" -d '{"id":"q1","choice":9}'
   ```

4. Desde *Información general* abre el grupo de recursos y luego el recurso de Application Insights con el nombre de tu Static Web App.
5. **Investigar → Rendimiento**: cada operación corresponde a una función (`info`, `questions`, `answer`, `certificate`) con sus invocaciones y duración.
6. **Investigar → Errores**: localiza la petición con código **400** del paso 3.
7. **Supervisión → Registros**: ejecuta estas consultas KQL, una a la vez:

   ```kusto
   // Invocaciones y duración promedio por función
   requests
   | where timestamp > ago(1h)
   | summarize invocaciones = count(), duracion_ms = avg(duration) by name

   // Instancias que atendieron /api/info (escalado)
   requests
   | where name == "info"
   | summarize invocaciones = count() by cloud_RoleInstance

   // Mensajes de context.log escritos por info.js
   traces
   | where message startswith "Instancia"
   | project timestamp, message
   | order by timestamp desc
   ```

`cloud_RoleInstance` identifica la instancia que ejecutó la función. Compárala con los `instanceId` de la Ráfaga: son dos formas de ver el mismo escalado.

> Application Insights se factura aparte de Static Web Apps según los datos que recibe; con el tráfico de este laboratorio el costo es mínimo.

## Parte 7 — Pipeline: pruebas y entornos de preview

1. Crea una rama y agrega una pregunta en `api/src/lib/questions.js` (copia una existente y cambia `id`, `text`, `options`, `answer`, `explanation`).
2. Abre un **Pull Request** contra `main`.
3. Observa:
   - El job `test` corre primero; el deploy espera (`needs: test`).
   - La acción comenta en el PR una **URL de preview** distinta de producción.
4. **Rompe el pipeline a propósito:** pon `answer: 9` en tu pregunta y haz push. El test *"cada pregunta tiene id único y una respuesta válida"* falla y **nada se despliega**. Corrígelo.
5. Haz **merge** del PR: producción se actualiza y el job `close_pull_request_job` elimina el entorno de preview.

## Parte 8 — Retos (elige al menos dos)

1. **Nueva función:** crea `api/src/functions/hello.js` que responda `GET /api/hello?name=Ana` con un saludo, y un botón en el sitio que la llame.
2. **Rotación de credenciales:** en el portal, **Restablecer** el token de despliegue. ¿Qué pasa con el siguiente pipeline? Actualiza el secreto. ¿Por qué rotar es buena práctica?
3. **Variables de entorno:** agrega en *Configuración → Variables de entorno* de la SWA una variable `LAB_MENSAJE` y devuélvela desde `/api/info` con `process.env.LAB_MENSAJE`. ¿Por qué no se pone en el código?
4. **Persistencia (avanzado):** guarda los certificados emitidos en Azure Table Storage usando `@azure/data-tables` y una cadena de conexión en las variables de entorno. Explica por qué la variable global de `info.js` **no** sirve para esto.
5. **Seguridad:** con `staticwebapp.config.json`, protege `/api/certificate` para que solo usuarios autenticados (GitHub) puedan llamarla (`"allowedRoles": ["authenticated"]`).

## Desarrollo local (opcional)

```bash
cp api/local.settings.sample.json api/local.settings.json
cd api && npm install && npm test && cd ..
npx @azure/static-web-apps-cli start src --api-location api
```

Abre <http://localhost:4280>. El SWA CLI emula el proxy `/api` y arranca las funciones con Core Tools.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `RequestDisallowedByPolicy` al crear | La región no está permitida para estudiantes | Usa otra región (East US 2, Central US, West Europe) |
| `The subscription is not registered to use namespace 'Microsoft.Web'` | Proveedor no registrado | Suscripción → Proveedores de recursos → registrar `Microsoft.Web` |
| Deploy: *"No matching Static Web App was found or the api key was invalid"* | Secreto vacío, mal nombrado o token rotado | Revisa el nombre exacto `AZURE_STATIC_WEB_APPS_API_TOKEN` y vuelve a copiar el token |
| El sitio carga pero dice *"La API no respondió"* | `api_location` incorrecto o error al arrancar la función | Revisa el log del paso *Build y deploy*; confirma `api_location: api` |
| PR desde un *fork* no despliega preview | GitHub no comparte secretos con forks | Esperado; trabaja con ramas del mismo repositorio |
| No se crean más previews | El plan Free tiene un límite de entornos de staging | Cierra PRs antiguos o borra entornos en *Entornos* |
| Application Insights no muestra datos | Los datos tardan unos minutos, o no ha habido invocaciones desde que se activó | Espera 3 a 5 minutos y genera tráfico; si sigue vacío, haz un commit para redesplegar |

## Preguntas de discusión

1. ¿Por qué no existe un recurso *Function App* en tu suscripción? ¿Quién administra las instancias que ves en Application Insights?
2. ¿Qué parte de este sistema **no** es serverless? (Pista: ¿quién compila el código?)
3. Las funciones administradas de Static Web Apps solo admiten triggers **HTTP**. ¿Qué harías si necesitas un trigger de temporizador o de cola?
4. ¿Qué riesgos tiene calificar el quiz solo en el navegador (como la autoevaluación de la pestaña 4)?
5. ¿Qué ventajas y límites tiene el token de despliegue frente a un Service Principal u OIDC?
6. ¿Cuándo **no** elegirías serverless? (cargas de larga duración, latencia estricta, estado en memoria…)

## Limpieza

Para no dejar recursos creados:

```bash
az group delete -n rg-serverless-lab
```

o en el portal: **Grupos de recursos → rg-serverless-lab → Eliminar grupo de recursos**. Esto borra también el recurso de Application Insights. Si al activarlo se creó un grupo `DefaultResourceGroup-…` con un área de trabajo de Log Analytics, revisa su contenido y elimínalo solo si pertenece a este laboratorio.

---

## Anexo — El mismo laboratorio en un simulador local de AWS (Floci)

Hasta aquí todo corrió en Azure. Este anexo muestra que también existen **simuladores** que reproducen una nube en tu computador. Sirven para practicar y probar sin cuenta, sin costo y sin conexión a la nube.

[Floci](https://github.com/floci-io/floci) es un emulador **local** de AWS, gratuito y de código abierto (licencia MIT). Corre en Docker y responde en `http://localhost:4566` a la misma API que AWS. Vas a desplegar **a mano**, con la AWS CLI, el mismo sitio y la misma lógica (`api/src/lib/`) usando los servicios serverless de AWS.

### Equivalencias Azure ↔ AWS

| Concepto | En Azure (Partes 1–8) | En AWS / Floci (este anexo) |
|---|---|---|
| Función (FaaS) | Azure Functions (`api/src/functions/`) | AWS Lambda (`floci/lambda/`) |
| Trigger HTTP | `app.http(...)` en el código | Ruta de **API Gateway** (HTTP API) → Lambda |
| Hosting estático | Static Web Apps | **S3** con *website hosting* |
| Mismo dominio para `/api` | Sí: SWA hace de proxy | No: S3 y API Gateway tienen URLs distintas, por eso se configura **CORS** y `src/config.js` |
| Identificador de invocación | `context.invocationId` | `context.awsRequestId` |
| Instancia | Instancia del host de Functions | Contenedor (*execution environment*) de Lambda |

Compara `api/src/functions/answer.js` con `floci/lambda/answer.js`: las dos llaman a `checkAnswer()` de `api/src/lib/quiz.js`. Solo cambia cómo se recibe la petición y cómo se devuelve la respuesta.

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) encendido. Floci ejecuta cada Lambda en un contenedor real.
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) (`aws --version` ≥ 2.13).
- Una terminal con `bash` o `zsh`, `curl` y `zip`. En Windows usa **WSL** o **Git Bash**.

Ejecuta todos los comandos desde la raíz del repositorio (`serverless-lab/`) y **en la misma terminal**, porque los pasos guardan valores en variables.

### Paso 1 — Arrancar el simulador

```bash
docker compose -f floci/docker-compose.yml up -d
curl -s --retry 15 --retry-all-errors --retry-delay 1 http://localhost:4566/_localstack/health
```

Floci tarda unos segundos en arrancar; `--retry` espera por ti. La respuesta lista los servicios simulados (`lambda`, `s3`, `apigateway`…) en estado `running`.

### Paso 2 — Apuntar la AWS CLI al simulador

```bash
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_PAGER=""
```

`AWS_ENDPOINT_URL` hace que la CLI hable con Floci en lugar de con AWS. Las credenciales pueden ser cualquier texto: el simulador no las valida.

### Paso 3 — Empaquetar las funciones

Una Lambda se despliega como un `.zip` con el código y sus dependencias. Cada paquete lleva el adaptador de AWS (`index.js` y `http.js`) y la lógica compartida (`lib/`):

```bash
for fn in info questions answer certificate; do
  rm -rf floci/.build/$fn && mkdir -p floci/.build/$fn/lib
  cp floci/lambda/$fn.js floci/.build/$fn/index.js
  cp floci/lambda/http.js floci/.build/$fn/
  cp api/src/lib/*.js floci/.build/$fn/lib/
  (cd floci/.build/$fn && zip -qr ../$fn.zip .)
done
ls floci/.build/*.zip
```

### Paso 4 — Crear las funciones Lambda

```bash
for fn in info questions answer certificate; do
  aws lambda create-function --function-name lab-$fn \
    --runtime nodejs22.x --handler index.handler \
    --role arn:aws:iam::000000000000:role/lab-lambda \
    --zip-file fileb://floci/.build/$fn.zip \
    --query FunctionArn --output text
done
```

Invoca una función **directamente**, sin HTTP. Así compruebas que el trigger es solo la forma de llegar a la función:

```bash
aws lambda invoke --function-name lab-info floci/.build/salida.json && cat floci/.build/salida.json
```

### Paso 5 — Exponer las funciones con API Gateway

Crea una HTTP API con CORS, porque el sitio vivirá en otro origen:

```bash
API_ID=$(aws apigatewayv2 create-api --name lab-api --protocol-type HTTP \
  --cors-configuration '{"AllowOrigins":["*"],"AllowMethods":["GET","POST","OPTIONS"],"AllowHeaders":["content-type"]}' \
  --query ApiId --output text)
echo $API_ID
```

Conecta cada ruta con su función. Cada conexión necesita una **integración** (API Gateway → Lambda) y una **ruta** (método + path → integración):

```bash
ruta() {
  INTEGRATION_ID=$(aws apigatewayv2 create-integration --api-id $API_ID \
    --integration-type AWS_PROXY --payload-format-version 2.0 \
    --integration-uri arn:aws:lambda:us-east-1:000000000000:function:lab-$1 \
    --query IntegrationId --output text)
  aws apigatewayv2 create-route --api-id $API_ID --route-key "$2" \
    --target integrations/$INTEGRATION_ID --query RouteKey --output text
}
ruta info "GET /api/info"
ruta questions "GET /api/questions"
ruta answer "POST /api/answer"
ruta certificate "POST /api/certificate"
```

Publica la API y pruébala:

```bash
aws apigatewayv2 create-stage --api-id $API_ID --stage-name '$default' --auto-deploy --query StageName --output text
API_URL=http://$API_ID.execute-api.localhost.floci.io:4566
curl $API_URL/api/info
```

> En AWS real también debes darle permiso a API Gateway para invocar cada función (`aws lambda add-permission`). El simulador no lo exige.

### Paso 6 — Publicar el sitio estático en S3

```bash
aws s3 mb s3://lab-sitio
aws s3api put-bucket-policy --bucket lab-sitio --policy '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::lab-sitio/*"}]}'
aws s3api put-bucket-website --bucket lab-sitio --website-configuration '{"IndexDocument":{"Suffix":"index.html"}}'
aws s3 sync src s3://lab-sitio --exclude staticwebapp.config.json --exclude config.js
```

El sitio necesita saber dónde está la API. En Azure no hacía falta porque compartían dominio:

```bash
echo "window.LAB_API_BASE = '$API_URL';" > floci/.build/config.js
aws s3 cp floci/.build/config.js s3://lab-sitio/config.js --content-type application/javascript
echo "Abre: http://lab-sitio.s3-website-us-east-1.localhost:4566/"
```

✅ **Checkpoint:** abre esa URL. El indicador dice *"API en línea · instancia …"* y puedes responder las preguntas y pedir el certificado.

También puedes ver todo lo creado en la consola web del simulador: <http://localhost:4566/_floci/ui>.

### Observa los conceptos en el simulador

| Experimento | Qué observar |
|---|---|
| Invoca `/api/info`, espera **~2 minutos** sin usar el sitio y vuelve a invocar | `coldStart: true` otra vez y más latencia. Floci destruye los contenedores inactivos (`CONTAINER_IDLE_TIMEOUT_SECONDS` en `floci/docker-compose.yml`) |
| Ejecuta `docker ps --format '{{.Names}}'` mientras usas el sitio | Un contenedor `floci-aws-lab-…` por instancia de Lambda |
| Pulsa **Ráfaga** | Varios `instanceId` distintos: escalado horizontal (el navegador abre como máximo ~6 conexiones a la vez) |
| `aws logs tail /aws/lambda/lab-info --follow` e invoca la función | Los `console.log` en CloudWatch Logs simulado |

### Para discutir

1. ¿Por qué en Azure no hizo falta CORS ni `config.js`, y en AWS sí?
2. ¿Qué código tuviste que cambiar para pasar de Azure a AWS y cuál no?
3. El simulador corre en tu computador: ¿es serverless? ¿Qué **no** puede simular (facturación, escalado real, disponibilidad)?

### Apagar el simulador

```bash
docker compose -f floci/docker-compose.yml down
```

Floci guarda todo en memoria: al apagarlo se borra lo desplegado. Si algo falla, revisa `docker logs floci`.
