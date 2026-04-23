// GradeBadge pure helper 단위 테스트 — UI-SPEC §GradeBadge tier palette 검증
// Render 테스트는 @testing-library/react-native 부재로 skip. 색상/사이즈 계산만 단위 검증.

import { colors } from '../../../styles/theme';
import { gradeBgColor, gradeLabelColor, gradeBadgeLayout } from '../GradeBadge';

describe('GradeBadge pure helpers', () => {
  describe('gradeBgColor', () => {
    it('tier=bronze → colors.surfaceLight', () => {
      expect(gradeBgColor('bronze')).toBe(colors.surfaceLight);
    });
    it('tier=silver → colors.surfaceLight', () => {
      expect(gradeBgColor('silver')).toBe(colors.surfaceLight);
    });
    it('tier=gold → colors.featuredAlpha20', () => {
      expect(gradeBgColor('gold')).toBe(colors.featuredAlpha20);
    });
    it('tier=diamond → colors.primaryAlpha8', () => {
      expect(gradeBgColor('diamond')).toBe(colors.primaryAlpha8);
    });
  });

  describe('gradeLabelColor', () => {
    it('tier=bronze → colors.textSecondary', () => {
      expect(gradeLabelColor('bronze')).toBe(colors.textSecondary);
    });
    it('tier=silver → colors.textPrimary', () => {
      expect(gradeLabelColor('silver')).toBe(colors.textPrimary);
    });
    it('tier=gold → colors.featuredAccent', () => {
      expect(gradeLabelColor('gold')).toBe(colors.featuredAccent);
    });
    it('tier=diamond → colors.primary', () => {
      expect(gradeLabelColor('diamond')).toBe(colors.primary);
    });
  });

  describe('gradeBadgeLayout', () => {
    it('size=sm → icon 12, padding sm (H:sm, V:xs)', () => {
      const l = gradeBadgeLayout('sm');
      expect(l.iconSize).toBe(12);
      expect(l.isMd).toBe(false);
    });
    it('size=md → icon 16, padding md (H:md, V:sm)', () => {
      const l = gradeBadgeLayout('md');
      expect(l.iconSize).toBe(16);
      expect(l.isMd).toBe(true);
    });
  });
});
