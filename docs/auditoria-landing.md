# Auditoría de landing — CelLab Tuxtla

Fecha: 20 de junio de 2026
Alcance: experiencia pública, conversión, accesibilidad, contenido, SEO técnico y preparación funcional.

## Resumen

La landing ya tiene una dirección visual propia, buena jerarquía, lenguaje directo y rutas claras hacia WhatsApp. En esta iteración se unificaron el monograma, favicon, selector de marcas y footer. El build de producción pasa correctamente.

Antes de publicar el rastreador o escalar campañas, hay cuatro asuntos prioritarios: conectar datos reales de reparación de forma segura, unificar la política de garantía, calcular el horario abierto/cerrado y sustituir casos de éxito simulados por evidencia verificable.

## Hallazgos prioritarios

### P1 — Resolver antes de producción

1. **Rastreador con datos simulados y folios predecibles**
   - RepairTracker consulta MOCK_ORDERS en el navegador y muestra ejemplos públicos.
   - Un endpoint real que acepte sólo folios como REP-0001 podría exponer modelo, falla, fecha y notas mediante enumeración.
   - Recomendación: endpoint dedicado, token opaco o folio + últimos 4 dígitos del teléfono, rate limiting, respuestas indistinguibles para folios inexistentes y reducción de datos mostrados.

2. **Garantía contradictoria**
   - La sección visual comunica “30—90 días”.
   - FAQ y chatbot mencionan 7, 15 y 30 días.
   - Recomendación: definir una matriz oficial por servicio/refacción y consumirla desde una sola fuente.

3. **Estado de apertura fijo**
   - El hero afirma “HOY Abierto” sin considerar día, hora, festivos o zona horaria.
   - Recomendación: calcular estado en America/Mexico_City, mostrar “Abierto hasta…” / “Cerrado · abre…” y permitir excepciones administrables.

4. **Casos de éxito sin evidencia**
   - Los casos tienen detalles específicos pero no fotografías, folios anonimizados ni confirmación de que sean reales.
   - Recomendación: publicar sólo trabajos autorizados, con imagen antes/después optimizada, fecha aproximada y aviso de que cada diagnóstico varía.

### P2 — Siguiente sprint

5. **Chatbot: accesibilidad y ciclo de vida**
   - Falta devolver foco al botón, cerrar con Escape y manejar foco dentro del diálogo.
   - Los temporizadores no se cancelan al cerrar/desmontar y pueden producir mensajes tardíos.
   - Los emojis del asistente no siguen el nuevo lenguaje visual.

6. **FAQ con patrón de tabs incompleto**
   - Faltan navegación con flechas, asociación estable tab/panel y foco roving.
   - Alternativa recomendada: filtros con aria-pressed, como el nuevo selector de marcas.

7. **Datos comerciales duplicados**
   - Teléfono, horario, garantías, marcas y textos viven en varios archivos.
   - getPublicInfo() existe, pero la landing no lo consume.
   - Recomendación: crear BusinessConfig compartido y servirlo desde /api/public.

8. **Dos acciones flotantes compiten**
   - WhatsApp y CelBot ocupan la misma esquina y agregan carga visual, especialmente en móvil.
   - Recomendación: mantener un solo disparador; WhatsApp debe aparecer como desenlace dentro de CelBot o como acción contextual.

9. **SEO local incompleto**
   - Faltan URL canónica, og:image, og:url y JSON-LD LocalBusiness.
   - Agregar también coordenadas, horario, teléfono y zona atendida cuando estén confirmados.

10. **Medición de conversión ausente**
    - No hay eventos para clics en WhatsApp, llamadas, marcas seleccionadas, búsquedas de folio o aperturas de CelBot.
    - Recomendación: definir eventos sin datos personales y medir embudo por intención.

### P3 — Mejora continua

11. Cerrar menú móvil con Escape/clic exterior y bloquear scroll mientras está abierto.
12. Añadir pruebas de interacción para selector de marcas, FAQ, rastreador y chatbot.
13. Autoalojar fuentes o definir una estrategia de fallback para conexión lenta.
14. Añadir estados de error/carga para mapa y datos públicos.
15. Revisar contraste y layout con captura real en 360, 768, 1024 y 1440 px.

## Cambios completados en esta iteración

- Monograma SVG simplificado y legible en tamaños pequeños.
- Favicon y theme-color alineados con la identidad actual.
- Selector interactivo de marcas sin emojis, con líneas atendidas, servicios frecuentes y CTA contextual.
- Sección de casos reorganizada y sin estilos inline.
- Footer con CTA final, contacto, horario, ubicación, navegación y regreso al inicio.
- Estados responsive para móvil, tablet y desktop.
- Semántica de botones y región dinámica del selector.
- Build TypeScript/Vite aprobado.

## Orden recomendado de implementación

1. Seguridad y API real del rastreador.
2. Fuente única de datos comerciales y garantías.
3. Horario dinámico y contenido real de casos.
4. Accesibilidad de chatbot/FAQ y consolidación de FAB.
5. SEO local, analítica y pruebas end-to-end.