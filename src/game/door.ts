
import * as PIXI from 'pixi.js';
import { Thing } from './thing';
import { Animation } from './anim';


enum DoorState {
    Closed,
    Open,
    Opening,
    Closing,
    Entering,
}


export type DoorParams = {
    level: string;
}


export class Door extends Thing {
    constructor(textureBase: string, params: DoorParams) {
        super();
        this.targetLevel = params.level;
        this.sprite = new PIXI.Sprite();
        this.openAnim = new Animation({
            frames: textureBase + '-*',
            fps: 30,
            looping: false,
        });
        this.texture = this.openAnim.first;
        this.closeAnim = this.openAnim.getReversed();
        this.z = -1;
        this.state = DoorState.Closed;
        this.interactRect = new PIXI.Rectangle(
            0,
            -this.sprite.height,
            this.sprite.width,
            this.sprite.height
        );
    }

    update(dt: number) {
        switch(this.state) {
            case DoorState.Closed:
                this.texture = this.openAnim.first;
                break;

            case DoorState.Open:
                this.texture = this.openAnim.last;
                break;

            case DoorState.Opening:
                this.texture = this.openAnim.update(dt);
                if (this.openAnim.isDone) {
                    this.state = DoorState.Open;
                    this.level.triggerLevelChange(this.targetLevel);
                }
                break;

            case DoorState.Closing:
                this.texture = this.closeAnim.update(dt);
                if (this.closeAnim.isDone) {
                    this.state = DoorState.Closed;
                }
                break;
        }
    }

    playerInteract() {
        if (this.state === DoorState.Closed) {
            this.openAnim.reset();
            this.state = DoorState.Opening;
        } else if (this.state === DoorState.Open) {
            this.closeAnim.reset();
            this.state = DoorState.Closing;
        }
    }
}
