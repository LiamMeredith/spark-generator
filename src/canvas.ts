/**
 * Object that manages a canvas to paint pixels
 */
export class Canvas {

    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;

    private innerWidth = 0;
    private innerHeight = 0;

    private sizeRatio = 3;
    public get width(): number {
        return this.innerWidth / this.sizeRatio;
    }

    public get height(): number {
        return this.innerHeight / this.sizeRatio;
    }

    constructor(
        canvas: HTMLCanvasElement,
        width: number,
        height: number,
        sizeRatio: number,
    ) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.innerWidth = width * this.sizeRatio;
        this.innerHeight = height * this.sizeRatio;
        this.sizeRatio = sizeRatio;

        this.initCanvas();
    }

    private initCanvas() {
        this.ctx.canvas.height = this.innerHeight;
        this.ctx.canvas.width = this.innerWidth;
        this.reset();
    }

    public reset() {
        for (let x = 0; x < this.innerWidth; x++) {
            for (let y = 0; y < this.innerHeight; y++) {
                this.ctx.fillStyle = 'black';
                this.ctx.fillRect(x * this.sizeRatio, y * this.sizeRatio, this.sizeRatio, this.sizeRatio);
            }
        }
    }

    public paintPixel(
        x: number,
        y: number,
        colour: string,
    ) {
        if (
            x * this.sizeRatio > this.innerWidth ||
            x * this.sizeRatio < 0 ||
            y * this.sizeRatio > this.innerHeight ||
            y * this.sizeRatio < 0
        ) {
            return;
        }
        this.ctx.fillStyle = colour;
        this.ctx.fillRect(x * this.sizeRatio, y * this.sizeRatio, this.sizeRatio, this.sizeRatio);
    }
}