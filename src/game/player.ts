
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


class BaseAnimation {
    constructor() {
        this.frame = 0;
    }

    get frameInt(): number {
        return this.frame|0;
    }

    get isDone() {
        return false;
    }

    update(dt) {
        return null;
    }

    reset() {
        this.frame = 0;
    }
}


class Animation extends BaseAnimation {
    constructor(params: AnimationParams) {
        super();
        this.frames = params.frames;
        this.fps = params.fps ?? 1;
        this.looping = params.looping ?? true;
        this.frame = 0;
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
}


class AnimationGroup extends BaseAnimation {
    constructor(anim1: Animation, anim2: Animation) {
        super();
        this.anim1 = anim1;
        this.anim2 = anim2;
        this.current = anim1;
        this.state = false;
    }

    set state(value: boolean) {
        this._state = value;
        if (value) {
            this.current = this.anim2;
        } else {
            this.current = this.anim1;
        }
    }

    set fps(value: number) {
        this.anim1.fps = value;
        this.anim2.fps = value;
    }

    get fps(): number {
        return this.current.fps;
    }

    get isDone(): boolean {
        return this.current.isDone;
    }

    update(dt) {
        const texture = this.current.update(dt);
        if (this.current === this.anim1) {
            this.anim2.frame = this.anim1.frame;
        } else {
            this.anim1.frame = this.anim2.frame;
        }
        return texture;
    }

    reset() {
        this.anim1.frame = 0;
        this.anim2.frame = 0;
    }
}


enum ShotState {
    Flying,
    Exploding,
}


class Shot extends Thing {
    constructor(velx) {
        super();
        this.flyAnim = new Animation({
            frames: [
                'effects-shot-0',
                'effects-shot-1',
            ],
            fps: 10,
        });
        this.explodeAnim = new Animation({
            frames: [
                'effects-shot-2',
                'effects-shot-3',
                'effects-shot-4',
                'effects-shot-5',
            ],
            fps: 15,
            looping: false,
        });
        this.sprite = new PIXI.Sprite();
        this.sprite.texture = PIXI.Assets.cache.get('effects-shot-0');
        this.sprite.anchor = PIXI.Assets.cache.get('/sprites/hero.json').data['frames']['effects-shot-0'].anchor;
        this.facing = Math.sign(velx);
        this.velx = velx;
        this.state = ShotState.Flying;
    }

    update(dt) {
        switch(this.state) {
            case ShotState.Flying:
                this.sprite.texture = PIXI.Assets.cache.get(this.flyAnim.update(dt));
                this.x += this.velx*dt;
                if (this.level.getSolidAt(this.x, this.y)) {
                    this.state = ShotState.Exploding;
                }
                break;

            case ShotState.Exploding:
                this.sprite.texture = PIXI.Assets.cache.get(this.explodeAnim.update(dt));
                if (this.explodeAnim.isDone) {
                    this.level.removeThing(this);
                }
                break;
        }
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
        this.walkAnimGroup = new AnimationGroup(
            new Animation({
                frames: [
                    'hero-walk-0',
                    'hero-walk-1',
                    'hero-walk-2',
                    'hero-walk-3',
                ],
                fps: 5,
            }),
            new Animation({
                frames: [
                    'hero-walk-gesture-0',
                    'hero-walk-gesture-1',
                    'hero-walk-gesture-2',
                    'hero-walk-gesture-3',
                ],
                fps: 5,
            }),
        )
        this.jumpVerticalAnim = new Animation({
            frames: [
                'hero-jump-vertical-0',
                'hero-jump-vertical-1',
            ],
            fps: 5,
            looping: false,
        });
        this.idlePlainFrame = 'hero-idle-0';
        this.idleGestureFrame = 'hero-idle-gesture-0';
        this.jumpHorizontalFrame = 'hero-jump-horizontal-0';
        this.controls = controls;
        this.jumpSpeed = 110;
        this.walkSpeed = 40;
        this.walkAnim.fps = WALK_FRAMES_PER_PIXEL * this.walkSpeed;
        this.velx = 0;
        this.vely = 0;
        this.state = PlayerState.Idle;
        this.lastState = null;
        this.attacking = false;
        this._texture = null;
        // const box = new PIXI.Graphics().rect(-0.5, -0.5, 1, 1).fill({ color: 'red' });
        // this.sprite.addChild(box);
    }

    get idleFrame(): string {
        if (this.attacking) {
            return this.idleGestureFrame;
        }
        return this.idlePlainFrame;
    }

    get walkAnim(): Animation {
        // TODO - kind of hacky
        this.walkAnimGroup.state = this.attacking;
        return this.walkAnimGroup;
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
            console.warn('player stuck in ground');
        }
        const currentState = this.state;
        const isStateChanged = this.state !== this.lastState;
        this.updateAttack();
        switch(this.state) {
            case PlayerState.Idle:
                if (this.controls.attack.pressed) {
                    this.startAttack();
                }
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
                    }
                }
                break;

            case PlayerState.Walking:
                if (!this.controls.dx) {
                    this.state = PlayerState.Idle;
                    break;
                }
                if (isStateChanged) {
                    this.walkAnim.reset();
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
                if (this.controls.attack.pressed) {
                    this.startAttack();
                }
                this.texture = this.walkAnim.update(dt);
                if (this.controls.jump.pressed) {
                    this.velx = this.facing * this.walkSpeed;
                    this.vely = -this.jumpSpeed;
                    this.state = PlayerState.Jumping;
                }
                break;

            case PlayerState.Jumping:
                if (isStateChanged) {
                    this.jumpVerticalAnim.reset();
                }
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
                if (isStateChanged) {
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

    startAttack() {
        const shot = new Shot(this.facing*100);
        shot.x = this.x + this.facing*6;
        shot.y = this.y - 8;
        this.level.addThing(shot);
        this.attacking = true;
    }

    updateAttack() {
        this.attacking = this.controls.attack.held;
    }
}
