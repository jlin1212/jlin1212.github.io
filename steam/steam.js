import * as np from 'https://unpkg.com/numpy-ts/dist/numpy-ts.browser.js';

const navier_script = `
    import js

    def du_bar(simId, s, b):
        js.outputs.as_object_map()[simId] = s;
`;

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

globalThis.outputs = {};
const L = 64;

function simulate(pyodide, canvasId, dims, sfunc, b) {
    let n = 0;
    while (n < 1000) {
        const locals = pyodide.toPy({ name: canvasId, s: sfunc(n), b: b });
        pyodide.runPython("du_bar(name, s, b)", { locals });
        console.log(outputs[canvasId].toJs());
        n += 1;
    }
}

function evenBurners1D(num) {
    let result = [];
    for (let i = 0; i < num; i++) {
        result.push((i+1)/(num+1))
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

    let seq_length = 3;
    let sfunc = sourceVectorFunction(seq_length, (n, i) => Math.sin(0.1 * (i + n)) * Math.sin(0.1 * n) );
    let b = evenBurners1D(seq_length);

    simulate(pyodide, 'initial', 2, sfunc, b);
}

window.onload = init;
