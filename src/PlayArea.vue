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

function parseTileset(text) {
    const data = new DOMParser().parseFromString(text, 'text/xml');
    const tileset = data.documentElement;
    const tileWidth = +tileset.getAttribute('tilewidth');
    const tileHeight = +tileset.getAttribute('tileheight');
    const spacing = +tileset.getAttribute('spacing');
    const margin = +tileset.getAttribute('margin');
    const columns = +tileset.getAttribute('columns');
    const tileCount = +tileset.getAttribute('tilecount');
    return {
        tileWidth: tileWidth,
        tileHeight: tileHeight,
        spacing: spacing,
        margin: margin,
        columns: columns,
        tileCount: tileCount,
        source: tileset.getElementsByTagName('image')[0].getAttribute('source'),
    };
}

function parseGrid(text, width, height) {
    const grid = text.trim().split('\n').map(line => {
        return line.split(',').filter(value => !!value).map(value => +value);
    });
    return grid;
}

function parseObjectProperties(node) {
    return Object.fromEntries(
        Array.from(node.getElementsByTagName('property'))
            .map(p => [p.getAttribute('name'), p.getAttribute('value')])
    );
}

function parseTiledMap(text) {
    const data = new DOMParser().parseFromString(text, 'text/xml');
    const map = data.documentElement;
    if (map.nodeName !== 'map') {
        throw Exception('file is not a tiled map');
    }
    const tilesets = [];
    const layers = [];
    Array.from(map.children).forEach(child => {
        if (child.nodeName === 'tileset') {
            tilesets.push({
                firstGID: +child.getAttribute('firstgid'),
                src: child.getAttribute('source'),
            });
        } else if (child.nodeName === 'layer') {
            const width = +child.getAttribute('width');
            const height = +child.getAttribute('height');
            const layer = {
                name: child.getAttribute('name'),
                grid: parseGrid(child.children[0].textContent, width, height),
            };
            layers.push(layer);
        } else if (child.tagName === 'objectgroup') {
            const objects = Array.from(child.children).map(data => {
                return {
                    name: data.getAttribute('name'),
                    type: data.getAttribute('type'),
                    x: +data.getAttribute('x'),
                    y: +data.getAttribute('y'),
                    width: +data.getAttribute('width'),
                    height: +data.getAttribute('height'),
                    properties: parseObjectProperties(data),
                };
            });
            layers.push({
                name: child.getAttribute('name'),
                objects: objects,
            });
        }
    });
    return {
        layers: layers,
        tilesets: tilesets,
    }
}

async function loadTiledMap(src) {
    const mapText = await PIXI.Assets.load({
        src: src,
        alias: 'map',
        parser: 'loadTxt',
    });
    const map = parseTiledMap(mapText);

    // Backfill the tileset definitions
    for (let tilesetRef of map.tilesets) {
        const tilesetText = await PIXI.Assets.load({
            src: tilesetRef.src,
            alias: 'tiles',
            parser: 'loadTxt',
        });
        const tileset = parseTileset(tilesetText);
        tilesetRef.data = tileset;
        tileset.texture = await PIXI.Assets.load(tileset.source);
    }
    return map;
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
    console.log(map);

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
