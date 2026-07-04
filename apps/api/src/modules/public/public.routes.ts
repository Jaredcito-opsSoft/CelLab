import { and, eq, isNull } from 'drizzle-orm';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { businessSettings, clients, repairs } from '../../db/schema.js';

export const publicRouter = Router();

const trackLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
const trackInput = z.object({ folio: z.string().trim().min(5).max(24), phone: z.string().trim().min(6).max(30) });
const statusLabels: Record<string, string> = {
  received: 'Recibido', diagnosis: 'En diagnóstico', awaiting_authorization: 'Esperando autorización', in_repair: 'En reparación', testing: 'En pruebas', ready: 'Listo para entregar', delivered: 'Entregado', cancelled: 'Cancelado',
};
const nextSteps: Record<string, string> = {
  received: 'Registramos tu equipo. El siguiente paso es el diagnóstico técnico.',
  diagnosis: 'Estamos revisando la falla reportada. Te avisaremos cuando tengamos cotización.',
  awaiting_authorization: 'Tu equipo espera autorización de cotización.',
  in_repair: 'La reparación está en proceso.',
  testing: 'Estamos probando funciones antes de entregar.',
  ready: 'Tu equipo está listo para entrega. Comunícate para confirmar horario.',
  delivered: 'El equipo fue entregado. Conserva tu nota para garantía.',
  cancelled: 'La reparación fue cancelada. Comunícate si necesitas aclaración.',
};
const normalizePhone = (value: string) => value.replace(/\D/g, '').slice(-10);
const notFound = { found: false, message: 'No encontramos una reparación con esos datos. Revisa el folio o comunícate por WhatsApp.' };

publicRouter.get('/', (_request, response) => {
  response.json({ business: 'LocalPOS', services: ['Diagn�stico', 'Reparaci�n celular', 'Accesorios'], warranty: 'La vigencia depende del servicio realizado y se indica en la nota de entrega.' });
});
publicRouter.get('/business-profile', async (_request, response, next) => {
  try {
    const [business] = await db.select({
      businessName: businessSettings.businessName,
      businessType: businessSettings.businessType,
      logoUrl: businessSettings.logoUrl,
      phone: businessSettings.phone,
      address: businessSettings.address,
      city: businessSettings.city,
      state: businessSettings.state,
      ticketMessage: businessSettings.ticketMessage,
      warrantyMessage: businessSettings.warrantyMessage,
      currency: businessSettings.currency,
      primaryColor: businessSettings.primaryColor,
    }).from(businessSettings).limit(1);

    if (!business) {
      response.json({ item: null });
      return;
    }

    const digits = (business.phone ?? '').replace(/\D/g, '');
    const whatsappPhone = digits ? (digits.length === 10 ? `52${digits}` : digits) : null;

    response.json({
      item: {
        ...business,
        whatsappPhone,
      },
    });
  } catch (error) { next(error); }
});

publicRouter.post('/repairs/track', trackLimiter, async (request, response, next) => {
  try {
    const input = trackInput.parse(request.body);
    const [business] = await db.select({ businessName: businessSettings.businessName }).from(businessSettings).limit(1);
    const [row] = await db.select({
      id: repairs.id,
      folio: repairs.folio,
      status: repairs.status,
      brand: repairs.brand,
      model: repairs.model,
      publicNotes: repairs.publicNotes,
      warrantyUntil: repairs.warrantyUntil,
      updatedAt: repairs.updatedAt,
      createdAt: repairs.createdAt,
      clientPhone: clients.phone,
    }).from(repairs).innerJoin(clients, eq(repairs.clientId, clients.id))
      .where(and(eq(repairs.folio, input.folio.toUpperCase()), eq(repairs.trackingEnabled, true), isNull(repairs.deletedAt)))
      .limit(1);

    if (!row || normalizePhone(row.clientPhone) !== normalizePhone(input.phone)) {
      response.json(notFound);
      return;
    }

    response.json({
      found: true,
      folio: row.folio,
      status: row.status,
      statusLabel: statusLabels[row.status] ?? row.status,
      device: `${row.brand} ${row.model}`,
      lastUpdate: row.updatedAt,
      receivedAt: row.createdAt,
      publicMessage: row.publicNotes || nextSteps[row.status] || 'Tu reparación está registrada en taller.',
      nextStep: nextSteps[row.status] || 'Comunícate por WhatsApp para más información.',
      warrantyUntil: row.warrantyUntil,
      businessName: business?.businessName ?? 'Negocio local',
    });
  } catch (error) { next(error); }
});
