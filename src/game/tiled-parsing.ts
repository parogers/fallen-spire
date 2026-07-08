
import * as PIXI from 'pixi.js';


// TODO - placeholders
export type TiledLayer = any;

export type TiledMap = {
    name: string;
    offsetX: number;
    offsetY: number;
    tilesets: Tileset[];
    layers: TiledLayer[];
    groups: TiledMap[];
    properties: { [name: string]: any };
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
        cols: doc.getAttribute('width'),
        rows: doc.getAttribute('height'),
        tilesets: [],
        layers: [],
        groups: [],
        properties: [],
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
        } else if (child.tagName === 'properties') {
            map.properties = parseObjectProperties(child);
        }
    });
    return map;
}


function sliceGrid(grid: number[][], startRow: number, endRow: number, startCol: number, endCol: number) {
    return grid.slice(startRow, endRow+1).map(row => row.slice(startCol, endCol+1));
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
    for (let sub of map.groups) {
        let startRow = map.rows;
        let startCol = map.cols;
        let endRow = 0;
        let endCol = 0;
        const marginTop = sub.properties['margin-top'] ?? 0;
        const marginBottom = sub.properties['margin-bottom'] ?? 0;
        for (let layer of sub.layers) {
            if (layer.grid) {
                for (let row = 0; row < map.rows; row++) {
                    for (let col = 0; col < map.cols; col++) {
                        if (layer.grid[row][col]) {
                            startRow = Math.min(startRow, row);
                            startCol = Math.min(startCol, col);
                            endRow = Math.max(endRow, row);
                            endCol = Math.max(endCol, col);
                        }
                    }
                }
            }
        }
        startRow = Math.max(startRow - marginTop, 0);
        endRow = Math.min(endRow + marginBottom, map.rows-1);
        const offsetX = startCol*map.tilesets[0].data.tileWidth;
        const offsetY = startRow*map.tilesets[0].data.tileHeight;
        sub.offsetX = offsetX;
        sub.offsetY = offsetY;
        for (let layer of sub.layers) {
            if (layer.grid) {
                layer.grid = sliceGrid(layer.grid, startRow, endRow, startCol, endCol);
            }
            if (layer.objects) {
                for (let obj of layer.objects) {
                    obj.x -= offsetX;
                    obj.y -= offsetY;
                }
            }
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
