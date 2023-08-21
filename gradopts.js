class LandscapeOptimizer {
    constructor() {}
    apply(pos, grad) {} // Take a position and the gradient at that position, and return a new position based on internal state and gradients.
}

class VanillaSGD extends LandscapeOptimizer {
    constructor() {
        super();
        this.lr = 1e-3;
    }

    apply(pos, grad) {
        return pos.addScaledVector(grad, this.lr);
    }
}

class Momentum extends LandscapeOptimizer {
    constructor() {
        super();
        this.lr = 1e-3;
        this.momentum = 1;
    }

    apply(pos, grad) {
        return pos + this.lr * grad;
    }
}

OPTIMIZERS = [VanillaSGD, Momentum];
