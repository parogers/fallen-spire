#!/bin/bash

if ! which spright &> /dev/null; then
    echo "ERROR: cannot find spright (see https://github.com/houmain/spright)"
    exit 1
fi

TMP=`mktemp -d`
./scripts/explode_xcf.sh rawdata/sprites/hero-walk.xcf $TMP/hero-walk-

cp rawdata/sprites/hero.conf $TMP
OLD=$PWD
cd $TMP
spright -i hero.conf

cd $OLD
cp $TMP/hero.json $TMP/hero.png .
