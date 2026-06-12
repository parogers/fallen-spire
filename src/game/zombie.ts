
import * as PIXI from 'pixi.js';

import { Thing, makeHitBox } from './thing';
import { Animation } from './anim';


enum ZombieState {
    Roaming='roaming',
    Attacking='attacking',
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
        // const g = new PIXI.Graphics().rect(
        //     this.combatHitBox.x,
        //     this.combatHitBox.y,
        //     this.combatHitBox.width,
        //     this.combatHitBox.height,
        // ).stroke({ color: 'red' })
        // this.sprite.addChild(g);
    }

    update(dt: number) {
        switch (this.state) {
            case ZombieState.Roaming:
                if (this.getDistanceTo(this.level.player) < 8) {
                    this.faceThing(this.level.player);
                    this.attackAnim.reset();
                    this.state = ZombieState.Attacking;
                    break;
                }
                this.texture = this.walkAnim.update(dt);
                if (!this.moveAlongGround(this.facing*10, dt)) {
                    this.facing *= -1;
                }
                break;

            case ZombieState.Attacking:
                this.texture = this.attackAnim.update(dt);
                if (this.attackAnim.isDone) {
                    this.state = ZombieState.Roaming;
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
