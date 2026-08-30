# GenSenMaruGothic TW web font source

These WOFF2 files are character subsets of GenSenMaruGothic TW TTF version 1.301. The source font files were the formally installed copies in the macOS user font library:

- `GenSenMaruGothicTW-Regular.ttf`
- `GenSenMaruGothicTW-Medium.ttf`
- `GenSenMaruGothicTW-Bold.ttf`

The embedded font metadata identifies the family as GenSenMaruGothic TW, version 1.301, and the license as SIL Open Font License 1.1. The project is maintained by ButTaiwan at <https://github.com/ButTaiwan/gensen-font>. The upstream README documents the v1.300 line and states that the font is derived from Source Han Sans and released under SIL OFL 1.1.

## CSS weight mapping

The source family does not provide a Semibold file. To preserve the site's existing three-step typographic hierarchy without synthesizing an intermediate weight, the web CSS maps:

- CSS 500 to `GenSenMaruGothicTW-Regular.ttf` (source weight class 400)
- CSS 600 to `GenSenMaruGothicTW-Medium.ttf` (source weight class 500)
- CSS 700 to `GenSenMaruGothicTW-Bold.ttf` (source weight class 700)

The internal font names and license metadata are preserved. Only the container format and glyph set were changed.

The WOFF2 subsets were produced with fontTools 4.63.0 and Brotli 1.2.0. Their shipped sizes are 130,412 bytes (500), 130,964 bytes (600), and 134,424 bytes (700), for a total of 395,800 bytes.

## Subset coverage

The subset request includes every non-ASCII character currently present in `src/**` application source and demo data, plus these explicit ranges:

- U+0000–U+00FF: Basic Latin and Latin-1 Supplement, including ASCII, digits, and Western punctuation
- U+2000–U+206F: General Punctuation
- U+3000–U+303F: CJK Symbols and Punctuation
- U+FE30–U+FE4F: CJK Compatibility Forms
- U+FF00–U+FFEF: Halfwidth and Fullwidth Forms

User-entered Han characters outside the shipped subset intentionally fall through to the system font stack. This keeps the public demo's font transfer small while leaving forms and pages usable for unrestricted input.

The upstream v1.301 files do not contain the decorative `✦` glyph used once in the unlock-game celebration. That non-text decoration also falls through to the system stack; all current static Chinese and English copy, demo data, ASCII, digits, and common punctuation are present in the WOFF2 files.

## Original source checksums (SHA-256)

- Regular: `339105cda2d4e76017e9d8bfc10bb792ad7616282d07ce95014a47eafd97e64a`
- Medium: `cb6d67abf20b4cd7258f9578fbac4b7194a051caed943c94d140a3e012b3248c`
- Bold: `53a056e4a1f82116cf5df390250de5d467468fc171c4b33890b4fb28fce5c2df`

See `OFL-1.1.txt` in this directory for the complete license and Reserved Font Name notice.
