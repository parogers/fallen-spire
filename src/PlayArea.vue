<script setup lang="ts">
import * as PIXI from 'pixi.js';

import { onMounted, onUnmounted, ref } from 'vue';

import { Game } from './game/game';

let game;
const fpsCooldown = ref(0);
const fps = ref(0);
const playArea = ref();


function tick(time) {
    const dt = time.deltaMS/1000;
    fpsCooldown.value -= dt;
    if (fpsCooldown.value <= 0) {
        fps.value = Math.round(time.FPS);
        fpsCooldown.value = 1;
    }
}


onMounted(async () => {
    game = new Game();
    await game.start();
    playArea.value.appendChild(game.app.canvas);
    PIXI.Ticker.shared.add(tick);
});

onUnmounted(() => {
    if (app) {
        game.destroy();
        PIXI.Ticker.shared.remove(tick);
    }
});

</script>

<template>
    <div class="fps">{{ fps|0 }} FPS</div>
    <div id="play-area" ref="playArea"></div>
</template>

<style scoped>
#play-area {
    font-size: 0;
}

.fps {
    position: absolute;
    top: 1em;
    right: 1em;
    color: white;
    background: black;
}
</style>
