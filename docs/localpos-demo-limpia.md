# Guía de demo limpia de LocalPOS

## Mensaje comercial

LocalPOS Piloto organiza ventas, caja, inventario básico y reportes operativos para un negocio local. CelLab Tuxtla es el primer negocio piloto y demuestra que el núcleo puede especializarse con módulos opcionales.

No presentar LocalPOS como multiempresa, sistema fiscal, plataforma con backups automáticos ni solución certificada para cualquier volumen.

## Preparación

- Usar únicamente PostgreSQL local `localpos_demo`.
- Ejecutar el perfil `pos` para la presentación principal.
- Mantener `pos_advanced`, `repairs`, `layaways`, `warranties`, proveedores, compras y reportes avanzados apagados.
- El cobro principal ofrece efectivo, transferencia o tarjeta; pagos mixtos y devoluciones parciales quedan reservados para la Demo C.
- Abrir el navegador en `/panel`.
- Usar `admin@demo.localpos.test` para explicar configuración o `caja@demo.localpos.test` para la venta.
- La contraseña se toma de `DEMO_PASSWORD`; es una credencial exclusivamente local.

## Demo A — POS simple

Duración objetivo: 5–8 minutos. Esta es la demo principal.

1. Iniciar sesión como `admin@demo.localpos.test` o `caja@demo.localpos.test`.
2. Mostrar el resumen del día y explicar que existe una sola venta histórica ficticia.
3. Entrar a Caja y abrir `MAIN-01` con un fondo inicial de ejemplo.
4. Ir a Venta rápida.
5. Buscar `Cable USB-C 1 m` y `Funda transparente`.
6. Agregar ambos productos y revisar cantidades y total.
7. Cobrar con un solo método. Para efectivo, capturar un monto recibido mayor al total y mostrar el cambio.
8. Confirmar la venta y abrir el ticket.
9. Mostrar historial y folio `VTA-*`.
10. Volver al inventario y confirmar la reducción de existencias.
11. Abrir Movimientos para mostrar el kardex `sale`.
12. Señalar `Mica templada Samsung A15` como stock bajo y `Bocina Bluetooth mini` como casi agotada.
13. Abrir Reportes y mostrar únicamente el reporte operativo simple.
14. Regresar a Caja, cerrar el turno con el efectivo esperado y explicar la diferencia.

### Frase de cierre

“En menos de ocho minutos vimos el ciclo que más tiempo consume en un negocio: cobrar, controlar caja, actualizar inventario y revisar el resultado del día.”

## Demo B — CelLab / taller

Duración adicional: 5–8 minutos. Antes de iniciar, preparar `DEMO_PROFILE=cellab` y ejecutar nuevamente el seed demo.

1. Aclarar que Reparaciones es un módulo opcional.
2. Iniciar sesión como administrador.
3. Abrir Reparaciones y mostrar `REP-00001`, una recepción ficticia.
4. Mostrar el cliente, equipo, falla y condición física sin IMEI real.
5. Agregar diagnóstico y avanzar solo por estados válidos.
6. Agregar una pieza del inventario, por ejemplo `Centro de carga genérico`.
7. Registrar un pago de ejemplo y explicar total, pagado y saldo.
8. Mostrar la nota imprimible de recepción o entrega.
9. Abrir `REP-00002`, ya preparada como “Lista”, y enseñar su línea de tiempo.
10. Probar el rastreo público con:
    - folio: `REP-00002`
    - teléfono ficticio: `9610000102`
11. Señalar que el rastreo no expone costos, notas internas, pagos ni datos sensibles.

## Demo C — Funciones avanzadas

Mostrar solo después de la demo principal y únicamente si el prospecto tiene esa necesidad:

- pagos mixtos;
- devoluciones parciales;
- apartados;
- cajas físicas adicionales;
- garantías `GAR-*`;
- proveedores y compras;
- reportes gerenciales.

Estas funciones no deben mezclarse con el recorrido POS de 5–8 minutos. Activarlas desde Configuración solo cuando el flujo haya sido preparado y validado para esa conversación.

## Qué no mostrar o prometer

- Multiempresa o multi-tenant.
- Facturación fiscal.
- Datos reales de CelLab.
- Supabase o infraestructura productiva.
- Capacidad sostenida de 100–500 ventas diarias sin una prueba de carga formal.
- Backups automáticos o recuperación certificada.
- Módulos apagados como si fueran parte del núcleo contratado.

## Señales de una demo correcta

- La venta se completa sin ayuda técnica.
- La caja explica claramente fondo, esperado, contado y diferencia.
- El stock baja y el movimiento queda trazable.
- El reporte simple responde cuánto se vendió y qué necesita atención.
- El sidebar no muestra módulos fuera del perfil.
- El prospecto entiende el núcleo antes de conocer funciones avanzadas.
