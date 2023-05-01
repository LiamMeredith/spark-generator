import './styles.scss';
import 'bootstrap/scss/bootstrap.scss';
import 'bootstrap';
import { Canvas } from './canvas';
import { SparkWeight } from './spark-physics';

/**
 * Main code that connects the form, spark physics and the canvas
 */
export class SparkSimulator {

    /** Default values */
    private static readonly DEFAULT_INTERVALS = 500;
    private static readonly DEFAULT_POSITION = { x: 100, y: 100 };
    private static readonly DEFAULT_EXP = 2;
    private static readonly DEFAULT_SIZE_RATIO = 3; /** Multiple pixel size to make it bigger */

    /** Values used for the painting of the canvas */
    private canvas: Canvas;
    private color = '#05edf5';
    /** Flag to control the button state */
    private buttonIsStart = true;
    /** Number to control total number of steps */
    private intervals = 0;

    /** Object to calculate the from and html states */
    private form = {
        intervalsInput: document.getElementById('intervals') as HTMLInputElement,
        positionInput: document.getElementById('position') as HTMLInputElement,
        exponentialInput: document.getElementById('exponential') as HTMLInputElement,
        submitButton: document.getElementById('form-button') as HTMLButtonElement,
        progress: document.getElementById('spark-progress') as HTMLElement,
    };

    /** Value that controls the current progress step state */
    private progressNumber = 0;
    /** Main and unique instance of the worker */
    private sparkPhysics: Worker | null = null;

    constructor() {
        /** Retrieve main available space to calculate the canvas dimensions */
        const mainContent = document.getElementsByClassName('main-content').item(0) as HTMLElement;

        let width = 250;
        let height = 250;
        if (mainContent) {
            width = mainContent.offsetWidth / SparkSimulator.DEFAULT_SIZE_RATIO;
            height = mainContent.offsetHeight / SparkSimulator.DEFAULT_SIZE_RATIO;
        }
        this.canvas = new Canvas(document.getElementById('canvas') as HTMLCanvasElement, width, height, SparkSimulator.DEFAULT_SIZE_RATIO);

        this.initForm();
    }

    /** Initializes the html form, html placeholders and the event listener */
    private initForm() {
        this.form.intervalsInput.placeholder = SparkSimulator.DEFAULT_INTERVALS + '';
        this.form.exponentialInput.placeholder = SparkSimulator.DEFAULT_EXP + '';
        this.form.positionInput.placeholder = SparkSimulator.DEFAULT_POSITION.x + ', ' + SparkSimulator.DEFAULT_POSITION.y;
        this.form.submitButton.addEventListener('click', () => {
            if (this.buttonIsStart) {
                this.startSpark();
                this.setFormToProgress();
            } else {
                this.setFormToInit();
            }
        })
    }

    /** Based on the form, start the spark worker. If any value from the form is empty, the worker will use default values */
    private startSpark(): void {
        if (this.sparkPhysics) {
            this.sparkPhysics.terminate();
            this.canvas.reset();
        }

        /** Create worker and use standard postMessage protocol to initial the inner object in the worker */
        this.sparkPhysics = new Worker(new URL('./spark-physics.ts', import.meta.url));
        /** Retrieve value from forms or give default values */
        let initialSparkPositions = SparkSimulator.DEFAULT_POSITION;
        if (this.form.positionInput.value) {
            const trimmedPosition = this.form.positionInput.value.replace(' ', '').split(',');
            const x = Number(trimmedPosition[0]);
            const y = Number(trimmedPosition[1]);

            if (!isNaN(x) && !isNaN(y)) {
                initialSparkPositions = { x, y };
            }
        }
        const exp = this.form.exponentialInput.value ? Number(this.form.exponentialInput.value) : SparkSimulator.DEFAULT_EXP;
        this.intervals = this.form.intervalsInput.value ? Number(this.form.intervalsInput.value) : SparkSimulator.DEFAULT_INTERVALS;

        /** Init instance inside the object */
        this.sparkPhysics.postMessage({
            width: this.canvas.width,
            height: this.canvas.height,
            initialSparkPositions,
            numberOfIntervals: this.intervals,
            exp,
        });

        /** Paint initial position */
        this.canvas.paintPixel(initialSparkPositions.x, initialSparkPositions.y, this.color)

        this.addSparkPhysicsEventListener(this.sparkPhysics);
    }

    private addSparkPhysicsEventListener(sparkPhysics: Worker) {
        sparkPhysics.addEventListener("message", (payload) => {
            this.progressNumber++;
            const sparkList = payload.data as SparkWeight[];

            this.paintSparkList(sparkList);

            /** Calculate current percentual progress and updates progress bar in html */
            const percentualProgress = (this.progressNumber / this.intervals) * 100;
            this.form.progress.ariaValueNow = percentualProgress + '';
            this.form.progress.style.width = percentualProgress + '%';

            /** If the percentual gets to a 100% -> set the button to init mode */
            if (percentualProgress === 100) {
                this.setFormToInit();
            }
        });
    }

    private paintSparkList(sparkList: SparkWeight[]) {
        sparkList.forEach(spark => {
            let fadeness: string;
            if (spark.weight === 1) {
                fadeness = 'FF';
            } else if (spark.weight > 0.5) {
                fadeness = '15';
            } else {
                fadeness = '07';
            }
            this.canvas.paintPixel(spark.x, spark.y, this.color + fadeness)
        });
    }

    /**
     * Managing the state of the form to a init state. This includes:
     * - The submit button
     * - Progress bar
     */
    private setFormToInit(): void {
        this.sparkPhysics?.terminate();
        this.form.submitButton.classList.remove('btn-danger');
        this.form.submitButton.classList.add('btn-success');
        this.form.submitButton.innerText = 'Start';
        this.form.progress.ariaValueNow = '0';
        this.buttonIsStart = true;
        this.progressNumber = 0;
        this.form.progress.style.width = 0 + '%';
    }

    /**
     * Managing the state of the form to a progress state. This includes:
     * - The submit button
     * - Progress bar
     */
    private setFormToProgress(): void {
        this.form.submitButton.classList.remove('btn-success');
        this.form.submitButton.classList.add('btn-danger');
        this.form.submitButton.innerText = 'Stop';
        this.buttonIsStart = false;
    }
}

/** On DOM loaded --> Start the app */
document.addEventListener('DOMContentLoaded', () => {
    new SparkSimulator();
});