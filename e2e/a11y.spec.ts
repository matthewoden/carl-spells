import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Automated accessibility pass (WCAG 2.2 A/AA rules) on every screen, in both themes.
const PAGES = [
  ['home', '/'],
  ['editor', '/spell/fireball?name=fireballs'],
  ['share', '/s/fireball/fireballs'],
  ['show my screen', '/screen/fireball/fireballs'],
  ['spell list', '/spells?g=dnd'],
  ['spell list by rank', '/spells?g=pf2e&by=level'],
  ['about', '/about'],
] as const;

for (const scheme of ['dark', 'light'] as const) {
  for (const [name, path] of PAGES) {
    test(`${name} has no accessibility violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      expect(summary, summary.join('\n')).toEqual([]);
    });
  }
}
