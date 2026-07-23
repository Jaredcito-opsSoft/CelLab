import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { managerialReportQuery } from '../modules/reports/reports.contracts.js';

describe('contrato de rango de reportes gerenciales', () => {
  it('acepta un rango inclusivo de hasta 366 días', () => {
    assert.equal(managerialReportQuery.safeParse({ from: '2024-01-01', to: '2024-12-31' }).success, true);
  });

  it('rechaza fechas incompletas, invertidas o rangos excesivos', () => {
    assert.equal(managerialReportQuery.safeParse({ from: '2026-01-01' }).success, false);
    assert.equal(managerialReportQuery.safeParse({ from: '2026-02-01', to: '2026-01-01' }).success, false);
    assert.equal(managerialReportQuery.safeParse({ from: '2024-01-01', to: '2025-01-01' }).success, false);
  });

  it('rechaza fechas calendario inválidas', () => {
    assert.equal(managerialReportQuery.safeParse({ from: '2026-02-30', to: '2026-03-01' }).success, false);
  });
});
