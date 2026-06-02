
import * as PIXI from 'pixi.js';
import { Thing } from './thing';


class Animation {
    constructor(frames: string[], fps: number) {
        this.frames = frames;
        this.fps = fps;
        this.frame = 0;
    }

    update(dt) {
        this.frame += this.fps*dt;
        const frameNum = Math.round(this.frame)|0;
        const name = this.frames[frameNum % this.frames.length];
        return PIXI.Assets.cache.get(name);
    }
}


export class Player extends Thing {
    constructor() {
        super();
        this.sprite = new PIXI.Sprite();
        this.sprite.anchor = (0.5, 1);
        this.walkAnim = new Animation([
            'hero-walk-0',
            'hero-walk-1',
            'hero-walk-2',
            'hero-walk-3',
        ], 5);
        this.update(0);
    }

    update(dt: number) {
        this.sprite.texture = this.walkAnim.update(dt);
    }
}
