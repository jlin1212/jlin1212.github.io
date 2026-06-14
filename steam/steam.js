import * as np from 'https://unpkg.com/numpy-ts/dist/numpy-ts.browser.js';

const navier_script = `
    from pyodide.ffi import jsnull
    from scipy.sparse import block_array, diags_array, eye_array, kron, kronsum
    from scipy.sparse.linalg import spsolve
    import js

    OPS = {}

    def normalize(v, vmin=None, vmax=None):
        vmin = np.amin(v) if vmin is None else vmin
        vmax = np.amax(v) if vmax is None else vmax
        return (v - vmin) / (vmax - vmin)

    def init_sim(simId, L):
        h = 1 / (L - 1)

        I = eye_array(L, format='csc')
        D = (1 / (2 * h)) * diags_array([np.ones(L-1),-np.ones(L-1)], offsets=[1,-1], format='csc')
        L = (1 / h ** 2) * diags_array([
            -np.full(L, 2),
            np.ones(L-1),
            np.ones(L-1)
        ], offsets=[0,1,-1], format='csc')

        OPS[simId] = {}
        OPS[simId]['I']   = kron(I, I)
        OPS[simId]['Dx']  = kron(D, I)
        OPS[simId]['Dy']  = kron(I, D)
        OPS[simId]['Lnn'] = kronsum(L, L)

    def du_bar(simId, dims, L, u, s, b):
        if u is jsnull: 
            u = np.zeros([*[L]*dims,dims])
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
        Fvec = 2 * Fmag.ravel(order='F')
        W = 1e-5 * np.random.randn(L**2, 2)

        U_x = diags_array(u[:,:,0].ravel(order='F'))
        U_y = diags_array(u[:,:,1].ravel(order='F'))

        nu = 1e-5

        convection = (U_x @ OPS[simId]['Dx']) + (U_y @ OPS[simId]['Dy'])
        momentum = nu * OPS[simId]['Lnn'] - convection
        zeros = momentum * 0.

        ns_sys = 20 * block_array([
            [momentum,         zeros,            OPS[simId]['Dx']],
            [zeros,            momentum,         OPS[simId]['Dy']],
            [OPS[simId]['Dx'], OPS[simId]['Dy'], zeros]
        ]).tocsc()
        ns_rhs = np.concatenate([0.1 * Fvec, Fvec, np.zeros(L**2)])

        sol = spsolve(ns_sys, ns_rhs)

        sol_ux, sol_uy, sol_p = sol[:L**2], sol[L**2:2*L**2], sol[2*L**2:]
        sol_u = np.stack([sol_ux.reshape((L, L), order='F'), sol_uy.reshape((L, L), order='F')], axis=-1)

        js.outputs.as_py_json()[simId].u_new = sol_u
        js.outputs.as_py_json()[simId].vis = normalize(np.linalg.norm(sol_u, axis=-1))
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
            ctx.fillRect(canvas.width - pixelWidth * j, canvas.height - (pixelWidth * i), pixelWidth, pixelWidth);
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
    outputs[canvasId] = {};
    const locals = pyodide.toPy({ simId: canvasId, L: L });
    pyodide.runPython("init_sim(simId, L)", { locals });
    step(pyodide, canvasId, 0, dims, sfunc, b);
}

function step(pyodide, canvasId, n, dims, sfunc, b) {
    const locals = pyodide.toPy({ 
        simId: canvasId, 
        L: L, 
        dims: dims, 
        u: (n > 0) ? outputs[canvasId]['u_new'] : null, 
        s: sfunc(n), b: b 
    });
    pyodide.runPython("du_bar(simId, dims, L, u, s, b)", { locals });
    renderArray2D(canvasId, outputs[canvasId].vis.toJs());
    setTimeout(step, 42, pyodide, canvasId, n + 1, dims, sfunc, b);
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
    await pyodide.loadPackage('scipy');
    pyodide.runPython(`import numpy as np`);
    pyodide.runPython(navier_script);
    document.getElementById('loading').style.opacity = 0;

    let sim_dims = 2;
    let seq_length = 3;
    let sfunc = sourceVectorFunction(seq_length, (n, i) => Math.sin(0.5 * i + 0.01 * n) * Math.sin(0.01 * n) );
    let b = evenBurners(sim_dims, seq_length);

    simulate(pyodide, 'initial', sim_dims, sfunc, b);
}

window.onload = init;
