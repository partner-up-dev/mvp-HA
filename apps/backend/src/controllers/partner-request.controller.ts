import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { PartnerRequestService } from '../services/PartnerRequestService';
import {
  prStatusManualSchema,
  parsedPRSchema,
} from '../entities/partner-request';

const app = new Hono();
const service = new PartnerRequestService();

// Request body schemas
const createPRSchema = z.object({
  rawText: z.string().min(1).max(2000),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

const updateStatusSchema = z.object({
  status: prStatusManualSchema,
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

const updateContentSchema = z.object({
  parsed: parsedPRSchema,
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

const batchGetSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).max(50),
});

const prIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const partnerRequestRoute = app
  // POST /api/pr - Create partner request
  .post(
    '/',
    zValidator('json', createPRSchema),
    async (c) => {
      const { rawText, pin } = c.req.valid('json');
      const result = await service.createPR(rawText, pin);
      return c.json(result, 201);
    }
  )
  // POST /api/pr/batch - Batch get partner request summaries
  .post(
    '/batch',
    zValidator('json', batchGetSchema),
    async (c) => {
      const { ids } = c.req.valid('json');
      const result = await service.getPRSummariesByIds(ids);
      return c.json(result);
    }
  )
  // GET /api/pr/:id - Get partner request
  .get(
    '/:id',
    zValidator('param', prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await service.getPR(id);
      return c.json(result);
    }
  )
  // PATCH /api/pr/:id/status - Update status
  .patch(
    '/:id/status',
    zValidator('param', prIdParamSchema),
    zValidator('json', updateStatusSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { status, pin } = c.req.valid('json');
      const result = await service.updatePRStatus(id, status, pin);
      return c.json(result);
    }
  )
  // PATCH /api/pr/:id/content - Update content
  .patch(
    '/:id/content',
    zValidator('param', prIdParamSchema),
    zValidator('json', updateContentSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { parsed, pin } = c.req.valid('json');
      const result = await service.updatePRContent(id, parsed, pin);
      return c.json(result);
    }
  )
  // POST /api/pr/:id/join - Join partner request
  .post(
    '/:id/join',
    zValidator('param', prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await service.joinPR(id);
      return c.json(result);
    }
  )
  // POST /api/pr/:id/exit - Exit partner request
  .post(
    '/:id/exit',
    zValidator('param', prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await service.exitPR(id);
      return c.json(result);
    }
  );
