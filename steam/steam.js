import * as np from 'https://unpkg.com/numpy-ts/dist/numpy-ts.browser.js';

function renderArray2D(canvasId, array) {
    let dims = array.shape.length;
    if (dims != 2) throw new Error('input array is not 2-dimensional');

    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');

    canvas.height = 320;
    canvas.width = 320;

    let amin = np.amin(array);
    let amax = np.amax(array);

    amin = 0;
    amax = 2;

    let pixelWidth = canvas.width / array.shape[1];

    for (let i = 0; i < array.shape[0]; i++) {
        for (let j = 0; j < array.shape[1]; j++) {
            let shade = (array.get([i,j]) - amin) * 255. / (amax - amin);
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
            ctx.fillRect(pixelWidth * j, canvas.height - (pixelWidth * i), pixelWidth, pixelWidth);
        }
    }

    let code_blocks = document.getElementsByTagName('blockquote');
    for (let i = 0; i < code_blocks.length; i++) {
        code_blocks[i].textContent = code_blocks[i].textContent.trim();
    }
}

const L = 64;

function simulate(canvasId, dims, s, b) {
    let u_shape = Array(dims).fill(L);
    u_shape.push(dims);
    let u_0 = np.zeros(u_shape);

    let fspace = np.linspace(0, 1, L);
    let fmeshes = np.meshgrid(...Array(dims).fill(fspace));
    let fvecs = np.stack(fmeshes, dims);

    let sigma = (0.5) ** 2;

    let bdists = b;
    for (let i = 0; i < dims; i++) {
        bdists = bdists.expand_dims(1);
    }
    bdists = bdists.subtract(fvecs.expand_dims(0));
    bdists = np.linalg.norm(bdists, 2, -1);
    bdists = np.array(bdists);

    let bbasis = np.exp(bdists.multiply(-1).divide(sigma ** 2));

    step(canvasId, dims, 0, 1e-1, u_0, s, bbasis);
}

function step(canvasId, dims, n, h, u, s, bbasis) {
    let sn = s(n);
    for (let i = 0; i < dims; i++) sn = sn.expand_dims(1);
    let F = sn.multiply(bbasis).sum(0).expand_dims(dims);
    renderArray2D(canvasId, F.slice(':',':','0'));
    setTimeout(step, 20, canvasId, dims, n + 1, h, u, s, bbasis);
}

function init() {
    let i = np.arange(3);
    let s = (n) => np.sin(i.add(n).multiply(0.01)).multiply(Math.sin(0.1 * n)).add(1);
    let b = i.add(1).divide(4).expand_dims(1);
    b = np.pad(b, [[0, 0], [0, 1]]);

    simulate('initial', 2, s, b);
}

window.onload = init;
