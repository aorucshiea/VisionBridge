#!/usr/bin/env python3
"""
Generate the Vision Bridge application icon.

Pure standard library: no Pillow / no ImageMagick. The mark is drawn from
rectangle tests on a 3x supersampled grid and box-filtered down, then packed
into a multi-resolution BMP-style .ico (the format Windows and electron-builder
both accept without question).

Run:  python scripts/make-icon.py
Out:  public/app-icon.ico
"""
import os
import struct

# Palette — matches src/theme/themes.ts
INK = (0x1B, 0x19, 0x15)
MARKER = (0xC6, 0x7C, 0x1B)

SIZES = [16, 24, 32, 48, 64, 128, 256]
SS = 3  # supersampling factor


def inside_rounded_rect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= r * r


def rect(x, y, x0, y0, x1, y1):
    return x0 <= x <= x1 and y0 <= y <= y1


def render(size):
    """Return an RGBA bytearray of one icon image, top-down."""
    n = size * SS
    u = 1.0 / n  # unit cell size in normalised coords
    acc = [[[0.0, 0.0, 0.0, 0.0] for _ in range(size)] for _ in range(size)]

    # Geometry in normalised (0..1) coordinates
    bg = (0.015, 0.015, 0.985, 0.985, 0.235)

    arm = 0.135          # length of each bracket arm
    t = 0.085            # bracket stroke thickness
    inset = 0.25         # distance from the icon edge to the bracket
    far = 1.0 - inset

    brackets = []
    # top-left
    brackets.append((inset, inset, inset + arm, inset + t))
    brackets.append((inset, inset, inset + t, inset + arm))
    # top-right
    brackets.append((far - arm, inset, far, inset + t))
    brackets.append((far - t, inset, far, inset + arm))
    # bottom-left
    brackets.append((inset, far - t, inset + arm, far))
    brackets.append((inset, far - arm, inset + t, far))
    # bottom-right
    brackets.append((far - arm, far - t, far, far))
    brackets.append((far - t, far - arm, far, far))

    bar = (0.345, 0.4575, 0.655, 0.5425, 0.042)  # marker stroke through the middle

    for py in range(size):
        row = acc[py]
        for px in range(size):
            r = g = b = a = 0.0
            for sy in range(SS):
                y = (py * SS + sy + 0.5) * u
                for sx in range(SS):
                    x = (px * SS + sx + 0.5) * u
                    if not inside_rounded_rect(x, y, *bg):
                        continue
                    hit = inside_rounded_rect(x, y, *bar)
                    if not hit:
                        for q in brackets:
                            if rect(x, y, *q):
                                hit = True
                                break
                    if hit:
                        r += MARKER[0]; g += MARKER[1]; b += MARKER[2]
                    else:
                        r += INK[0]; g += INK[1]; b += INK[2]
                    a += 255.0
            total = SS * SS
            if a == 0:
                row[px] = [0.0, 0.0, 0.0, 0.0]
            else:
                # Colours are averaged over covered samples; alpha over all samples.
                cov = a / 255.0
                row[px] = [r / cov, g / cov, b / cov, a / total]

    out = bytearray()
    for py in range(size):
        for px in range(size):
            r, g, b, a = acc[py][px]
            out += bytes((int(round(r)), int(round(g)), int(round(b)), int(round(a))))
    return out


def bmp_image(size, rgba):
    """BITMAPINFOHEADER + bottom-up BGRA + 1bpp AND mask."""
    header = struct.pack(
        '<IiiHHIIiiII',
        40,           # biSize
        size,         # biWidth
        size * 2,     # biHeight (XOR + AND)
        1,            # biPlanes
        32,           # biBitCount
        0,            # biCompression = BI_RGB
        0, 0, 0, 0, 0,
    )
    xor = bytearray()
    for y in range(size - 1, -1, -1):
        for x in range(size):
            i = (y * size + x) * 4
            r, g, b, a = rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]
            xor += bytes((b, g, r, a))

    row_bytes = ((size + 31) // 32) * 4
    mask = bytearray()
    for y in range(size - 1, -1, -1):
        bits = bytearray(row_bytes)
        for x in range(size):
            if rgba[(y * size + x) * 4 + 3] < 128:
                bits[x // 8] |= 0x80 >> (x % 8)
        mask += bits

    return header + bytes(xor) + bytes(mask)


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    targets = [
        os.path.join(root, 'public', 'app-icon.ico'),
    ]

    images = []
    for size in SIZES:
        images.append((size, bmp_image(size, render(size))))
        print(f'  rendered {size}x{size}')

    out = bytearray(struct.pack('<HHH', 0, 1, len(images)))
    offset = 6 + 16 * len(images)
    for size, data in images:
        out += struct.pack('<BBBBHHII', size if size < 256 else 0, size if size < 256 else 0,
                           0, 0, 1, 32, len(data), offset)
        offset += len(data)
    for _size, data in images:
        out += data

    for path in targets:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as fh:
            fh.write(out)
        print('wrote', path, f'({len(out) / 1024:.0f} KB)')


if __name__ == '__main__':
    main()
