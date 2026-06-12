PAPERS = [
    {
        cover: 'PhysRevResearch.7.023241.png',
        title: 'Memristive linear algebra',
        authors: 'Jonathan Lin, Frank Barrows, Francesco Caravelli',
        abstract: `The advent of memristive devices offers a promising avenue for efficient and scalable analog computing,
        particularly for linear algebra operations essential in various scientific and engineering applications. This paper
        investigates the potential of memristive crossbars in implementing matrix inversion algorithms. We explore both
        static and dynamic approaches, emphasizing the advantages of analog and in-memory computing for matrix
        operations beyond multiplication. In particular, we demonstrate that the electrical properties of memristive
        crossbars uniquely suit them for the evolution of a family of matrix exponentials, which can be exploited for
        the efficient computation of matrix inverses and online solutions for linear problems. Our results demonstrate
        that memristive arrays can reduce computational complexity. We also study power consumption and show a
        tradeoff between precision and energy. Furthermore, we address the challenges of device variability, precision,
        and scalability, providing insights into the practical implementation of these algorithms.`,
        date: 'June 2025',
        href: 'https://journals.aps.org/prresearch/abstract/10.1103/PhysRevResearch.7.023241'
    },
    {
        cover: 'AIS.2025.png',
        title: 'Uncontrolled learning: codesign of neuromorphic hardware topology for neuromorphic algorithms',
        authors: 'Frank Barrows, Jonathan Lin, Francesco Caravelli',
        abstract: `Neuromorphic computing has the potential to revolutionize future technologies
        and our understanding of intelligence, yet it remains challenging to realize in
        practice. The learning-from-mistakes algorithm, inspired by the brain’s simple
        learning rules of inhibition and pruning, is one of the few brain-like training
        methods. This algorithm is implemented in neuromorphic memristive hardware
        through a codesign process that evaluates essential hardware trade-offs. While
        the algorithm effectively trains small networks as binary classifiers and per-
        ceptrons, performance declines significantly with increasing network size unless
        the hardware is tailored to the algorithm. This work investigates the trade-offs
        between depth, controllability, and capacity—the number of learnable patterns—
        in neuromorphic hardware. This highlights the importance of topology and
        governing equations, providing theoretical tools to evaluate a device’s compu-
        tational capacity based on its measurements and circuit structure. The findings
        show that breaking neural network symmetry enhances both controllability and
        capacity. Additionally, by pruning the circuit, neuromorphic algorithms in all-
        memristive circuits can utilize stochastic resources to create local contrasts in
        network weights. Through combined experimental and simulation efforts, the
        parameters are identified that enable networks to exhibit emergent intelligence
        from simple rules, advancing the potential of neuromorphic computing.`,
        date: 'March 2025',
        href: 'https://advanced.onlinelibrary.wiley.com/doi/full/10.1002/aisy.202400739'
    },
    {
        cover: '2602.03546v3.png',
        title: 'How to train your resistive network: generalized equilibrium propagation and analytical learning',
        authors: 'Jonathan Lin, Aman Desai, Frank Barrows, Francesco Caravelli',
        abstract: `Machine learning is a powerful method of extracting meaning from data; unfortunately, current digital hardware is
        extremely energy-intensive. There is interest in an alternative analog computing implementation that could match
        the performance of traditional machine learning while being significantly more energy-efficient. However, it remains
        unclear how to train such analog computing systems while adhering to locality constraints imposed by the physical (as
        opposed to digital) nature of these systems. Local learning algorithms such as Equilibrium Propagation and Coupled
        Learning have been proposed to address this issue. In this paper,we develop an algorithm to exactly calculate gradients
        using a graph theoretic and analytical framework for Kirchhoff's laws. We also introduce Generalized Equilibrium
        Propagation, a framework encompassing a broad class of Hebbian learning algorithms, including Coupled Learning
        and Equilibrium Propagation, and show how our algorithm compares. We demonstrate our algorithm using numerical
        simulations and show that we can train resistor networks without the need for a replica or control over all edges.`,
        date: 'Februrary 2026',
        href: 'https://arxiv.org/abs/2602.03546'
    }
]
PAPER_IDX = 0;

function init() {
    showSection('stuff');
    let links = document.querySelectorAll('#links span');
    
    for (let i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function(evt) {
            if (evt.target.classList.contains('active')) return;
            hideSections();
            showSection(evt.target.textContent);
            evt.target.classList.add('active');
        });
    }
    
    for (let i = 0; i < PAPERS.length; i++) {
        let paper = document.createElement('div');
        paper.classList.add('paper-container');
        
        let paperView = document.createElement('img');
        paperView.classList.add('paper-view');
        paperView.src = `/img/paper/${PAPERS[i].cover}`;
        
        let paperDesc = document.createElement('div');
        paperDesc.classList.add('paper-desc');
        
        let paperDate = document.createElement('span');
        paperDate.classList.add('paper-date');
        paperDate.textContent = PAPERS[i].date.toLowerCase();

        let paperTitle = document.createElement('a');
        paperTitle.classList.add('paper-title');
        paperTitle.href = PAPERS[i].href;
        paperTitle.textContent = PAPERS[i].title;
        
        let paperAuthors = document.createElement('p');
        paperAuthors.classList.add('paper-authors');
        paperAuthors.textContent = PAPERS[i].authors;
        
        let paperAbstract = document.createElement('p');
        paperAbstract.classList.add('paper-abstract');
        paperAbstract.textContent = PAPERS[i].abstract;

        paper.appendChild(paperView)
        paperDesc.appendChild(paperDate);
        paperDesc.appendChild(paperTitle);
        paperDesc.appendChild(paperAuthors);
        paperDesc.appendChild(paperAbstract);
        paper.appendChild(paperDesc);

        document.getElementById('papers').appendChild(paper)
    }

    document.onkeydown = function(evt) {
        let papersVisible = document.getElementById('papers').style.display == 'block';
        if (!papersVisible) return;
        if (evt.key == 'ArrowRight' || evt.key == 'ArrowDown') showPaper(add_mod(PAPER_IDX, 1, PAPERS.length));
        if (evt.key == 'ArrowLeft' || evt.key == 'ArrowUp') showPaper(add_mod(PAPER_IDX, -1, PAPERS.length));
    }

    setTimeout(flicker, 1000);
    showPaper(0);
}

const flickerTimeline = [
    { opacity: 1 }, { opacity: 0.1 }, { opacity: 0.8 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }
];

function add_mod(x, y, m) {
    return (((x + y) % m) + m) % m;
}

function flicker() {
    setTimeout(flicker, Math.random() * 500 + 3000);
    document.getElementById('title').animate(flickerTimeline, 400);
}

function hideSections() {
    document.querySelectorAll('#links .active').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
}

function showSection(id) {
    document.querySelector(`#${id}.section`).style.display = 'block';
}

window.onload = init;
