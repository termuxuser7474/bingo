import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Responsive UI & Mobile PWA Quality Audit', () => {
  const publicDir = path.resolve(__dirname, '../../../client/public');
  const distDir = path.resolve(__dirname, '../../../client/dist');
  const indexHtmlPath = path.resolve(__dirname, '../../../client/index.html');
  const cssPath = path.resolve(__dirname, '../../../client/src/styles/index.css');

  it('1. PWA manifest.json exists, is valid JSON, and specifies standalone display', () => {
    const manifestPath = path.join(publicDir, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(content.short_name).toBe('BINGO');
    expect(content.display).toBe('standalone');
    expect(content.theme_color).toBe('#0a0e17');
    expect(content.icons.length).toBeGreaterThan(0);
  });

  it('2. Favicon SVG exists and has scalable vector markup', () => {
    const faviconPath = path.join(publicDir, 'favicon.svg');
    expect(fs.existsSync(faviconPath)).toBe(true);
    const content = fs.readFileSync(faviconPath, 'utf8');
    expect(content).toContain('<svg');
    expect(content).toContain('viewBox');
  });

  it('3. index.html includes viewport-fit=cover and iOS/Android mobile web app meta tags', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('mobile-web-app-capable');
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('apple-mobile-web-app-status-bar-style');
    expect(html).toContain('rel="manifest"');
  });

  it('4. index.css defines safe area insets, touch-action, and overflow-x prevention', () => {
    const css = fs.readFileSync(cssPath, 'utf8');
    expect(css).toContain('env(safe-area-inset-top');
    expect(css).toContain('env(safe-area-inset-bottom');
    expect(css).toContain('touch-action: manipulation');
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain('aspect-ratio: 1 / 1');
  });

  it('5. Built client dist bundle exists with HTML, JS, and CSS files', () => {
    expect(fs.existsSync(path.join(distDir, 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'favicon.svg'))).toBe(true);
    const assets = fs.readdirSync(path.join(distDir, 'assets'));
    expect(assets.some((f) => f.endsWith('.js'))).toBe(true);
    expect(assets.some((f) => f.endsWith('.css'))).toBe(true);
  });
});
