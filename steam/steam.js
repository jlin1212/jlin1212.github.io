import * as np from 'https://unpkg.com/numpy-ts/dist/numpy-ts.browser.js';

function renderArray(canvasId, array) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');

    canvas.height = 320;
    canvas.width = 320;

    let amin = np.amin(array);
    let amax = np.amax(array);

    let pixelWidth = canvas.width / array.shape[1];

    for (let i = 0; i < array.shape[0]; i++) {
        for (let j = 0; j < array.shape[1]; j++) {
            let shade = (array.get([i,j]) - amin) * 255. / (amax - amin);
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
            ctx.fillRect(pixelWidth * j, pixelWidth * i, pixelWidth, pixelWidth);
        }
    }
}

function sigmoid(x) {
    return np.reciprocal(np.exp(x.multiply(-10)).add(1));
}

const pL = 1;
const pB = 1;
const muL = 1;
const muB = 1;
const Tboil = 5;
const ey = np.expand_dims(np.expand_dims(np.array([0, 1]), 0), 0);

function du(T, u, s) {
    let p = sigmoid(np.subtract(T, Tboil)).multiply(pB - pL).add(pL);
    let mu = sigmoid(np.subtract(T, Tboil)).multiply(muB - muL).add(muL);
    let nu = mu.divide(p);
    let rho = p.divide(T);

    let [uyxy, uxxy] = np.gradient(u, 1, [0, 1]);
    let nabla_u = np.stack([uxxy, uyxy], 3);
    
    let convect = np.linalg.matmul(nabla_u, np.expand_dims(u, 3))
    convect = np.squeeze(np.array(convect).multiply(-1));

    let gravity = np.expand_dims(p, 2).multiply(ey).divide(np.expand_dims(T, 2));
    
    let [py, px] = np.gradient(p);
    let nabla_p = np.stack([px, py], 2);
    let pressure = np.expand_dims(T, 2).multiply(nabla_p).divide(np.expand_dims(p, 2));

    let [uyxyxy, uyxyyx] = np.gradient(uyxy, 1, [0, 1]);
    let [uxxyxy, uxxyyx] = np.gradient(uyxy, 1, [0, 1]);

    let div_u_x = np.array(uxxyxy.slice(':',':','0')).add(uxxyyx.slice(':',':','1'));
    let div_u_y = np.array(uyxyxy.slice(':',':','0')).add(uyxyyx.slice(':',':','1'));

    let drag = np.stack([div_u_x, div_u_y], 2);

    return np.expand_dims(nu, 2).multiply(drag).subtract(pressure).subtract(gravity).subtract(convect);
}

function dT(T, u, s) {
    let [Ty, Tx] = np.gradient(T, 1);
    let nablaT = np.stack([Tx, Ty], 2);
    let uT = np.multiply(u, np.expand_dims(T, 2));
    let diff = np.subtract(nablaT, uT);
    let [Tyxy, Txxy] = np.gradient(diff, 1, [0, 1]);
    let divDiff = np.array(Tyxy.slice(':',':','1')).add(Txxy.slice(':',':','0'));
    return divDiff.add(s);
}

const N = 64;

let s_0 = np.zeros([N, N]);
s_0[-1] = np.exp(np.square(np.linspace(-5, 5, N)).multiply(-1)).multiply(0.1);
// s_0[-1] = np.sin(np.linspace(-1, 1, N).multiply(10)).add(1);

let u_curr = np.zeros([N, N, 2]);
let T_curr = np.ones([N, N]);

const dt = 1e-1;
let t = 0;

function step_T() {
    let dT_curr = dT(T_curr, u_curr, s_0.multiply(Math.sin(0.05 * t)));
    let du_curr = du(T_curr, u_curr, s_0.multiply(Math.sin(100 * t)));

    t = t + dt;

    T_curr = T_curr.add(dT_curr.multiply(dt));
    u_curr = u_curr.add(du_curr.multiply(dt));

    renderArray('initial', T_curr);
    requestAnimationFrame(step_T);
}

step_T();
