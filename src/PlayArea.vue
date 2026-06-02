<script setup lang="ts">
import * as PIXI from 'pixi.js';

import { onMounted, onUnmounted, ref } from 'vue';

import { Grid } from '@parogers/pixijs-easygrid';

import { loadTiledMap, makeSpritesheetFromTileset } from './tiled-parsing';

import { Player } from './game/player';

let app: Application|null = null;
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


async function loadMap(src) {
    const map = await loadTiledMap(src);
    const tileset = map.tilesets[0].data;
    const tileNamePrefix = tileset.source + '-';
    await makeSpritesheetFromTileset(tileset, tileNamePrefix);

    grid = new Grid({
        fixedViewport: false,
        tileSize: 8,
    });
    grid.setTiles(map.layers[0].grid.map(row => {
        return row.map(value => {
            if (value === 0) {
                return null;
            }
            return tileNamePrefix + (value-1);
        });
    }));
    return {
        grid,
    };
}


onMounted(async () => {
    PIXI.TextureStyle.defaultOptions.scaleMode = 'nearest';
    app = new PIXI.Application();
    await app.init({ background: '#000000', resizeTo: window });

    await PIXI.Assets.load('/sprites/hero.json');
    const { grid } = await loadMap('map.tmx');

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
