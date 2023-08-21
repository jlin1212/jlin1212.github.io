class LandscapeOptimizer {
    constructor() {
        this.params = {};
    }
    apply(pos, grad) {} // Take a position and the gradient at that position, and return a new position based on internal state and gradients.
}

class VanillaSGD extends LandscapeOptimizer {
    constructor() {
        super();
        this.params.lr = 1e-2;
    }

    apply(pos, grad) {
        return math.add(pos, math.multiply(-this.params.lr, grad));
    }
}

class Momentum extends LandscapeOptimizer {
    constructor() {
        super();
        this.params.lr = 1e-2;
        this.params.beta = 0.96;
        this.last_grad = null;
    }

    apply(pos, grad) {
        if (this.last_grad == null) {
            this.last_grad = grad;
            return math.add(pos, math.multiply(-this.params.lr, grad));
        } else {
            let momentum = math.add(
                math.multiply(this.params.beta, this.last_grad),
                math.multiply(1 - this.params.beta, grad)
            );
            this.last_grad = momentum;
            return math.add(pos, math.multiply(-this.params.lr, momentum));
        }
    }
}

OPTIMIZERS = [VanillaSGD, Momentum];
