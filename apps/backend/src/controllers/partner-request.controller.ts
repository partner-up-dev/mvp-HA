import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { PartnerRequestService } from '../services/PartnerRequestService';
import { prStatusSchema } from '../entities/partner-request';

const app = new Hono();
const service = new PartnerRequestService();

// Request body schemas
const createPRSchema = z.object({
  rawText: z.string().min(1).max(2000),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
});

const updateStatusSchema = z.object({
  status: prStatusSchema,
  pin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
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
  // GET /api/pr/:id - Get partner request
  .get(
    '/:id',
    zValidator('param', z.object({ id: z.string().uuid() })),
    async (c) => {
      const { id } = c.req.valid('param');
      const result = await service.getPR(id);
      return c.json(result);
    }
  )
  // PATCH /api/pr/:id/status - Update status
  .patch(
    '/:id/status',
    zValidator('param', z.object({ id: z.string().uuid() })),
    zValidator('json', updateStatusSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { status, pin } = c.req.valid('json');
      const result = await service.updatePRStatus(id, status, pin);
      return c.json(result);
    }
  );
