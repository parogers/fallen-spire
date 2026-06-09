
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
    constructor(anim1: Animation, anim2: Animation) {
        super();
        this.anim1 = anim1;
        this.anim2 = anim2;
        this.current = anim1;
        this.state = false;
    }

    set state(value: boolean) {
        this._state = value;
        if (value) {
            this.current = this.anim2;
        } else {
            this.current = this.anim1;
        }
    }

    set fps(value: number) {
        this.anim1.fps = value;
        this.anim2.fps = value;
    }

    get fps(): number {
        return this.current.fps;
    }

    get isDone(): boolean {
        return this.current.isDone;
    }

    update(dt) {
        const texture = this.current.update(dt);
        if (this.current === this.anim1) {
            this.anim2.frame = this.anim1.frame;
        } else {
            this.anim1.frame = this.anim2.frame;
        }
        return texture;
    }

    reset() {
        this.anim1.frame = 0;
        this.anim2.frame = 0;
    }
}
