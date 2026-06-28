
import * as PIXI from 'pixi.js';
import { Thing } from './thing';
import { Animation } from './anim';


export class Door extends Thing {
    constructor(textureBase: string) {
        super();
        this.sprite = new PIXI.Sprite();
        this.texture = textureBase + '-0';
        this.openAnim = new Animation({
            frames: textureBase + '-*',
            fps: 8,
        });
        this.z = -1;
    }

    update(dt: number) {
        this.texture = this.openAnim.update(dt);
    }
}
