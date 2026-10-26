import { describe, it, expect, vi, beforeEach } from "vitest";

const upload = vi.fn();
const uploadStream = vi.fn();

vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload: (...args: unknown[]) => upload(...args),
      upload_stream: (...args: unknown[]) => uploadStream(...args),
    },
  },
}));
vi.mock("@/utils/logger", () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { uploadImage } from "@/server/cloudinary.service";

const respuesta = { secure_url: "https://res.cloudinary.com/x/a.jpg", public_id: "olivomarket/products/a", width: 800, height: 600, format: "jpg" };

describe("uploadImage", () => {
  beforeEach(() => {
    upload.mockReset();
    uploadStream.mockReset();
  });

  it("con base64 sube una sola vez y no deja un upload_stream abierto", async () => {
    upload.mockResolvedValue(respuesta);

    const r = await uploadImage("data:image/png;base64,AAAA");

    expect(r).toEqual({ url: respuesta.secure_url, publicId: respuesta.public_id, width: 800, height: 600, format: "jpg" });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(uploadStream).not.toHaveBeenCalled();
  });

  it("con base64 propaga el error de Cloudinary", async () => {
    upload.mockRejectedValue({ message: "Invalid image", http_code: 400 });
    await expect(uploadImage("data:image/png;base64,AAAA")).rejects.toMatchObject({ http_code: 400 });
  });

  it("con un Buffer usa el stream y lo cierra", async () => {
    const end = vi.fn();
    uploadStream.mockImplementation((_opts: unknown, cb: (e: unknown, r: unknown) => void) => {
      end.mockImplementation(() => cb(undefined, respuesta));
      return { end };
    });

    const r = await uploadImage(Buffer.from("x"));

    expect(r.url).toBe(respuesta.secure_url);
    expect(end).toHaveBeenCalledTimes(1);
    expect(upload).not.toHaveBeenCalled();
  });
});
