<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import * as PIXI from 'pixi.js';

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

    playArea.value.appendChild(app.canvas);
    PIXI.Ticker.shared.add(tick);
    console.log('mounted!');
});

onUnmounted(() => {
    console.log('unmounted');
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
