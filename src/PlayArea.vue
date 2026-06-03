<script setup lang="ts">
import * as PIXI from 'pixi.js';

import { onMounted, onUnmounted, ref } from 'vue';

import { Level, loadLevel } from './game/level';

import { Player } from './game/player';

import { KeyboardControls } from './game/controls';

let app: Application|null = null;
let level;
let controls;
const playArea = ref();


function tick(time)
{
    const dt = time.deltaMS/1000;
    // frame += 2*time.deltaMS/1000;
    // const frameNum = (frame|0) % 2;
    // sprite.texture = sheet.textures['hero-jump-' + frameNum];
    controls.update(dt);
    level.update(dt);
}


onMounted(async () => {
    PIXI.TextureStyle.defaultOptions.scaleMode = 'nearest';
    app = new PIXI.Application();
    await app.init({ background: '#a0a0a0', resizeTo: window });

    await PIXI.Assets.load('/sprites/hero.json');
    level = await loadLevel('map.tmx');

    controls = new KeyboardControls();

    // grid.x = 10;
    // grid.y = 20;
    level.grid.viewport.x = 0;
    level.grid.viewport.y = 0;
    // grid.viewport.width = 40;
    // grid.viewport.height = 45;
    app.stage.addChild(level.stage);
    app.stage.scale.set(4);

    const player = new Player(controls);
    player.level = level;
    player.x = 10;
    player.y = 45;
    level.addThing(player);

    playArea.value.appendChild(app.canvas);
    PIXI.Ticker.shared.add(tick);
});

onUnmounted(() => {
    if (app) {
        controls.destroy();
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
