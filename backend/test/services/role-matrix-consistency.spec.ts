/**
 * Role-permissions matrix consistency test.
 *
 * Asserts that ROLE_PERMISSION_MATRIX (in @article30/shared) stays in sync with
 * every @Roles() decorator in the backend controllers.
 *
 * Strategy: import controller classes directly and read their NestJS/reflect-metadata
 * annotations.  This avoids spinning up the full AppModule (which needs Redis, DB,
 * S3, …) while still reading the same metadata that the runtime AuthGuard uses.
 */

import 'reflect-metadata';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { RequestMethod } from '@nestjs/common';
import { Role, ROLE_PERMISSION_MATRIX, type HttpMethod } from '@article30/shared';
import { ROLES_KEY } from '../../src/common/decorators/roles.decorator';

// Import every controller class
// Each import triggers the decorator application which writes Reflect metadata.
import { TreatmentsController } from '../../src/modules/treatments/treatments.controller';
import { ViolationsController } from '../../src/modules/violations/violations.controller';
import { ChecklistController } from '../../src/modules/checklist/checklist.controller';
import { AuditLogController } from '../../src/modules/audit-log/audit-log.controller';
import { ComplianceController } from '../../src/modules/compliance/compliance.controller';
import { DsrController } from '../../src/modules/dsr/dsr.controller';
import { UsersController } from '../../src/modules/users/users.controller';
import { OrganizationController } from '../../src/modules/organization/organization.controller';
import { RssFeedsController } from '../../src/modules/rss-feeds/rss-feeds.controller';
import { RegulatoryUpdatesController } from '../../src/modules/regulatory-updates/regulatory-updates.controller';
import { ScreeningsController } from '../../src/modules/screenings/screenings.controller';
import { DocumentsController } from '../../src/modules/documents/documents.controller';
import { VendorsController } from '../../src/modules/vendors/vendors.controller';
import { TimelineController } from '../../src/modules/follow-up/timeline.controller';
import { CommentsController } from '../../src/modules/follow-up/comments.controller';
import { AttachmentsController } from '../../src/modules/follow-up/attachments.controller';
import { DecisionsController } from '../../src/modules/follow-up/decisions.controller';
// Controllers whose routes are fully public / session-only (no @Roles on any handler).
// Listed explicitly so the safeguard test (further down) can assert the total file count
// matches `ALL_CONTROLLERS.length + PUBLIC_ONLY_CONTROLLER_FILES.length`, catching any
// new controller a developer forgets to register.
const PUBLIC_ONLY_CONTROLLER_FILES = [
  'auth.controller.ts',
  'recitals.controller.ts',
  'articles.controller.ts',
  'alerts.controller.ts',
  'config.controller.ts',
  'health.controller.ts',
] as const;

// Constants

const REQUEST_METHOD_TO_VERB: Record<number, HttpMethod | undefined> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PATCH]: 'PATCH',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  // HEAD / OPTIONS / ALL intentionally omitted — the matrix doesn't model them.
};

const API_PREFIX = '/api';

// `any` in the parameter position bypasses TS 6's tightened constructor-parameter
// contravariance — each controller has a distinct injected-service signature.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_CONTROLLERS: (new (...args: any[]) => unknown)[] = [
  TreatmentsController,
  ViolationsController,
  ChecklistController,
  AuditLogController,
  ComplianceController,
  DsrController,
  UsersController,
  OrganizationController,
  RssFeedsController,
  RegulatoryUpdatesController,
  ScreeningsController,
  DocumentsController,
  VendorsController,
  TimelineController,
  CommentsController,
  AttachmentsController,
  DecisionsController,
];

// Helpers

function joinPath(...segments: string[]): string {
  const joined = ('/' + segments.filter(Boolean).join('/')).replace(/\/+/g, '/');
  // Remove trailing slash unless the result is the root '/'
  return joined.length > 1 ? joined.replace(/\/$/, '') : joined;
}

/** Recursively collect every `*.controller.ts` filename under a directory. */
function findControllerFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...findControllerFiles(full));
    } else if (entry.endsWith('.controller.ts')) {
      out.push(entry);
    }
  }
  return out;
}

