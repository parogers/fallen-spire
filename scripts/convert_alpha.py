#!/usr/bin/env python3

import sys
import PIL, PIL.Image


def convert_alpha(src):
    img = PIL.Image.open(src)
    alpha = img.getpixel((0, 0))
    for x in range(img.size[0]):
        for y in range(img.size[1]):
            if img.getpixel((x, y)) == alpha:
                img.putpixel((x, y), 0)
    img.save(src)


def main():
    src_files = sys.argv[1:]
    assert src_files
    for src in src_files:
        convert_alpha(src)


if __name__ == '__main__':
    main()
