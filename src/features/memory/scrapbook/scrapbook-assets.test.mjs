import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const modules = ['sender', 'memory/scrapbook'];
for (const feature of modules) {
  const root = new URL(`../../${feature}/`, import.meta.url);
  test(`${feature}: opaque grayscale photo masks use luminance in CSS`, async () => {
    const css = await readFile(new URL(feature === 'sender' ? 'sender-builder.module.css' : 'scrapbook.module.css', root), 'utf8');
    assert.match(css, /\.maskedPhotoLayer\s*\{[^}]*mask-mode:\s*luminance/s);
    for (const [template, count] of [['one', 1], ['two', 2], ['three', 3]]) {
      for (let i = 1; i <= count; i++) {
        const mask = await sharp(fileURLToPath(new URL(`assets/d044/${template}/photo-slot-${i}-mask.png`, root))).stats();
        assert.equal(mask.isOpaque, true);
        assert.equal(mask.channels[0].min, 0);
        assert.equal(mask.channels[0].max, 255);
      }
    }
  });
  test(`${feature}: runtime WebP layers preserve size and transparency with a smaller payload`, async () => {
    let originalBytes = 0;
    let runtimeBytes = 0;
    for (const template of ['one', 'two', 'three']) {
      for (const name of ['background', 'description-torn-paper', 'foreground-tape-clips-stickers', 'outer-doodles-stars', 'photo-frames']) {
        const png = fileURLToPath(new URL(`assets/d044/${template}/${name}.png`, root));
        const webp = png.replace(/\.png$/, '.webp');
        const original = await sharp(png).metadata();
        const runtime = await sharp(webp).metadata();
        assert.equal(runtime.width, original.width);
        assert.equal(runtime.height, original.height);
        const originalAlpha = await sharp(png).ensureAlpha().extractChannel('alpha').raw().toBuffer();
        const runtimeAlpha = await sharp(webp).ensureAlpha().extractChannel('alpha').raw().toBuffer();
        assert.deepEqual(runtimeAlpha, originalAlpha);
        originalBytes += (await stat(png)).size;
        runtimeBytes += (await stat(webp)).size;
      }
    }
    assert.ok(runtimeBytes < originalBytes * 0.1);
  });
}
