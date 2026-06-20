const navier_script = `
    from pyodide.ffi import jsnull
    from scipy.sparse import block_array, diags_array, eye_array, kron, kronsum
    from scipy.sparse.linalg import cg, spsolve
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

    def du(simId, dims, L, u, s, b):
        if u is jsnull: 
            u = np.zeros([*[L]*dims,dims])
        else: u = np.array(u)
        b = np.array(b)
        s = np.array(s)

        s_idx = (np.arange(9) + 1.) / (9 + 1)
        s_idx = (s_idx * L).astype(int)

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
        W = 1e-5 * np.random.randn(L**2)

        Fvec = Fvec + W

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

        js.outputs.as_py_json()[simId].s     = s
        js.outputs.as_py_json()[simId].u_new = sol_u
        js.outputs.as_py_json()[simId].u_out = sol_u[0,s_idx,1]
        js.outputs.as_py_json()[simId].vis   = normalize(np.linalg.norm(sol_u, axis=-1))
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
    for (const code_block of code_blocks) {
        code_block.textContent = code_block.textContent.trim();
    }
}

class GraphManager {
    static hists = {};
    static dx = 1;

    static initGraph(canvasId, scheme) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');

        canvas.height = 200;
        canvas.width = 500;

        for (let x = 0; x <= canvas.width; x += (canvas.width / 20)) {
            ctx.beginPath();
            ctx.strokeStyle = '#bbb';
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.strokeStyle = '#888';
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        this.hists[canvasId] = {
            offset: 0,
            scheme: scheme
        };
    }

    static graphSeries(canvasId, sample, scale) {
        if (this.hists[canvasId].palette == null) {
            this.hists[canvasId].palette = palette(this.hists[canvasId].scheme, sample.length);
        }

        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');

        ctx.lineWidth = 2;

        if (this.hists[canvasId] != null && this.hists[canvasId].sample != null) {
            let hist = this.hists[canvasId];
            const offset = hist.offset + this.dx;

            if (offset > canvas.width) {
                this.initGraph(canvasId, this.hists[canvasId].scheme);
                return;
            }

            const y_base = canvas.height / 2;

            for (let i = 0; i < sample.length; i++) {
                ctx.beginPath();
                ctx.moveTo(hist.offset, y_base - hist.sample[i] * scale);
                ctx.strokeStyle = `#${this.hists[canvasId].palette[i]}`;
                ctx.lineTo(offset, y_base - sample[i] * scale);
                ctx.stroke();
            }
            this.hists[canvasId].offset = offset;
        }

        this.hists[canvasId].sample = sample;
    }
}

globalThis.outputs = {};
const L = 64;

function simulate(pyodide, canvasId, dims, sfunc, b, graphs) {
    if (graphs !== undefined) {
        for (const graph of graphs) GraphManager.initGraph(graph.canvas, graph.scheme);
    }

    document.getElementById(canvasId).addEventListener('click', function() {
        let isRunning = this.dataset.running === 'true';
        this.dataset.running = (!isRunning).toString();
        let canvases = document.getElementsByTagName('canvas');
        for (const canvas of canvases) {
            if (canvas.id !== canvasId) canvas.dataset.running = 'false';
        }
    });
    outputs[canvasId] = {};
    const locals = pyodide.toPy({ simId: canvasId, L: L });
    pyodide.runPython("init_sim(simId, L)", { locals });
    step(pyodide, canvasId, 0, dims, sfunc, b, graphs);
}

function step(pyodide, canvasId, n, dims, sfunc, b, graphs) {
    let canvas = document.getElementById(canvasId);
    let isRunning = canvas.dataset.running === 'true';

    if (isRunning) {
        const locals = pyodide.toPy({ 
            simId: canvasId, 
            L: L, 
            dims: dims, 
            u: (n > 0) ? outputs[canvasId]['u_new'] : null, 
            s: sfunc(n), b: b
        });
        pyodide.runPython("du(simId, dims, L, u, s, b)", { locals });
        canvas.nextElementSibling.textContent = `step=${n}`;

        renderArray2D(canvasId, outputs[canvasId].vis.toJs());
        outputs[canvasId].vis.destroy();
        if (graphs !== undefined) {
            for (const graph of graphs) {
                GraphManager.graphSeries(graph.canvas, outputs[canvasId][graph.key].toJs(), graph.scale);
                outputs[canvasId][graph.key].destroy();
            }
        }
    } else {
        if (outputs[canvasId].vis == null) renderArray2D(canvasId, Array(L).fill(Array(L).fill(0)));
    }
    
    setTimeout(step, 42, pyodide, canvasId, isRunning ? n + 1 : n, dims, sfunc, b, graphs);
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
    let sfunc = sourceVectorFunction(seq_length, (n, i) => Math.sin(0.5 * i + 0.07 * n) * Math.sin(0.07 * n) + 1. );
    let b = evenBurners(sim_dims, seq_length);

    simulate(pyodide, 'initial', sim_dims, sfunc, b);

    let reservoir_graphs = [{
        canvas: 'reservoirInput',
        key: 's',
        scale: 20,
        scheme: 'cb-qualitative'
    }, {
        canvas: 'reservoirOutput',
        key: 'u_out',
        scale: 7,
        scheme: 'qualitative'
    }];
    simulate(pyodide, 'reservoir', sim_dims, sfunc, b, reservoir_graphs);
}

window.onload = init;
