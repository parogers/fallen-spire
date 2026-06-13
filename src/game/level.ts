
import * as PIXI from 'pixi.js';

import {
    Grid,
    getHitMapFromTileSheet,
    makeDiagonalHitMap,
} from '@parogers/pixijs-easygrid';

import { Thing } from './thing';
import { Player } from './player';
import { type Entity, loadTiledMap, makeSpritesheetFromTileset } from './tiled-parsing';
import { Rat } from './rat';
import { Zombie } from './zombie';


const GRAVITY = 600;


export class Level {
    constructor(grid: Grid, entities: Entity[]) {
        this.grid = grid;
        this.entities = entities;
        this.things = new Set<Thing>();
        this.updaters = new Set<Thing>();
        this.midground = new PIXI.Container();
        this.stage = new PIXI.Container();
        this.stage.addChild(grid);
        this.stage.addChild(this.midground);
        this.gravity = GRAVITY;
        this.player = null;
        spawn(this);
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
        if (thing instanceof Player) {
            this.player = thing;
            this.player.unstickPostSpawn();
        }
    }

    removeThing(thing: Thing) {
        thing.level = null;
        this.things.delete(thing);
        this.updaters.delete(thing);
        if (thing.sprite) {
            this.midground.removeChild(thing.sprite);
        }
        if (thing instanceof Player) {
            this.player = null;
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

    findEntity(name: string): Entity|null {
        return this.entities.find(e => e.name === name) ?? null;
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
    const mapGrid = map.layers.find(layer => layer.name === 'grid');
    if (!mapGrid) {
        throw Error('cannot find grid in: ' + src);
    }
    grid.setTiles(map.layers[0].grid.map(row => {
        return row.map(value => {
            if (value === 0) {
                return null;
            }
            return tileNamePrefix + (value-1);
        });
    }));
    const mapEntityLayer = map.layers.find(layer => layer.name === 'entities') || [];
    const entities = mapEntityLayer.objects;
    return new Level(grid, entities);
}


export function spawn(level: Level)
{
    for (let entity of level.entities) {
        if (entity.type === 'monster') {
            if (entity.name === 'rat') {
                const rat = new Rat();
                rat.x = entity.x + entity.width/2;
                rat.y = entity.y;
                rat.facing = entity.facing;
                level.addThing(rat);
                rat.unstickPostSpawn();
            } else if (entity.name === 'zombie') {
                const m = new Zombie();
                m.x = entity.x + entity.width/2;
                m.y = entity.y;
                m.facing = entity.facing;
                level.addThing(m);
                m.unstickPostSpawn();
            } else {
                console.warn('unknown monster type: ' + entity.type);
            }
        }
    }
}
