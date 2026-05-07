import { describe, it, expect } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApprovedGuard } from '../../src/common/guards/approved.guard';
import { createMockContext } from '../helpers';
import { Role } from '@article30/shared';

describe('ApprovedGuard', () => {
  const reflector = new Reflector();
  const guard = new ApprovedGuard(reflector);

  it('allows approved users', () => {
    const { context } = createMockContext({
      user: { id: 'user-1', role: Role.AUDITOR, approved: true },
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('throws ForbiddenException for unapproved users', () => {
    const { context } = createMockContext({
      user: { id: 'user-2', role: Role.AUDITOR, approved: false },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('skips check for @Public() routes', () => {
    const { context } = createMockContext({
      user: { id: 'user-3', role: Role.AUDITOR, approved: false },
      isPublic: true,
    });

    const result = guard.canActivate(context);
    expect(result).toBe(true);
  });
});
