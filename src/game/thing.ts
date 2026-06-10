
import * as PIXI from 'pixi.js';

import { Loader } from './loader';


export class Thing {
    constructor() {
        this.level = null;
    }

    set z(value: number) {
        this.sprite.zIndex = value;
    }

    get z(): number {
        return this.sprite.zIndex;
    }

    set x(value: number) {
        this.sprite.x = value;
    }

    set y(value: number) {
        this.sprite.y = value;
    }

    get x(): number {
        return this.sprite.x;
    }

    get y(): number {
        return this.sprite.y;
    }

    set facing(direction: number) {
        this.sprite.scale.x = Math.sign(direction);
    }

    get facing(): number {
        return Math.sign(this.sprite.scale.x);
    }

    set texture(name: string) {
        if (this._texture !== name) {
            this._texture = name;
            const anchor = Loader.shared.getAnchor(name);
            this.sprite.texture = PIXI.Assets.cache.get(name);
            if (anchor) {
                this.sprite.anchor = anchor;
            } else {
                console.error('cannot find anchor for: ' + name);
            }
        }
    }

    getOnGround(): boolean {
        return this.level.getSolidAt(this.x, this.y + 0.1);
    }

    /* Moves this character as far as possible (ish) in the given direction
     * until it hits an obstacle. Returns true if the movement was unobstructed,
     * and false otherwise. */
    moveFurthest(x: number, y: number, velx: number, vely: number, dt: number = 1) {
        for (let n = 0; n < 10; n++) {
            if (!this.level.getSolidAt(x + velx*dt, y + vely*dt)) {
                this.x = x + velx*dt;
                this.y = y + vely*dt;
                return n === 0;
            }
            dt /= 2;
        }
        return false;
    }

    getDistanceTo(other: Thing): number {
        return Math.sqrt(
            (other.x - this.x) ** 2 +
            (other.y - this.y) ** 2
        );
    }
}
