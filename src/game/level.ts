
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
import { MessageArea } from './message';
import { Door } from './door';

const GRAVITY = 600;
const CAMERA_SMOOTHING_WEIGHT = 0.8;
const CAMERA_OFFSET_SPEED = 30;
const CAMERA_OFFSET_MAX = 20;
export const CAMERA_WIDTH = 200;
export const CAMERA_HEIGHT = 120;



export type LevelParams = {
    grid: Grid;
    background?: Grid;
    entities: Entity[];
}


function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}


class Camera
{
    constructor(level: Level) {
        this.level = level;
        this.offset = 0;
        this.tracking = null;
    }

    updateViewport(dt: number) {
        const viewport = this.level.grid.viewport;
        viewport.width = CAMERA_WIDTH;
        viewport.height = CAMERA_HEIGHT;
        if (this.tracking.velx) {
            const offset = this.offset + CAMERA_OFFSET_SPEED*this.tracking.facing*dt;
            this.offset = Math.min(Math.abs(offset), CAMERA_OFFSET_MAX)*Math.sign(offset);
        }
        const w = CAMERA_SMOOTHING_WEIGHT;
        const trackX = this.tracking.x + this.offset;
        const trackY = this.tracking.y;
        viewport.x = w*viewport.x + (1-w)*clamp(
            trackX - viewport.width/2,
            0,
            this.level.width - viewport.width
        );
        viewport.y = w*viewport.y + (1-w)*clamp(
            trackY - viewport.height/2,
            0,
            this.level.height - viewport.height
        );
        if (this.level.background) {
            this.level.background.viewport.x = viewport.x;
            this.level.background.viewport.y = viewport.y;
            this.level.background.viewport.width = viewport.width;
            this.level.background.viewport.height = viewport.height;
        }
    }
}


export class Level {
    constructor(params: LevelParams) {
        this.grid = params.grid;
        this.background = params.background ?? null;
        this.entities = params.entities;
        this.things = new Set<Thing>();
        this.updaters = new Set<Thing>();
        this.stage = new PIXI.Container();
        this.bg = new PIXI.Graphics().rect(0, 0, CAMERA_WIDTH, CAMERA_HEIGHT).fill({ color: 'black' });
        this.stage.addChild(this.bg);
        if (this.background) {
            this.stage.addChild(this.background);
        }
        this.stage.addChild(this.grid);
        this.gravity = GRAVITY;
        this.player = null;
        this.camera = new Camera(this);
        this.messageArea = new MessageArea(
            CAMERA_WIDTH,
            CAMERA_HEIGHT
        );
        this.stage.addChild(this.messageArea.stage);
        spawn(this);
    }

    get width(): number {
        return this.grid.gridWidth;
    }

    get height(): number {
        return this.grid.gridHeight;
    }

    get tileWidth(): number {
        return this.grid.tileSize.width;
    }

    get tileHeight(): number {
        return this.grid.tileSize.height;
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
            this.camera.tracking = thing;
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
        this.camera.updateViewport(dt);
        this.messageArea.update(dt);
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

    showMessage(msg: string) {
        this.messageArea.show({
            text: msg,
        });
    }
}


export async function loadLevel(renderer: PIXI.Renderer, src: string)
{
    const map = await loadTiledMap(src);
    // const tileset = map.tilesets[0].data;
    // const tileNamePrefix = tileset.source + '-';
    // const sheet = await makeSpritesheetFromTileset(tileset, tileNamePrefix);
    const tileNamePrefix = 'tiles-';
    const sheet = await PIXI.Assets.load('tiles.json');

    const hitMap = getHitMapFromTileSheet(renderer, sheet);
    hitMap.set('tiles-17', makeDiagonalHitMap('down', 'below'));
    hitMap.set('tiles-18', makeDiagonalHitMap('up', 'below'));
    hitMap.set('tiles-10', makeDiagonalHitMap('down', 'below'));
    hitMap.set('tiles-11', makeDiagonalHitMap('up', 'below'));
    const grid = new Grid({
        tileSize: 8,
        hitMap: hitMap,
    });
    const midground = map.layers.find(layer => layer.name === 'grid');
    if (!midground) {
        throw Error('cannot find grid in: ' + src);
    }

    function mapGridToTiles(grid: number[][]): string[][] {
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

    function getBackgroundGrid(): Grid|null {
        const background = map.layers.find(layer => layer.name === 'background');
        if (!background) {
            return null;
        }
        const bg = new Grid({
            tileSize: grid.tileSize,
        });
        bg.setTiles(mapGridToTiles(background.grid));
        return bg;
    }

    grid.setTiles(mapGridToTiles(midground.grid));
    const mapEntityLayer = map.layers.find(layer => layer.name === 'entities') || [];
    const entities = mapEntityLayer.objects;
    return new Level({ grid, entities, background: getBackgroundGrid() });
}


export function spawn(level: Level)
{
    for (let entity of level.entities) {
        if (entity.name === 'spawn') {
            continue;
        }
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
            const x = entity.x  + entity.width/2;
            const y = Math.round(entity.y / level.tileHeight)*level.tileHeight;
            const scenery = new Scenery(entity.name, x, y);
            level.addThing(scenery);
        } else if (entity.type === 'door') {
            const x = entity.x-0.5;
            const y = Math.round(entity.y / level.tileHeight)*level.tileHeight;
            const door = new Door(entity.name);
            door.x = x;
            door.y = y;
            level.addThing(door);
        } else {
            console.warn('ignoring entity type:', entity.type, 'at', entity.x, entity.y);
        }
    }
}
