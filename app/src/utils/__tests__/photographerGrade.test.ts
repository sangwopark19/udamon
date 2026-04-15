import { calculateGrade, gradeToBadge } from '../photographerGrade';

describe('calculateGrade', () => {
  it('both zero → 0', () => {
    expect(calculateGrade(0, 0)).toBe(0);
  });
  it('posts only', () => {
    expect(calculateGrade(5, 0)).toBe(5);
  });
  it('followers contribute floor(/10)', () => {
    expect(calculateGrade(0, 50)).toBe(5);
  });
  it('sum of posts + floor(followers/10)', () => {
    expect(calculateGrade(3, 25)).toBe(5);
  });
  it('negative clamps to 0', () => {
    expect(calculateGrade(-1, -5)).toBe(0);
  });
  it('fractional inputs are floored', () => {
    expect(calculateGrade(10.7, 25.3)).toBe(12);
  });
});

describe('gradeToBadge', () => {
  it('grade 0 → bronze', () => {
    const b = gradeToBadge(0);
    expect(b.tier).toBe('bronze');
    expect(b.iconColor).toBe('#A97142');
    expect(b.iconName).toBe('medal-outline');
  });
  it('grade 4 → bronze (boundary)', () => {
    expect(gradeToBadge(4).tier).toBe('bronze');
  });
  it('grade 5 → silver', () => {
    const s = gradeToBadge(5);
    expect(s.tier).toBe('silver');
    expect(s.iconColor).toBe('#6B7280');
  });
  it('grade 19 → silver (boundary)', () => {
    expect(gradeToBadge(19).tier).toBe('silver');
  });
  it('grade 20 → gold', () => {
    const g = gradeToBadge(20);
    expect(g.tier).toBe('gold');
    expect(g.iconColor).toBe('#FACC15');
    expect(g.iconName).toBe('medal');
  });
  it('grade 49 → gold (boundary)', () => {
    expect(gradeToBadge(49).tier).toBe('gold');
  });
  it('grade 50 → diamond', () => {
    const d = gradeToBadge(50);
    expect(d.tier).toBe('diamond');
    expect(d.iconColor).toBe('#1B2A4A');
    expect(d.iconName).toBe('diamond');
  });
  it('grade 100 → diamond', () => {
    expect(gradeToBadge(100).tier).toBe('diamond');
  });
});
