
import * as PIXI from 'pixi.js';

import { Loader } from './loader';


export function makeHitBox(width: number, height: number): PIXI.Rectangle {
    const x = -width/2;
    const y = -height;
    return new PIXI.Rectangle(x, y, width, height);
}


export class Thing {
    constructor() {
        this.level = null;
        this._onGroundDirty = true;
        this._onGround = false;
    }

    set z(value: number) {
        this.sprite.zIndex = value;
    }

    get z(): number {
        return this.sprite.zIndex;
    }

    set x(value: number) {
        this.sprite.x = value;
        this._onGroundDirty = true;
    }

    set y(value: number) {
        this.sprite.y = value;
        this._onGroundDirty = true;
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

    get onGround(): boolean {
        if (this._onGroundDirty) {
            this._onGround = this.level.getSolidAt(this.x, this.y + 0.1);
            this._onGroundDirty = false;
        }
        return this._onGround;
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

    unstickPostSpawn()
    {
        const bigStep = 1;
        const smallStep = 0.1;
        for (let n = 0; n < 10; n++) {
            if (!this.level.getSolidAt(this.x, this.y)) {
                for (let m = 0; m < 10; m++) {
                    if (this.level.getSolidAt(this.x, this.y + smallStep)) {
                        break;
                    }
                    this.y += smallStep;
                }
                return;
            }
            this.y -= bigStep;
        }
        console.warn('cannot unstick thing at', this);
    }

    moveAlongGround(this, velx, dt) {
        // Handle sloping downward
        this.velx = velx;
        if (!this.onGround) {
            if (this.level.getSolidAt(this.x, this.y+2)) {
                this.moveFurthest(this.x, this.y, 0, 2);
            } else {
                this.vely += this.level.gravity*dt;
            }
        } else {
            this.vely = 0;
        }
        // Handle sloping upwards
        const nextx = this.x + this.velx*dt;
        if (this.level.getSolidAt(nextx, this.y)) {
            if (!this.level.getSolidAt(nextx, this.y-1)) {
                this.moveFurthest(nextx, this.y-2, 0, 2);
            }
        } else {
            this.x = nextx;
        }
        this.moveFurthest(this.x, this.y, 0, this.vely, dt);
        return this.x === nextx;
    }

    faceThing(other: Thing) {
        this.facing = Math.sign(other.x - this.x);
    }
}
