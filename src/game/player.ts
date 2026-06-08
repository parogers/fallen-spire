
import * as PIXI from 'pixi.js';

import { Thing } from './thing';

import { Controls } from './controls';


const GRAVITY = 600;
const WALK_FRAMES_PER_PIXEL = 4/13;

enum PlayerState {
    Idle='idle',
    Walking='walking',
    Jumping='jumping',
    Hanging='hanging',
    ClimbFromHanging='climb-from-hanging',
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

    get frameInt(): number {
        return this.frame|0;
    }

    get isDone() {
        return !this.looping && (this.frame|0) >= this.frames.length;
    }

    update(dt) {
        this.frame += this.fps*dt;
        let frameNum = this.frame|0;
        if (this.looping) {
            frameNum %= this.frames.length;
        } else {
            frameNum = Math.min(frameNum, this.frames.length-1);
        }
        return this.frames[frameNum];
    }

    reset() {
        this.frame = 0;
    }
}


export class Player extends Thing {
    constructor(controls: Controls) {
        super();
        this.sprite = new PIXI.Sprite();
        this.climbFromHangingAnim = new Animation({
            frames: [
                'hero-climb-from-hanging-0',
                'hero-climb-from-hanging-1',
                'hero-climb-from-hanging-2',
                'hero-climb-from-hanging-3',
            ],
            fps: 5,
            looping: false,
        });
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
            fps: 5,
            looping: false,
        });
        this.idleFrame = 'hero-idle-0';
        this.jumpHorizontalFrame = 'hero-jump-horizontal-0';
        this.controls = controls;
        this.jumpSpeed = 110;
        this.walkSpeed = 40;
        this.walkAnim.fps = WALK_FRAMES_PER_PIXEL * this.walkSpeed;
        this.velx = 0;
        this.vely = 0;
        this.state = PlayerState.Idle;
        this.lastState = null;
        this._texture = null;
        // const box = new PIXI.Graphics().rect(-0.5, -0.5, 1, 1).fill({ color: 'red' });
        // this.sprite.addChild(box);
    }

    set texture(name: string) {
        if (this._texture !== name) {
            this._texture = name;
            this.sprite.texture = PIXI.Assets.cache.get(name);
            this.sprite.anchor = PIXI.Assets.cache.get('/sprites/hero.json').data['frames'][name].anchor;
        }
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
            console.warn('player stuck in ground')
        }
        const currentState = this.state;
        switch(this.state) {
            case PlayerState.Idle:
                this.texture = this.idleFrame;
                if (!onGround) {
                    this.vely += GRAVITY*dt;
                    this.moveFurthest(this.x, this.y, 0, this.vely, dt);
                } else {
                    this.vely = 0;
                    if (this.controls.dx) {
                        this.state = PlayerState.Walking;
                    } else if (this.controls.jump.pressed || this.controls.up.pressed) {
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
                this.texture = this.walkAnim.update(dt);
                if (this.controls.jump.pressed) {
                    this.velx = this.facing * this.walkSpeed;
                    this.vely = -this.jumpSpeed;
                    this.state = PlayerState.Jumping;
                }
                break;

            case PlayerState.Jumping:
                if (this.velx === 0) {
                    this.texture = this.jumpVerticalAnim.update(dt);
                    if (this.jumpVerticalAnim.frame < 1) {
                        break;
                    }
                } else {
                    this.texture = this.jumpHorizontalFrame;
                }
                this.vely += GRAVITY*dt;
                this.moveFurthest(this.x, this.y, this.velx, 0, dt);
                this.moveFurthest(this.x, this.y, 0, this.vely, dt);
                if (onGround && this.vely >= 0) {
                    this.state = PlayerState.Idle;
                }
                if (!onGround && Math.abs(this.vely) < 20) {
                    const hands = 16;
                    if (
                        !this.level.getFullSolidAt(this.x + this.facing*2, this.y - hands) &&
                        !this.level.getFullSolidAt(this.x + 1, this.y - (hands-2)) &&
                        this.level.getFullSolidAt(this.x + this.facing*2, this.y - hands/2)
                    ) {
                        this.state = PlayerState.Hanging;
                        const cell = this.level.grid.getCellAt(this.x + this.facing*2, this.y-hands);
                        this.y = cell.y + this.level.grid.tileSize.height + hands;
                        this.x = cell.x + this.level.grid.tileSize.width;
                    }
                }
                break;

            case PlayerState.Hanging:
                if (this.controls.down.pressed) {
                    this.state = PlayerState.Idle;
                } else if (this.controls.up.pressed) {
                    this.state = PlayerState.ClimbFromHanging;
                }
                break;

            case PlayerState.ClimbFromHanging:
                if (this.state !== this.lastState) {
                    this.climbFromHangingAnim.reset();
                    this.y -= 11;
                }
                const lastFrame = this.climbFromHangingAnim.frameInt;
                this.texture = this.climbFromHangingAnim.update(dt);
                if (lastFrame !== this.climbFromHangingAnim.frameInt) {
                    switch(this.climbFromHangingAnim.frameInt) {
                        case 1:
                            this.y -= 2;
                            break;

                        case 2:
                            this.y -= 4;
                            break;
                    }
                }
                if (this.climbFromHangingAnim.isDone) {
                    this.state = PlayerState.Idle;
                    this.sprite.x += this.facing*3;
                    this.moveFurthest(this.x, this.y, 0, 2);
                    this.texture = this.idleFrame;
                }
                break;
        }
        this.lastState = currentState;
    }
}
