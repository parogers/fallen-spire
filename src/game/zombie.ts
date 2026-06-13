
import * as PIXI from 'pixi.js';

import { Thing, makeHitBox } from './thing';
import { Animation } from './anim';


enum ZombieState {
    Idle='idle',
    Roaming='roaming',
    ChasingPlayer='chasing-player',
    Attacking='attacking',
    Dead='dead',
}


export class Zombie extends Thing {
    constructor() {
        super();
        this.sprite = new PIXI.Sprite();
        this.velx = 0;
        this.vely = 0;
        this.state = ZombieState.Roaming;
        this.lastState = this.state;
        this.walkAnim = new Animation({
            frames: [
                'zombie-walk-0',
                'zombie-walk-1',
                'zombie-walk-2',
                'zombie-walk-3',
            ],
            fps: 3.5,
        });
        this.attackAnim = new Animation({
            frames: [
                'zombie-attack-0',
                'zombie-attack-1',
            ],
            fps: 4,
            looping: false,
        });
        this.deadAnim = new Animation({
            frames: [
                'zombie-dead-0',
                'zombie-dead-1',
            ],
            fps: 2,
            looping: false,
        });
        this.combatHitBox = makeHitBox(6, 14);
        this.timer = 0;
        this.baseWalkSpeed = 7;
        // const g = new PIXI.Graphics().rect(
        //     this.combatHitBox.x,
        //     this.combatHitBox.y,
        //     this.combatHitBox.width,
        //     this.combatHitBox.height,
        // ).stroke({ color: 'red' })
        // this.sprite.addChild(g);
    }

    get speedFactor(): number {
        if (this.state === ZombieState.ChasingPlayer) {
            return 2;
        }
        return 1;
    }

    get walkSpeed(): number {
        return this.speedFactor*this.baseWalkSpeed;
    }

    update(dt: number) {
        switch (this.state) {
            case ZombieState.Idle:
                this.texture = this.walkAnim.update(0);
                this.timer -= dt;
                if (this.timer <= 0) {
                    this.timer = 2 + Math.random()*3;
                    this.state = ZombieState.Roaming;
                    this.facing *= -1;
                }
                if (
                    this.getDistanceTo(this.level.player) < 50 &&
                    this.isFacingThing(this.level.player)
                ) {
                    this.state = ZombieState.ChasingPlayer;
                }
                break;

            case ZombieState.Roaming:
                this.timer -= dt;
                if (this.timer <= 0) {
                    this.state = ZombieState.Idle;
                    this.timer = 1 + Math.random()*4;
                    break;
                }
                if (this.moveAlongGround(this.facing*this.walkSpeed, dt)) {
                    this.texture = this.walkAnim.update(dt);
                } else {
                    this.timer = 5;
                    this.state = ZombieState.Idle;
                }
                if (this.getDistanceTo(this.level.player) < 20) {
                    this.state = ZombieState.ChasingPlayer;
                    this.faceThing(this.level.player);
                }
                break;

            case ZombieState.ChasingPlayer:
                if (this.getDistanceTo(this.level.player) < 8) {
                    this.faceThing(this.level.player);
                    this.attackAnim.reset();
                    this.state = ZombieState.Attacking;
                    break;
                }
                if (this.getDistanceTo(this.level.player) > 50) {
                    this.state = ZombieState.Idle;
                    this.timer = 5;
                    break;
                }
                if (!this.isFacingThing(this.level.player)) {
                    this.timer -= dt;
                    if (this.timer <= 0) {
                        this.faceThing(this.level.player);
                        this.timer = 1;
                    }
                }
                this.texture = this.walkAnim.update(dt*this.speedFactor);
                if (!this.moveAlongGround(this.facing*this.walkSpeed, dt)) {
                    this.facing *= -1;
                }
                break;

            case ZombieState.Attacking:
                this.texture = this.attackAnim.update(dt);
                if (this.attackAnim.isDone) {
                    this.state = ZombieState.ChasingPlayer;
                }
                break;

            case ZombieState.Dead:
                this.timer -= dt;
                if (this.timer <= 0) {
                    this.texture = this.deadAnim.update(dt);
                }
                this.vely += this.level.gravity*dt;
                if (!this.moveFurthest(this.x, this.y, 0, this.vely, dt)) {
                    this.vely = 0;
                }
                break;
        }
        this.lastState = this.state;
    }

    takeDamage(amount: number, source: Thing) {
        if (this.state === ZombieState.Dead) {
            return false;
        }
        this.timer = 0.2;
        this.state = ZombieState.Dead;
        this.z = -1;
        return true;
    }
}
