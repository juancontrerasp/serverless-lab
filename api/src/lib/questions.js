// Banco de preguntas del laboratorio.
// Vive en el BACKEND (la función) y no en el navegador: así el cliente nunca
// recibe la respuesta correcta y la lógica de calificación queda en el servidor.

const questions = [
  {
    id: 'q1',
    concept: 'Qué es serverless',
    text: '¿Qué significa realmente "serverless"?',
    options: [
      'Que el código se ejecuta sin ningún servidor físico',
      'Que existen servidores, pero el proveedor los gestiona y tú solo despliegas código o configuración',
      'Que la aplicación solo funciona en el navegador del usuario',
      'Que no se necesita conexión a Internet'
    ],
    answer: 1,
    explanation:
      'Siempre hay servidores. "Serverless" significa que tú no los aprovisionas, parcheas ni escalas: el proveedor (Azure) se encarga y tú te concentras en el código.'
  },
  {
    id: 'q2',
    concept: 'Pago por uso',
    text: 'En un modelo serverless de consumo, ¿cuándo pagas por el cómputo?',
    options: [
      'Pagas una tarifa fija mensual por la máquina virtual',
      'Solo cuando tu código se ejecuta (invocaciones y tiempo de ejecución)',
      'Pagas por cada usuario registrado',
      'Nunca, serverless siempre es gratis'
    ],
    answer: 1,
    explanation:
      'El modelo de consumo cobra por ejecuciones y recursos usados mientras la función corre. Si nadie la invoca, el costo de cómputo tiende a cero. (Este lab usa el plan Free de Static Web Apps, que incluye la API administrada sin costo.)'
  },
  {
    id: 'q3',
    concept: 'FaaS y triggers',
    text: '¿Qué hace que una Azure Function se ejecute?',
    options: [
      'Un trigger (disparador): una petición HTTP, un mensaje en una cola, un temporizador, etc.',
      'Se ejecuta en un bucle infinito esperando trabajo',
      'Un administrador la inicia manualmente desde el portal cada vez',
      'Se ejecuta automáticamente cada vez que alguien abre el sitio estático'
    ],
    answer: 0,
    explanation:
      'Las funciones son "event-driven": cada una tiene exactamente un trigger. En este laboratorio todas usan trigger HTTP (por eso responden en /api/...).'
  },
  {
    id: 'q4',
    concept: 'Cold start',
    text: '¿Qué es un "cold start" (arranque en frío)?',
    options: [
      'Un error que ocurre cuando la función falla',
      'La latencia extra cuando la plataforma debe crear una instancia nueva para atender una invocación',
      'Cuando la base de datos se apaga por inactividad',
      'El tiempo que tarda GitHub Actions en desplegar'
    ],
    answer: 1,
    explanation:
      'Si no hay una instancia "caliente", Azure debe asignar recursos, cargar el runtime y tu código. Esa primera invocación tarda más. En la pestaña "Laboratorio en vivo" puedes verlo con el campo coldStart.'
  },
  {
    id: 'q5',
    concept: 'Stateless',
    text: 'Guardaste un contador en una variable global de tu función. ¿Qué puede pasar?',
    options: [
      'El contador es permanente y compartido por todos los usuarios',
      'El contador se reinicia cuando la instancia se recicla y no se comparte entre instancias',
      'Azure lo guarda automáticamente en una base de datos',
      'La función no se puede desplegar con variables globales'
    ],
    answer: 1,
    explanation:
      'Las funciones deben diseñarse "stateless". La memoria de una instancia es efímera y cada instancia tiene la suya. Para persistir estado se usa un servicio externo (Table Storage, Cosmos DB, etc.).'
  },
  {
    id: 'q6',
    concept: 'Escalado automático',
    text: 'Llegan 1 000 peticiones simultáneas a tu API serverless. ¿Qué hace la plataforma?',
    options: [
      'Rechaza todas las peticiones por encima de 1',
      'Escala horizontalmente creando más instancias según la demanda (dentro de los límites del plan)',
      'Tienes que crear manualmente más máquinas virtuales',
      'Pone las peticiones en pausa hasta el día siguiente'
    ],
    answer: 1,
    explanation:
      'El escalado horizontal (scale-out) es automático. Prueba el botón "Ráfaga" en el laboratorio en vivo: puede que veas distintos instanceId atendiendo las llamadas.'
  },
  {
    id: 'q7',
    concept: 'Static Web Apps',
    text: 'En Azure Static Web Apps, ¿quién sirve los archivos HTML/CSS/JS?',
    options: [
      'Una máquina virtual que tú administras',
      'Una red de distribución global administrada por Azure; no hay servidor web que configurar',
      'El propio navegador del estudiante',
      'Una Azure Function por cada archivo'
    ],
    answer: 1,
    explanation:
      'El contenido estático se publica en infraestructura global administrada. Las peticiones a /api/* se enrutan a las funciones administradas que viven en la carpeta api/.'
  },
  {
    id: 'q8',
    concept: 'API administrada',
    text: 'En este lab, ¿por qué el frontend puede llamar a /api/answer sin configurar CORS?',
    options: [
      'Porque CORS no existe en Azure',
      'Porque Static Web Apps sirve el sitio y la API bajo el mismo dominio (mismo origen)',
      'Porque el navegador desactiva CORS para estudiantes',
      'Porque la función tiene authLevel "admin"'
    ],
    answer: 1,
    explanation:
      'Static Web Apps actúa como proxy: el sitio y /api comparten origen, así que el navegador no necesita CORS. Es una de las ventajas de la API "managed".'
  },
  {
    id: 'q9',
    concept: 'CI/CD sin SPN',
    text: 'Tu suscripción de Azure for Students no permite crear un Service Principal. ¿Cómo despliega GitHub Actions?',
    options: [
      'No es posible desplegar sin Service Principal',
      'Con el token de despliegue de la Static Web App guardado como secreto del repositorio',
      'Escribiendo tu usuario y contraseña de Azure en el YAML',
      'Subiendo los archivos manualmente por FTP'
    ],
    answer: 1,
    explanation:
      'El token de despliegue (deployment token) autoriza SOLO a publicar contenido en ESA Static Web App. No da acceso a la suscripción, por eso no requiere permisos de Entra ID. Se guarda como el secreto AZURE_STATIC_WEB_APPS_API_TOKEN.'
  },
  {
    id: 'q10',
    concept: 'Entornos de preview',
    text: '¿Qué ocurre cuando abres un Pull Request contra main en este repositorio?',
    options: [
      'Nada, solo los push a main hacen algo',
      'El pipeline ejecuta pruebas y despliega un entorno de preview con su propia URL',
      'Se borra el sitio de producción',
      'GitHub cobra el despliegue'
    ],
    answer: 1,
    explanation:
      'Static Web Apps crea un entorno de staging por Pull Request (el plan Free permite unos pocos simultáneos). Al cerrar el PR, el job "close" lo elimina.'
  }
];

module.exports = { questions };
