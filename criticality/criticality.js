function init() {
    if (window.scrollY < window.innerHeight / 2) init_dots();
    else {
        document.querySelector('#land span').style.opacity = 1;
        document.querySelector('#land span').style.top = '0px';
    }

    init_brain_anim();
    handleFixedScroll();
}

function clamp(x, min, max) {
    return (x > min) ? (x < max) ? x : max : min
}

function mean_speed(nodes) {
    let cumul_speed = nodes.reduce((accum, node) => accum += Math.sqrt(node.vx * node.vx + node.vy * node.vy), 0);
    return cumul_speed / nodes.length
}

let BRAIN_COORDS = null;

async function init_brain_anim() {
    const container = document.getElementById('brain-graphic-container');
    const width = container.getBoundingClientRect().width;
    const height = width;

    ['brain', 'seizure'].forEach(async function(type) {
        const svg = d3.create('svg')
            .attr('id', `${type}-graph`)
            .attr('width', width)
            .attr('height', height);
        container.append(svg.node());

        const positions = await d3.text(`assets/${type}_graph.txt`);
        let coords = positions.split('\n').map((elem) => elem.split(' ').map((e) => parseFloat(e)));
        let coordScale = (type == 'brain') ? 0.6 : 0.7;
        coords = coords.map(function(d) { 
            return { x: (-d[0] * coordScale + 1) / 2, y: (-d[1] * coordScale + 1) / 2 };
        });
        coords = coords.filter(c => !isNaN(c.x));
        BRAIN_COORDS = coords;

        const adj = await d3.text(`assets/${type}_graph_adj.txt`);
        let adjlist = adj.split('\n').map((elem) => elem.split(' ').map((e) => parseInt(e)));
        let edges = []
        adjlist.forEach(function (list) {
            for (let i = 1; i < list.length; i++) {
                edges.push({
                source: coords[list[0]],
                target: coords[list[i]] 
                });
            }
        });

        const bfs = await d3.text(`assets/${type}_graph_bfs.txt`);
        let bfslist = bfs.split('\n').map((elem) => elem.split(':').map((e) => parseInt(e)));
        bfslist.forEach((b) => coords[b[0]]['distance'] = b[1]);

        let links = svg.append('g')
            .selectAll('link')
            .data(edges)
            .enter()
            .append('line')
                .attr('x1', d => d.source.x * width)
                .attr('y1', d => d.source.y * height)
                .attr('x2', d => d.target.x * width)
                .attr('y2', d => d.target.y * height)
                .attr('stroke-width', 10)
                .attr('opacity', 1)
                .attr('stroke', (type == 'brain') ? '#0890ffff' : '#ff0808ff');

        let nodes = svg.append('g')
            .selectAll('dot')
            .data(coords)
            .enter()
            .append('circle')
                .attr('cx', d => d.x * width)
                .attr('cy', d => d.y * height)
                .attr('r', 6)
                .attr('stroke-width', 6)
                .attr('stroke', (type == 'brain') ? '#0f5d9dff' : '#b61d1dff')
                .attr('opacity', 1)
                .attr('fill', '#fffcedff');
    });
}

function updateBrainGraph() {
    ['brain', 'seizure'].forEach(function (type) {
        const svg = d3.select(`#brain-graphic-container svg#${type}-graph`);
        const area_scaling = (type == 'brain') ? 0.6 : 0.8;
        const brain_min = getGlobalTopOffset(document.querySelector(`#${type}`)) * (2 - area_scaling);
        const brain_max = brain_min + area_scaling * document.querySelector(`#${type}`).getBoundingClientRect().height;

        const container = document.getElementById('brain-graphic-container');
        const width = container.getBoundingClientRect().width;
        const height = width;
        
        let pageMiddle = window.scrollY + (window.innerHeight / 2);
        let ratio = clamp((pageMiddle - brain_min) / (brain_max - brain_min), 0, 1);
        let distThreshold = ratio * ((type == 'brain') ? 6 : 4);

        svg.selectAll('circle').attr('opacity', d => (d.distance <= distThreshold) ? 1 : 0);
        svg.selectAll('line')
            .attr('x1', d => d.source.x * width)
            .attr('y1', d => d.source.y * height)
            .attr('x2', d => (d.source.x + clamp(distThreshold - d.source.distance, 0, 1) * (d.target.x - d.source.x)) * width)
            .attr('y2', d => (d.source.y + clamp(distThreshold - d.source.distance, 0, 1) * (d.target.y - d.source.y)) * height);
    });
}

