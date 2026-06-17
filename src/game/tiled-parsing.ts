
import * as PIXI from 'pixi.js';


export type Entity = {
    name: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    facing: number;
    properties: { [name: string]: any };
}


function parseTileset(text) {
    const data = new DOMParser().parseFromString(text, 'text/xml');
    const tileset = data.documentElement;
    if (tileset.nodeName !== 'tileset') {
        throw Error('expecting tileset root to be "tileset"');
    }
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
    const layersByName = {};
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
                    facing: (+data.getAttribute('gid') & (2**31)) ? -1 : 1,
                    properties: parseObjectProperties(data),
                };
            });
            const layer = {
                name: child.getAttribute('name'),
                objects: objects,
            };
            layers.push(layer);
            layersByName[layer.name] = layer;
        }
    });
    return {
        layersByName,
        layers,
        tilesets,
    };
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
        try {
            const tileset = parseTileset(tilesetText);
            tilesetRef.data = tileset;
            tileset.texture = await PIXI.Assets.load(tileset.source);
        } catch(error) {
            console.error('error parsing tileset: ' + tilesetRef.src);
            throw error;
        }
    }
    return map;
}


export function makeSpritesheetFromGrid(tileset, tileNamePrefix) {
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


export async function makeSpritesheetFromTileset(tileset, tileNamePrefix) {
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
