# Metalurgia Castilla — Datos canónicos (pptx v3 y web deben coincidir)

## 1. Contexto y requisitos de negocio
- Empresa: Metalurgia Castilla. Planta industrial en Burgos.
- 40 máquinas industriales: Hornos (8), Prensas (10), Tornos (14), Cintas transportadoras (8).
- Situación de partida: 1 revisión manual/semana (ingeniero revisa Excel y ficheros de texto), 0 copias de seguridad (todo en un único PC de planta), 0 dashboards para dirección.
- Consecuencias: detección tardía de fallos, riesgo de pérdida total del histórico, sin datos (MTBF/MTTR/paradas) para decidir inversión.
- Región AWS: eu-south-2 (España — Aragón), por latencia con Burgos y por mantener datos en España/UE.

## 2. Plan de mantenimiento predictivo (sin cambios respecto a v2)
- Modelo combinado: Predictivo (base) + Preventivo (piezas no sensorizables, calendario) + Correctivo (último recurso).
- Clasificación de criticidad:
  | Máquina | Cantidad | Criticidad | Variable principal | Otras variables |
  |---|---|---|---|---|
  | Hornos | 8 | CRÍTICA ALTA | Temperatura | Consumo eléctrico |
  | Prensas | 10 | CRÍTICA MEDIA | Vibración | Consumo eléctrico |
  | Tornos | 14 | CRÍTICA BAJA | Vibración | Consumo eléctrico |
  | Cintas transportadoras | 8 | Soporte/preventivo | Consumo eléctrico | — |
- Umbrales en 3 niveles (Normal/Aviso/Crítico) calculados con el HISTÓRICO DE CADA máquina individual (no un valor genérico por tipo).
- Flujo de trabajo: Lectura → Evaluación → Notificación → Orden de trabajo → Registro (retroalimenta y afina umbrales).
- Roles: Ingeniero de mantenimiento (dashboard, órdenes de trabajo), Ingeniero de datos/TI (pipeline, umbrales, seguridad y costes AWS), Dirección (KPIs, decide inversión).
- KPIs del programa: MTBF, MTTR, % paradas no planificadas, alarmas críticas atendidas antes del fallo.

## 3. Arquitectura AWS — NUEVA: 3 zonas de red (reemplaza el diseño de 2 zonas de v2)

### Zona 1 — Red OT (planta, Burgos)
- CIDR: 192.168.10.0/24, aislada de IT corporativo.
- 40 máquinas + sensores (temperatura / vibración / consumo eléctrico).
- Switch industrial (OT), IP 192.168.10.2, sin salida a Internet.
- EG — Servidor Gestor Industrial (Edge Gateway), IP fija 192.168.10.10: buffer local + filtrado, sigue funcionando sin Internet, reenvía por MQTT/TLS.
- Customer Gateway: extremo VPN en el firewall/router de planta.

### Zona 2 — VPC de Gestión (10.20.0.0/16) — pipeline industrial de datos
- Subred pública (10.20.0.0/24): VPN Gateway (VGW) — termina el Site-to-Site VPN (2 túneles IPsec, IKEv2 + AES-256-GCM).
- Subred privada (10.20.10.0/24) — procesamiento:
  - AWS IoT Core: recibe y autentica cada lectura MQTT (certificado X.509 por sensor/gateway).
  - AWS Lambda: evalúa umbrales normal/aviso/crítico de cada lectura.
  - Amazon S3: data lake, histórico raw + processed.
  - AWS Glue: crawler + ETL a Parquet, alimenta el Data Catalog.
  - Servicios transversales de seguridad: AWS IAM (roles de mínimo privilegio), AWS KMS (cifrado SSE-KMS en S3), Amazon CloudWatch (vigila el pipeline), AWS Backup (copias automatizadas de S3).

### Zona 3 — VPC de Aplicaciones Corporativas (10.30.0.0/16) — NUEVA, antes no existía
- Subred privada (10.30.10.0/24) — aplicaciones:
  - Amazon Athena: consultas SQL serverless sobre S3 vía Glue Data Catalog.
  - Amazon QuickSight: dashboards para dirección e ingeniería.
  - Amazon SNS: distribuye alarmas (email + SMS) al ingeniero de mantenimiento.
- Conectada a la VPC de Gestión mediante **VPC Peering** (10.20.0.0/16 ↔ 10.30.0.0/16): tráfico privado, nunca sale a Internet.
- Por qué existe esta VPC separada (explicar a nivel estudiante, sin relleno corporativo):
  - Separa el pipeline industrial (ingesta/procesamiento) de las aplicaciones que usan las personas (dashboards, alarmas): un fallo o cambio en Athena/QuickSight no puede afectar a la recepción de lecturas de planta.
  - Cada VPC tiene su propio control de tráfico (Security Groups): aísla por red, no solo por permisos IAM — así si alguien compromete la VPC de aplicaciones, no llega directamente al pipeline de ingesta.
  - VPC Peering solo permite el tráfico estrictamente necesario (Athena leyendo S3/Glue Data Catalog), nada más.

