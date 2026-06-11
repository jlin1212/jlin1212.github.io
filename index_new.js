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
    flicker();
}

const flickerTimeline = [
    { opacity: 1 }, { opacity: 0.1 }, { opacity: 0.8 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }
];

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
