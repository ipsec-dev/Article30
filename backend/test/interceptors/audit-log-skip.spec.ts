import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditLogInterceptor } from '../../src/common/interceptors/audit-log.interceptor';
import { SKIP_AUDIT_KEY } from '../../src/common/decorators/skip-audit.decorator';

function makeContext(handler: () => void): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'PATCH',
        route: { path: '/users/:id/admin-reset-password' },
        url: '/users/abc/admin-reset-password',
        user: { id: 'admin-1' },
        params: { id: 'target-1' },
      }),
      getResponse: () => ({}),
    }),
    getHandler: () => handler,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('AuditLogInterceptor @SkipAudit() gating', () => {
  let auditLogService: { create: ReturnType<typeof vi.fn> };
  let prisma: { user: { findUnique: ReturnType<typeof vi.fn> } };
  let reflector: Reflector;
  let interceptor: AuditLogInterceptor;

  beforeEach(() => {
    auditLogService = { create: vi.fn().mockResolvedValue(undefined) };
    prisma = { user: { findUnique: vi.fn().mockResolvedValue(null) } };
    reflector = new Reflector();
    interceptor = new AuditLogInterceptor(auditLogService as never, prisma as never, reflector);
  });

  it('does not call auditLogService.create when handler has @SkipAudit()', async () => {
    const handler = () => {};
    Reflect.defineMetadata(SKIP_AUDIT_KEY, true, handler);
    const context = makeContext(handler);
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await new Promise<void>(resolve => {
      interceptor.intercept(context, next).subscribe({ complete: resolve });
    });

    expect(auditLogService.create).not.toHaveBeenCalled();
  });

  it('calls auditLogService.create when handler does not have @SkipAudit()', async () => {
    const handler = () => {};
    const context = makeContext(handler);
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await new Promise<void>(resolve => {
      interceptor.intercept(context, next).subscribe({ complete: resolve });
    });

    expect(auditLogService.create).toHaveBeenCalledOnce();
  });
});