### Flujo end-to-end
Máquinas → Switch industrial (OT) → Edge Gateway (buffer+filtrado, MQTT local) → Customer Gateway → **Site-to-Site VPN (IPsec)** → VPN Gateway (VPC Gestión) → AWS IoT Core (IoT Rule) → AWS Lambda (evalúa umbrales) → Amazon S3 (guarda lectura) + Amazon SNS si aviso/crítico (cruza por VPC Peering a VPC Aplicaciones Corporativas) → AWS Glue (crawler+ETL) → **VPC Peering** → Amazon Athena (consulta SQL vía Data Catalog) → Amazon QuickSight (dashboard).

### Diagrama interactivo
Diagrama completo con iconos oficiales AWS (Lucidchart): https://lucid.app/lucidchart/b6a10df7-4e6a-4042-a367-513059aa089e/view

## 4. Seguridad y costes — qué requisito de negocio resuelve cada uno
| Medida | Qué resuelve |
|---|---|
| Certificados X.509 por sensor/gateway (IoT Core) | Autenticación individual: se puede revocar una sola máquina sin afectar a las otras 39. |
| TLS/MQTT + VPN IPsec (IKEv2+AES-256-GCM) | Cifrado en tránsito planta↔AWS — nadie puede leer o alterar las lecturas por el camino. |
| AWS IAM (roles de mínimo privilegio) | Cada servicio (Lambda, Glue, QuickSight) solo puede hacer lo estrictamente necesario — sin credenciales compartidas. |
| AWS KMS (SSE-KMS en S3) | Cifrado en reposo del histórico — aunque alguien accediera al bucket, no podría leer los datos sin la clave. |
| VPC de Gestión / VPC de Aplicaciones Corporativas + Peering | Aislamiento por red entre ingesta y aplicaciones: reduce el radio de impacto de un fallo o brecha. |
| Amazon CloudWatch | Vigila el propio pipeline (errores de Lambda, latencia de IoT Core) — detecta problemas del sistema, no solo de las máquinas. |
| AWS Backup | Resuelve el riesgo de origen del proyecto: "si el PC de planta se rompe se pierde el histórico" — S3 + Backup lo protegen. |
| AWS Budgets | Alertas por umbral de gasto mensual — control de costes para un proyecto serverless de pago por uso. |

Costes: servicios serverless (IoT Core, Lambda, Athena, SNS) pagan por uso — tráfico de 40 sensores es irregular. S3 con ciclo de vida a Glacier tras 90 días. QuickSight por sesión de usuario (no licencia fija). AWS Backup con retención definida.

## 5. Dashboard de ejemplo — datos ficticios (SOLO para ilustrar cómo se vería, no son datos reales)
- Total: 40 máquinas — Estado: 33 Normal, 5 Aviso, 2 Crítico.
- Alarmas activas ahora mismo: 3 (2 Aviso, 1 Crítico).
- MTBF actual (simulado, últimos 30 días tras desplegar el proyecto): 690 horas.
- MTTR actual (simulado): 3.4 horas.
- % paradas no planificadas: bajó de ~18% (antes, estimado) a 6% (después, simulado).
- Alarmas críticas atendidas antes del fallo (últimos 30 días, simulado): 11 de 13 (85%).
- Por máquina (datos ficticios de ejemplo, ~6-8 filas representativas, no las 40): Horno-01 (72°C... perdón, temperatura ~655°C, Normal), Horno-03 (temperatura ~684°C, Crítico), Prensa-02 (vibración 4.1 mm/s, Aviso), Prensa-07 (vibración 2.3 mm/s, Normal), Torno-05 (vibración 5.6 mm/s, Crítico), Torno-11 (vibración 1.8 mm/s, Normal), Cinta-02 (consumo 42 kWh, Normal), Cinta-06 (consumo 58 kWh, Aviso).
- Estos números son ficticios y solo sirven para representar visualmente el resultado final del proyecto.

## 6. Coherencia pptx ↔ web
- El pptx v3 (diapositivas) contiene el resumen ejecutivo: arquitectura de 3 zonas, plan de mantenimiento, seguridad/costes — SIN el desglose de cantidades por máquina en el dashboard (eso es ampliación exclusiva de la web).
- La web amplía todo lo anterior: explica cada elemento del diagrama a nivel estudiante, añade el dashboard con datos ficticios, y no debe contradecir ninguna cifra del pptx (CIDRs, criticidades, KPIs nombrados, roles).
