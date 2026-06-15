
import * as PIXI from 'pixi.js';

export type Anchor = {
    x: number;
    y: number;
}

const SPRITESHEETS = [
    '/sprites/hero.json',
    '/sprites/monsters.json',
    '/sprites/scenery.json',
];


export class Loader {
    static shared = new Loader();
    private anchors = new Map<string, Anchor>();

    constructor() {}

    getAnchor(spriteName: string): Anchor|null {
        return this.anchors.get(spriteName) ?? null;
    }

    static async load() {
        for (let spritesheet of SPRITESHEETS) {
            const sheet = await PIXI.Assets.load(spritesheet);
            for (let spriteName in sheet.data.frames) {
                const anchor = sheet.data.frames[spriteName].anchor;
                Loader.shared.anchors.set(spriteName, anchor);
            }
        }
    }
}
