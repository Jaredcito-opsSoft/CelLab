# LocalPOS Piloto — Checklist comercial honesto

Fecha de revisión: 22 de julio de 2026

Corte verificable: rama `main`, commit `abca46e`

## Posicionamiento

**LocalPOS Piloto** es un POS web simple y modular para negocios locales que desean ordenar ventas, caja, inventario básico y reportes operativos sin adoptar un sistema empresarial complejo.

CelLab Tuxtla es el negocio piloto y puede activar módulos especializados de reparaciones, rastreo y piezas. La oferta base para otros giros debe mantener esos módulos apagados.

### Pitch de 15 segundos

> LocalPOS ayuda a registrar ventas, controlar la caja y saber qué productos hay, desde un panel sencillo para la operación diaria.

### Pitch de 30 segundos

> LocalPOS Piloto reemplaza parte del control en libreta o Excel con venta rápida, caja operativa, inventario básico y reportes simples. Se configura para un negocio y permite activar solo algunos módulos opcionales, con acompañamiento durante la prueba.

### Mensaje obligatorio de piloto

> Esta es una versión piloto acompañada. No incluye facturación, contabilidad, multiempresa, pagos mixtos, devoluciones parciales, apartados ni operación multi-register.

## 1. Confirmado en `main`

Paquete base:

- Login y usuarios con roles.
- Permisos aplicados en backend.
- CRUD administrativo de usuarios.
- Auditoría inicial de acciones sensibles.
- Venta rápida.
- Un método de pago por venta: efectivo, transferencia o tarjeta.
- Folio, historial, detalle y ticket imprimible.
- Cancelación total según permisos autorizados.
- Productos con SKU, costo, precio, stock y mínimo.
- Clientes.
- Caja operativa: apertura, movimientos, esperado, contado, diferencia y cierre.
- Kardex y movimientos básicos de inventario.
- Reportes simples.
- Configuración del negocio.
- Módulos activables y ocultamiento de funciones no necesarias.

## 2. Validado con smokes/build

- `smoke:permissions` aprobado en la evidencia del hito.
- `smoke:modules` aprobado en la evidencia del hito.
- `smoke:purchases` aprobado en la evidencia del hito.
- Typecheck web/API/general aprobado al cierre de los hitos mergeados.
- Build de producción aprobado al cierre de los hitos mergeados.
- Smoke visual documentado de módulos y configuración.

Estos resultados validan el alcance indicado; no validan funciones pertenecientes a Hitos 13, 14 o 15.

## 3. Piloto recomendado

### Alcance comercial

- Un negocio y una configuración.
- Operación sencilla de caja.
- Catálogo inicial acotado.
- Usuarios nominales con roles definidos.
- Configuración inicial.
- Capacitación breve.
- Soporte cercano durante el periodo acordado.
- Revisión periódica de incidencias y feedback.
- Sin desarrollos a medida incluidos, salvo correcciones críticas acordadas.

### Perfil de prospecto

- Una sola ubicación.
- Inventario simple.
- Sin lotes ni caducidades.
- Sin dependencia inmediata de CFDI integrado.
- Operación actual en libreta, notas o Excel.
- Propietario disponible para observar resultados.
- Disposición a registrar ventas y cerrar caja diariamente.

### Módulos base visibles

- Resumen.
- Ventas.
- Historial de ventas.
- Caja.
- Clientes.
- Inventario.
- Movimientos.
- Reportes simples.
- Configuración.

## 4. Opcional activable

| Módulo | Cuándo ofrecerlo | Límite comercial |
| --- | --- | --- |
| Reparaciones | Talleres y CelLab | Sin fotos, firmas o garantías `GAR-*` |
| Rastreo público | Taller con reparaciones activas | Solo información pública limitada |
| Piezas de reparación | Taller que consume refacciones | Flujo ligado a reparación |
| Proveedores | Negocio que necesita directorio | Sin cuentas por pagar |
| Compras | Negocio que formaliza recepción de mercancía | Sin pagos a proveedor; no afecta caja |

## 5. Parcial / no vender como completo

- La auditoría es inicial, no un sistema de cumplimiento o seguridad empresarial.
- La caja es operativa y simple; no es multi-register.
- Los reportes son básicos; no son gerenciales, contables ni fiscales.
- La garantía dentro de una reparación es básica; no es un flujo profesional de reclamos.
- La interfaz es web adaptable; no es una aplicación móvil nativa.
- La modularidad permite activar funciones; no significa multiempresa ni presets completos por giro.
- Compras recibe mercancía y actualiza stock/costo; no administra deuda ni pagos.
- El build de producción existe; la infraestructura productiva debe prepararse y verificarse por separado.

## 6. Roadmap post-piloto

Mover a una fase posterior, sujeto a validación y prioridad comercial:

