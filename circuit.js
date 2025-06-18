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

let biasField = document.getElementById('bias-field');
let ohmField = document.getElementById('ohm-field');
let editDialog = document.getElementById('edit');

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
    .selectAll('circle')
    .data(nodes)
    .join('circle')
        .attr('r', 4)
        .attr('fill', '#fff')
        .attr('stroke-width', 3)
        .attr('stroke', '#85451e');

let delaunay = null;
let incidence = null;

let links = null;
let link = null;

function ticked() {
    node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
}

function mesh() {
    delaunay = d3.Delaunay.from(nodes, d => d.x, d => d.y);
    incidence = Array.from({ length: N }, () => Array.from({ length: delaunay.halfedges.length }, () => 0));
    links = [];
    
    for (let i = 0; i < delaunay.halfedges.length; i++) {
        let j = delaunay.halfedges[i];
        if (i <= j) continue;
        if (j < 0) j = (j % 3 === 2) ? i - 2 : i + 1;
        const ti = delaunay.triangles[i];
        const tj = delaunay.triangles[j];
        
        incidence[ti][i] = 1;
        incidence[tj][i] = -1;

        links.push({
            source: nodes[ti],
            target: nodes[tj],
            id: links.length,
            bias: 0,
            resistance: 10
        });
    }

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
        .attr('y2', d => d.target.y);
    
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
            return `rotate(${angle+90}, ${this.x.baseVal.value+(sourceW/2)}, ${this.y.baseVal.value+(sourceH/2)})`;
        });
}

function edit(d) {
    editDialog.style.opacity = 1;

    let x = (d.source.x + d.target.x) / 2;
    let y = (d.source.y + d.target.y) / 2 - 10;

    editDialog.style.left = `${100*x/width}%`;
    editDialog.style.top = `${100*y/height}%`;
    editDialog.dataset['target'] = d.id;

    biasField.innerHTML = `${d.bias}`;
    ohmField.innerHTML = `${d.resistance}`;
}

function updateEdges() {
    console.log(svg.selectAll('g#edges'))
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
    updateEdges();
}

document.onkeydown = function(evt) {
    if (evt.key === 'Escape') {
        editDialog.style.opacity = 0;
        updateEdges();
    }
};

biasField.onkeyup = function() {
    let content = this.innerHTML.trim();
    if (content.length > 0 && !isNaN(content)) links[editDialog.dataset['target']].bias = parseFloat(this.innerHTML);
    updateEdges();
    console.log(links[editDialog.dataset['target']]);
};

ohmField.onkeyup = function() {
    let content = this.innerHTML.trim();
    if (content.length > 0 && !isNaN(content)) links[editDialog.dataset['target']].resistance = parseFloat(this.innerHTML);
    updateEdges();
    console.log(links[editDialog.dataset['target']]);
};

container.append(svg.node());
