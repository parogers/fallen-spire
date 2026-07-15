
import * as PIXI from 'pixi.js';
import {
    Grid,
    StackedGrid,
    getHitMapFromTileSheet,
    makeDiagonalHitMap,
} from '@parogers/pixijs-easygrid';
import { type Entity } from './tiled-parsing';
import { Level } from './level';
import { Loader } from './loader';


function makeGrid(rows: number, cols: number): number[][] {
    return new Array(rows).fill(0).map(() => new Array(cols).fill(null));
}


function mapGridToTiles(grid: number[][], tileNamePrefix: string): string[][] {
    return grid.map(row => {
        return row.map(value => {
            if (value === 0) {
                return null;
            }
            const tile = tileNamePrefix + ('' + (value-1)).padStart(2, '0');
            return tile;
        });
    })
}

function getBackgroundGrid(map, tileNamePrefix): Grid|null {
    const background = map.layers.find(layer => layer.name === 'background');
    if (!background) {
        return null;
    }
    const bg = new Grid({
        autoUpdate: false,
        tiles: mapGridToTiles(background.grid, tileNamePrefix),
    });
    return bg;
}


function getMidgroundGrid(map, renderer, tileNamePrefix: string): Grid|null {
    const midground = map.layers.find(layer => layer.name === 'grid');
    if (!midground) {
        return null;
    }
    const sheet = Loader.getTilesSpritesheet();
    const hitMap = getHitMapFromTileSheet(renderer, sheet);
    hitMap.set('tiles-17', makeDiagonalHitMap('down', 'below'));
    hitMap.set('tiles-18', makeDiagonalHitMap('up', 'below'));
    hitMap.set('tiles-10', makeDiagonalHitMap('down', 'below'));
    hitMap.set('tiles-11', makeDiagonalHitMap('up', 'below'));
    const grid = new Grid({
        hitMap: hitMap,
        autoUpdate: false,
        tiles: mapGridToTiles(midground.grid, tileNamePrefix),
    });
    return grid;
}


function makeFadedGrid(rows: number, cols: number): Grid {
    const faded = makeGrid(rows, cols);
    for (let r = 0; r < rows; r++) {
        faded[r][0] = 'tiles-05';
        faded[r][cols-1] = 'tiles-12';
    }
    faded[0][1] = 'tiles-12';
    const grid = new Grid({
        tiles: faded,
    });
    return grid;
}


export function loadLevel(renderer: PIXI.Renderer, map: TiledMap): Level
{
    const tileNamePrefix = 'tiles-';
    const stacked = new StackedGrid();
    const midground = getMidgroundGrid(map, renderer, tileNamePrefix);
    if (!midground) {
        throw Error('cannot find grid in: ' + src);
    }
    const bg = getBackgroundGrid(map, tileNamePrefix);
    if (bg) {
        stacked.addGrid(bg, 'background');
    }
    stacked.addGrid(midground, 'midground');
    if (map.properties['faded-edges']) {
        stacked.addGrid(makeFadedGrid(midground.rows, midground.cols));
    }
    const mapEntityLayer = map.layers.find(layer => layer.name === 'entities');
    const entities = mapEntityLayer?.objects ?? [];
    return new Level({
        grid: stacked,
        entities,
        offsetX: map.offsetX,
        offsetY: map.offsetY,
        darkness: map.properties['darkness'] ?? false,
    });
}


export class LevelManager {
    tiledMapsByName = new Map();

    constructor(renderer: PIXI.Renderer)
    {
        this.renderer = renderer;
        for (let name of Loader.getAssetNames()) {
            if (!name.endsWith('.tmx')) {
                continue;
            }
            const map = PIXI.Assets.cache.get(name);
            for (let group of map.groups) {
                if (this.tiledMapsByName.has(group.name)) {
                    throw Error('duplicate map found: ' + group.name);
                }
                this.tiledMapsByName.set(group.name, group);
            }
        }
    }

    loadLevel(name: string): Level|null {
        const map = this.tiledMapsByName.get(name);
        if (!map) {
            throw Error('cannot find map: ' + name);
        }
        return loadLevel(this.renderer, map);
    }
}
