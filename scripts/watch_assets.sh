#!/bin/bash

while inotifywait -r -e close_write -q rawdata/
    do sleep 0.5
    ./scripts/build_sprites.sh
    ./scripts/build_tiles.sh
done
