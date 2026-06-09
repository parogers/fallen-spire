
import * as PIXI from 'pixi.js';

import { Loader } from './loader';


export class Thing {
    constructor() {
        this.level = null;
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
            this.sprite.texture = PIXI.Assets.cache.get(name);
            this.sprite.anchor = Loader.shared.getAnchor(name);
        }
    }
}
