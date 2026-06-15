
import * as PIXI from 'pixi.js';

import {
    Grid,
    getHitMapFromTileSheet,
    makeDiagonalHitMap,
} from '@parogers/pixijs-easygrid';

import { Thing } from './thing';
import { Scenery } from './scenery';
import { Player } from './player';
import { type Entity, loadTiledMap, makeSpritesheetFromTileset } from './tiled-parsing';
import { Rat } from './rat';
import { Zombie } from './zombie';


const GRAVITY = 600;


function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

export class Level {
    constructor(grid: Grid, entities: Entity[]) {
        this.grid = grid;
        this.entities = entities;
        this.things = new Set<Thing>();
        this.updaters = new Set<Thing>();
        this.stage = new PIXI.Container();
        this.stage.addChild(grid);
        this.gravity = GRAVITY;
        this.player = null;
        this.cameraOffset = 0;
        spawn(this);
    }

    get midground(): PIXI.Container {
        return this.grid.foreground;
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
        this.grid.viewport.width = 200;
        this.grid.viewport.height = 100;
        if (this.player.velx) {
            const offset = this.cameraOffset + 30*this.player.facing*dt;
            this.cameraOffset = Math.min(Math.abs(offset), 20)*Math.sign(offset);
        }
        const w = 0.8;
        const trackX = this.player.x + this.cameraOffset;
        const trackY = this.player.y;
        this.grid.viewport.x = w*this.grid.viewport.x + (1-w)*clamp(
            trackX - this.grid.viewport.width/2,
            0,
            this.grid.gridWidth
        );
        this.grid.viewport.y = w*this.grid.viewport.y + (1-w)*clamp(
            trackY - this.grid.viewport.height/2,
            0,
            this.grid.gridHeight
        );
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
        } else if (entity.type === 'scenery') {
            const scenery = new Scenery(entity.name);
            scenery.x = entity.x  + entity.width/2;
            scenery.y = entity.y;
            level.addThing(scenery);
        }
    }
}
