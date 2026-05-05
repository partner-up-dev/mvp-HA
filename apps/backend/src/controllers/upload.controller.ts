import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import {
  imageUploadPurposes,
  ImageStorageError,
  readStoredImage,
  saveImageFile,
} from "../infra/storage/image-storage.service";

const app = new Hono();

const uploadPurposeSchema = z.object({
  purpose: z.enum(imageUploadPurposes),
});

const imageKeySchema = uploadPurposeSchema.extend({
  key: z.string().uuid(),
});

const imageUploadFormSchema = z.object({
  image: z.instanceof(File),
});

const toHttpException = (error: ImageStorageError): HTTPException =>
  new HTTPException(error.status, { message: error.message });

export const uploadRoute = app
  .post(
    "/images/:purpose",
    zValidator("param", uploadPurposeSchema),
    zValidator("form", imageUploadFormSchema),
    async (c) => {
      const { purpose } = c.req.valid("param");
      const { image } = c.req.valid("form");

      try {
        const storedImage = await saveImageFile(purpose, image);
        return c.json({
          key: storedImage.key,
          url: `/api/upload/images/${purpose}/${storedImage.key}`,
        });
      } catch (error) {
        if (error instanceof ImageStorageError) {
          throw toHttpException(error);
        }
        throw error;
      }
    },
  )
  .get(
    "/images/:purpose/:key",
    zValidator("param", imageKeySchema),
    async (c) => {
      const { purpose, key } = c.req.valid("param");

      try {
        const storedImage = await readStoredImage(purpose, key);
        const responseBytes = new Uint8Array(storedImage.buffer.byteLength);
        responseBytes.set(storedImage.buffer);
        return c.body(responseBytes, 200, {
          "Content-Type": storedImage.contentType,
          "Content-Disposition": `inline; filename="${storedImage.key}"`,
          "Cache-Control": "public, max-age=31536000",
        });
      } catch (error) {
        if (error instanceof ImageStorageError) {
          throw toHttpException(error);
        }
        throw error;
      }
    },
  );
