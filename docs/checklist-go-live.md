# Checklist go-live — LocalPOS piloto

## Bloqueadores (todos deben estar cerrados)

- [ ] Dominio web y API con HTTPS.
- [ ] `npm run preflight:release -- --strict` sin errores.
- [ ] `npm run verify` aprobado sobre el candidato exacto.
- [ ] Migraciones aplicadas una sola vez y auditadas.
- [ ] Backup previo legible y copia fuera del equipo de despliegue.
- [ ] Restauración ensayada en una base temporal.
- [ ] `/health/live` y `/health/ready` responden 200.
- [ ] `npm run smoke:release -w @cellab/api` aprobado.
- [ ] Administrador real creado; contraseña bootstrap retirada del runtime.
- [ ] Usuarios operadores individuales; no compartir cuentas.
- [ ] Negocio, moneda, zona horaria, ticket y garantía revisados.
- [ ] Cajas físicas creadas y asignación operativa documentada.
- [ ] Impresión probada desde cada terminal y tableta.
- [ ] Venta, pago mixto, devolución parcial, apartado y corte ensayados.
- [ ] Responsable de soporte y canal de incidentes definidos.
- [ ] Piloto limitado a 1–3 cajas hasta cerrar la optimización del perfil de 10 cajas.

## Go / no-go

Es **GO** solo si no hay pérdida de datos, diferencias de caja sin explicar, errores 5xx, stock negativo, folios duplicados ni bloqueadores abiertos. Cualquier resultado incierto de cobro o venta es **NO-GO** hasta conciliarlo; nunca se reintenta a ciegas.
