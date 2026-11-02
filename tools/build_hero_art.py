"""Build the hero artwork from a high resolution source.

Usage:  python tools/build_hero_art.py assets/My-Guest-Project-image.jpg

The source must be the same composition as the original 1712 x 919 illustration, at any larger size
(3424 x 1838, 6848 x 3676 and so on). It produces, in assets/:
  india-world-ext-2x.webp        artwork with a soft mirrored margin on the left, so he can sit dead centre
  india-world-clean-ext-2x.webp  the same artwork with the illustrated figure painted out (the real photo swaps in over it)
  india-world-ext.webp           small copy used by the minimap
Everything is scaled from the source width, so a 4K source just works.
"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

BASE_W, BASE_H, PAD0 = 1712, 919, 200                     # coordinates the page uses
here = os.path.dirname(os.path.abspath(__file__)); assets = os.path.join(os.path.dirname(here), 'assets')
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(assets, 'My-Guest-Project-image.jpg')
art = Image.open(src).convert('RGB')
S = art.width / BASE_W
assert abs(art.height / BASE_H - S) < 0.01, 'source must keep the 1712 x 919 aspect ratio'
PAD = round(PAD0 * S)
print('source', art.size, 'scale', round(S, 3), 'pad', PAD)

def extend(img):
    W, H = img.size
    strip = img.crop((0, 0, PAD, H)).transpose(Image.FLIP_LEFT_RIGHT)       # mirrored, so the seam is continuous
    blurred = strip.filter(ImageFilter.GaussianBlur(11 * S))
    a = np.asarray(strip).astype(np.float64); b = np.asarray(blurred).astype(np.float64)
    w = np.clip(np.linspace(1, 0, PAD)[None, :, None], 0, 1) ** 1.3
    out = (a * (1 - w) + b * w) * (1 - 0.16 * w)
    ext = Image.new('RGB', (W + PAD, H))
    ext.paste(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), (0, 0)); ext.paste(img, (PAD, 0))
    return ext

# Painted out copy: remove the illustrated figure (silhouette read off a measuring grid, in 1712 x 919 coordinates)
real = Image.open(os.path.join(assets, 'sarath-full.webp')).convert('RGBA')
H = round(262 * S); W = round(H * real.width / real.height)
LEFT = round(270 * S - 0.4726 * W); TOP = round(838 * S) - H
poly = [(250,586),(284,586),(291,604),(287,627),(305,639),(318,650),(319,672),(312,691),(306,706),(305,731),(303,760),(302,800),(311,831),(314,842),(236,842),(239,831),(246,800),(247,770),(243,745),(238,720),(240,690),(237,660),(238,641),(247,630),(249,610)]
cart = Image.new('L', art.size, 0); ImageDraw.Draw(cart).polygon([(x * S, y * S) for x, y in poly], fill=255)
sil = Image.new('L', art.size, 0)
sil.paste(real.resize((W, H), Image.LANCZOS).getchannel('A').point(lambda v: 255 if v > 30 else 0), (LEFT, TOP))
mask = ndi.binary_dilation(np.asarray(cart) > 0, iterations=round(4 * S)) | ndi.binary_dilation(np.asarray(sil) > 0, iterations=round(2 * S))
img = np.asarray(art).astype(np.float64); known = (~mask).astype(np.float64); filled = img.copy(); ck = known.copy()
for sigma in (2, 3, 4, 6, 8, 12, 16, 24, 32, 48):
    sg = sigma * S
    num = np.stack([ndi.gaussian_filter(filled[..., c] * ck, sg) for c in range(3)], axis=-1)
    den = ndi.gaussian_filter(ck, sg)[..., None]
    take = (ck < 0.5) & (den[..., 0] > 0.04)
    filled[take] = (num / np.maximum(den, 1e-6))[take]; ck = np.maximum(ck, take.astype(np.float64))
sm = np.stack([ndi.gaussian_filter(filled[..., c], 1.2 * S) for c in range(3)], axis=-1)
noise = np.random.default_rng(3).normal(0, 4.0, filled.shape)
out = np.where(mask[..., None], sm + noise, img)
alpha = ndi.gaussian_filter(mask.astype(np.float64), 1.5 * S)[..., None]
clean = Image.fromarray(np.clip(img * (1 - alpha) + out * alpha, 0, 255).astype(np.uint8))

ext, cext = extend(art), extend(clean)
q = dict(quality=90, method=6)
ext.save(os.path.join(assets, 'india-world-ext-2x.webp'), 'WEBP', **q)
cext.save(os.path.join(assets, 'india-world-clean-ext-2x.webp'), 'WEBP', **q)
ext.resize((ext.width // 2, ext.height // 2), Image.LANCZOS).save(os.path.join(assets, 'india-world-ext.webp'), 'WEBP', quality=88)
print('saved', ext.size, 'figure placement (source px)', LEFT + PAD, TOP, W, H)
