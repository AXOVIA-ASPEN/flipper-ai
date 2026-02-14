import { type Page } from '@playwright/test';
import * as path from 'path';

const SCREENSHOT_DIR = 'e2e/screenshots';

export async function captureScreenshot(page: Page, name: string) {
  const filename = `${name}-${Date.now()}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: true });
  return filename;
}

export async function captureViewport(page: Page, name: string) {
  const filename = `${name}-viewport-${Date.now()}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
  return filename;
}

export async function setViewport(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
}

export async function setMobileViewport(page: Page) {
  await setViewport(page, 375, 812);
}

export async function setTabletViewport(page: Page) {
  await setViewport(page, 768, 1024);
}

export async function setDesktopViewport(page: Page) {
  await setViewport(page, 1280, 720);
}
