
import * as PIXI from 'pixi.js';
import { DEFAULT_FONT_FAMILY } from './loader';


type MessageParams = {
    text: string;
    duration?: number;
}


type Message = {
    text: string;
    duration: number;
}


export class MessageArea {
    constructor(width: number, height: number) {
        this.messages = <Message[]>[];
        this.stage = new PIXI.Container();
        this.pause = 0;
        this.width = width;
        this.height = height;
    }

    show(params: MessageParams) {
        this.messages.push({
            text: params.text,
            duration: params?.duration ?? params.text.length*0.25,
        })
    }

    showNext() {
        if (this.messages.length === 0) {
            return;
        }
        const text = new PIXI.BitmapText({
            text: this.messages[0].text,
            style: {
                fontFamily: DEFAULT_FONT_FAMILY,
                letterSpacing: 1,
                fontSize: 6,
                fill: '#ffcc00',
            },
        });
        text.x = this.width/2 - text.width/2;
        text.y = this.height - text.height-2;
        this.stage.removeChildren();
        this.stage.addChild(text);
    }

    update(dt: number) {
        if (this.messages.length === 0) {
            return;
        }
        if (this.pause > 0) {
            this.pause -= dt;
            if (this.pause > 0) {
                return;
            }
        }
        if (this.stage.children.length === 0) {
            this.showNext();
            return;
        }
        this.messages[0].duration -= dt;
        if (this.messages[0].duration <= 0) {
            this.messages.shift();
            this.stage.removeChildren();
            if (this.messages.length) {
                this.pause = 1;
            }
        }
    }
}
