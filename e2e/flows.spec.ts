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
    await field.evaluate((el: HTMLTextAreaElement) => (el.focus(), el.setSelectionRange(el.value.length, el.value.length)));
    await page.keyboard.type('s');
    await expect(field).toHaveValue('Fireballs');
    await expect(page.locator('.status-text')).toHaveText(' · one letter added');
    await expect(page.locator('.card-cast')).toHaveText('You cast');
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
    // The address changes a moment before the editor renders and resets the scroll.
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
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

test.describe('sharing on a desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('Share copies the link instead of opening the share sheet', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/spell/fireball?name=fireballs');
    await page.evaluate(() => {
      (window as unknown as { shared: boolean }).shared = false;
      navigator.share = async () => void ((window as unknown as { shared: boolean }).shared = true);
    });
    await page.getByRole('button', { name: 'Share this spell' }).click();
    await expect(page.getByRole('status')).toHaveText('Link copied');
    // It sits above the buttons, never over them.
    const toast = await page.getByRole('status').boundingBox();
    const button = await page.getByRole('button', { name: 'Share this spell' }).boundingBox();
    expect(toast!.y + toast!.height).toBeLessThanOrEqual(button!.y);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/s\/fireball\/fireballs$/);
    expect(await page.evaluate(() => (window as unknown as { shared: boolean }).shared)).toBe(false);
  });
});

test.describe('sharing on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('a long one-word name shrinks to one line instead of wrapping', async ({ page }) => {
    await page.goto('/spell/thaumaturgy');
    await page.evaluate(() => document.fonts.ready);
    const lines = await page.locator('.mirror').evaluate((m) => {
      const r = document.createRange();
      r.selectNodeContents(m.firstChild!);
      return r.getClientRects().length;
    });
    expect(lines).toBe(1);
  });

  test('Share hands the share sheet the link alone', async ({ page }) => {
    await page.goto('/spell/fireball?name=fireballs');
    await page.evaluate(() => {
      navigator.share = async (data) => void ((window as unknown as { sharedData: unknown }).sharedData = data);
    });
    await page.getByRole('button', { name: 'Share this spell' }).click();
    const data = await page.evaluate(() => (window as unknown as { sharedData: Record<string, string> }).sharedData);
    expect(Object.keys(data)).toEqual(['url']);
    expect(data.url).toMatch(/\/s\/fireball\/fireballs$/);
  });
});

test.describe('the edit survives leaving and coming back', () => {
  const edit = async (page: Page) => {
    await page.goto('/spell/fireball');
    await page.locator('#name').evaluate((el: HTMLTextAreaElement) => (el.focus(), el.setSelectionRange(0, 0)));
    await page.keyboard.type('s'); // "Sfireball": capital moved, exact text matters
    await expect(page.locator('#name')).toHaveValue('Sfireball');
  };

  test('back from show-my-screen, straight after typing', async ({ page }) => {
    await edit(page);
    await page.getByRole('link', { name: 'Show my screen' }).click();
    await expect(page).toHaveURL(/\/screen\//);
    await page.getByRole('button', { name: 'Back to the editor' }).click();
    await expect(page).toHaveURL(/\/spell\/fireball$/);
    await expect(page.locator('#name')).toHaveValue('Sfireball');
  });

  test('browser Back from home, and from Another', async ({ page }) => {
    await edit(page);
    await page.waitForTimeout(400); // the background save
    await page.getByRole('link', { name: 'Spells' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();
    await expect(page.locator('#name')).toHaveValue('Sfireball');
    await page.locator('.another').click();
    await expect(page).not.toHaveURL(/\/spell\/fireball$/);
    await page.goBack();
    await expect(page.locator('#name')).toHaveValue('Sfireball');
  });

  test('a reload keeps the edit; arriving by a link starts clean', async ({ page }) => {
    await edit(page);
    await page.waitForTimeout(400);
    await page.reload();
    await expect(page.locator('#name')).toHaveValue('Sfireball');
    await page.goto('/');
    await page.locator('#q').fill('fireball');
    await page.locator('.results a', { hasText: /^Fireball/ }).first().click();
    await expect(page).toHaveURL(/\/spell\/fireball$/);
    await expect(page.locator('#name')).toHaveValue('Fireball');
  });
});

test.describe('desktop layout', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('buttons sit side by side in a wider column; no Show my screen on a computer', async ({ page }) => {
    await page.goto('/s/fireball/fireballs');
    const tops = await page.$$eval('.actions .hex', (els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops).toHaveLength(2);
    expect(tops[0]).toBe(tops[1]);
    await page.goto('/spell/fireball');
    expect(await page.$eval('.page', (e) => Math.round(e.getBoundingClientRect().width))).toBe(640);
    await expect(page.getByRole('link', { name: 'Show my screen' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Share this spell' })).toBeVisible();
    await page.goto('/');
    expect(await page.$eval('.page', (e) => Math.round(e.getBoundingClientRect().width))).toBe(480);
  });

  test('inner pages show the C·A·R·L tiles, linking home', async ({ page }) => {
    await page.goto('/spells');
    await page.getByRole('link', { name: 'CARL, home' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('keyboard search on a desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('arrows walk the suggestions; up from the top returns to the box; Enter opens one', async ({ page }) => {
    await page.goto('/');
    const q = page.locator('#q');
    await q.fill('fire');
    const names = await page.locator('.r-name').allTextContents();
    await q.press('ArrowDown');
    await expect(page.locator('.results a').nth(0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.results a').nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(q).toBeFocused();
    await expect(q).toHaveValue('fire');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('#name')).toHaveValue(names[1]);
  });
});

test('on a phone the card guides the edit: tap, then the rule, then what you cast', async ({ page }) => {
  await page.goto('/spell/fireball');
  expect(await page.locator('.field').evaluate((e) => getComputedStyle(e).borderBottomStyle)).toBe('solid');
  await expect(page.locator('#name')).not.toBeFocused();
  await expect(page.locator('.card-cast')).toHaveText('Tap the name to edit');
  // A tap on the card's empty space (here, the level line) edits from the end.
  await page.locator('.card-line').click();
  await expect(page.locator('#name')).toBeFocused();
  await expect(page.locator('.card-cast')).toHaveText('Change, add, or remove a letter');
  await page.keyboard.type('s');
  await expect(page.locator('#name')).toHaveValue('Fireballs');
  await expect(page.locator('.card-cast')).toHaveText('You cast');
});

test.describe('editor on a desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('opens with the field focused and the caret at the end', async ({ page }) => {
    await page.goto('/spell/fireball');
    await expect(page.locator('#name')).toBeFocused();
    await expect(page.locator('.card-cast')).toHaveText('Change, add, or remove a letter');
    await page.keyboard.type('s');
    await expect(page.locator('#name')).toHaveValue('Fireballs');
  });
});
