#!/bin/bash

while inotifywait -r -e close_write -q rawdata/
    do sleep 0.5
    ./scripts/build_sprite.sh rawdata/sprites/hero/
done
