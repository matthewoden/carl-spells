import { expect, test, type Page } from '@playwright/test';

// The main player journeys, against the real Worker and built app.

const tiles = (page: Page) =>
  page.$$eval('.tile-col', (cs) =>
    cs
      .filter((c) => !(c as HTMLElement).dataset.collapsed)
      .map((c) => {
        const t = c.querySelector('.tile') as HTMLElement;
        return t.textContent + (t.dataset.hl ? '*' : '');
      })
      .join(''),
  );

test.describe('home', () => {
  test('the tiles open as C R L and the A flips in', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    expect(await tiles(page)).toBe('CRL');
    await page.clock.runFor(2500);
    expect(await tiles(page)).toBe('CA*RL');
  });

  test('a demo spell casts after 25s idle and undoes itself', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.clock.runFor(2500);
    await page.clock.runFor(26_000);
    await expect.poll(() => tiles(page)).toBe('CA*RD*');
    await page.clock.runFor(4000);
    expect(await tiles(page)).toBe('CA*RL');
  });

  test('reduced motion shows plain CARL', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    expect(await tiles(page)).toBe('CA*RL');
  });

  test('the game toggle scopes search and is remembered', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'PF2E' }).click();
    await expect(page.locator('#q')).toHaveAttribute('placeholder', /Force Barrage/);
    await page.locator('#q').fill('force');
    await expect(page.locator('.r-name').first()).toHaveText('Force Barrage');
    await page.reload();
    await expect(page.getByRole('radio', { name: 'PF2E' })).toHaveAttribute('aria-checked', 'true');
  });

  test('Enter opens the top result in the editor', async ({ page }) => {
    await page.goto('/');
    await page.locator('#q').fill('firebal');
    await page.locator('#q').press('Enter');
    await expect(page).toHaveURL(/\/spell\/fireball$/);
  });

  test('the ? opens About', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'About CARL' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('About');
  });
});

test.describe('editor', () => {
  test('an added letter is highlighted and named', async ({ page }) => {
    await page.goto('/spell/fireball');
    const field = page.locator('#name');
    await field.click();
    await field.press('End');
    await field.pressSequentially('s');
    await expect(field).toHaveValue('Fireballs');
    await expect(page.locator('.status-text')).toHaveText('One letter added');
    await expect(page.locator('.mirror .edit')).toHaveText('s');
  });

  test('a letter typed at the front takes the capital', async ({ page }) => {
    await page.goto('/spell/fireball');
    await page.locator('#name').evaluate((el: HTMLTextAreaElement) => (el.focus(), el.setSelectionRange(0, 0)));
    await page.keyboard.type('s');
    await expect(page.locator('#name')).toHaveValue('Sfireball');
  });

  test('a shared link opens with the edit applied', async ({ page }) => {
    await page.goto('/spell/fireball?name=fireballs&g=pf2e');
    await expect(page.locator('#name')).toHaveValue('Fireballs');
    await expect(page.locator('.level')).toHaveText('Rank 3 · Arcane, Primal');
  });
});

test.describe('share page and preview image', () => {
  test('crawlers get the joke’s own preview tags', async ({ request }) => {
    const html = await (await request.get('/s/fireball/fireballs?g=pf2e')).text();
    expect(html).toContain('<title>Fireballs · CARL</title>');
    expect(html).toMatch(/og:image" content="http[^"]+\/og\/fireball\/fireballs\.png\?v=\d+&amp;g=pf2e"/);
    expect(html).toContain('Rank 3 · Arcane, Primal');
    expect(html.match(/property="og:image"/g)).toHaveLength(1); // the default was swapped out
  });

  test('the preview image is a 600×315 PNG', async ({ request }) => {
    const res = await request.get('/og/fireball/fireballs.png');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
    const buf = await res.body();
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([600, 315]);
  });

  test('bad links are 404s, never rendered', async ({ request }) => {
    expect((await request.get('/s/not-a-spell/x')).status()).toBe(404);
    expect((await request.get('/og/fireball/%3Cb%3E.png')).status()).toBe(404);
  });

  test('every other page has the default preview', async ({ request }) => {
    const html = await (await request.get('/spells')).text();
    expect(html).toMatch(/og:image" content="[^"]*og-default\.png"/);
  });
});

test.describe('show my screen', () => {
  test('is dark, and tapping the name hides the original', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/screen/fireball/fireballs');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('.screen-name svg').click();
    await expect(page.locator('.screen-under')).toHaveAttribute('data-hidden', '');
    await expect(page.locator('.screen-hint')).toHaveText('Tap the name to show the original');
  });
});

test.describe('spell list', () => {
  test('controls change the grouping and live in the address', async ({ page }) => {
    await page.goto('/spells?g=pf2e');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Spell list');
    await page.getByRole('radio', { name: 'Rank' }).click();
    await page.getByRole('radio', { name: 'Highest first' }).click();
    await expect(page).toHaveURL(/g=pf2e&by=level&sort=desc/);
    await expect(page.locator('.sl-gt').first()).toHaveText('Rank 10');
  });

  test('the jump strip and Back keep your place', async ({ page }) => {
    await page.goto('/spells?g=dnd');
    await page.locator('.sl-strip a[data-jump="g-M"]').click();
    await expect.poll(() => page.$eval('#g-M', (e) => Math.round(e.getBoundingClientRect().top))).toBeLessThan(80);
    const y = await page.evaluate(() => Math.round(scrollY));
    await page.locator('#g-M .sl-row').first().evaluate((a: HTMLElement) => a.click());
    await expect(page).toHaveURL(/\/spell\//);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.goBack();
    await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(y);
  });

  test('the compact bar scrolls back to the top', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/spells');
    await page.evaluate(() => scrollTo(0, 5000));
    await expect(page.locator('.sl-bar')).toHaveAttribute('data-show');
    await page.locator('.sl-bar').click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  });
});
