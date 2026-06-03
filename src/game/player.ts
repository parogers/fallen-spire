
import * as PIXI from 'pixi.js';

import { Thing } from './thing';

import { Controls } from './controls';


const GRAVITY = 600;
const WALK_FRAMES_PER_PIXEL = 4/13;


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
    constructor(controls: Controls) {
        super();
        this.sprite = new PIXI.Sprite();
        this.sprite.anchor.set(0.5, 14/15);
        this.walkAnim = new Animation([
            'hero-walk-0',
            'hero-walk-1',
            'hero-walk-2',
            'hero-walk-3',
        ], 5);
        this.idleFrame = PIXI.Assets.cache.get('hero-idle-0');
        this.controls = controls;
        this.walkSpeed = 40;
        this.walkAnim.fps = WALK_FRAMES_PER_PIXEL * this.walkSpeed;
        this.velx = 0;
        this.vely = 0;
        this.onGround = false;
        this.jumping = false;
    }

    update(dt: number) {
        this.onGround = this.level.getSolidAt(this.x, this.y + 0.1);
        if (this.onGround && !this.jumping) {
            if (this.controls.dx) {
                this.facing = this.controls.dx;
                this.sprite.texture = this.walkAnim.update(dt);
                this.velx = this.walkSpeed * this.controls.dx;
            } else {
                this.sprite.texture = this.idleFrame;
                this.velx = 0;
            }
        }
        if (!this.onGround || this.jumping) {
            this.jumping = false;
            this.vely += GRAVITY*dt;
            let dtt = dt;
            for (let n = 0; n < 10; n++) {
                if (!this.level.getSolidAt(this.x, this.y + this.vely*dtt)) {
                    this.y += this.vely*dtt;
                    break;
                }
                dtt /= 2;
                if (n === 4) {
                    this.vely = 0;
                    this.onGround = true;
                }
            }
        }
        if (!this.level.getSolidAt(this.x + this.velx*dt, this.y)) {
            this.x += this.velx*dt;
        }
        if (this.controls.jump.pressed && this.onGround) {
            this.velx = 50*this.facing;
            this.vely = -125;
            this.jumping = true;
        }
    }
}
