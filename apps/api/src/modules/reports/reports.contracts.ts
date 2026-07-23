import { z } from 'zod';

export const managerialReportQuery = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
}).superRefine((value, context) => {
  if ((value.from && !value.to) || (!value.from && value.to)) {
    context.addIssue({ code: 'custom', message: 'Envía las fechas from y to juntas.' });
    return;
  }
  if (!value.from || !value.to) return;
  const from = new Date(`${value.from}T00:00:00Z`);
  const to = new Date(`${value.to}T00:00:00Z`);
  if (from > to) context.addIssue({ code: 'custom', message: 'La fecha inicial no puede ser posterior a la final.' });
  const inclusiveDays = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (inclusiveDays > 366) context.addIssue({ code: 'custom', message: 'El rango máximo es de 366 días.' });
});
