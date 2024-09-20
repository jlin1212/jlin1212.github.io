SPINNER = [{
    thumbnail: 'julia.png',
    title: 'Juliascapes',
    description: `
        <p>Fractals are some of the most beautiful and ubiquitous ways to demonstrate the hidden complexity in math, but we almost always see them in 2D. 
        Here, I've written a <span class='threedee'>3D</span> fractal renderer, allowing you to experience them as a landscape.</p>
        <p>These fractals are called Julia sets. Each one is uniquely associated with a single <i>complex number</i>, meaning that there are an infinite number of them.
        This renderer lets you specify any "seed" number, allowing you to sample any one you wish.</p>
    `,
    href: 'julia.html',
}, {
    thumbnail: 'gradbowl.png',
    title: 'Gradbowl',
    description: `<p>We often read about optimizer hyperpameters like "momentum", "alpha", and "beta", but what do these actually mean in practice?</p>
    <p>Here, you can specify a landscape of your own making and set different optimizers to work. Play with hyperparameters and see how these change 
    the trajectories of the balls as they struggle downhill. See if you can find the right parameters to make optimizers escape local minima.</p>`,
    href: 'gradbowl.html',
}, {
    thumbnail: 'lenia.png',
    title: 'Lenia',
    description: `Well, not Lenia itself - instead, this is a Wikipedia article I wrote about this clever continuous-space extension of 
    discrete cellular automata like Conway's <a href='https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life'>Game of Life</a>.`,
    href: 'https://en.wikipedia.org/wiki/Lenia',
}];
SPINNER_IDX = 0;

function init() {
    document.getElementById('spinnerleft').onclick = () => spinnerStep(-1);
    document.getElementById('spinnerright').onclick = () => spinnerStep(1);

    let spinner = document.getElementById('spinner');
    
    for (let i = 0; i < SPINNER.length; i++) {
        let item = document.getElementById('spinneritem').content.cloneNode(true);
        item.querySelector('.title').textContent = SPINNER[i].title;
        item.querySelector('.thumbnail').src = `screenshots/${SPINNER[i].thumbnail}`;
        item.querySelector('.description').innerHTML = SPINNER[i].description;
        item.querySelector('.item').addEventListener('click', function() { window.location.href = SPINNER[i].href });
        spinner.appendChild(item);
    }

    let items = document.querySelectorAll('#spinner .item');
    let netOffset = 0;
    for (let i = 0; i < SPINNER.length; i++) {
        items[i].dataset.offset = netOffset;
        netOffset += (items[i].offsetWidth + 100);
    }

    updateSpinner(0, true);
}

function spinnerStep(delta) {
    let test_idx = SPINNER_IDX + delta;
    if (test_idx >= 0 && test_idx < SPINNER.length) updateSpinner(test_idx);
}

function updateSpinner(idx, force) {
    if (idx == SPINNER_IDX && !force) return;
    document.querySelector('#landing .background').style.backgroundImage = `url('screenshots/${SPINNER[idx].thumbnail}')`;
    
    let spinner = document.getElementById('spinner');
    let items = document.querySelectorAll('#spinner .item');
    items[SPINNER_IDX].classList.remove('active');
    items[idx].classList.add('active');
    let item = items[idx];

    let offset = (spinner.offsetWidth - item.offsetWidth) / 2 - items[idx].dataset.offset;

    for (let i = 0; i < items.length; i++) {
        items[i].style.left = ''; items[i].style.right = '';
        if (offset > 0) items[i].style.left = `${offset}px`;
        else items[i].style.right = `${Math.abs(offset)}px`;
    }

    SPINNER_IDX = idx;
    if (SPINNER_IDX == 0) {
        document.querySelector('#spinnerleft').style.display = 'none';
        document.querySelector('#spinnerright').style.display = 'block';
    } else if (SPINNER_IDX == SPINNER.length - 1) {
        document.querySelector('#spinnerleft').style.display = 'block';
        document.querySelector('#spinnerright').style.display = 'none';
    } else {
        document.querySelector('#spinnerleft').style.display = 'block';
        document.querySelector('#spinnerright').style.display = 'block';
    }
}

init();

window.onresize = init;
