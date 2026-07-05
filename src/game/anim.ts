
import { findTextures } from './loader';


export type AnimationParams = {
    frames: string[]|string;
    fps: number;
    looping?: boolean;
}


export class BaseAnimation {
    constructor() {
        this.frame = 0;
    }

    get frameInt(): number {
        return this.frame|0;
    }

    get isDone() {
        return false;
    }

    update(dt) {
        return null;
    }

    reset(frame: number = 0) {
        this.frame = frame;
    }
}


export class Animation extends BaseAnimation {
    constructor(params: AnimationParams) {
        function getFrames(): string[] {
            if (Array.isArray(params.frames)) {
                return params.frames;
            }
            return findTextures(params.frames);
        }
        super();
        this.frames = getFrames();
        if (this.frames.length === 0) {
            console.error('no animation found for: ', params);
        }
        this.fps = params.fps ?? 1;
        this.looping = params.looping ?? true;
        this.frame = 0;
    }

    get isDone() {
        return !this.looping && (this.frame|0) >= this.frames.length;
    }

    get first(): string|null {
        return this.frames?.[0] ?? null;
    }

    get last(): string|null {
        if (this.frames.length) {
            return this.frames[this.frames.length-1];
        }
        return null;
    }

    update(dt) {
        this.frame += this.fps*dt;
        let frameNum = this.frame|0;
        if (this.looping) {
            frameNum %= this.frames.length;
        } else {
            frameNum = Math.min(frameNum, this.frames.length-1);
        }
        return this.frames[frameNum];
    }

    getReversed(): Animation {
        return new Animation({
            looping: this.looping,
            fps: this.fps,
            frames: this.frames.slice().reverse(),
        });
    }
}


export class AnimationGroup extends BaseAnimation {
    constructor(mapping: { [name: string]: Animation }) {
        super();
        this.animationMap = mapping;
        this._state = Object.keys(mapping)[0];
        this.current = Object.values(mapping)[0];
    }

    set state(value: boolean) {
        this._state = value;
        if (this.animationMap[value]) {
            this.current = this.animationMap[value];
        } else {
            console.error('cannot find animation state:', value, 'in', Object.keys(this.animationMap));
        }
    }

    set fps(value: number) {
        Object.values(this.animationMap).forEach(anim => anim.fps = value);
    }

    get fps(): number {
        return this.current.fps;
    }

    get isDone(): boolean {
        return this.current.isDone;
    }

    update(dt) {
        const texture = this.current.update(dt);
        const frame = this.current.frame;
        Object.values(this.animationMap).forEach(anim => anim.frame = frame);
        return texture;
    }

    reset() {
        Object.values(this.animationMap).forEach(anim => anim.frame = 0);
    }
}
