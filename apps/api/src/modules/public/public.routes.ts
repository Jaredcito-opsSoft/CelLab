import { Router } from 'express';

export const publicRouter = Router();

publicRouter.get('/', (_request, response) => {
  response.json({
    business: 'CelLab Tuxtla',
    services: ['Diagnóstico', 'Reparación celular', 'Accesorios'],
    warranty: 'La vigencia depende del servicio realizado y se indica en la nota de entrega.',
  });
});

