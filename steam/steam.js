import * as np from 'https://unpkg.com/numpy-ts/dist/numpy-ts.browser.js';

const navier_script = `
    from pyodide.ffi import jsnull
    import js

    def normalize(v):
        return (v - np.amin(v)) / (np.amax(v) - np.amin(v))

    def du_bar(simId, dims, L, u, s, b):
        if u == jsnull: u = np.zeros([*[L]*dims,dims])
        else: u = np.array(u)
        b = np.array(b)
        s = np.array(s)

        b = np.expand_dims(b, tuple(range(1, dims+1)))
        
        fspace = np.linspace(0, 1, L)
        fmesh = np.meshgrid(*[fspace]*dims)
        fvecs = np.stack(fmesh, dims)

        bdists = b - fvecs[None,...]
        bdists = np.linalg.norm(bdists, axis=-1)

        js.outputs.as_py_json()[simId] = normalize(bdists[0]);
`;

function renderArray2D(canvasId, array) {
    let H = array.length;
    let W = array[0].length;

    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');

    canvas.height = 320;
    canvas.width = 320;

    let pixelWidth = canvas.width / W;

    for (let i = 0; i < H; i++) {
        for (let j = 0; j < W; j++) {
            let shade = array[i][j] * 255;
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
            ctx.fillRect(pixelWidth * j, canvas.height - (pixelWidth * i), pixelWidth, pixelWidth);
        }
    }

    let code_blocks = document.getElementsByTagName('blockquote');
    for (let i = 0; i < code_blocks.length; i++) {
        code_blocks[i].textContent = code_blocks[i].textContent.trim();
    }
}

globalThis.outputs = {};
const L = 64;

function simulate(pyodide, canvasId, dims, sfunc, b) {
    let n = 0;
    while (n < 1000) {
        const locals = pyodide.toPy({ simId: canvasId, L: L, dims: dims, u: null, s: sfunc(n), b: b });
        pyodide.runPython("du_bar(simId, dims, L, u, s, b)", { locals });
        renderArray2D(canvasId, outputs[canvasId].toJs());
        n += 1;
    }
}

function evenBurners(dim, num) {
    let result = [];
    for (let i = 0; i < num; i++) {
        let row = [];
        row = row.concat((i + 1) / (num + 1));
        row = row.concat(Array(dim - 1).fill(0));
        result[i] = row;
    }
    return result;
}

function sourceVectorFunction(len, callback) {
    return function(n) {
        let s = [];
        for (let i = 0; i < len; i++) {
            s.push(callback(n, i));
        }
        return s;
    }
}

async function init() {
    let pyodide = await loadPyodide();
    await pyodide.loadPackage('numpy');
    pyodide.runPython(`import numpy as np`);
    pyodide.runPython(navier_script);
    document.getElementById('loading').style.opacity = 0;

    let sim_dims = 2;
    let seq_length = 3;
    let sfunc = sourceVectorFunction(seq_length, (n, i) => Math.sin(0.1 * (i + n)) * Math.sin(0.1 * n) );
    let b = evenBurners(sim_dims, seq_length);

    simulate(pyodide, 'initial', sim_dims, sfunc, b);
}

window.onload = init;
