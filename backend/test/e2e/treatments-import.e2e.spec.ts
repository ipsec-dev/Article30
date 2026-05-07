import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Role, LegalBasis } from '@article30/shared';
import { cleanupDatabase } from '../helpers';
import { createTestApp, type TestApp } from './app-factory';
import { loginAs, primeCsrf } from './login';
import { TreatmentsImportService } from '../../src/modules/treatments/treatments-import.service';
import {
  buildXlsx,
  buildXlsxMissingColumn,
  buildXlsxOverCap,
  LIST_SEP,
} from './fixtures/treatments-import-fixtures';
import { seedTreatment, seedUser } from './seed';

describe('treatments-import.service (e2e)', () => {
  let testApp: TestApp;
  let importService: TreatmentsImportService;

  beforeAll(async () => {
    testApp = await createTestApp();
    importService = testApp.app.get(TreatmentsImportService);
  });

  afterAll(async () => {
    await cleanupDatabase(testApp.prisma);
    await testApp.close();
  });

  afterEach(async () => {
    await cleanupDatabase(testApp.prisma);
  });

  describe('parseAndValidate() — structural checks', () => {
    it('throws BadRequest when the required `name` header is missing', async () => {
      await expect(importService.parseAndValidate(buildXlsxMissingColumn())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws BadRequest when row count exceeds the cap', async () => {
      await expect(importService.parseAndValidate(buildXlsxOverCap())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('returns an empty preview when the file has only a header row', async () => {
      const preview = await importService.parseAndValidate(buildXlsx([]));
      expect(preview.rows).toHaveLength(0);
      expect(preview.summary).toEqual({ ok: 0, conflict: 0, invalid: 0, total: 0 });
    });
  });

  describe('parseAndValidate() — per-row checks', () => {
    it('flags a row as invalid when name is missing', async () => {
      const preview = await importService.parseAndValidate(buildXlsx([{ purpose: 'noname' }]));
      expect(preview.rows[0].status).toBe('invalid');
      expect(preview.rows[0].errors).toContain('missing_name');
    });

    it('flags a row as invalid when legalBasis is unknown', async () => {
      const preview = await importService.parseAndValidate(
        buildXlsx([{ name: 'bad-basis', legalBasis: 'NONSENSE' }]),
      );
      expect(preview.rows[0].status).toBe('invalid');
      expect(preview.rows[0].errors).toContain('invalid_legal_basis');
    });

    it('flags a row as invalid when assignedToEmail does not match a user', async () => {
      const preview = await importService.parseAndValidate(
        buildXlsx([{ name: 'unknown-email', assignedToEmail: 'ghost@example.test' }]),
      );
      expect(preview.rows[0].status).toBe('invalid');
      expect(preview.rows[0].errors).toContain('unknown_assignee_email');
    });

    it('flags a row as conflict when name matches an existing treatment', async () => {
      const { user } = await seedUser(testApp.prisma, Role.DPO);
      await seedTreatment(testApp.prisma, user.id, { name: 'already-here' });
      const preview = await importService.parseAndValidate(buildXlsx([{ name: 'already-here' }]));
      expect(preview.rows[0].status).toBe('conflict');
      expect(preview.rows[0].errors).toContain('name_conflict_existing');
    });

    it('flags both rows as conflict when an in-file duplicate appears', async () => {
      const preview = await importService.parseAndValidate(
        buildXlsx([{ name: 'dup' }, { name: 'dup' }]),
      );
      expect(preview.rows.map(r => r.status)).toEqual(['conflict', 'conflict']);
      expect(preview.rows.every(r => r.errors.includes('name_conflict_in_file'))).toBe(true);
    });

    it('matches assignedToEmail case-insensitively against existing users', async () => {
      const { user } = await seedUser(testApp.prisma, Role.DPO, {
        email: 'mixed.case@example.test',
      });
      const upper = user.email.toUpperCase(); // e.g. MIXED.CASE@EXAMPLE.TEST
      const preview = await importService.parseAndValidate(
        buildXlsx([{ name: 'with-uppercase-email', assignedToEmail: upper }]),
      );
      expect(preview.rows[0].status).toBe('ok');
      expect(preview.rows[0].errors).toEqual([]);
    });

    it('returns ok rows with summary counts when input is valid', async () => {
      const { user } = await seedUser(testApp.prisma, Role.DPO);
      const preview = await importService.parseAndValidate(
        buildXlsx([
          {
            name: 'happy-1',
            purpose: 'p',
            legalBasis: LegalBasis.CONSENT,
            personCategories: `cat A${LIST_SEP}cat B`,
            assignedToEmail: user.email,
          },
          { name: 'happy-2' },
        ]),
      );
      expect(preview.summary).toEqual({ ok: 2, conflict: 0, invalid: 0, total: 2 });
      expect(preview.rows.every(r => r.status === 'ok')).toBe(true);
    });
  });

  describe('commit()', () => {
    it('rejects with ConflictException if any row is invalid or conflicts', async () => {
      const { user } = await seedUser(testApp.prisma, Role.DPO);
      await expect(
        importService.commit(buildXlsx([{ name: 'ok' }, { purpose: 'no-name-row' }]), user.id),
      ).rejects.toBeInstanceOf(ConflictException);

      const count = await testApp.prisma.treatment.count();
      expect(count).toBe(0);
    });

    it('inserts every row when input is clean and writes one CREATE audit-log per row', async () => {
      const { user } = await seedUser(testApp.prisma, Role.DPO);
      const result = await importService.commit(
        buildXlsx([{ name: 'a' }, { name: 'b' }, { name: 'c' }]),
        user.id,
      );

      expect(result.created).toBe(3);
      expect(await testApp.prisma.treatment.count()).toBe(3);

      const auditRows = await testApp.prisma.auditLog.findMany({
        where: { entity: 'treatment', action: 'CREATE' },
        orderBy: { performedAt: 'asc' },
      });
      expect(auditRows).toHaveLength(3);
      expect(auditRows.every(r => r.performedBy === user.id)).toBe(true);

      // Lock in the hash-chain invariant: bulk import must not produce a chain
      // that fails verify().
      const auditService = testApp.app.get(
        (await import('../../src/modules/audit-log/audit-log.service')).AuditLogService,
      );
      const verification = await auditService.verify();
      expect(verification.valid).toBe(true);
    });

    it('persists treatments even when an audit-log write fails', async () => {
      const { user } = await seedUser(testApp.prisma, Role.DPO);
      const auditService = testApp.app.get(
        (await import('../../src/modules/audit-log/audit-log.service')).AuditLogService,
      );
      const original = auditService.create.bind(auditService);
      // Fail the first audit write, succeed afterwards.
      let calls = 0;
      const spy = vi.spyOn(auditService, 'create').mockImplementation(async (...args) => {
        calls += 1;
        if (calls === 1) throw new Error('simulated audit-log failure');
        return original(...args);
      });

      try {
        const result = await importService.commit(
          buildXlsx([{ name: 'survives-audit-failure-1' }, { name: 'survives-audit-failure-2' }]),
          user.id,
        );

        expect(result.created).toBe(2);
        // Both treatments exist (the audit failure didn't roll them back).
        const found = await testApp.prisma.treatment.findMany({
          where: { name: { in: ['survives-audit-failure-1', 'survives-audit-failure-2'] } },
        });
        expect(found).toHaveLength(2);
      } finally {
        spy.mockRestore();
      }
    });
  });
});

describe('GET /api/treatments/import-template', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await cleanupDatabase(testApp.prisma);
    await testApp.close();
  });

  afterEach(async () => {
    await cleanupDatabase(testApp.prisma);
  });

  it('returns 401 without a session', async () => {
    const res = await testApp.agent().get('/api/treatments/import-template');
    expect(res.status).toBe(401);
  });

  it('returns 403 for an AUDITOR (not in TREATMENT_WRITE_ROLES)', async () => {
    const { user, password } = await seedUser(testApp.prisma, Role.AUDITOR);
    const { agent } = await loginAs(testApp.app, user.email, password);
    const res = await agent.get('/api/treatments/import-template');
    expect(res.status).toBe(403);
  });

  it('returns the xlsx template for an authorized writer', async () => {
    const { user, password } = await seedUser(testApp.prisma, Role.DPO);
    const { agent } = await loginAs(testApp.app, user.email, password);
    const res = await agent.get('/api/treatments/import-template');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.headers['content-disposition']).toContain('treatments-template.xlsx');
  });
});

