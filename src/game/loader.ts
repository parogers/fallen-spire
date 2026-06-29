
import * as PIXI from 'pixi.js';

export type Anchor = {
    x: number;
    y: number;
}

export const DEFAULT_FONT_FAMILY = 'BitScript';

const TILES_JSON = '/tiles.json';
const ASSETS = [
    TILES_JSON,
    '/sprites/hero.json',
    '/sprites/monsters.json',
    '/sprites/scenery.json',
    'BitScript.ttf',
];


/*
 * Returns a list of textures (names) matching the given pattern
 */
export function findTextures(pattern: string): string[] {
    const names = [];
    const prefix = pattern.replace('*', '');
    if (pattern === prefix) {
        return [pattern];
    }
    while (true) {
        const name = prefix + names.length;
        if (!PIXI.Assets.cache.has(name)) {
            break;
        }
        names.push(name);
    }
    return names;
}


export class Loader {
    static shared = new Loader();
    private anchors = new Map<string, Anchor>();

    constructor() {}

    getAnchor(spriteName: string): Anchor|null {
        return this.anchors.get(spriteName) ?? null;
    }

    static getTilesSpritesheet(): PIXI.Spritesheet {
        return PIXI.Assets.cache.get(TILES_JSON);
    }

    static async load() {
        for (let url of ASSETS) {
            const asset = await PIXI.Assets.load(url);
            if (!asset?.data?.frames) {
                continue;
            }
            for (let spriteName in asset.data.frames) {
                const anchor = asset.data.frames[spriteName].anchor;
                Loader.shared.anchors.set(spriteName, anchor);
            }
        }
    }
}
