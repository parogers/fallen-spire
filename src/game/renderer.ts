
import * as PIXI from 'pixi.js';


let renderer = null;


export function setRenderer(r: PIXI.Renderer) {
    renderer = r;
}


export function getRenderer(): PIXI.Renderer|null {
    return renderer;
}
