import * as np from 'https://unpkg.com/numpy-ts/dist/numpy-ts.browser.js';

const navier_script = `
    from pyodide.ffi import jsnull
    from scipy.sparse import diags_array, kronsum
    from scipy.sparse.linalg import spsolve
    import js

    def normalize(v, vmin=None, vmax=None):
        vmin = np.amin(v) if vmin is None else vmin
        vmax = np.amax(v) if vmax is None else vmax
        return (v - vmin) / (vmax - vmin)

    def solve_poisson(rhs, scale):
        N, _ = rhs.shape
        Ln = diags_array([np.full(N, -2), np.full(N-1, 1), np.full(N-1, 1)], offsets=[0, 1, -1])
        Lnn = kronsum(Ln, Ln)
        sol = spsolve(Lnn, rhs.ravel(order='F'))
        return sol.reshape(rhs.shape, order='F')

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

        sigma = (1/4) ** 2

        bdists = b - fvecs[None,...]
        bdists = np.linalg.norm(bdists, axis=-1)
        bgauss = np.exp(-bdists ** 2 / sigma ** 2)

        Fmag = np.expand_dims(s, tuple(range(1, dims+1))) * bgauss
        Fmag = np.sum(Fmag, axis=0)
        F = Fmag[...,None] * np.ones((L, L, 2))
        W = 1e-5 * np.random.randn(L, L, 2)

        nabla_u = np.gradient(u, 1/(L+1), axis=tuple(range(dims)))
        nabla_u = np.array(nabla_u)
        nabla_u = np.moveaxis(nabla_u, 0, -2)

        advection = np.einsum('...i,...ij->...j', u, nabla_u)
        
        nnabla_u = np.gradient(nabla_u, 1/(L+1), axis=tuple(range(dims)))
        nnabla_u = np.array(nnabla_u)
        nnabla_u = np.moveaxis(nnabla_u, 0, -3)

        lap_u = np.einsum('...iij->...j', nnabla_u)

        nu = 0.5
        dt = 1e-5
        du = nu * lap_u - advection + F + W

        u_new = u + dt * du

        nabla_u_new = np.gradient(u_new, 1/(L+1), axis=tuple(range(dims)))
        nabla_u_new = np.array(nabla_u_new)
        nabla_u_new = np.moveaxis(nabla_u_new, 0, -2)
        div_u_new = np.einsum('...ii->...', nabla_u_new)
        div_u_new = div_u_new

        p = solve_poisson(div_u_new, 1 / (L + 1))
        print(np.amin(p), np.amax(p))
        nabla_p = np.gradient(p, 1 / (L + 1))
        nabla_p = np.array(nabla_p)
        nabla_p = np.moveaxis(nabla_p, 0, -1)

        u_next = u_new - dt * 40 * nabla_p

        nabla_u_next = np.gradient(u_next, 1/(L+1), axis=(0,1))
        nabla_u_next = np.array(nabla_u_next)
        nabla_u_next = np.moveaxis(nabla_u_next, 0, -2)
        div_u_next = np.einsum('...ii->...', nabla_u_next)

        js.outputs.as_py_json()[simId].u_new = u_next
        js.outputs.as_py_json()[simId].vis = normalize(np.atan2(u_next[:,:,1],u_next[:,:,0]))
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
    await pyodide.loadPackage('scipy');
    pyodide.runPython(`import numpy as np`);
    pyodide.runPython(navier_script);
    document.getElementById('loading').style.opacity = 0;

    let sim_dims = 2;
    let seq_length = 3;
    let sfunc = sourceVectorFunction(seq_length, (n, i) => Math.sin(0.5 * i + 0.1 * n) * Math.sin(0.1 * n) );
    let b = evenBurners(sim_dims, seq_length);

    simulate(pyodide, 'initial', sim_dims, sfunc, b);
}

window.onload = init;
