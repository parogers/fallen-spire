

export class Thing {
    constructor() {}

    set x(value: number) {
        this.sprite.x = value;
    }

    set y(value: number) {
        this.sprite.y = value;
    }

    get x(): number {
        return this.sprite.x;
    }

    get y(): number {
        return this.sprite.y;
    }
}
