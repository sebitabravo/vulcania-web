# Proyecto — Vulcania

Plataforma chilena comunitaria de monitoreo del volcán Villarrica (Pucón). Next.js 16 App Router + React 19 + Tailwind/shadcn + Leaflet + Supabase (realtime, auth OTP por teléfono, RLS). Deploy en Vercel (vulcania-web.vercel.app). Escala de alerta SERNAGEOMIN (verde/amarilla/naranja/roja). Full mode preparado para Supabase; la salud del proyecto real requiere aplicar el schema y pasar los gates E2E.

## Specs

- [volcan-data-operability](./specs/volcan-data-operability/proposal.md) — Operabilidad de datos volcánicos: pipeline híbrido de alerta, zonas seguras con atribución, ficha técnica real del volcán y capa legal (consentimiento, términos, opt-in SMS).
