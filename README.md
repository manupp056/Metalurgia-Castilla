# Metalurgia Castilla — Mantenimiento Predictivo con AWS

Proyecto de formación **AWS re/Start**: diseño de una arquitectura de mantenimiento predictivo sobre AWS para una planta industrial ficticia (Metalurgia Castilla, Burgos, 40 máquinas).

🔗 **Sitio publicado:** https://manupp056.github.io/Metalurgia-Castilla

Esta web es el documento de presentación ampliado del proyecto, complementario a las diapositivas (`.pptx`). Desarrolla con más detalle el problema de negocio, el plan de mantenimiento, la arquitectura AWS y la seguridad/costes, y añade un dashboard de ejemplo con datos ficticios.

## Contenido

| Sección | Qué incluye |
|---|---|
| **Inicio / Resumen** | El problema de partida de Metalurgia Castilla y sus consecuencias |
| **Plan de mantenimiento** | Modelo predictivo/preventivo/correctivo, clasificación de las 40 máquinas, umbrales por máquina, flujo de trabajo, roles y KPIs |
| **Arquitectura AWS** | Las 3 zonas de red — Red OT, VPC de Gestión y VPC de Aplicaciones Corporativas — con diagrama y explicación de cada elemento (qué hace, por qué está ahí, con qué se conecta) |
| **Seguridad y costes** | Qué requisito de negocio resuelve cada medida: X.509, TLS, IAM, KMS, VPC Peering, CloudWatch, Backup, Budgets |
| **Dashboard de ejemplo** | Simulación visual del resultado final del proyecto con datos ficticios (estado de las máquinas, KPIs, alarmas) |

## Arquitectura de 3 zonas

- **Red OT** (planta, Burgos) — 40 máquinas + sensores, Edge Gateway, Customer Gateway.
- **VPC de Gestión** (`10.20.0.0/16`) — pipeline de ingesta: AWS IoT Core, Lambda, S3, Glue.
- **VPC de Aplicaciones Corporativas** (`10.30.0.0/16`) — Athena, QuickSight, SNS, conectada a la VPC de Gestión mediante **VPC Peering**.

Diagrama interactivo completo con iconos oficiales de AWS: [Lucidchart ↗](https://lucid.app/lucidchart/b6a10df7-4e6a-4042-a367-513059aa089e/view)

## Stack

HTML, CSS y JavaScript vanilla — sin build ni dependencias, listo para GitHub Pages. Los gráficos del dashboard usan [Chart.js](https://www.chartjs.org/) vía CDN. Los iconos de la arquitectura son los oficiales de AWS ([`assets/icons/`](assets/icons)).

## Ejecutar en local

```bash
python -m http.server 3000
```

y abrir `http://localhost:3000`.

## Estructura

```
web/
├── index.html
├── style.css
├── app.js
├── assets/icons/        ← iconos oficiales AWS (SVG)
├── assets/icons-png/     ← mismos iconos en PNG (usados también en el .pptx)
└── CONTENT_SOURCE_OF_TRUTH.md   ← dataset canónico compartido con las diapositivas
```

---
Proyecto de formación AWS re/Start.
