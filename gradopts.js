class Optimizer {
    constructor() {
        this.params = {};
    }
    apply(pos, grad) {} // Take a position and the gradient at that position, and return a new position based on internal state and gradients.
}

class VanillaSGD extends Optimizer {
    constructor() {
        super();
        this.params.lr = 1e-2;
    }

    apply(pos, grad) {
        return math.add(pos, math.multiply(-this.params.lr, grad));
    }
}

class Momentum extends Optimizer {
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

class Adagrad extends Optimizer {
    constructor() {
        super();
        this.params.lr = 1e-2;
        this.params.eps = 1e-8;
        this.running = math.zeros(2);
    }

    apply(pos, grad) {
        this.running = math.add(this.running, math.map(grad, math.square));
        let avg_coeff = math.multiply(
            -this.params.lr,
            math.map(math.map(math.add(this.running, this.params.eps), math.sqrt), x => 1 / x)
        )
        let update = math.dotMultiply(avg_coeff, grad);
        return math.add(pos, math.reshape(update, [2]));
    }
}

class Adam extends Optimizer {
    constructor() {
        super();
        this.params.lr = 1e-2;
        this.params.beta1 = 0.9;
        this.params.beta2 = 0.999;
        this.params.gamma = 1e-8;

        this.m = math.zeros(2);
        this.v = math.zeros(2);
        this.step = 0
    }

    apply(pos, grad) {
        this.step = this.step + 1;

        this.m = math.add(
            math.multiply(this.params.beta1, this.m),
            math.multiply(1 - this.params.beta1, grad)
        );
        this.v = math.add(
            math.multiply(this.params.beta2, this.v),
            math.multiply(1 - this.params.beta2, math.map(grad, math.square))
        );

        let mhat = math.divide(this.m, 1 - math.pow(this.params.beta1, this.step));
        let vhat = math.divide(this.v, 1 - math.pow(this.params.beta2, this.step));

        let update = math.multiply(
            -this.params.lr,
            math.dotDivide(mhat, math.add(math.map(vhat, math.sqrt), this.params.gamma))
        )

        return math.add(pos, update);
    }
}

OPTIMIZERS = [VanillaSGD, Momentum, Adagrad, Adam];
