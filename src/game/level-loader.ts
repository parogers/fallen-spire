
import * as PIXI from 'pixi.js';
import {
    Grid,
    StackedGrid,
    getHitMapFromTileSheet,
    makeDiagonalHitMap,
} from '@parogers/pixijs-easygrid';
import { type Entity, loadTiledMap, makeSpritesheetFromTileset } from './tiled-parsing';
import { Level } from './level';
import { Loader } from './loader';


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


export async function loadLevel(renderer: PIXI.Renderer, src: string)
{
    const map = await loadTiledMap(src);
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
    const mapEntityLayer = map.layers.find(layer => layer.name === 'entities') || [];
    const entities = mapEntityLayer.objects;
    return new Level({ grid: stacked, entities });
}
