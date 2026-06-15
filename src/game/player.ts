
import * as PIXI from 'pixi.js';

import { Thing, makeHitBox } from './thing';
import { Controls } from './controls';
import { Animation, AnimationGroup } from './anim';

const DEFAULT_WALK_SPEED = 40;
const WALK_FRAMES_PER_PIXEL = 4/13;

enum PlayerState {
    Idle='idle',
    Walking='walking',
    Jumping='jumping',
    JumpingToClimb='jumping-to-climb',
    Hanging='hanging',
    ClimbFromHanging='climb-from-hanging',
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
        this.texture = 'effects-shot-0';
        this.facing = Math.sign(velx);
        this.velx = velx;
        this.state = ShotState.Flying;
    }

    update(dt) {
        switch(this.state) {
            case ShotState.Flying:
                this.texture = this.flyAnim.update(dt);
                this.x += this.velx*dt;
                if (this.level.getSolidAt(this.x, this.y)) {
                    this.state = ShotState.Exploding;
                }
                for (let thing of this.level.things) {
                    if (
                        thing.takeDamage &&
                        thing.combatHitBox &&
                        thing.combatHitBox.contains(this.x - thing.x, this.y - thing.y)
                    ) {
                        if (thing.takeDamage(1, this)) {
                            this.state = ShotState.Exploding;
                        }
                        break;
                    }
                }
                break;

            case ShotState.Exploding:
                this.texture = this.explodeAnim.update(dt);
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
                'hero-jump-vertical-1',
                'hero-climb-from-hanging-0',
                'hero-climb-from-hanging-1',
                'hero-climb-from-hanging-2',
                'hero-climb-from-hanging-3',
            ],
            fps: 5,
            looping: false,
        });
        this.walkAnimGroup = new AnimationGroup({
            plain: new Animation({
                frames: [
                    'hero-walk-0',
                    'hero-walk-1',
                    'hero-walk-2',
                    'hero-walk-3',
                ],
                fps: WALK_FRAMES_PER_PIXEL*DEFAULT_WALK_SPEED,
            }),
            gesture: new Animation({
                frames: [
                    'hero-walk-gesture-0',
                    'hero-walk-gesture-1',
                    'hero-walk-gesture-2',
                    'hero-walk-gesture-3',
                ],
                fps: WALK_FRAMES_PER_PIXEL*DEFAULT_WALK_SPEED,
            }),
            crouch: new Animation({
                frames: [
                    'hero-crouch-walk-0',
                    'hero-crouch-walk-1',
                    'hero-crouch-walk-2',
                    'hero-crouch-walk-3',
                ],
                fps: 4,
            }),
            'crouch-gesture': new Animation({
                frames: [
                    'hero-crouch-walk-gesture-0',
                    'hero-crouch-walk-gesture-1',
                    'hero-crouch-walk-gesture-2',
                    'hero-crouch-walk-gesture-3',
                ],
                fps: 4,
            }),
        })
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
        this.crouchPlainFrame = 'hero-crouch-0';
        this.crouchGestureFrame = 'hero-crouch-gesture-0';
        this.controls = controls;
        this.jumpSpeed = 110;
        this.standWalkSpeed = DEFAULT_WALK_SPEED;
        this.crouchWalkSpeed = 20;
        this.velx = 0;
        this.vely = 0;
        this.state = PlayerState.Idle;
        this.lastState = null;
        this.attacking = false;
        this.crouching = false;
        this._texture = null;
        this.combatHitBox = makeHitBox(6, 14);
        // const box = new PIXI.Graphics().rect(-0.5, -0.5, 1, 1).fill({ color: 'red' });
        // this.sprite.addChild(box);
    }

    get walkSpeed(): number {
        if (this.crouching) {
            return this.crouchWalkSpeed;
        }
        return this.standWalkSpeed;
    }

    get idleFrame(): string {
        if (this.crouching) {
            if (this.attacking) {
                return this.crouchGestureFrame;
            }
            return this.crouchPlainFrame;
        }
        if (this.attacking) {
            return this.idleGestureFrame;
        }
        return this.idlePlainFrame;
    }

    get walkAnim(): Animation {
        // TODO - kind of hacky
        let state = 'plain';
        if (this.attacking && this.crouching) state = 'crouch-gesture';
        else if (this.attacking) state = 'gesture';
        else if (this.crouching) state = 'crouch';
        this.walkAnimGroup.state = state;
        return this.walkAnimGroup;
    }

    update(dt: number) {
        if (this.level.getSolidAt(this.x, this.y)) {
            console.warn('player stuck in ground', this.x, this.y);
        }
        const currentState = this.state;
        const isStateChanged = this.state !== this.lastState;
        this.updateAttack();
        switch(this.state) {
            case PlayerState.Idle:
                if (this.controls.attack.pressed) {
                    this.startAttack();
                }
                this.crouching = this.controls.down.held;
                this.texture = this.idleFrame;
                if (!this.onGround) {
                    this.vely += this.level.gravity*dt;
                    this.moveFurthest(this.x, this.y, 0, this.vely, dt);
                } else {
                    this.vely = 0;
                    if (this.controls.dx) {
                        this.state = PlayerState.Walking;
                    } else if (this.controls.jump.pressed || this.controls.up.pressed) {
                        this.velx = 0;
                        this.vely = -this.jumpSpeed;
                        if (this.checkGrabAt(this.x, this.y - 24)) {
                            this.state = PlayerState.JumpingToClimb;
                        } else if (this.checkGrabAt(this.x, this.y - 16)) {
                            this.state = PlayerState.ClimbFromHanging;
                            this.texture = this.jumpVerticalAnim.frames[1];
                        } else {
                            this.state = PlayerState.Jumping;
                        }
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
                this.moveAlongGround(this.controls.dx*this.walkSpeed, dt);
                this.facing = this.controls.dx;
                if (this.controls.attack.pressed) {
                    this.startAttack();
                }
                this.crouching = this.controls.down.held;
                this.texture = this.walkAnim.update(dt);
                if (this.controls.jump.pressed || this.controls.up.pressed) {
                    this.velx = this.facing * this.walkSpeed;
                    this.vely = -this.jumpSpeed;
                    this.state = PlayerState.Jumping;
                }
                break;

            case PlayerState.Jumping:
                if (isStateChanged) {
                    this.jumpVerticalAnim.reset();
                }
                this.texture = this.jumpHorizontalFrame;
                if (this.controls.attack.pressed) {
                    this.startAttack();
                }
                this.vely += this.level.gravity*dt;
                this.moveFurthest(this.x, this.y, this.velx, 0, dt);
                this.moveFurthest(this.x, this.y, 0, this.vely, dt);
                if (this.onGround && this.vely >= 0) {
                    this.state = PlayerState.Idle;
                    this.vely = 0;
                }
                break;

            case PlayerState.JumpingToClimb:
                if (isStateChanged) {
                    this.jumpVerticalAnim.reset();
                }
                this.texture = this.jumpVerticalAnim.update(dt);
                if (this.jumpVerticalAnim.frame < 1) {
                    break;
                }
                this.vely += this.level.gravity*dt;
                this.moveFurthest(this.x, this.y, 0, this.vely, dt);
                if (this.onGround && this.vely >= 0) {
                    this.vely = 0;
                    this.state = PlayerState.Idle;
                    break;
                }
                if (Math.abs(this.vely) < 5 && this.checkGrabAt(this.x, this.y - this.handHeight)) {
                    this.state = PlayerState.Hanging;
                    const cell = this.level.grid.getCellAt(
                        this.x + this.facing*2,
                        this.y - this.handHeight
                    );
                    this.x = cell.x + (this.facing > 0 ? -0.1 : this.level.grid.tileSize.width);
                    this.y = cell.y + this.level.grid.tileSize.height + this.handHeight;
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
                    const startFrame = this.lastState === PlayerState.Idle ? 0 : 1;
                    this.climbFromHangingAnim.reset(startFrame);
                }
                const lastFrame = this.climbFromHangingAnim.frameInt;
                this.texture = this.climbFromHangingAnim.update(dt);
                if (isStateChanged || lastFrame !== this.climbFromHangingAnim.frameInt) {
                    if (this.climbFromHangingAnim.frameInt === 1) {
                        this.y -= 11;
                    } else if (this.climbFromHangingAnim.frameInt === 2) {
                        this.y -= 2;
                    } else if (this.climbFromHangingAnim.frameInt === 3) {
                        this.y -= 4;
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

    get handHeight(): number {
        if (this.crouching) {
            return 4.5;
        }
        if (this.state === PlayerState.Jumping) {
            return 6.5;
        }
        if (this.state === PlayerState.JumpingToClimb) {
            return 16;
        }
        return 8.5;
    }

    checkGrabAt(x, y) {
        return (
            !this.level.getFullSolidAt(x + this.facing*2, y) &&
            !this.level.getFullSolidAt(x - this.facing, y + 2) &&
            this.level.getFullSolidAt(x + this.facing*2, y + 2)
        );
    }

    startAttack() {
        const shot = new Shot(this.facing*100);
        shot.x = this.x + this.facing*6;
        shot.y = this.y - this.handHeight;
        this.level.addThing(shot);
        this.attacking = true;
    }

    updateAttack() {
        this.attacking = this.controls.attack.held;
    }
}
