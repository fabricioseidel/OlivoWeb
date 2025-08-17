import { describe, it, expect } from 'vitest';
import * as handler from '../app/api/categories/route';

describe('API /categories', () => {
  it('should be defined', () => {
    expect(handler).toBeDefined();
  });
});
