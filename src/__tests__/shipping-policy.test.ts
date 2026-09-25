import { describe, it, expect } from 'vitest';
import { comunaToSlug } from '@/lib/shipping-policy';


describe('comunaToSlug', () => {
  it('normaliza tildes y ñ', () => {
    expect(comunaToSlug('Ñuñoa')).toBe('nunoa');
    expect(comunaToSlug('ñuñoa')).toBe('nunoa');
    expect(comunaToSlug('Peñalolén')).toBe('penalolen');
    expect(comunaToSlug('PEÑALOLEN')).toBe('penalolen');
  });

  it('normaliza espacios a guiones', () => {
    expect(comunaToSlug('San Joaquín')).toBe('san-joaquin');
    expect(comunaToSlug('La Reina')).toBe('la-reina');
  });

  it('devuelve null para comunas fuera de cobertura o vacías', () => {
    expect(comunaToSlug('Providencia')).toBeNull();
    expect(comunaToSlug('')).toBeNull();
    expect(comunaToSlug(null)).toBeNull();
    expect(comunaToSlug(undefined)).toBeNull();
  });
});
