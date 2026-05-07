import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lastValueFrom, of, throwError } from 'rxjs';
import type { CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditLogInterceptor } from '../../src/common/interceptors/audit-log.interceptor';
import { createMockContext } from '../helpers';

type AuditCreateSpy = ReturnType<typeof vi.fn>;

function makeInterceptor(
  opts: {
    auditCreate?: AuditCreateSpy;
    findUnique?: (args: unknown) => Promise<unknown>;
    findUniqueThrows?: boolean;
    modelName?: string;
  } = {},
) {
  const auditCreate = opts.auditCreate ?? vi.fn().mockResolvedValue(undefined);
  const model = opts.findUnique
    ? { findUnique: opts.findUnique }
    : opts.findUniqueThrows
      ? {
          findUnique: () => {
            throw new Error('boom');
          },
        }
      : { findUnique: vi.fn().mockResolvedValue({ id: 'old-1', name: 'old' }) };

  const prisma = {
    [opts.modelName ?? 'treatment']: model,
  } as unknown as import('../../src/prisma/prisma.service').PrismaService;

  const auditLogService = {
    create: auditCreate,
  } as unknown as import('../../src/modules/audit-log/audit-log.service').AuditLogService;

  const interceptor = new AuditLogInterceptor(auditLogService, prisma, new Reflector());
  return { interceptor, auditCreate };
}

function handler(response: unknown): CallHandler {
  return { handle: () => of(response) };
}

