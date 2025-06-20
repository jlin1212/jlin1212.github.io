import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 1028;
const height = 1080;
const N = 40;

const resistor = (await d3.xml('./circuit/resistor.svg')).children[0];
resistor.setAttribute('class', 'resistor');
const resistorH = resistor.height.baseVal.value;
const resistorW = resistor.width.baseVal.value;

const source = (await d3.xml('./circuit/battery.svg')).children[0];
source.setAttribute('class', 'source');
const sourceH = source.height.baseVal.value;
const sourceW = source.width.baseVal.value;

const memristor = (await d3.xml('./circuit/memristor.svg')).children[0];
memristor.setAttribute('class', 'memristor');
const memristorH = memristor.height.baseVal.value;
const memristorW = memristor.width.baseVal.value;

let biasField = document.getElementById('bias-field');
let ohmField = document.getElementById('ohm-field');
let editDialog = document.getElementById('edit');
let modeButton = document.getElementById('mode');
let randomButton = document.getElementById('randomize');
let flowButton = document.getElementById('flowView');
let zeroButton = document.getElementById('zero');

const svg = d3.create('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('style', 'max-width: 100%; height: auto;');

let nodes = Array.from({ length: N }, () => ({}));
let simulation = d3.forceSimulation(nodes)
    .alphaDecay(0.08)
    .force('charge', d3.forceManyBody().strength(-150))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .on('tick', ticked) 
    .on('end', mesh);

const node = svg.append('g')
    .attr('id', 'nodes')
    .selectAll('circle')
    .data(nodes)
    .join('circle')
        .attr('r', 2)
        .attr('fill', '#fff')
        .attr('stroke-width', 3)
        .attr('stroke', '#85451e');

let delaunay = null;
let links = null;
let link = null;

let augB = null;
let potential_operator = null;
let OmegaA = null;
let v = null;
let i = null;
let u = null;
let gradient = null;
let showFlow = false;

let mode = 0;

const uScale = 15;

function ticked() {
    node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
}

function mesh() {
    delaunay = d3.Delaunay.from(nodes, d => d.x, d => d.y);
    links = [];
    
    for (let i = 0; i < delaunay.halfedges.length; i++) {
        let j = delaunay.halfedges[i];
        if (i <= j) continue;
        if (j < 0) j = (j % 3 === 2) ? i - 2 : i + 1;
        const ti = delaunay.triangles[i];
        const tj = delaunay.triangles[j];

        links.push({
            source: nodes[ti],
            target: nodes[tj],
            id: links.length,
            bias: 0,
            resistance: 1
        });
    }

    let incidence = math.zeros(nodes.length, links.length)
    links.forEach((l, i) => {
        incidence.set([l.source.index,i], -1);
        incidence.set([l.target.index,i], 1);
    });
    let Btilde = math.subset(incidence, math.index(
        math.range(0,nodes.length-1), math.range(0,links.length)))
    let g = math.multiply(Btilde, math.transpose(Btilde))

    augB = math.transpose(math.clone(Btilde));
    augB.resize([links.length, nodes.length]);
    augB.set([links.length-1, 0], 1);
    potential_operator = math.pinv(augB);

    let OmegaB = math.multiply(math.multiply(math.transpose(Btilde), math.inv(g)), Btilde)
    OmegaA = math.subtract(math.identity(links.length), OmegaB);

    link = svg.append('g').lower()
        .attr('stroke', '#940f0f')
        .attr('stroke-opacity', 0.6)
        .attr('id', 'edges')
    .selectAll('g')
    .data(links).enter().append('g')
        .attr('class', 'edge')
    .on('click', (evt, d) => edit(d));

    link.append('line')
        .attr('stroke-width', d => 2)
        .attr('data-link', d => d.id)
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
        .attr('data-length', d => Math.sqrt(Math.pow(d.source.x - d.target.x, 2) + Math.pow(d.source.y - d.target.y, 2)));
    
    link.append(() => resistor.cloneNode(true))
        .attr('id', '')
        .attr('class', 'resistor')
        .attr('data-link', (d,i) => i)
        .attr('x', d => (d.source.x + d.target.x - resistorW) / 2)
        .attr('y', d => (d.source.y + d.target.y - resistorH) / 2)
        .attr('transform', d => {
            let angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI;
            let x = (d.source.x + d.target.x) / 2;
            let y = (d.source.y + d.target.y) / 2;
            return `rotate(${angle}, ${x}, ${y})`;
        });

    link.append(() => source.cloneNode(true))
        .attr('id', '')
        .attr('class', 'bias')
        .attr('data-link', (d,i) => i)
        .attr('x', d => ((1 - 0.25) * d.source.x + 0.25 * d.target.x) - (sourceW / 2))
        .attr('y', d => ((1 - 0.25) * d.source.y + 0.25 * d.target.y) - (sourceH / 2))
        .attr('opacity', d => Math.abs(d.bias) > 0 ? 1 : 0)
        .attr('transform', function(d) {
            let angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI;
            return `rotate(${angle+270}, ${this.x.baseVal.value+(sourceW/2)}, ${this.y.baseVal.value+(sourceH/2)})`;
        });
}

function edit(d) {
    console.log(d);
    editDialog.style.opacity = 1;
    editDialog.style.display = 'flex';

    let x = (d.source.x + d.target.x) / 2;
    let y = (d.source.y + d.target.y) / 2 - 10;

    editDialog.style.left = `${100*x/width}%`;
    editDialog.style.top = `${100*y/height}%`;
    editDialog.dataset['target'] = d.id;

    biasField.innerHTML = `${d.bias}`;
    ohmField.innerHTML = `${d.resistance}`;
}

function renderEdges() {
    let edges = svg.selectAll('g#edges g.edge');
    edges.data(links).select('.bias').attr('opacity', d => Math.abs(d.bias) > 0 ? 1 : 0);
    
    let S = math.matrix(links.map(l => l.bias));
    let R = math.diag(math.matrix(links.map(l => l.resistance)));
    let Z = math.subtract(R, math.identity(links.length));
    let OmegaAR = math.multiply(
        R, OmegaA,
        math.pinv(math.add(math.identity(links.length), math.multiply(Z, OmegaA)))
    );

    v = math.add(math.multiply(-1, S), math.multiply(-1, OmegaAR, S));
    i = math.multiply(math.pinv(R), v);
    u = math.multiply(potential_operator, v);
    gradient = math.multiply(
        math.resize(v, [1, links.length]), 
        math.subtract(math.identity(links.length), OmegaAR),
        math.diag(i)
    )

    console.log('gradient', gradient);
    console.log('number of edges', links.length);
    console.log('voltage', v);
    console.log('potentials', u);

    let circles = svg.selectAll('g#nodes circle');
    circles.data(u)
        .attr('r', d => uScale / (1 + Math.exp(-Math.abs(d.value))) + (2 - 0.5 * uScale))
        .attr('class', d => {
            let mag = Math.log10(Math.abs(d.value));
            if (mag < -9) return 'ground';
            if (d.value > 0) return 'out';
            if (d.value < 0) return 'in';
        });
    circles.data(nodes);

    let edgeData = null;
    switch(mode) {
        case 0:
            edgeData = i;
            break;
        case 1:
            edgeData = v;
            break;
        case 2:
            edgeData = math.multiply(200, gradient); // scale by 10 to make gradient visible, since it's quite small otherwise
            break;
    }

    edges.data(edgeData)
        .attr('data-flow', d => d.value >= 0 ? 'forward' : 'backward')
        .attr('stroke', d => d.value <= 0 ? '#940f0f' : '#163669')
        .attr('data-i', d => d.value)
        .style('animation-duration', (d,_i) => `${8 * Math.exp(-Math.abs(i.get([_i]))) + 0.1}s`)
        .style('animation-play-state', d => Math.abs(d.value) === 0 ? 'paused' : 'running')
        .select('line').attr('stroke-width', d => Math.pow(2 * Math.log(Math.abs(d.value) + 1), 1.7) + 1.3);
    edges.data(links)
        .attr('stroke-dasharray', showFlow ? '6 3' : '');
}

document.onmousedown = function(evt) {
    if (editDialog.style.opacity === 0) return;
    switch (evt.target.tagName) {
        case 'circle':
        case 'path':
            return;
    }
    if (editDialog.contains(evt.target)) return;
    editDialog.style.opacity = 0;
    editDialog.style.display = 'none';
    renderEdges();
}

document.onkeydown = function(evt) {
    if (evt.key === 'Escape') {
        editDialog.style.opacity = 0;
        editDialog.style.display = 'none';
        renderEdges();
    }
};

biasField.onkeyup = function() {
    let content = this.innerHTML.trim();
    if (content.length > 0 && !isNaN(content)) links[editDialog.dataset['target']].bias = parseFloat(this.innerHTML);
    renderEdges();
    console.log(links[editDialog.dataset['target']]);
};

ohmField.onkeyup = function() {
    let content = this.innerHTML.trim();
    if (content.length > 0 && !isNaN(content)) links[editDialog.dataset['target']].resistance = parseFloat(this.innerHTML);
    renderEdges();
};

modeButton.onclick = function() {
    mode = (mode + 1) % 3;
    switch(mode) {
        case 0:
            modeButton.innerText = 'view: current';
            break;
        case 1:
            modeButton.innerText = 'view: voltage';
            break;
        case 2:
            modeButton.innerHTML = `view: &part;<sub>r</sub> v`;
            break;
        default:
            modeButton.innerText = 'view: unknown';
            break;
    }
    renderEdges();
}

randomButton.onclick = function() {
    for (let i = 0; i < links.length; i++) {
        links[i].resistance = Math.floor(Math.random() * 20 + 10);
    }
    renderEdges();
}

flowButton.onclick = function() {
    showFlow = !showFlow;
    flowButton.innerText = showFlow ? 'view: flow' : 'view: magnitude';
    showFlow = flowButton.innerText !== 'view: magnitude';
    renderEdges();
}

zeroButton.onclick = function() {
    for (let i = 0; i < links.length; i++) {
        links[i].bias = 0;
    }
    renderEdges();
}

container.append(svg.node());
