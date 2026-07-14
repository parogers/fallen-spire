
import * as PIXI from 'pixi.js';

import { Animation } from './anim';
import { Thing } from './thing';
import { Scenery } from './scenery';
import { Player } from './player';
import { Rat } from './rat';
import { Zombie } from './zombie';
import { MessageArea } from './message';
import { Door, type DoorParams } from './door';
import { getRenderer } from './renderer';

const GRAVITY = 600;
const CAMERA_SMOOTHING_WEIGHT = 0.8;
const CAMERA_OFFSET_SPEED = 30;
const CAMERA_OFFSET_MAX = 20;
export const CAMERA_WIDTH = 200;
export const CAMERA_HEIGHT = 120;


export enum LevelEvent {
    ChangeLevel='change-level',
}


enum LevelState {
    Playing,
    Entering,
    Leaving,
}


export type LevelParams = {
    grid: StackedGrid;
    entities: Entity[];
    offsetX?: number;
    offsetY?: number;
    darkness?: boolean;
}


function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}


function renderDarkness(radius: number, blur: number=2)
{
    const width = CAMERA_WIDTH*2;
    const height = CAMERA_HEIGHT*2;
    const renderTexture = PIXI.RenderTexture.create({ width, height });
    let graphics = new PIXI.Graphics();
    const centerX = width/2;
    const centerY = height/2;

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const check = (dx**2 + 1.5*dy**2) ** 0.5;
            if (
                check > radius ||
                check >= radius-blur && Math.abs(dx) % 2 === Math.abs(dy) % 2
            ) {
                graphics = graphics.rect(x, y, 1, 1);
            }
        }
    }
    graphics = graphics.fill({ color: '#000000' });
    getRenderer().render({ container: graphics, target: renderTexture });
    return renderTexture;
}


class Darkness extends Thing {
    constructor() {
        super();
        this.sprite = new PIXI.Sprite();
        this.sprite.anchor.set(0.5);
        this.z = 1000;
        this.anim = new Animation({
            frames: [
                renderDarkness(32),
                renderDarkness(31.5),
            ],
            fps: 10,
        });
    }

    update(dt: number) {
        this.sprite.texture = this.anim.update(dt);
    }
}


class Camera
{
    constructor(level: Level) {
        this.level = level;
        this.offset = 0;
        this.tracking = null;
        this.firstUpdate = true;
        this.width = CAMERA_WIDTH;
        this.height = CAMERA_HEIGHT;
    }

    updateViewport(dt: number) {
        const viewport = this.level.grid.viewport;
        viewport.width = this.width;
        viewport.height = this.height;
        if (this.tracking.velx) {
            const offset = this.offset + CAMERA_OFFSET_SPEED*this.tracking.facing*dt;
            this.offset = Math.min(Math.abs(offset), CAMERA_OFFSET_MAX)*Math.sign(offset);
        }
        const w = this.firstUpdate ? 0 : CAMERA_SMOOTHING_WEIGHT;
        const trackX = this.tracking.x + this.offset;
        const trackY = this.tracking.y;
        if (this.level.width < viewport.width) {
            viewport.x = -(viewport.width/2 - this.level.width/2);
        } else {
            viewport.x = w*viewport.x + (1-w)*clamp(
                trackX - viewport.width/2,
                0,
                this.level.width - viewport.width
            );
        }
        if (this.level.height < viewport.height) {
            viewport.y = -(viewport.height/2 - this.level.height/2);
        } else {
            viewport.y = w*viewport.y + (1-w)*clamp(
                trackY - viewport.height/2,
                0,
                this.level.height - viewport.height
            );
        }
        this.firstUpdate = false;
    }
}


export class Level {
    darkness: PIXI.Sprite|null = null;

    constructor(params: LevelParams) {
        this.grid = params.grid;
        this.entities = params.entities;
        this.things = new Set<Thing>();
        this.updaters = new Set<Thing>();
        this.stage = new PIXI.Container();
        this.bg = new PIXI.Graphics().rect(0, 0, CAMERA_WIDTH, CAMERA_HEIGHT).fill({ color: 'black' });
        this.stage.addChild(this.bg);
        this.stage.addChild(this.grid);
        this.gravity = GRAVITY;
        this.player = null;
        this.camera = new Camera(this);
        this.messageArea = new MessageArea(
            CAMERA_WIDTH,
            CAMERA_HEIGHT
        );
        this.stage.addChild(this.messageArea.stage);
        this.targetLevel = null;
        this.offsetX = params.offsetX ?? 0;
        this.offsetY = params.offsetY ?? 0;
        this.state = LevelState.Entering;
        this.curtain = new PIXI.Graphics().rect(0, 0, CAMERA_WIDTH, CAMERA_HEIGHT).fill({ color: 0 });
        this.stage.addChild(this.curtain);
        if (params.darkness) {
            this.darkness = new Darkness();
            this.addThing(this.darkness);
        }
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
        return this.grid.layersByName.get('midground');
    }

    addThing(thing: Thing) {
        if (!this.things.has(thing)) {
            thing.level = this;
            this.things.add(thing);
            if (thing.sprite) {
                this.midground.foreground.addChild(thing.sprite);
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
            this.midground.foreground.removeChild(thing.sprite);
        }
        if (thing instanceof Player) {
            this.player = null;
        }
    }

    update(dt: number) {
        if (this.state === LevelState.Playing || this.state === LevelState.Entering) {
            this.messageArea.update(dt);
            this.updaters.values().forEach(thing => {
                if (thing.update) {
                    thing.update(dt);
                }
            });
            this.camera.updateViewport(dt);
            this.grid.update(dt);
            if (this.player && this.darkness) {
                this.darkness.x = this.player.x - 2;
                this.darkness.y = this.player.y - 4;
            }
            if (this.targetLevel) {
                this.state = LevelState.Leaving;
                return;
            }
        }
        if (this.state === LevelState.Entering) {
            this.camera.updateViewport(dt);
            this.grid.update(dt);
            this.curtain.alpha -= 4*dt;
            if (this.curtain.alpha <= 0) {
                this.state = LevelState.Playing;
            }
        } else if (this.state === LevelState.Leaving) {
            this.curtain.alpha += 4*dt;
            if (this.curtain.alpha >= 1) {
                return {
                    type: LevelEvent.ChangeLevel,
                    level: this.targetLevel,
                };
            }
        }
    }

    getSolidAt(x: number, y: number): boolean {
        return this.midground.getSolidAt(x, y);
    }

    getFullSolidAt(x: number, y: number): boolean {
        return !!this.midground.getTileInfoAt(x, y);
    }

    findEntity(name: string): Entity|null {
        return this.entities.find(e => e.name === name) ?? null;
    }

    showMessage(msg: string) {
        this.messageArea.show({
            text: msg,
        });
    }

    findThing(func: (thing: Thing) => boolean): Thing|null {
        return this.things.values().find(func) ?? null;
    }

    triggerLevelChange(level: string) {
        this.targetLevel = level;
    }
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
            const door = new Door(entity.name, {
                level: entity.properties['level'],
            });
            door.x = x;
            door.y = y;
            level.addThing(door);
        } else {
            console.warn('ignoring entity type:', entity.type, 'at', entity.x, entity.y);
        }
    }
}
