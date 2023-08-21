class LandscapeOptimizer {
    constructor() {
        this.params = {};
    }
    apply(pos, grad) {} // Take a position and the gradient at that position, and return a new position based on internal state and gradients.
}

class VanillaSGD extends LandscapeOptimizer {
    constructor() {
        super();
        this.params.lr = 1e-3;
    }

    apply(pos, grad) {
        return pos.addScaledVector(grad, -this.params.lr);
        // return pos;
    }
}

class Momentum extends LandscapeOptimizer {
    constructor() {
        super();
        this.params.lr = 1e-3;
        this.params.beta = 0.8;
        this.last_grad = null;
    }

    apply(pos, grad) {
        let next_grad = null;
        if (this.momentum_grad == null) next_grad = grad;
        else next_grad = this.last_grad.lerp(grad, this.params.beta);
        this.last_grad = next_grad;
        return pos.addScaledVector(next_grad, -this.params.lr);
    }
}

OPTIMIZERS = [VanillaSGD, Momentum];