/** Walk a controller class and return all guarded routes as { key, roles } pairs. */
function extractRoutes(
  ctrlClass: new (...args: unknown[]) => unknown,
): Map<string, readonly Role[]> {
  const result = new Map<string, readonly Role[]>();

  const ctrlPath = (Reflect.getMetadata('path', ctrlClass) as string | undefined) ?? '';
  const ctrlRoles = (Reflect.getMetadata(ROLES_KEY, ctrlClass) as Role[] | undefined) ?? [];

  const proto = ctrlClass.prototype as Record<string, unknown>;
  for (const methodName of Object.getOwnPropertyNames(proto)) {
    if (methodName === 'constructor') continue;
    const handler = proto[methodName];
    if (typeof handler !== 'function') continue;

    const httpMethodEnum = Reflect.getMetadata('method', handler) as number | undefined;
    if (httpMethodEnum === undefined) continue; // not a route handler

    const verb = REQUEST_METHOD_TO_VERB[httpMethodEnum];
    if (!verb) continue; // HTTP method not modelled in the matrix

    const subPath = (Reflect.getMetadata('path', handler) as string | undefined) ?? '';
    const handlerRoles = Reflect.getMetadata(ROLES_KEY, handler) as Role[] | undefined;
    const effectiveRoles: readonly Role[] = handlerRoles ?? ctrlRoles;

    const fullPath = joinPath(API_PREFIX, ctrlPath, subPath);
    result.set(`${verb} ${fullPath}`, effectiveRoles);
  }

  return result;
}

// Test

describe('role permissions matrix consistency', () => {
  it('ALL_CONTROLLERS plus PUBLIC_ONLY_CONTROLLER_FILES covers every controller file', () => {
    // Safeguard against the explicit-controller-list approach silently missing a
    // new controller someone forgets to register. If this fails, add the new
    // controller to ALL_CONTROLLERS (if it has @Roles routes) or to
    // PUBLIC_ONLY_CONTROLLER_FILES (if every handler is @Public).
    const modulesDir = join(__dirname, '..', '..', 'src', 'modules');
    const filesOnDisk = findControllerFiles(modulesDir);
    const expectedTotal = ALL_CONTROLLERS.length + PUBLIC_ONLY_CONTROLLER_FILES.length;
    expect(
      filesOnDisk.length,
      `Found ${filesOnDisk.length} *.controller.ts files but the test only knows about ${expectedTotal}. ` +
        `Add the missing controller(s) to ALL_CONTROLLERS or PUBLIC_ONLY_CONTROLLER_FILES.\n` +
        `Files: ${filesOnDisk.sort().join(', ')}`,
    ).toBe(expectedTotal);
  });

  it('matches the actual @Roles() metadata on every guarded route', () => {
    // Build the full map: 'VERB /api/path' → effective roles
    const actualRouteRoles = new Map<string, readonly Role[]>();
    for (const ctrl of ALL_CONTROLLERS) {
      for (const [key, roles] of extractRoutes(ctrl)) {
        actualRouteRoles.set(key, roles);
      }
    }

    // 1. Forward: every matrix route must exist with matching roles.
    for (const cap of ROLE_PERMISSION_MATRIX) {
      for (const route of cap.routes) {
        const key = `${route.method} ${route.path}`;
        const actual = actualRouteRoles.get(key);
        expect(
          actual,
          `Route ${key} is listed under capability "${cap.id}" but does not exist in the backend`,
        ).toBeDefined();
        expect(
          new Set(actual ?? []),
          `Roles for ${key} (capability "${cap.id}") drifted from the matrix`,
        ).toEqual(new Set(cap.allowedRoles));
      }
    }

    // 2. Reverse: every guarded backend route must be claimed by the matrix.
    const claimed = new Set(
      ROLE_PERMISSION_MATRIX.flatMap(c => c.routes.map(r => `${r.method} ${r.path}`)),
    );
    for (const [route, roles] of actualRouteRoles) {
      if (roles.length === 0) continue; // public/session-only — excluded
      expect(
        claimed.has(route),
        `Route ${route} is guarded by [${[...roles].join(',')}] but is missing from ROLE_PERMISSION_MATRIX`,
      ).toBe(true);
    }
  });
});
