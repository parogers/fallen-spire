#!/bin/bash
#
# Exports every layer of the given XCF as a separate PNG.
#

SRC=$1
DEST=$2

if ! which xcfinfo &> /dev/null; then
    echo "ERROR: cannot find xcinfo - install xcftools"
    exit 1
fi

if [ "$SRC" = "" -o "$DEST" = "" ]; then
    echo "usage: $0 SRC DEST"
    exit 1
fi

if [ ! -d "$DEST" ]; then
    echo "$DEST: not a directory"
    exit 1
fi

LAYERS=`xcfinfo $SRC |grep '\+'|cut -d "|" -f 2`

COUNT=0
IFS=$'\n'
for LAYER in $LAYERS; do
    echo "Processing layer $COUNT - $LAYER"
    xcf2png "$SRC" "$LAYER" -o "${DEST}/`basename ${SRC%.*}`-${COUNT}.png"
    COUNT=$((COUNT+1))
done
