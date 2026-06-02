<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import * as PIXI from 'pixi.js';
import { loadTiledMap } from './tiled-parsing';

let sprite;
let frame = 0;
let app: Application|null = null;
let sheet;
const playArea = ref();

function tick(time)
{
    frame += 2*time.deltaMS/1000;
    const frameNum = (frame|0) % 2;
    sprite.texture = sheet.textures['hero-jump-' + frameNum];
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
    return sheet;
}

onMounted(async () => {
    PIXI.TextureStyle.defaultOptions.scaleMode = 'nearest';
    app = new PIXI.Application();
    await app.init({ background: '#1099bb', resizeTo: window });
    sheet = await PIXI.Assets.load('/sprites/hero.json');
    sprite = new PIXI.Sprite(sheet.textures['hero-walk-0']);
    sprite.x = 10;
    sprite.y = 9;
    app.stage.scale.set(4);
    app.stage.addChild(sprite);

    const sprite2 = new PIXI.Sprite(sheet.textures['hero-idle-0']);
    sprite2.x = 20;
    sprite2.y = 10;
    app.stage.addChild(sprite2);

    const map = await loadTiledMap('map.tmx');
    for (let tilesetRef of map.tilesets) {
        const sheet = await makeSpritesheetFromTileset(tilesetRef.data);
        const tile = new PIXI.Sprite(sheet.textures['tiles.png-8']);
        tile.x = 10;
        tile.y = 50;
        app.stage.addChild(tile);
        console.log(sheet);
    }

    playArea.value.appendChild(app.canvas);
    PIXI.Ticker.shared.add(tick);
});

onUnmounted(() => {
    if (app) {
        PIXI.Ticker.shared.remove(tick);
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