async function init_dots() {
    const container = document.getElementById('dots');
    const dots_width = container.getBoundingClientRect().width;
    const dots_height = container.getBoundingClientRect().height;
    const svg = d3.create('svg')
        .attr('width', dots_width)
        .attr('height', dots_height);

    const positions = await d3.text('titles/criticality.txt')
    let coords = positions.split('\n').map((elem) => elem.split(' ').map((e) => parseFloat(e)));
    let nodes = [];
    let random_centerX = 0;
    let random_centerY = 0;
    for (let i = 0; i < coords.length; i++) {
        let x = -0.5 + (Math.random() - 0.5);
        let y = coords[i][1] + 0.6 * (Math.random() - 0.5);
        nodes.push({ x: x, y: y, critical: false });
        random_centerX += x;
        random_centerY += y;
    }
    random_centerX /= coords.length;
    random_centerY /= coords.length;
    
    let brownian_alpha = 1;
    let brownian_alpha_y = 0.01;
    let scatter = false;

    const simulation = d3.forceSimulation(nodes)
    .alphaDecay(0)
    .force("brownian", function(alpha) {
        const alpha_min = 0.1;
        for (let j = 0; j < nodes.length; j++) {
            nodes[j].vx += (Math.random() - 0.5) * clamp(brownian_alpha, alpha_min, Number.POSITIVE_INFINITY) * 0.005;
            nodes[j].vy += (Math.random() - 0.5) * brownian_alpha_y;
        }
    })
    .force("logo", function(alpha) {
        const speed_max = 0.004;
        for (let j = 0; j < nodes.length; j++) {
            let dx = clamp((coords[j][0] - nodes[j].x) * 0.03, -speed_max, speed_max);
            let dy = clamp((2 * (coords[j][1] - 0.3) - nodes[j].y) * 0.03, -speed_max, speed_max)
            nodes[j].vx += dx;
            nodes[j].vy += dy;
        }
    })
    .force("scatter", function(alpha) {
        if (!scatter) return;
        for (let j = 0; j < nodes.length; j++) {
            nodes[j].vx += (nodes[j].x - 0.5) * 0.3;
            nodes[j].vy += (nodes[j].y - 0.5) * 0.3;
        }
    })
    .on('tick', function() {
        dots
            .attr('cx', d => d.x * dots_width)
            .attr('cy', d => d.y * dots_height);
        brownian_alpha += 0.1 * (0.01 - brownian_alpha);
        if (mean_speed(nodes) < 0.002) brownian_alpha_y += 0.1 * (0.003 - brownian_alpha_y);
        if (mean_speed(nodes) < 0.0006) {
            document.querySelector('#land span').style.opacity = 1;
            document.querySelector('#land span').style.top = '0px';
        }
    });

    let dots = svg.append('g')
        .selectAll('dot')
        .data(nodes)
        .enter()
        .append('circle')
            .attr('cx', (d) => d.x * dots_width)
            .attr('cy', (d) => d.y * dots_height)
            .attr('r', 1.3)
            .attr('fill', (d) => d.critical ? 'red' : 'black')
            .attr('cursor', (d) => d.critical ? 'pointer' : 'default')
            .on('click', function (evt, d) {
                scatter = d.critical;
            });
    
    container.append(svg.node());
}

function getGlobalTopOffset(elem) {
    return elem.getBoundingClientRect().top + window.scrollY;
}

function handleFixedScroll(evt) {
    let pageMiddle = window.scrollY + (window.innerHeight / 2);

    let dots_cutoff = 0.5 * window.innerHeight;
    document.getElementById('dots').style.opacity = 1. - (clamp(window.scrollY, 0, dots_cutoff) / dots_cutoff);

    let reveal_texts = document.querySelectorAll('.card span, #brain-graphic-container');
    reveal_texts.forEach(function(elem, idx) {
        if (idx == 0) return;
        middle_offset = getGlobalTopOffset(elem) - pageMiddle;
        let opacity = (middle_offset > 0) ? Math.exp(-((middle_offset) ** 2) / 10000) : 1;
        elem.style.opacity = opacity;
    });

    let brain_bottom = getGlobalTopOffset(document.getElementById('brain')) + document.getElementById('brain').offsetHeight;
    let seizure_top = getGlobalTopOffset(document.getElementById('seizure'));
    let seizure_bottom = seizure_top + document.getElementById('brain').offsetHeight;
    let critical_brain = document.querySelector('#brain span');

    let section_opacity = clamp(window.scrollY - (brain_bottom - 500), -600, 0) / -600;
    critical_brain.style.opacity = critical_brain.style.opacity * section_opacity;

    if (pageMiddle > critical_brain.offsetTop && 
        pageMiddle > getGlobalTopOffset(document.getElementById('brain')) + 100 &&
        pageMiddle < brain_bottom) critical_brain.classList.add('fixed-text-center');
    else critical_brain.classList.remove('fixed-text-center');

    let brain_img = document.querySelector('#brain-graphic-container');
    let brain_img_cutoff = getGlobalTopOffset(brain_img) + (brain_img.getBoundingClientRect().height / 2);

    let brain_graph_offset = pageMiddle - (brain_bottom - 300);
    if (brain_graph_offset > 0) {
        document.getElementById('brain-graph').style.opacity = Math.exp(-(brain_graph_offset ** 2) / 20000);
    } else {
        document.getElementById('brain-graph').style.opacity = 1;
    }

    let seizure_graph = document.getElementById('seizure-graph');
    if (pageMiddle > seizure_top && pageMiddle < seizure_bottom) seizure_graph.style.opacity = 1;
    else seizure_graph.style.opacity = 0;

    if (pageMiddle > brain_img_cutoff && 
        pageMiddle > getGlobalTopOffset(document.getElementById('brain')) &&
        pageMiddle < seizure_bottom) brain_img.classList.add('fixed-text-center');
    else brain_img.classList.remove('fixed-text-center');

    let seizure_txt = document.querySelector('#seizure span')
    if (pageMiddle > getGlobalTopOffset(seizure_txt) &&
        pageMiddle < seizure_bottom &&
        pageMiddle > getGlobalTopOffset(document.querySelector('#seizure')) + 120) seizure_txt.classList.add('fixed-text-center');
    else seizure_txt.classList.remove('fixed-text-center');

    updateBrainGraph();
}

window.onscroll = handleFixedScroll;
init();