describe('POST /api/treatments/import', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await cleanupDatabase(testApp.prisma);
    await testApp.close();
  });

  afterEach(async () => {
    await cleanupDatabase(testApp.prisma);
  });

  it('returns 401 without a session', async () => {
    const { agent, csrfToken } = await primeCsrf(testApp.app);
    const res = await agent.post('/api/treatments/import').set('x-xsrf-token', csrfToken);
    expect(res.status).toBe(401);
  });

  it('dryRun=true returns the preview without writing', async () => {
    const { user, password } = await seedUser(testApp.prisma, Role.DPO);
    const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
    const buffer = buildXlsx([{ name: 'preview-only' }]);
    const res = await agent
      .post('/api/treatments/import?dryRun=true')
      .set('x-xsrf-token', csrfToken)
      .attach('file', buffer, 'in.xlsx');
    expect(res.status).toBe(201);
    expect(res.body.summary).toEqual({ ok: 1, conflict: 0, invalid: 0, total: 1 });
    expect(await testApp.prisma.treatment.count()).toBe(0);
  });

  it('dryRun=false commits clean rows', async () => {
    const { user, password } = await seedUser(testApp.prisma, Role.DPO);
    const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
    const buffer = buildXlsx([{ name: 'committed-1' }, { name: 'committed-2' }]);
    const res = await agent
      .post('/api/treatments/import?dryRun=false')
      .set('x-xsrf-token', csrfToken)
      .attach('file', buffer, 'in.xlsx');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ created: 2 });
    expect(await testApp.prisma.treatment.count()).toBe(2);
  });

  it('dryRun=false rejects 409 when any row would conflict', async () => {
    const { user, password } = await seedUser(testApp.prisma, Role.DPO);
    await seedTreatment(testApp.prisma, user.id, { name: 'existing' });
    const { agent, csrfToken } = await loginAs(testApp.app, user.email, password);
    const buffer = buildXlsx([{ name: 'existing' }, { name: 'fresh' }]);
    const res = await agent
      .post('/api/treatments/import?dryRun=false')
      .set('x-xsrf-token', csrfToken)
      .attach('file', buffer, 'in.xlsx');
    expect(res.status).toBe(409);
    expect(await testApp.prisma.treatment.count()).toBe(1); // only the seeded one
  });
});
