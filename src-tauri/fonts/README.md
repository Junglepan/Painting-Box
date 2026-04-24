# Bundled Fonts

Place the following files here to enable built-in font support:

| File | Download |
|------|----------|
| `inter-regular.ttf` | https://github.com/rsms/inter/releases/latest → Inter.zip → Inter-Regular.ttf |
| `inter-bold.ttf`    | https://github.com/rsms/inter/releases/latest → Inter.zip → Inter-Bold.ttf |

Once both files are present, `build.rs` sets `bundled_inter` cfg flag and
the fonts are embedded into the binary via `include_bytes!`. The app will
then use Inter for all watermark text across all platforms, regardless of
system fonts.

Also copy the same files (plus optional `.woff2` variants) to `public/fonts/`
so the Canvas preview uses the identical font.

License: Inter is released under the SIL Open Font License 1.1.
