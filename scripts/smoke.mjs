// Plays the built page headless at phone size: the tutorial perfume, a blotter, a sale,
// the brand name, a declined customer and the results menu. Fails on any page error.
// Screenshots land in dist/smoke/ for a human to look at.
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const page_ = await readFile('dist/drop-by-drop.html', 'utf8');
// Mimic the wrapper claude.ai adds when the page is published.
const wrapped = `<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${page_}</body></html>`;
await mkdir('dist/smoke', { recursive: true });
await writeFile('dist/smoke/page.html', wrapped);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
const page = await context.newPage();
page.setDefaultTimeout(6000);
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

const shot = async (name) => {
  await page.waitForTimeout(260);
  await page.screenshot({ path: `dist/smoke/${name}.png` });
};
const tapBeaker = async (n) => {
  for (let i = 0; i < n; i++) {
    await page.locator('.beaker').dispatchEvent('pointerdown', { pointerId: 1, isPrimary: true });
    await page.locator('.beaker').dispatchEvent('pointerup', { pointerId: 1, isPrimary: true });
  }
};
const step = async (label, fn) => {
  try {
    await fn();
    console.log(`ok    ${label}`);
  } catch (e) {
    console.log(`FAIL  ${label}: ${e.message}`);
    await shot('failure');
    errors.push(`${label}: ${e.message}`);
  }
};

await page.goto(`file://${resolve('dist/smoke/page.html')}`);
await page.waitForTimeout(400);

await step('welcome screen', async () => {
  await page.getByRole('heading', { name: 'Drop by Drop' }).waitFor();
  await shot('01-welcome');
  await page.getByRole('button', { name: 'Open the workshop' }).click();
});

await step('tutorial customer and glowing bottles', async () => {
  await page.getByText('peachy, rosy perfume').waitFor();
  await page.getByRole('button', { name: /^Lemon oil/ }).click();
  await page.getByText(/only needs the glowing bottles/).waitFor();
  await shot('02-bench');
});

await step('blend Clara\'s perfume drop by drop', async () => {
  await page.getByRole('button', { name: /^Rose absolute/ }).click();
  await tapBeaker(10);
  await page.getByRole('button', { name: /^Peach lactone/ }).click();
  await tapBeaker(2);
  await page.getByRole('button', { name: /^Ambrette seed oil/ }).click();
  await tapBeaker(16);
  await page.getByText('28').first().waitFor();
  await shot('03-blended');
});

await step('blotter says Signature', async () => {
  await page.getByRole('button', { name: /^Blotter/ }).click();
  await page.getByText("That's exactly it!").waitFor();
  await page.locator('.band-signature').waitFor();
  await shot('04-blotter');
  await page.getByRole('button', { name: 'Keep working' }).click();
});

await step('bottle and sell', async () => {
  await page.getByRole('button', { name: 'Bottle it' }).click();
  await page.getByRole('heading', { name: 'Signature' }).waitFor();
  await shot('05-sale');
  await page.getByRole('button', { name: 'Next customer' }).click();
});

await step('name the house', async () => {
  await page.getByRole('heading', { name: 'Every house needs a name' }).waitFor();
  await page.locator('#brand-name').fill('Maison Test');
  await shot('06-brand');
  await page.getByRole('button', { name: 'Name my house' }).click();
  await page.getByText('Maison Test').first().waitFor();
});

await step('second customer, pour by holding, then decline', async () => {
  await page.getByText('lemony').waitFor();
  await page.getByRole('button', { name: /^Lemon oil/ }).click();
  const box = await page.locator('.beaker').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  const drops = Number(await page.locator('.beaker-count strong').textContent());
  if (!(drops > 4)) throw new Error(`holding poured only ${drops} drops`);
  await shot('07-pour');
  await page.getByRole('button', { name: 'Decline' }).click();
  await page.getByRole('button', { name: 'Decline' }).click();
  await page.getByText('Something romantic').waitFor();
});

await step('jasmine trap flops and is discovered', async () => {
  await page.getByRole('button', { name: /^Rose absolute/ }).click();
  await tapBeaker(11);
  await page.getByRole('button', { name: /^Peach lactone/ }).click();
  await tapBeaker(2);
  await page.getByRole('button', { name: /^Vanillin/ }).click();
  await tapBeaker(7);
  await page.getByRole('button', { name: /^Jasmine absolute/ }).click();
  await tapBeaker(5);
  await page.getByRole('button', { name: /^Blotter/ }).click();
  await page.getByText(/something dirty/).waitFor();
  await page.getByText('New in your notebook.').waitFor();
  await shot('08-trap');
  await page.getByRole('button', { name: 'Keep working' }).click();
});

await step('generated fourth customer', async () => {
  await page.getByRole('button', { name: 'Bottle it' }).click();
  await page.getByRole('heading', { name: 'Flop' }).waitFor();
  await page.getByRole('button', { name: 'Next customer' }).click();
  await page.locator('.request').waitFor();
  await shot('09-generated');
});

await step('menu shows results', async () => {
  await page.getByRole('button', { name: 'Menu and results' }).click();
  await page.getByRole('heading', { name: 'This playtest' }).waitFor();
  await shot('10-menu');
});

await step('no horizontal scroll at phone width', async () => {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (wide) throw new Error('page scrolls sideways');
});

await browser.close();
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n${errors.join('\n')}`);
  process.exit(1);
}
console.log('\nSmoke test passed. Screenshots in dist/smoke/.');
