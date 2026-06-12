
import * as PIXI from 'pixi.js';

import { Thing } from './thing';
import { Animation } from './anim';


enum ZombieState {
    Roaming='roaming',
    Dead='dead',
}


export class Zombie extends Thing {
    constructor() {
        super();
        this.sprite = new PIXI.Sprite();
        this.idleFrame = 'zombie-walk-1';
        this.texture = this.idleFrame;
        this.velx = 0;
        this.vely = 0;
        this.state = ZombieState.Roaming;
        this.walkAnim = new Animation({
            frames: [
                'zombie-walk-0',
                'zombie-walk-1',
                'zombie-walk-2',
                'zombie-walk-3',
            ],
            fps: 4,
        });
        this.deadAnim = new Animation({
            frames: [
                'zombie-dead-0',
                'zombie-dead-1',
            ],
            fps: 2,
            looping: false,
        });
    }

    update(dt: number) {
        switch (this.state) {
            case ZombieState.Roaming:
                this.texture = this.walkAnim.update(dt);
                this.velx = this.facing * 10;
                if (!this.moveFurthest(this.x, this.y, this.velx, 0, dt)) {
                    this.facing *= -1;
                }
                this.vely += this.level.gravity*dt;
                if (!this.moveFurthest(this.x, this.y, 0, this.vely, dt)) {
                    this.vely = 0;
                }
                break;

            case ZombieState.Dead:
                this.texture = this.deadAnim.update(dt);
                this.vely += this.level.gravity*dt;
                if (!this.moveFurthest(this.x, this.y, 0, this.vely, dt)) {
                    this.vely = 0;
                }
                break;
        }
    }

    takeDamage(amount: number, source: Thing) {
        if (this.state === ZombieState.Dead) {
            return false;
        }
        this.state = ZombieState.Dead;
        this.z = -1;
        return true;
    }
}
