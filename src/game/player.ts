
import * as PIXI from 'pixi.js';

import { Thing } from './thing';

import { Controls } from './controls';


const GRAVITY = 600;
const WALK_FRAMES_PER_PIXEL = 4/13;

enum PlayerState {
    Idle=0,
    Walking,
    Jumping,
}

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
        this.state = PlayerState.Idle;
        this.onGround = false;
        this.jumping = false;
    }

    update(dt: number) {
        const findClosest = (x, y, velx, vely, dt=1) => {
            for (let n = 0; n < 10; n++) {
                if (!this.level.getSolidAt(x + velx*dt, y + vely*dt)) {
                    x += velx*dt;
                    y += vely*dt;
                    break;
                }
                dt /= 2;
            }
            return { x, y };
        }
        const onGround = this.level.getSolidAt(this.x, this.y + 0.1);
        if (this.level.getSolidAt(this.x, this.y)) {
            console.log('player stuck in ground')
        }
        switch(this.state) {
            case PlayerState.Idle:
                this.sprite.texture = this.idleFrame;
                if (!onGround) {
                    this.vely += GRAVITY*dt;
                    this.y = findClosest(this.x, this.y, 0, this.vely, dt).y;
                } else {
                    this.vely = 0;
                    if (this.controls.dx) {
                        this.state = PlayerState.Walking;
                    }
                }
                break;

            case PlayerState.Walking:
                if (!this.controls.dx) {
                    this.state = PlayerState.Idle;
                    break;
                }
                this.velx = this.controls.dx*this.walkSpeed;
                if (!onGround) {
                    this.vely += GRAVITY*dt;
                } else {
                    this.vely = 0;
                }
                const nextx = this.x + this.velx*dt;
                if (this.level.getSolidAt(nextx, this.y)) {
                    this.x = nextx;
                    this.y = findClosest(this.x, this.y-2, 0, 2).y;
                } else {
                    this.x = nextx;
                }
                this.y = findClosest(this.x, this.y, 0, this.vely, dt).y;
                this.facing = this.controls.dx;
                this.sprite.texture = this.walkAnim.update(dt);
                break;

            case PlayerState.Jumping:
                break;
        }
        return;

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
