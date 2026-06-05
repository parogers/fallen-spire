#!/bin/bash

for SRC in rawdata/sprites/*; do
    ./scripts/build_sprite.sh $SRC
done
