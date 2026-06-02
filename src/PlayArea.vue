<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import * as PIXI from 'pixi.js';
import { Grid } from '@parogers/pixijs-easygrid';

import { loadTiledMap } from './tiled-parsing';
import { Player } from './game/player';

let sprite;
let frame = 0;
let app: Application|null = null;
let sheet;
let grid;
let player;
const playArea = ref();

function tick(time)
{
    const dt = time.deltaMS/1000;
    // frame += 2*time.deltaMS/1000;
    // const frameNum = (frame|0) % 2;
    // sprite.texture = sheet.textures['hero-jump-' + frameNum];
    player.update(dt);
    grid.update(dt);
}

function makeSpritesheetFromGrid(tileset, tileNamePrefix) {
    const tiles = {};
    const rows = (tileset.tileCount / tileset.columns)|0 + 1;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < tileset.columns; col++) {
            const x = tileset.margin + tileset.spacing*col + tileset.tileWidth*col;
            const y = tileset.margin + tileset.spacing*row + tileset.tileHeight*row;
            const index = Object.keys(tiles).length;
            if (index >= tileset.tileCount) {
                break;
            }
            const name = tileNamePrefix + index;
            tiles[name] = {
                frame: {
                    x: x,
                    y: y,
                    w: tileset.tileWidth,
                    h: tileset.tileHeight,
                },
                spriteSourceSize: {
                    x: x,
                    y: y,
                    w: tileset.tileWidth,
                    h: tileset.tileHeight,
                },
                sourceSize: {
                    w: tileset.tileWidth,
                    h: tileset.tileHeight,
                },
                anchor: {
                    x: 0,
                    y: 0,
                }
            };
        }
    }
    const sheet = {
        frames: tiles,
        meta: {
            image: tileset.source,
            format: 'RGBA8888',
            size: {
                w: tileset.sourceWidth,
                h: tileset.sourceHeight,
            },
            scale: 1,
        },
    };
    return sheet;
}

async function makeSpritesheetFromTileset(tileset) {
    const tileNamePrefix = tileset.source + '-';
    const sheetData = makeSpritesheetFromGrid(tileset, tileNamePrefix);
    const texture = await PIXI.Assets.load(tileset.source);
    const sheet = new PIXI.Spritesheet(texture, sheetData);
    await sheet.parse();
    // TODO is there a better way of doing this?
    // Manually update the cache
    Object.keys(sheet.textures).forEach(name => {
        PIXI.Assets.cache.set(name, sheet.textures[name]);
    });
    return sheet;
}

onMounted(async () => {
    PIXI.TextureStyle.defaultOptions.scaleMode = 'nearest';
    app = new PIXI.Application();
    await app.init({ background: '#000000', resizeTo: window });

    const map = await loadTiledMap('map.tmx');
    await makeSpritesheetFromTileset(map.tilesets[0].data);

    await PIXI.Assets.load('/sprites/hero.json');

    grid = new Grid({
        // spritesheet: sheet2,
        fixedViewport: false,
        tileSize: 8,
    });
    grid.setTiles(map.layers[0].grid.map(row => {
        return row.map(value => {
            if (value === 0) {
                return null;
            }
            return 'tiles.png-' + (value-1);
        });
    }))
    // grid.x = 10;
    // grid.y = 20;
    grid.viewport.x = 0;
    grid.viewport.y = 0;
    // grid.viewport.width = 40;
    // grid.viewport.height = 45;
    app.stage.addChild(grid);
    app.stage.scale.set(4);

    player = new Player();
    player.x = 20;
    player.y = 48;
    app.stage.addChild(player.sprite);

    playArea.value.appendChild(app.canvas);
    PIXI.Ticker.shared.add(tick);
});

onUnmounted(() => {
    if (app) {
        PIXI.Ticker.shared.remove(tick);
        // PIXI.Assets.unload();
        PIXI.Assets.cache.reset();
        app.destroy();
        app = null;
    }
});

</script>

<template>
    <div ref="playArea">
    </div>
</template>

<style scoped>
</style>
