#!/usr/bin/env python3

import PIL
import shutil
import glob
import tempfile
import configparser
import subprocess
import sys
import os
from gimpformats.gimpXcfDocument import GimpDocument


SPRITE_DEST = os.path.join('public', 'sprites')


def extract_pivots(doc):
    commentNode = next(p for p in doc.parasites if p.name == 'gimp-comment')
    comment = commentNode.data.decode('utf-8').replace('\00', '')
    parser = configparser.ConfigParser()
    try:
        parser.read_string(comment)
    except configparser.MissingSectionHeaderError:
        return None
    pivots = {}
    for pivot in parser['pivots']:
        value = parser['pivots'][pivot]
        if pivot.startswith('pivot'):
            frame_num = int(pivot[5:])
            x, y = value.split(',')
            x = int(x.strip())
            y = int(y.strip())
            pivots[frame_num] = (x, y)
    return pivots


def convert_alpha(src):
    img = PIL.Image.open(src)
    alpha = img.getpixel((0, 0))
    for x in range(img.size[0]):
        for y in range(img.size[1]):
            if img.getpixel((x, y)) == alpha:
                img.putpixel((x, y), 0)
    img.save(src)


def explode_xcf(src, dest):
    doc = GimpDocument(src)
    fname = os.path.splitext(os.path.basename(src))[0]
    for num, layer in enumerate(doc):
        layer.image.save(os.path.join(dest, f'{fname}-{num}.png'))


def process_sprite(src):
    assert os.path.exists(src)
    sprite_name = os.path.split(os.path.normpath(src))[-1]
    assert sprite_name, src
    with tempfile.TemporaryDirectory() as dest:
        # doc = GimpDocument(src)
        # pivots = extract_pivots(doc)
        for xcf_src in glob.glob(os.path.join(src, '*.xcf')):
            explode_xcf(xcf_src, dest)

        for png_src in glob.glob(os.path.join(dest, '*.png')):
            convert_alpha(png_src)

        shutil.copy(
            os.path.join(src, 'sprite.conf'),
            os.path.join(dest, sprite_name + '.conf'),
        )

        old_dir = os.getcwd()
        os.chdir(dest)
        proc = subprocess.run([
            'spright',
            '-i',
            os.path.join(dest, sprite_name + '.conf'),
        ])
        os.chdir(old_dir)

        shutil.copy(os.path.join(dest, sprite_name + '.json'), SPRITE_DEST)
        shutil.copy(os.path.join(dest, sprite_name + '.png'), SPRITE_DEST)


def main():
    src = sys.argv[1]
    process_sprite(src)
    # explode_xcf(src, dest)


if __name__ == '__main__':
    main()