- Hito 13: inventario avanzado, categorías, códigos de barras y compatibilidades.
- Hito 14: pagos mixtos, devoluciones parciales y apartados.
- Hito 15: garantías profesionales con folio `GAR-*`.
- Cajas físicas y sesiones por terminal.
- Pruebas de 3–10 cajas y optimización de concurrencia.
- Reportes gerenciales y exportaciones avanzadas.
- Presets por tipo de negocio.
- CI ampliado, Docker, healthchecks y observabilidad.
- Backups automatizados y restore drill.

No mostrar estas funciones en una propuesta como “incluidas” hasta que estén integradas en `main` y tengan validación específica.

## 7. No incluido

- Pago mixto.
- Devoluciones parciales.
- Apartados.
- Garantías profesionales `GAR-*`.
- Multi-register o catálogo de cajas físicas.
- Reportes gerenciales avanzados.
- Facturación o CFDI.
- Contabilidad e impuestos.
- Multiempresa o multisucursal.
- Inventario por lote, caducidad o almacén.
- Cuentas por pagar.
- Pagos a proveedor.
- Operación offline.
- Aplicación móvil nativa.
- WhatsApp API automática.
- IA.
- CRM y campañas.
- Restaurante con mesas, cocina o comandas.

## Matriz comercial por giro

| Giro | Oferta recomendada | No prometer |
| --- | --- | --- |
| Accesorios | Base POS simple | Pagos mixtos, apartados, códigos de barras avanzados |
| Taller de celulares | Base + reparaciones, rastreo y piezas | Garantías `GAR-*`, fotografías y firma digital |
| Papelería | Base POS simple | Lotes, almacenes o multi-register |
| Ropa pequeña | Base POS simple | Matriz de variantes o apartados |
| Barbería/estética | Base + clientes e inventario simple | Agenda, CRM o automatizaciones |
| Alimentos simples | Venta y caja con catálogo corto | Mesas, recetas, cocina o comandas |

## Checklist para preparar una demo

### Datos

- [ ] Nombre, logo y datos ficticios.
- [ ] Administrador y operador de demostración.
- [ ] Entre 8 y 15 productos.
- [ ] Existencias variadas y un producto con stock bajo.
- [ ] Dos clientes ficticios.
- [ ] Sin datos personales de otro negocio.
- [ ] Módulos no relevantes apagados.

### Recorrido principal de 5–8 minutos

- [ ] Iniciar sesión.
- [ ] Mostrar resumen.
- [ ] Abrir caja.
- [ ] Buscar y agregar productos.
- [ ] Registrar una venta con un método de pago.
- [ ] Mostrar ticket e historial.
- [ ] Ver el movimiento y nuevo stock.
- [ ] Consultar reporte simple.
- [ ] Cerrar caja y explicar la diferencia.

### Recorrido opcional de CelLab/taller

- [ ] Crear o elegir cliente.
- [ ] Recibir equipo y generar `REP-*`.
- [ ] Cambiar estado o agregar diagnóstico.
- [ ] Agregar una pieza si el módulo está activo.
- [ ] Mostrar nota y rastreo público limitado.

### Control técnico previo

- [ ] Migraciones aplicadas al entorno correcto.
- [ ] `npm run typecheck` aprobado.
- [ ] `npm run build` aprobado.
- [ ] Smokes de permisos y módulos aprobados.
- [ ] `smoke:purchases` aprobado si compras estará activo.
- [ ] Impresión probada.
- [ ] Procedimiento de respaldo definido y probado por el responsable.
- [ ] Sin datos o secretos de otro negocio.

## Preguntas para validar el piloto

### Antes

1. ¿Cómo registra ventas hoy?
2. ¿Cómo calcula el efectivo esperado?
3. ¿Cómo identifica faltantes de inventario?
4. ¿Quién puede cambiar precios, stock o caja?
5. ¿Qué reporte básico necesita al final del día?
6. ¿Depende de facturación integrada?

### Después de la primera semana

1. ¿El operador pudo vender sin ayuda?
2. ¿La apertura y el cierre de caja fueron entendibles?
3. ¿El stock resultó más confiable?
4. ¿Qué pantalla generó dudas?
5. ¿Qué función incluida no utilizó?
6. ¿Qué tarea se volvió más rápida?
7. ¿Pagaría por continuar con este alcance?

## Criterios de éxito

El piloto es prometedor si:

- la mayoría de ventas se registra en LocalPOS;
- no aparecen folios duplicados o pérdidas de operación;
- los operadores pueden completar una venta después de la capacitación;
- la caja se abre y cierra con disciplina;
- las diferencias pueden investigarse con movimientos;
- el dueño consulta los reportes simples;
- el soporte disminuye después de los primeros días;
- el negocio reconoce una mejora concreta y disposición a pagar.

## Cierre comercial

La primera oferta debe vender una mejora verificable:

> **ordenar ventas, caja, inventario básico y reportes simples.**

No presentar LocalPOS como un sistema completo. Los módulos opcionales se activan solo cuando el negocio realmente los necesita y las funciones de roadmap se cotizan o planifican únicamente después de estar integradas y validadas.
