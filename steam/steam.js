import * as np from 'https://unpkg.com/numpy-ts/dist/numpy-ts.browser.js';

const navier_script = `
    from pyodide.ffi import jsnull
    import js

    def normalize(v, vmin=None, vmax=None):
        vmin = np.amin(v) if vmin is None else vmin
        vmax = np.amax(v) if vmax is None else vmax
        return (v - vmin) / (vmax - vmin)

    def du_bar(simId, dims, L, u, s, b):
        if u is jsnull: u = np.zeros([*[L]*dims,dims])
        else: u = np.array(u)
        b = np.array(b)
        s = np.array(s)

        b = np.expand_dims(b, tuple(range(1, dims+1)))
        
        fspace = np.linspace(0, 1, L)
        fmesh = np.meshgrid(*[fspace]*dims)
        fvecs = np.stack(fmesh, -1)

        sigma = (1/16) ** 2

        bdists = b - fvecs[None,...]
        bdists = np.linalg.norm(bdists, axis=-1)
        bgauss = np.exp(-bdists ** 2 / sigma ** 2)

        Fmag = np.expand_dims(s, tuple(range(1, dims+1))) * bgauss
        Fmag = np.sum(Fmag, axis=0)

        fft_axes = tuple(range(dims))

        F = np.pad(Fmag[...,None], { dims: (dims-1, 0) })
        F_bar = np.fft.fftn(F, axes=fft_axes)
        u_bar = np.fft.fftn(u, axes=fft_axes)

        kspace = 2 * np.pi * np.fft.fftfreq(L, 1 / (L + 1))
        kmesh = np.meshgrid(*[kspace]*dims)
        kvecs = np.stack(kmesh, -1)
        kmags = np.linalg.norm(kvecs, axis=-1, keepdims=True)

        nabla_u_bar = np.einsum('...i,...j->...ij', 1j * kvecs, u_bar)
        nabla_u_real = np.fft.ifftn(nabla_u_bar, axes=fft_axes)

        drag_bar = -(kmags ** 2) * u_bar
        convect_real = np.einsum('...i,...ij->...j', u, nabla_u_real)
        convect_bar = np.fft.fftn(convect_real, axes=fft_axes)

        leray_identity = np.expand_dims(np.eye(dims), tuple(range(dims)))
        leray_kok = np.einsum('...i,...j->...ij', kvecs, kvecs) / kmags[...,None]
        leray_kok = np.nan_to_num(leray_kok)
        leray_proj = leray_identity - leray_kok
        leray_proj[:,:,0,0] = 0.

        proj_convect_force_bar = np.einsum('...ij,...j->...i', leray_proj, convect_bar + F_bar)

        du_bar = 1 * drag_bar - proj_convect_force_bar + np.random.randn(L, L, dims)

        h = 1e-7
        u_bar_new = u_bar + h * du_bar
        u_new = np.fft.ifftn(u_bar_new, axes=fft_axes)

        js.outputs.as_py_json()[simId].u_new = u_new;
        js.outputs.as_py_json()[simId].vis = normalize(np.log(np.abs(u_new[:,:,1])));
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
const L = 128;

function simulate(pyodide, canvasId, dims, sfunc, b) {
    outputs[canvasId] = {};
    step(pyodide, canvasId, 0, dims, sfunc, b);
}

function step(pyodide, canvasId, n, dims, sfunc, b) {
    const locals = pyodide.toPy({ simId: canvasId, L: L, dims: dims, u: (n > 0) ? outputs[canvasId]['u_new'] : null, s: sfunc(n), b: b });
    pyodide.runPython("du_bar(simId, dims, L, u, s, b)", { locals });
    renderArray2D(canvasId, outputs[canvasId].vis.toJs());
    if (n < 10000) setTimeout(step, 20, pyodide, canvasId, n + 1, dims, sfunc, b);
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
    let seq_length = 2;
    let sfunc = sourceVectorFunction(seq_length, (n, i) => Math.sin(1 * i + 0.05 * n) * Math.sin(0.5 * n) );
    let b = evenBurners(sim_dims, seq_length);

    simulate(pyodide, 'initial', sim_dims, sfunc, b);
}

window.onload = init;
