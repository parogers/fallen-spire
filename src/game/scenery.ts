
import * as PIXI from 'pixi.js';
import { Thing } from './thing';


export class Scenery extends Thing {
    constructor(texture: string) {
        super();
        this.sprite = new PIXI.Sprite();
        this.texture = texture;
    }
}
