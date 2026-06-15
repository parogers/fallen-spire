#!/usr/bin/env python3

import collections
import json
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


def extract_pivots(src):
    def _parse_pivot(txt):
        x, y = txt.split(',')
        x = float(x.strip())
        y = float(y.strip())
        return x, y

    doc = GimpDocument(src)
    try:
        commentNode = next(p for p in doc.parasites if p.name == 'gimp-comment')
    except StopIteration:
        return {}
    comment = commentNode.data.decode('utf-8').replace('\00', '')
    parser = configparser.ConfigParser()
    try:
        parser.read_string(comment)
    except configparser.MissingSectionHeaderError:
        return {}

    default_pivot = None
    try:
        default_pivot = _parse_pivot(parser['pivots']['pivot'])
    except:
        default_pivot = None

    if default_pivot:
        pivots = collections.defaultdict(lambda : default_pivot)
    else:
        pivots = {}
    for name in parser['pivots']:
        value = parser['pivots'][name]
        if name != 'pivot' and name.startswith('pivot'):
            frame_num = int(name[5:])
            x, y = _parse_pivot(value)
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


def update_pivots(src, pivots):
    with open(src) as file:
        json_data = json.load(file)

    for sprite_name, sprite_data in json_data['frames'].items():
        i = sprite_name.rindex('-')
        assert i >= 0
        base_name = sprite_name[0:i]
        sprite_num = int(sprite_name[i+1:])
        try:
            px, py = pivots[base_name][sprite_num]
        except KeyError:
            pass
        else:
            sprite_data['anchor'] = {
                'x' : px / sprite_data['sourceSize']['w'],
                'y' : py / sprite_data['sourceSize']['h'],
            }
    with open(src, 'w') as file:
        json.dump(json_data, file, indent=4)


def process_sprite(src):
    assert os.path.exists(src)
    sprite_name = os.path.split(os.path.normpath(src))[-1]
    assert sprite_name, src
    pivots = {}
    with tempfile.TemporaryDirectory() as dest:
        for xcf_src in glob.glob(os.path.join(src, '*.xcf')):
            xcf_pivots = extract_pivots(xcf_src)
            xcf_name = os.path.splitext(os.path.basename(xcf_src))[0]
            pivots[xcf_name] = xcf_pivots
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

        update_pivots(os.path.join(dest, sprite_name + '.json'), pivots)

        shutil.copy(os.path.join(dest, sprite_name + '.json'), SPRITE_DEST)
        shutil.copy(os.path.join(dest, sprite_name + '.png'), SPRITE_DEST)


def main():
    src = sys.argv[1]
    process_sprite(src)
    # explode_xcf(src, dest)


if __name__ == '__main__':
    main()
