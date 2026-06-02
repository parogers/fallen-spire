
import * as PIXI from 'pixi.js';

import { Grid } from '@parogers/pixijs-easygrid';

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
        this.things.delete(thing);
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
}


export async function loadLevel(src: string)
{
    const map = await loadTiledMap(src);
    const tileset = map.tilesets[0].data;
    const tileNamePrefix = tileset.source + '-';
    await makeSpritesheetFromTileset(tileset, tileNamePrefix);

    const grid = new Grid({
        fixedViewport: false,
        tileSize: 8,
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
