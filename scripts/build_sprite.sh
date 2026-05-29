#!/bin/bash

SPRITE_DIR=$1

if ! which spright &> /dev/null; then
    echo "ERROR: cannot find spright (see https://github.com/houmain/spright)"
    exit 1
fi

if [ "$SPRITE_DIR" = "" ]; then
    echo "usage: $0 SPRITE-DIR"
    exit 1
fi

TMP=`mktemp -d`
SPRITE_NAME=`basename $SPRITE_DIR`
find $SPRITE_DIR -name '*.xcf' -exec ./scripts/explode_xcf.sh "{}" $TMP ";"
./scripts/convert_alpha.py $TMP/*.png

cp $SPRITE_DIR/sprite.conf $TMP
OLD=$PWD
cd $TMP
spright -i sprite.conf

cd $OLD
cp $TMP/${SPRITE_NAME}.json $TMP/${SPRITE_NAME}.png .
