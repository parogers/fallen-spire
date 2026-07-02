
import * as PIXI from 'pixi.js';
import { loadTiledMap } from './tiled-parsing';

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
    'map.tmx',
];

export const TILED_MAP_LOADER = {
    id: 'fallen-spire/map-loader',
    extension: {
        type: PIXI.ExtensionType.LoadParser,
        name: 'fallen-spire-map-loader',
    },
    test(url: string) {
        return url.endsWith('.tmx');
    },
    async load(url: string) {
        const response = await fetch(url);
        const mapText = await response.text();
        const map = await loadTiledMap(mapText)
        return map;
    },
};
PIXI.extensions.add(TILED_MAP_LOADER);


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

    static getAssetNames(): string[] {
        return ASSETS;
    }
}
