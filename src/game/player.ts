
import * as PIXI from 'pixi.js';

import { Thing } from './thing';

import { Controls } from './controls';


const GRAVITY = 600;
const WALK_FRAMES_PER_PIXEL = 4/13;

enum PlayerState {
    Idle='idle',
    Walking='walking',
    Jumping='jumping',
}

type AnimationParams = {
    frames: string[];
    fps: number;
    looping?: boolean;
}

class Animation {
    constructor(params: AnimationParams) {
        this.frames = params.frames;
        this.fps = params.fps;
        this.looping = params.looping ?? true;
        this.frame = 0;
    }

    update(dt) {
        this.frame += this.fps*dt;
        let frameNum = Math.round(this.frame)|0;
        if (this.looping) {
            frameNum %= this.frames.length;
        } else {
            frameNum = Math.min(frameNum, this.frames.length-1);
        }
        const name = this.frames[frameNum];
        return PIXI.Assets.cache.get(name);
    }

    reset() {
        this.frame = 0;
    }
}


export class Player extends Thing {
    constructor(controls: Controls) {
        super();
        this.sprite = new PIXI.Sprite();
        this.sprite.anchor.set(0.5, 14/15);
        this.walkAnim = new Animation({
            frames: [
                'hero-walk-0',
                'hero-walk-1',
                'hero-walk-2',
                'hero-walk-3',
            ],
            fps: 5,
        });
        this.jumpVerticalAnim = new Animation({
            frames: [
                'hero-jump-vertical-0',
                'hero-jump-vertical-1',
            ],
            fps: 3,
            looping: false,
        });
        this.idleFrame = PIXI.Assets.cache.get('hero-idle-0');
        this.jumpHorizontalFrame = PIXI.Assets.cache.get('hero-jump-horizontal-0');
        this.controls = controls;
        this.jumpSpeed = 120;
        this.walkSpeed = 40;
        this.walkAnim.fps = WALK_FRAMES_PER_PIXEL * this.walkSpeed;
        this.velx = 0;
        this.vely = 0;
        this.state = PlayerState.Idle;
        this.lastState = null;
    }

    /* Moves this character as far as possible (ish) in the given direction
     * until it hits an obstacle. */
    moveFurthest(x: number, y: number, velx: number, vely: number, dt: number = 1) {
        for (let n = 0; n < 10; n++) {
            if (!this.level.getSolidAt(x + velx*dt, y + vely*dt)) {
                this.x = x + velx*dt;
                this.y = y + vely*dt;
                break;
            }
            dt /= 2;
        }
    }

    update(dt: number) {
        const onGround = this.level.getSolidAt(this.x, this.y + 0.1);
        if (this.level.getSolidAt(this.x, this.y)) {
            console.warning('player stuck in ground')
        }
        this.lastState = this.state;
        switch(this.state) {
            case PlayerState.Idle:
                this.sprite.texture = this.idleFrame;
                if (!onGround) {
                    this.vely += GRAVITY*dt;
                    this.moveFurthest(this.x, this.y, 0, this.vely, dt);
                } else {
                    this.vely = 0;
                    if (this.controls.dx) {
                        this.state = PlayerState.Walking;
                    } else if (this.controls.jump.pressed) {
                        this.velx = 0;
                        this.vely = -this.jumpSpeed;
                        this.state = PlayerState.Jumping;
                        this.jumpVerticalAnim.reset();
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
                    if (this.level.getSolidAt(this.x, this.y+2)) {
                        this.moveFurthest(this.x, this.y, 0, 2);
                    } else {
                        this.vely += GRAVITY*dt;
                    }
                } else {
                    this.vely = 0;
                }
                const nextx = this.x + this.velx*dt;
                if (this.level.getSolidAt(nextx, this.y)) {
                    if (!this.level.getSolidAt(nextx, this.y-1)) {
                        this.moveFurthest(nextx, this.y-2, 0, 2);
                    }
                } else {
                    this.x = nextx;
                }
                this.moveFurthest(this.x, this.y, 0, this.vely, dt);
                this.facing = this.controls.dx;
                this.sprite.texture = this.walkAnim.update(dt);
                if (this.controls.jump.pressed) {
                    this.velx = this.facing * this.walkSpeed;
                    this.vely = -this.jumpSpeed;
                    this.state = PlayerState.Jumping;
                }
                break;

            case PlayerState.Jumping:
                if (this.velx === 0) {
                    this.sprite.texture = this.jumpVerticalAnim.update(dt);
                    if (this.jumpVerticalAnim.frame < 0.5) {
                        break;
                    }
                } else {
                    this.sprite.texture = this.jumpHorizontalFrame;
                }
                this.vely += GRAVITY*dt;
                this.moveFurthest(this.x, this.y, this.velx, 0, dt);
                this.moveFurthest(this.x, this.y, 0, this.vely, dt);
                if (onGround && this.vely >= 0) {
                    this.state = PlayerState.Idle;
                }
                break;
        }
    }
}
