
import * as PIXI from 'pixi.js';


// TODO - placeholders
export type TiledLayer = any;

export type TiledMap = {
    name: string;
    tilesets: Tileset[];
    layers: TiledLayer[];
    groups: TiledMap[];
}


export type Tileset = {
    tileWidth: number;
    tileHeight: number;
    spacing: number;
    margin: number;
    columns: number;
    tileCount: number;
    source: string;
    sourceWidth: number;
    sourceHeight: number;
}


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


function parseTileset(text: string): Tileset {
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

function parseGrid(text: string, width: number, height: number): number[][] {
    const grid = text.trim().split('\n').map(line => {
        return line.split(',').filter(value => !!value).map(value => +value);
    });
    return grid;
}

function parseObjectProperties(node: Element): { [key: string]: string } {
    return Object.fromEntries(
        Array.from(node.getElementsByTagName('property'))
            .map(p => [p.getAttribute('name'), p.getAttribute('value')])
    );
}

function parseTiledMap(doc: Element): TiledMap {
    if (doc.nodeName !== 'map' && doc.nodeName !== 'group') {
        throw Error('file is not a tiled map');
    }
    const map = {
        name: doc.getAttribute('name') ?? '',
        tilesets: [],
        layers: [],
        groups: [],
    };
    Array.from(doc.children).forEach(child => {
        if (child.nodeName === 'tileset') {
            map.tilesets.push({
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
            map.layers.push(layer);
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
            map.layers.push(layer);
        } else if (child.tagName === 'group') {
            const group = parseTiledMap(child);
            map.groups.push(group);
        }
    });
    return map;
}

export async function loadTiledMap(mapText: string): TiledMap {
    const data = new DOMParser().parseFromString(mapText, 'text/xml');
    const map = parseTiledMap(data.documentElement);
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


export function makeSpritesheetFromGrid(tileset: Tileset, tileNamePrefix: string) {
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


export async function makeSpritesheetFromTileset(
    tileset: Tileset,
    tileNamePrefix: string
): PIXI.Spritesheet {
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
