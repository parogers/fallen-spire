
import * as PIXI from 'pixi.js';

import { Level, LevelEvent, CAMERA_WIDTH, CAMERA_HEIGHT } from './level';
import { LevelManager } from './level-loader';
import { Player } from './player';
import { KeyboardControls } from './controls';
import { TILED_MAP_LOADER, Loader } from './loader';
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
        this.levelMgr = new LevelManager(this.app.renderer);

        this.level = this.levelMgr.loadLevel('start');
        this.controls = new KeyboardControls();

        this.app.stage.addChild(this.level.stage);
        this.app.stage.scale.set(4);

        const spawn = this.level.findEntity('spawn');
        const player = new Player(controls);
        player.x = spawn.x + spawn.width/2;
        player.y = spawn.y;
        player.facing = spawn.facing;
        this.player = player;
        this.level.addThing(player);
        this.callUpdate = time => this.update(time);
        PIXI.Ticker.shared.add(this.callUpdate);

        this.level.showMessage('Fallen Spire Demo');
        this.level.showMessage('Created by Petrie');

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
        PIXI.extensions.remove(TILED_MAP_LOADER);
    }

    update(time) {
        const dt = Math.min(time.deltaMS/1000, 1/60.);
        this.controls.update(dt);
        const event = this.level.update(dt);
        if (event?.type === LevelEvent.ChangeLevel) {
            this.level = this.levelMgr.loadLevel(event.level);
            this.level.addThing(this.player);
            this.app.stage.removeChildren();
            this.app.stage.addChild(this.level.stage);
            this.level.update(0);
        }
    }
}
