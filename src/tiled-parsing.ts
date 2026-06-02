
import * as PIXI from 'pixi.js';


function parseTileset(text) {
    const data = new DOMParser().parseFromString(text, 'text/xml');
    const tileset = data.documentElement;
    const tileWidth = +tileset.getAttribute('tilewidth');
    const tileHeight = +tileset.getAttribute('tileheight');
    const spacing = +tileset.getAttribute('spacing');
    const margin = +tileset.getAttribute('margin');
    const columns = +tileset.getAttribute('columns');
    const tileCount = +tileset.getAttribute('tilecount');
    const image = tileset.getElementsByTagName('image')[0];
    return {
        tileWidth: tileWidth,
        tileHeight: tileHeight,
        spacing: spacing,
        margin: margin,
        columns: columns,
        tileCount: tileCount,
        source: image.getAttribute('source'),
        sourceWidth: image.getAttribute('width'),
        sourceHeight: image.getAttribute('height'),
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

export async function loadTiledMap(src) {
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
