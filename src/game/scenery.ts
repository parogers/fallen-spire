
import * as PIXI from 'pixi.js';
import { Thing } from './thing';
import { findTextures } from './loader';


// Psuedo-randomly pick a texture based on a seed value
function chooseTexture(pattern: string, seed: number): string {
    const matches = findTextures(pattern);
    if (matches.length === 0) {
        return '';
    }
    return matches[seed % matches.length];
}


export class Scenery extends Thing {
    constructor(texture: string, x: number, y: number) {
        super();
        this.sprite = new PIXI.Sprite();
        this.x = x;
        this.y = y;
        const pick = Math.abs(this.x|0) + Math.abs(this.y|0);
        this.texture = chooseTexture(texture, pick);
    }
}
