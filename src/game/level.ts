
import * as PIXI from 'pixi.js';

import {
    Grid,
    getHitMapFromTileSheet,
    makeDiagonalHitMap,
} from '@parogers/pixijs-easygrid';

import { Thing } from './thing';

import { loadTiledMap, makeSpritesheetFromTileset } from './tiled-parsing';


export class Level {
    constructor(grid: Grid) {
        this.grid = grid;
        this.things = new Set<Thing>();
        this.updaters = new Set<Thing>();
        this.midground = new PIXI.Container();
        this.stage = new PIXI.Container();
        this.stage.addChild(grid);
        this.stage.addChild(this.midground);
    }

    addThing(thing: Thing) {
        if (!this.things.has(thing)) {
            thing.level = this;
            this.things.add(thing);
            if (thing.sprite) {
                this.midground.addChild(thing.sprite);
            }
        }
        if (!this.updaters.has(thing) && thing.update) {
            this.updaters.add(thing);
        }
    }

    removeThing(thing: Thing) {
        thing.level = null;
        this.things.delete(thing);
        this.updaters.delete(thing);
        if (thing.sprite) {
            this.midground.removeChild(thing.sprite);
        }
    }

    update(dt: number) {
        this.grid.update(dt);
        this.updaters.values().forEach(thing => {
            if (thing.update) {
                thing.update(dt);
            }
        });
    }

    getSolidAt(x: number, y: number): boolean {
        return this.grid.getSolidAt(x, y);
    }

    getFullSolidAt(x: number, y: number): boolean {
        return !!this.grid.getTileInfoAt(x, y);
    }
}


export async function loadLevel(renderer: PIXI.Renderer, src: string)
{
    const map = await loadTiledMap(src);
    const tileset = map.tilesets[0].data;
    const tileNamePrefix = tileset.source + '-';
    const sheet = await makeSpritesheetFromTileset(tileset, tileNamePrefix);

    const hitMap = getHitMapFromTileSheet(renderer, sheet);
    hitMap.set('tiles.png-17', makeDiagonalHitMap('down', 'below'));
    hitMap.set('tiles.png-18', makeDiagonalHitMap('up', 'below'));
    const grid = new Grid({
        fixedViewport: false,
        tileSize: 8,
        hitMap: hitMap,
    });
    grid.setTiles(map.layers[0].grid.map(row => {
        return row.map(value => {
            if (value === 0) {
                return null;
            }
            return tileNamePrefix + (value-1);
        });
    }));
    return new Level(grid);
}
