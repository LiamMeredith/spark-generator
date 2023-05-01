console.log(1)

addEventListener('message', (event) => {
    // event is an ExtendableMessageEvent object
    const data = event.data;
    new SparkPhysics(data.width, data.height, data.initialSparkPositions, data.numberOfIntervals, data.exp);
});



/**
 * The spark/s will work in a limited space. This space will be represented with a 2 Dimension map of spaces
 * that will represent a number between 0 and 1.
 * 
 * 0 Represents void
 * 1 Represents spark
 * 0.X Represents the possibility of random generating spark
 * 
 * Everytime a potentional spark can be generated, it will be necessary to navigate through the map, retrieve all
 * nodes which are not 1 and calculate the average of adjacent nodes 
 */
export class SparkPhysics {

    /**
     * Dimensions used to calculate if spark is out of bounds, to avoid unnecessary calculations
     */
    private width = 0;
    private height = 0;
    private numberOfIntervals = 0;
    private exp = 2;

    // All ceels with positive charge
    private sparkTrace: Record<string, SparkWeight> = {};
    // Record with all weight equal to 1
    private positiveWeight: Record<string, SparkWeight> = {};

    constructor(
        width: number,
        height: number,
        initialSparkPositions: Position,
        numberOfIntervals: number,
        exp: number
    ) {
        this.width = width;
        this.height = height;
        this.numberOfIntervals = numberOfIntervals;
        this.exp = exp;

        const positionId = this.positionId(initialSparkPositions);
        this.sparkTrace[positionId] = {
            ...initialSparkPositions,
            weight: 1,
        };
        this.positiveWeight[positionId] = {
            ...initialSparkPositions,
            weight: 1,
        };
        for (let con = 0; con < this.numberOfIntervals; con++) {
            const nextPositiveWeight = this.nextActiveSpark();
            const positionsToPaint: SparkWeight[] = [];

            const sparkX = nextPositiveWeight.x - 2;
            const sparkY = nextPositiveWeight.y - 2;

            for (let y = 0; y < 5; y++) {
                for (let x = 0; x < 5; x++) {
                    const possibleSparkToPaint = this.sparkTrace[this.positionId({ x: sparkX + x, y: sparkY + y })];
                    positionsToPaint.push({ x: sparkX + x, y: sparkY + y, weight: possibleSparkToPaint?.weight ?? 0 });
                }
            }
            postMessage(positionsToPaint);
        }
    }

    /**
     * Calculating the next active spark it will be required to:
     * 
     * 1. Evolve the spark trace
     * 2. Update weight traces
     * 2. Randomly find next available 
     */
    public nextActiveSpark(): SparkWeight {
        const weightUpdates: Record<string, SparkWeight> = {};

        // Calculate from existing and new positions, the new weight
        Object.values(this.sparkTrace).forEach(value => {
            this.availablePosition(value, weightUpdates).forEach(potentialPosition => {
                weightUpdates[this.positionId(potentialPosition)] = {
                    ...potentialPosition,
                    weight: this.calculatePositionWeight(potentialPosition),
                }
            });
        });

        // From new weight, save to global states
        Object.values(weightUpdates).forEach(value => {
            this.sparkTrace[this.positionId(value)] = value;
        });


        let nextPositiveWeight: SparkWeight | null = null;
        // Retrieve all active weights
        const positiveWeightList = Object.values(this.positiveWeight);
        while (!nextPositiveWeight) {
            const randomPositiveWeight = positiveWeightList[Math.floor(Math.random() * positiveWeightList.length)];
            const availablePositionsList = this.availablePosition(randomPositiveWeight, this.positiveWeight);

            if (availablePositionsList.length !== 0) {
                const randomAvailablePosition = availablePositionsList[Math.floor(Math.random() * availablePositionsList.length)];

                if (!this.positiveWeight[this.positionId(randomAvailablePosition)]) {
                    const random = Math.random();
                    const invertedWeight = 1 - this.sparkTrace[this.positionId(randomAvailablePosition)].weight;
                    const pow = Math.pow(invertedWeight, this.exp)
                    if (random < pow) {
                        nextPositiveWeight = this.sparkTrace[this.positionId(randomAvailablePosition)];
                        nextPositiveWeight.weight = 1;
                        this.positiveWeight[this.positionId(nextPositiveWeight)] = nextPositiveWeight;
                        this.sparkTrace[this.positionId(nextPositiveWeight)] = nextPositiveWeight;
                    }
                }
            }
        }
        return nextPositiveWeight;
    }

    /**
     * Retrieving all available positions based on a current position. all available positions will be:
     * 1. In bounds
     * 2. Hasn't been already calculated
     * 3. Hasn't got an already active weight
     */
    private availablePosition(position: Position, weightUpdates: Record<string, SparkWeight>): Position[] {
        const availablePositionList: Position[] = [];

        let availablePosition = { ...position };
        let positionId = this.positionId(availablePosition)
        if (
            !this.positiveWeight[positionId] &&
            !weightUpdates[positionId] &&
            !this.isOutOfBounds(availablePosition)
        ) {
            availablePositionList.push(availablePosition);
        }

        availablePosition = { ...position, x: position.x + 1 }
        positionId = this.positionId(availablePosition)
        if (
            !this.positiveWeight[positionId] &&
            !weightUpdates[positionId] &&
            !this.isOutOfBounds(availablePosition)
        ) {
            availablePositionList.push(availablePosition);
        }

        availablePosition = { ...position, x: position.x - 1 }
        positionId = this.positionId(availablePosition)
        if (
            !this.positiveWeight[positionId] &&
            !weightUpdates[positionId] &&
            !this.isOutOfBounds(availablePosition)
        ) {
            availablePositionList.push(availablePosition);
        }

        availablePosition = { ...position, y: position.y + 1 }
        positionId = this.positionId(availablePosition)
        if (
            !this.positiveWeight[positionId] &&
            !weightUpdates[positionId] &&
            !this.isOutOfBounds(availablePosition)
        ) {
            availablePositionList.push(availablePosition);
        }

        availablePosition = { ...position, y: position.y - 1 }
        positionId = this.positionId(availablePosition)
        if (
            !this.positiveWeight[positionId] &&
            !weightUpdates[positionId] &&
            !this.isOutOfBounds(availablePosition)
        ) {
            availablePositionList.push(availablePosition);
        }
        return availablePositionList;
    }

    /**
     * Based on the position, check if it is bounds
     */
    private isOutOfBounds(position: Position): boolean {
        return position.x > this.width || position.x < 0 || position.y > this.height || position.y < 0;
    }

    /**
     * Retrieve a unique id based by concating the x and y position
     */
    private positionId(position: Position) {
        return position.x + '-' + position.y;
    }

    /**
     * Re-Calculate the weight for a determine position. This process would be done for each tick
     */
    private calculatePositionWeight(position: Position) {
        let weight =
            ((this.sparkTrace[this.positionId({ x: position.x, y: position.y + 1 })]?.weight ?? 0) +
                (this.sparkTrace[this.positionId({ x: position.x, y: position.y - 1 })]?.weight ?? 0) +
                (this.sparkTrace[this.positionId({ x: position.x + 1, y: position.y })]?.weight ?? 0) +
                (this.sparkTrace[this.positionId({ x: position.x - 1, y: position.y })]?.weight ?? 0)) / 4;
        return weight;
    }
}

export interface Position {
    x: number;
    y: number;
}

export interface SparkWeight extends Position {
    weight: number;
}