# Arquitectura

CelLab Tuxtla se construye como monorepo modular con dos aplicaciones independientes:

- `apps/web`: React, Vite y TypeScript para la web pública y el panel privado.
- `apps/api`: Node.js, Express y TypeScript para autenticación, validaciones, reglas de negocio y persistencia.

La API es la única capa autorizada para modificar datos críticos. La clave `SUPABASE_SERVICE_ROLE_KEY` nunca debe llegar al navegador.

## Dominios

Los módulos iniciales son autenticación, clientes, inventario, reparaciones, ventas, garantías y documentos. Cada dominio crecerá de forma aislada y compartirá únicamente validadores, errores y utilidades transversales.

## Decisiones de la primera parte

- Node.js 20+ y TypeScript estricto.
- Express para una API conocida y suficiente para el MVP.
- Zod para validar configuración y, después, cuerpos de solicitudes.
- PostgreSQL/Supabase como persistencia prevista.
- Web pública sin acceso directo a tablas operativas.