describe('AuditLogInterceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('read-only methods', () => {
    it.each(['GET', 'HEAD', 'OPTIONS'])('passes through %s without auditing', async method => {
      const { interceptor, auditCreate } = makeInterceptor();
      const { context } = createMockContext({ method, user: { id: 'u1' } });
      const result$ = interceptor.intercept(context, handler({ ok: true }));
      await expect(lastValueFrom(result$)).resolves.toEqual({ ok: true });
      expect(auditCreate).not.toHaveBeenCalled();
    });
  });

  describe('unauthenticated requests', () => {
    it('passes through without auditing when no user and entity !== dsr', async () => {
      const { interceptor, auditCreate } = makeInterceptor();
      const { context, request } = createMockContext({ method: 'POST' });
      request.route = { path: '/api/treatments' };
      const result$ = interceptor.intercept(context, handler({ id: 'x' }));
      await expect(lastValueFrom(result$)).resolves.toEqual({ id: 'x' });
      expect(auditCreate).not.toHaveBeenCalled();
    });

    it('still audits a dsr submission with no user (public /submit path)', async () => {
      const { interceptor, auditCreate } = makeInterceptor({ modelName: 'dataSubjectRequest' });
      const { context, request } = createMockContext({ method: 'POST' });
      request.route = { path: '/api/dsr/submit' };
      await lastValueFrom(interceptor.intercept(context, handler({ id: 'dsr-1' })));
      expect(auditCreate).toHaveBeenCalledOnce();
      expect(auditCreate.mock.calls[0][0]).toMatchObject({
        action: 'CREATE',
        entity: 'dsr',
        entityId: 'dsr-1',
        performedBy: null,
      });
    });
  });

  describe('POST', () => {
    it('records CREATE with null oldValue and the response body as newValue', async () => {
      const { interceptor, auditCreate } = makeInterceptor();
      const { context, request } = createMockContext({ method: 'POST', user: { id: 'u1' } });
      request.route = { path: '/api/treatments' };
      await lastValueFrom(interceptor.intercept(context, handler({ id: 't1', name: 'T1' })));
      expect(auditCreate).toHaveBeenCalledOnce();
      const arg = auditCreate.mock.calls[0][0];
      expect(arg.action).toBe('CREATE');
      expect(arg.entity).toBe('treatment');
      expect(arg.entityId).toBe('t1');
      expect(arg.oldValue).toBeNull();
      expect(arg.newValue).toEqual({ id: 't1', name: 'T1' });
      expect(arg.performedBy).toBe('u1');
    });
  });

  describe('PATCH with id param', () => {
    it('fetches the pre-existing row as oldValue and records UPDATE', async () => {
      const findUnique = vi.fn().mockResolvedValue({ id: 't1', name: 'before' });
      const { interceptor, auditCreate } = makeInterceptor({ findUnique });
      const { context, request } = createMockContext({ method: 'PATCH', user: { id: 'u1' } });
      request.route = { path: '/api/treatments/:id' };
      request.params = { id: 't1' };
      await lastValueFrom(interceptor.intercept(context, handler({ id: 't1', name: 'after' })));
      expect(findUnique).toHaveBeenCalledWith({ where: { id: 't1' } });
      expect(auditCreate).toHaveBeenCalledOnce();
      expect(auditCreate.mock.calls[0][0]).toMatchObject({
        action: 'UPDATE',
        oldValue: { id: 't1', name: 'before' },
        newValue: { id: 't1', name: 'after' },
      });
    });

    it('swallows a findUnique error and treats oldValue as null', async () => {
      const { interceptor, auditCreate } = makeInterceptor({ findUniqueThrows: true });
      const { context, request } = createMockContext({ method: 'PATCH', user: { id: 'u1' } });
      request.route = { path: '/api/treatments/:id' };
      request.params = { id: 't1' };
      await lastValueFrom(interceptor.intercept(context, handler({ id: 't1', name: 'after' })));
      expect(auditCreate).toHaveBeenCalledOnce();
      expect(auditCreate.mock.calls[0][0].oldValue).toBeNull();
    });
  });

  describe('entity mapping edge cases', () => {
    it('uses null oldValue when the entity is not in the map', async () => {
      const { interceptor, auditCreate } = makeInterceptor({ modelName: 'alert' });
      const { context, request } = createMockContext({ method: 'PATCH', user: { id: 'u1' } });
      request.route = { path: '/api/alerts/:id' };
      request.params = { id: 'a1' };
      await lastValueFrom(interceptor.intercept(context, handler({ id: 'a1' })));
      expect(auditCreate.mock.calls[0][0].oldValue).toBeNull();
    });

    it('uses null oldValue when the request has no id/itemId param', async () => {
      const { interceptor, auditCreate } = makeInterceptor();
      const { context, request } = createMockContext({ method: 'PATCH', user: { id: 'u1' } });
      request.route = { path: '/api/treatments' };
      request.params = {};
      await lastValueFrom(interceptor.intercept(context, handler({ id: 't1' })));
      expect(auditCreate.mock.calls[0][0].oldValue).toBeNull();
    });

    it('uses the itemId param when id is absent (checklist PUT)', async () => {
      const findUnique = vi.fn().mockResolvedValue({ itemId: 'art5', response: 'NO' });
      const { interceptor, auditCreate } = makeInterceptor({
        findUnique,
        modelName: 'checklistResponse',
      });
      const { context, request } = createMockContext({ method: 'PUT', user: { id: 'u1' } });
      request.route = { path: '/api/checklist/:itemId' };
      request.params = { itemId: 'art5' };
      await lastValueFrom(interceptor.intercept(context, handler({ itemId: 'art5' })));
      expect(findUnique).toHaveBeenCalledWith({ where: { id: 'art5' } });
      expect(auditCreate).toHaveBeenCalledOnce();
      expect(auditCreate.mock.calls[0][0]).toMatchObject({
        action: 'UPSERT',
        entity: 'checklist',
        entityId: 'art5',
      });
    });
  });

  describe('action extraction', () => {
    it.each([
      ['/api/treatments/:id/validate', 'PATCH', 'VALIDATE'],
      ['/api/treatments/:id/invalidate', 'PATCH', 'INVALIDATE'],
      ['/api/users/:id/approve', 'PATCH', 'APPROVE'],
      ['/api/users/:id/deactivate', 'PATCH', 'DEACTIVATE'],
      ['/api/users/:id/role', 'PATCH', 'CHANGE_ROLE'],
    ])('recognises path %s as %s', async (path, method, expectedAction) => {
      const { interceptor, auditCreate } = makeInterceptor();
      const { context, request } = createMockContext({ method, user: { id: 'u1' } });
      request.route = { path };
      request.params = { id: 'x1' };
      await lastValueFrom(interceptor.intercept(context, handler({ id: 'x1' })));
      expect(auditCreate.mock.calls[0][0].action).toBe(expectedAction);
    });

    it.each([
      ['POST', 'CREATE'],
      ['PATCH', 'UPDATE'],
      ['PUT', 'UPSERT'],
      ['DELETE', 'DELETE'],
    ])('falls back to method-based action for %s', async (method, expectedAction) => {
      const { interceptor, auditCreate } = makeInterceptor();
      const { context, request } = createMockContext({ method, user: { id: 'u1' } });
      request.route = { path: '/api/treatments/:id' };
      request.params = { id: 't1' };
      await lastValueFrom(interceptor.intercept(context, handler({ id: 't1' })));
      expect(auditCreate.mock.calls[0][0].action).toBe(expectedAction);
    });
  });

  describe('entity extraction', () => {
    it('strips the "api" prefix and trailing "s"', async () => {
      const { interceptor, auditCreate } = makeInterceptor({ modelName: 'violation' });
      const { context, request } = createMockContext({ method: 'POST', user: { id: 'u1' } });
      request.route = { path: '/api/violations' };
      await lastValueFrom(interceptor.intercept(context, handler({ id: 'v1' })));
      expect(auditCreate.mock.calls[0][0].entity).toBe('violation');
    });

    it('falls back to "unknown" when the path has no leading segment', async () => {
      const { interceptor, auditCreate } = makeInterceptor();
      const { context, request } = createMockContext({ method: 'POST', user: { id: 'u1' } });
      request.route = { path: '/' };
      await lastValueFrom(interceptor.intercept(context, handler({ id: 'x' })));
      expect(auditCreate.mock.calls[0][0].entity).toBe('unknown');
    });
  });

  describe('audit-create error swallow', () => {
    it('does not throw when auditLogService.create rejects', async () => {
      const auditCreate = vi.fn().mockRejectedValue(new Error('DB write failed'));
      const { interceptor } = makeInterceptor({ auditCreate });
      const { context, request } = createMockContext({ method: 'POST', user: { id: 'u1' } });
      request.route = { path: '/api/treatments' };
      const result$ = interceptor.intercept(context, handler({ id: 't1' }));
      await expect(lastValueFrom(result$)).resolves.toEqual({ id: 't1' });
      await new Promise(r => setTimeout(r, 0));
      expect(auditCreate).toHaveBeenCalledOnce();
    });
  });

  describe('response-data id fallback', () => {
    it('uses the response body id when params.id is missing', async () => {
      const { interceptor, auditCreate } = makeInterceptor();
      const { context, request } = createMockContext({ method: 'POST', user: { id: 'u1' } });
      request.route = { path: '/api/treatments' };
      await lastValueFrom(interceptor.intercept(context, handler({ id: 'new-id' })));
      expect(auditCreate.mock.calls[0][0].entityId).toBe('new-id');
    });
  });

  describe('next.handle error propagation', () => {
    it('propagates errors from the handler (interceptor does not mask them)', async () => {
      const { interceptor } = makeInterceptor();
      const { context, request } = createMockContext({ method: 'POST', user: { id: 'u1' } });
      request.route = { path: '/api/treatments' };
      const failingHandler: CallHandler = {
        handle: () => throwError(() => new Error('service blew up')),
      };
      const result$ = interceptor.intercept(context, failingHandler);
      await expect(lastValueFrom(result$)).rejects.toThrow('service blew up');
    });
  });
});
