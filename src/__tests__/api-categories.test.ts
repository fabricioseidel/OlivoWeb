import { vi, describe, it, expect } from "vitest";

vi.mock('@prisma/client', () => ({ PrismaClient: class {} }));

import * as handler from '../app/api/categories/route';

describe('API /categories', () => {
  it('should be defined', () => {
    expect(handler).toBeDefined();
  });
});
