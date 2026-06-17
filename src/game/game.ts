
import * as PIXI from 'pixi.js';

import { Level, loadLevel, CAMERA_WIDTH, CAMERA_HEIGHT } from './level';
import { Player } from './player';
import { KeyboardControls } from './controls';
import { Loader } from './loader';
import { scaleToViewport } from '@parogers/pixijs-easygrid'


export class Game {
    constructor() {
        PIXI.TextureStyle.defaultOptions.scaleMode = 'nearest';
        this.app = null;
        this.controls = null;
        this.level = null;
    }

    async start()
    {
        this.app = new PIXI.Application();
        await this.app.init({ background: '#a0a0a0', resizeTo: window });
        this.app.renderer.on('resize', () => {
            this.autoResize();
        });
        await Loader.load();
        this.level = await loadLevel(this.app.renderer, 'map.tmx');
        this.controls = new KeyboardControls();

        this.app.stage.addChild(this.level.stage);
        this.app.stage.scale.set(4);

        const spawn = this.level.findEntity('spawn');
        const player = new Player(controls);
        player.level = this.level;
        player.x = spawn.x + spawn.width/2;
        player.y = spawn.y;
        player.facing = spawn.facing;
        this.level.addThing(player);
        this.callUpdate = time => this.update(time);
        PIXI.Ticker.shared.add(this.callUpdate);

        setTimeout(() => {
            this.app.renderer.emit('resize');
        }, 1);
    }

    autoResize() {
        scaleToViewport(this.app, {
            width: CAMERA_WIDTH,
            height: CAMERA_HEIGHT,
        });
    }

    destroy() {
        PIXI.Ticker.shared.remove(this.callUpdate);
        PIXI.Assets.cache.reset();
        if (this.controls) {
            this.controls.destroy();
        }
        if (this.app) {
            this.app.destroy();
        }
        this.controls = null;
        this.app = null;
    }

    update(time) {
        const dt = Math.min(time.deltaMS/1000, 1/60.);
        this.controls.update(dt);
        this.level.update(dt);
    }
}
