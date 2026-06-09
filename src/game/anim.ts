
export type AnimationParams = {
    frames: string[];
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

    reset() {
        this.frame = 0;
    }
}


export class Animation extends BaseAnimation {
    constructor(params: AnimationParams) {
        super();
        this.frames = params.frames;
        this.fps = params.fps ?? 1;
        this.looping = params.looping ?? true;
        this.frame = 0;
    }

    get isDone() {
        return !this.looping && (this.frame|0) >= this.frames.length;
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
