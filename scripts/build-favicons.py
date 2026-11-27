"""Favicons from the hero artwork (public/brand/infinity-white-entry.webp) on a deep-navy tile.

Usage: python3 -I scripts/build-favicons.py
Writes public/favicon.svg (embeds a 256 px webp), favicon.ico (16/32/48), favicon-32.png,
apple-touch-icon.png (180), icon-192.png, icon-512.png.
"""
import base64
import io
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SRC = PUBLIC / "brand" / "infinity-white-entry.webp"
M = 1024  # master size


def tile(size: int, radius: float, logo_w: float, rounded: bool = True) -> Image.Image:
    """Navy tile with a soft core glow and the logo centred. logo_w = fraction of tile width."""
    # background: vertical navy gradient (matches the hero: #010309 → #04122e)
    bg = Image.new("RGBA", (size, size))
    top, bottom = (3, 7, 20), (10, 24, 58)
    px = bg.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(size):
            px[x, y] = (*c, 255)

    # soft light behind the crossing (cool on the white side, warm on the spectrum side)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    r = size * 0.30
    g.ellipse((size / 2 - r * 1.35, size / 2 - r * 0.7, size / 2, size / 2 + r * 0.7), fill=(70, 120, 255, 70))
    g.ellipse((size / 2, size / 2 - r * 0.7, size / 2 + r * 1.35, size / 2 + r * 0.7), fill=(255, 60, 120, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.09))
    bg = Image.alpha_composite(bg, glow)

    art = Image.open(SRC).convert("RGBA")
    art = art.crop(art.getchannel("A").getbbox())
    w = round(size * logo_w)
    h = round(w * art.height / art.width)
    art = art.resize((w, h), Image.LANCZOS)
    bg.alpha_composite(art, ((size - w) // 2, (size - h) // 2))

    if rounded:
        mask = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=radius * size * 4, fill=255)
        bg.putalpha(mask.resize((size, size), Image.LANCZOS))
    return bg


def small(size: int) -> Image.Image:
    """Tiny sizes: the logo nearly edge to edge so the ∞ stays legible, then a light sharpen."""
    im = tile(M, 0.22, 0.94).resize((size, size), Image.LANCZOS)
    return im.filter(ImageFilter.UnsharpMask(radius=0.6, percent=60, threshold=1))


def main() -> None:
    big = tile(M, 0.22, 0.86)
    big.resize((512, 512), Image.LANCZOS).save(PUBLIC / "icon-512.png", optimize=True)
    big.resize((192, 192), Image.LANCZOS).save(PUBLIC / "icon-192.png", optimize=True)
    # Apple applies its own corner mask: square, opaque tile
    tile(M, 0, 0.84, rounded=False).resize((180, 180), Image.LANCZOS).save(PUBLIC / "apple-touch-icon.png", optimize=True)

    s16, s32, s48 = small(16), small(32), small(48)
    s32.save(PUBLIC / "favicon-32.png", optimize=True)
    s48.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[s16, s32])

    buf = io.BytesIO()
    tile(M, 0.22, 0.92).resize((256, 256), Image.LANCZOS).save(buf, "WEBP", quality=90)
    b64 = base64.b64encode(buf.getvalue()).decode()
    (PUBLIC / "favicon.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 256 256">'
        f'<image width="256" height="256" href="data:image/webp;base64,{b64}" xlink:href="data:image/webp;base64,{b64}"/></svg>\n'
    )
    print("favicons written")


if __name__ == "__main__":
    main()
