import { describe, it, expect } from 'vitest';
import { PLANS } from '../../../constants';
import { Plan } from '../../../types';

describe('Constants - PLANS', () => {
  it('should have three plans defined', () => {
    expect(PLANS).toHaveLength(3);
  });

  it('should have basic plan with correct structure', () => {
    const basicPlan = PLANS.find(p => p.id === 'basic');
    expect(basicPlan).toBeDefined();
    expect(basicPlan?.name).toBe('Básico');
    expect(basicPlan?.price).toBe(0);
    expect(basicPlan?.features).toBeInstanceOf(Array);
    expect(basicPlan?.limits).toBeDefined();
  });

  it('should have pro plan with correct structure', () => {
    const proPlan = PLANS.find(p => p.id === 'pro');
    expect(proPlan).toBeDefined();
    expect(proPlan?.name).toBe('Profissional');
    expect(proPlan?.price).toBe(97);
    expect(proPlan?.features).toBeInstanceOf(Array);
    expect(proPlan?.limits).toBeDefined();
  });

  it('should have enterprise plan with correct structure', () => {
    const enterprisePlan = PLANS.find(p => p.id === 'enterprise');
    expect(enterprisePlan).toBeDefined();
    expect(enterprisePlan?.name).toBe('Enterprise');
    expect(enterprisePlan?.price).toBe(299);
    expect(enterprisePlan?.features).toBeInstanceOf(Array);
    expect(enterprisePlan?.limits).toBeDefined();
  });

  it('should have valid plan IDs', () => {
    PLANS.forEach(plan => {
      expect(['basic', 'pro', 'enterprise']).toContain(plan.id);
    });
  });

  it('should have limits with all required fields', () => {
    PLANS.forEach(plan => {
      expect(plan.limits).toHaveProperty('agents');
      expect(plan.limits).toHaveProperty('historyDays');
      expect(plan.limits).toHaveProperty('users');
      expect(typeof plan.limits.agents).toBe('number');
      expect(typeof plan.limits.historyDays).toBe('number');
      expect(typeof plan.limits.users).toBe('number');
    });
  });

  it('should have features as array of strings', () => {
    PLANS.forEach(plan => {
      expect(plan.features).toBeInstanceOf(Array);
      plan.features.forEach(feature => {
        expect(typeof feature).toBe('string');
        expect(feature.length).toBeGreaterThan(0);
      });
    });
  });

  it('should have increasing limits from basic to enterprise', () => {
    const basic = PLANS.find(p => p.id === 'basic')!;
    const pro = PLANS.find(p => p.id === 'pro')!;
    const enterprise = PLANS.find(p => p.id === 'enterprise')!;

    expect(pro.limits.agents).toBeGreaterThan(basic.limits.agents);
    expect(enterprise.limits.agents).toBeGreaterThan(pro.limits.agents);

    expect(pro.limits.historyDays).toBeGreaterThan(basic.limits.historyDays);
    expect(enterprise.limits.historyDays).toBeGreaterThan(pro.limits.historyDays);

    expect(pro.limits.users).toBeGreaterThan(basic.limits.users);
    expect(enterprise.limits.users).toBeGreaterThan(pro.limits.users);
  });
});

