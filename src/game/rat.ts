
import * as PIXI from 'pixi.js';

import { Thing } from './thing';
import { Animation } from './anim';


enum RatState {
    Idle='idle',
    Roaming='roaming',
    Dead='dead',
}


export class Rat extends Thing {
    constructor() {
        super();
        this.sprite = new PIXI.Sprite();
        this.idleFrame = 'rat-idle-0';
        this.deadFrame = 'rat-dead-0';
        this.texture = this.idleFrame;
        this.velx = 0;
        this.vely = 0;
        this.state = RatState.Idle;
        this.ratWalkAnim = new Animation({
            frames: [
                'rat-walk-0',
                'rat-walk-1',
                'rat-walk-2',
                'rat-walk-3',
            ],
            fps: 15,
        });
    }

    update(dt: number) {
        switch (this.state) {
            case RatState.Idle:
                if (!this.onGround) {
                    this.vely += this.level.gravity*dt;
                    if (!this.moveFurthest(this.x, this.y, 0, this.vely, dt)) {
                        this.vely = 0;
                    }
                } else {
                    if (this.level.player && this.getDistanceTo(this.level.player) < 50) {
                        this.state = RatState.Roaming;
                        this.facing = this.level.player.x - this.x;
                    }
                }
                break;

            case RatState.Roaming:
                this.texture = this.ratWalkAnim.update(dt);
                this.velx = this.facing * 30;
                if (!this.moveFurthest(this.x, this.y, this.velx, 0, dt)) {
                    this.facing *= -1;
                }
                this.vely += this.level.gravity*dt;
                if (!this.moveFurthest(this.x, this.y, 0, this.vely, dt)) {
                    this.vely = 0;
                }
                break;

            case RatState.Dead:
                this.texture = this.deadFrame;
                this.vely += this.level.gravity*dt;
                if (!this.moveFurthest(this.x, this.y, 0, this.vely, dt)) {
                    this.vely = 0;
                }
                break;
        }
    }

    takeDamage(amount: number, source: Thing) {
        if (this.state === RatState.Dead) {
            return false;
        }
        this.state = RatState.Dead;
        this.z = -1;
        return true;
    }
}
