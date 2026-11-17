import { DOMAINS, SECTIONS, domainOf, sectionOf, weightMid } from './schema';

describe('schema', () => {
  it('maps every official sub-skill to exactly one study section', () => {
    for (const d of DOMAINS) {
      for (const sub of d.subs) {
        const owners = SECTIONS.filter((s) => s.domain === d.id && s.subs.includes(sub.id));
        expect(owners.length).withContext(`${d.id}|${sub.id}`).toBe(1);
      }
    }
  });

  it('only uses sub-skills that exist in the section domain', () => {
    for (const s of SECTIONS) {
      const domain = DOMAINS.find((d) => d.id === s.domain);
      expect(domain).withContext(s.id).toBeDefined();
      for (const sub of s.subs) {
        expect(domain?.subs.some((x) => x.id === sub)).withContext(`${s.id}|${sub}`).toBeTrue();
      }
    }
  });

  it('reads the domain from the question id', () => {
    expect(domainOf({ id: 'D1-001' })).toBe('D1');
    expect(domainOf({ id: 'D2-120' })).toBe('D2');
  });

  it('finds the section through domain and sub-skill', () => {
    expect(sectionOf({ id: 'D1-001', sub: 'fairness' })?.id).toBe('1.1');
    expect(sectionOf({ id: 'D2-050', sub: 'cu-app' })?.id).toBe('2.7');
    expect(sectionOf({ id: 'D2-050', sub: 'fairness' })).toBeUndefined();
  });

  it('uses the middle of each weight range and the ranges add up around 100%', () => {
    expect(weightMid({ weight: [40, 45] })).toBe(42.5);
    const total = DOMAINS.reduce((sum, d) => sum + weightMid(d), 0);
    expect(total).toBe(100);
  });
});
