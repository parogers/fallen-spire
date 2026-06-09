

const KEY_MAPPING = [
    {
        key: 'w',
        alt: 'ArrowUp',
        control: 'up',
    },
    {
        key: 's',
        alt: 'ArrowDown',
        control: 'down',
    },
    {
        key: 'a',
        alt: 'ArrowLeft',
        control: 'left',
    },
    {
        key: 'd',
        alt: 'ArrowRight',
        control: 'right',
    },
    {
        key: ' ',
        control: 'jump',
    },
    {
        key: 'z',
        alt: 'Enter',
        control: 'attack',
    },
];


class ControlState {
    pressed: boolean = false;
    released: boolean = false;
    held: boolean = false;
}


export class Controls {
    controls = {
        up: new ControlState(),
        down: new ControlState(),
        left: new ControlState(),
        right: new ControlState(),
        jump: new ControlState(),
        attack: new ControlState(),
    };

    get attack(): ControlState {
        return this.controls.attack;
    }

    get up(): ControlState {
        return this.controls.up;
    }

    get down(): ControlState {
        return this.controls.down;
    }

    get left(): ControlState {
        return this.controls.left;
    }

    get right(): ControlState {
        return this.controls.right;
    }

    get jump(): ControlState {
        return this.controls.jump;
    }

    get dx(): number {
        return this.right.held - this.left.held;
    }

    get dy(): number {
        return this.down.held - this.up.held;
    }
}


export class KeyboardControls extends Controls {
    constructor() {
        super();
        this.attachListeners();
    }

    attachListeners() {
        this.onKeyDown = event => {
            for (let mapping of KEY_MAPPING) {
                if (mapping.key === event.key || mapping.alt === event.key) {
                    this.controls[mapping.control].pressed = true;
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                }
            }
        };
        this.onKeyUp = event => {
            for (let mapping of KEY_MAPPING) {
                if (mapping.key === event.key || mapping.alt === event.key) {
                    this.controls[mapping.control].released = true;
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                }
            }
        };
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    destroy() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }

    update(dt: number) {
        for (let name in this.controls) {
            const control = this.controls[name];
            if (control.pressed) {
                if (control.held) {
                    control.pressed = false;
                }
                control.held = true;
            }
            if (control.released) {
                if (!control.held) {
                    control.released = false;
                }
                control.held = false;
            }
        }
    }
}
