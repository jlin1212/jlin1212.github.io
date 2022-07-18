var glCanvas, gl, zoomUniformLocation, chunkXLocation, chunkYLocation, quadProgram, colormapTexture;

var complexA = 0.285;
var complexB = 0.01;
var cameraX = 0;
var cameraY = 4;
var cameraZ = -6;
var zoomFactor = 1.3;
var sceneX = 3.8;
var sceneY = 3.5;
var sceneZ = -1;
var mist = 25.;
var heightScale = 3.;

var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
var chunkSize = isMobile ? 80 : 100;

function main() {
    document.querySelector('#colormap').onchange = changeColormap;

    console.log('juliascape by jonathan lin')

    document.querySelector('#complexA').value = complexA;
    document.querySelector('#complexB').value = complexB;
    document.querySelector('#cameraX').value = cameraX;
    document.querySelector('#cameraY').value = cameraY;
    document.querySelector('#cameraZ').value = cameraZ;
    document.querySelector('#zoom').value = zoomFactor;
    document.querySelector('#sceneX').value = sceneX;
    document.querySelector('#sceneY').value = sceneY;
    document.querySelector('#sceneZ').value = sceneZ;
    document.querySelector('#mist').value = mist;
    document.querySelector('#heightScale').value = heightScale;

    glCanvas = document.querySelector('#glCanvas');
    gl = glCanvas.getContext('webgl', { preserveDrawingBuffer: true });

    document.querySelector('#renderButton').onmousedown = draw;
    document.querySelector('#saveButton').onmousedown = save;

    glCanvas.height = window.innerHeight * 2;
    glCanvas.width = window.innerWidth * 2;
    if (!isMobile) glCanvas.style.height = '100vh';

    // glCanvas.height = 16.16 * 300;
    // glCanvas.width = 20.16 * 300;
    // glCanvas.style.height = '80vh';

    quadProgram = createProgramFromScripts(gl, ['quadVertexShader', 'quadFragmentShader']);

    let positionAttributeLocation = gl.getAttribLocation(quadProgram, 'aPosition');
    let resolutionUniformLocation = gl.getUniformLocation(quadProgram, 'uResolution');

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    let positions = [
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1
    ]
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.viewport(0, 0, 100, 100);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(quadProgram);

    // Pass chunk dimensions
    chunkXLocation = gl.getUniformLocation(quadProgram, 'chunkX');
    chunkYLocation = gl.getUniformLocation(quadProgram, 'chunkY');

    // Quad vertices
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    var size = 2;
    var type = gl.FLOAT;
    var normalize = false;
    var stride = 0;
    var offset = 0;
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

    // Pass screen resolution
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

    // Load colormap texture
    gl.activeTexture(gl.TEXTURE0);

    colormapTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colormapTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 255, 255]));

    var colormapImage = new Image();
    colormapImage.src = 'colormap-utah.png';
    
    let colormapUniformLocation = gl.getUniformLocation(quadProgram, 'uColormap');
    gl.uniform1i(colormapUniformLocation, 0);

    colormapImage.addEventListener('load', function() {
        console.log('loaded colormap');
        console.log(colormapImage);
        gl.bindTexture(gl.TEXTURE_2D, colormapTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, colormapImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        draw();
    });

    zoomUniformLocation = gl.getUniformLocation(quadProgram, 'uZoom');

    console.log(gl.canvas.width / gl.canvas.height);
}

function changeColormap() {
    var colormapImage = new Image();
    colormapImage.src = 'colormap-' + document.querySelector('#colormap').value + '.png';

    let colormapUniformLocation = gl.getUniformLocation(quadProgram, 'uColormap');
    gl.uniform1i(colormapUniformLocation, 0);

    colormapImage.addEventListener('load', function() {
        console.log('loaded colormap');
        console.log(colormapImage);
        gl.bindTexture(gl.TEXTURE_2D, colormapTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, colormapImage);
        gl.generateMipmap(gl.TEXTURE_2D);
    });
}

function updateSceneParam(uniform, id) {
    gl.uniform1f(gl.getUniformLocation(quadProgram, uniform), parseFloat(document.querySelector('#' + id).value));
}

async function draw() {
    console.log('draw');
    gl.uniform1f(zoomUniformLocation, zoomFactor);

    gl.uniform1f(gl.getUniformLocation(quadProgram, 'complexA'), parseFloat(document.querySelector('#complexA').value));
    gl.uniform1f(gl.getUniformLocation(quadProgram, 'complexB'), parseFloat(document.querySelector('#complexB').value));
    gl.uniform1f(gl.getUniformLocation(quadProgram, 'cameraX'), parseFloat(document.querySelector('#cameraX').value));
    gl.uniform1f(gl.getUniformLocation(quadProgram, 'cameraY'), parseFloat(document.querySelector('#cameraY').value));
    gl.uniform1f(gl.getUniformLocation(quadProgram, 'cameraZ'), parseFloat(document.querySelector('#cameraZ').value));
    gl.uniform1f(gl.getUniformLocation(quadProgram, 'zoomFactor'), parseFloat(document.querySelector('#zoom').value));
    gl.uniform1f(gl.getUniformLocation(quadProgram, 'sceneX'), parseFloat(document.querySelector('#sceneX').value));
    gl.uniform1f(gl.getUniformLocation(quadProgram, 'sceneY'), parseFloat(document.querySelector('#sceneY').value));
    gl.uniform1f(gl.getUniformLocation(quadProgram, 'sceneZ'), parseFloat(document.querySelector('#sceneZ').value));
    gl.uniform1f(gl.getUniformLocation(quadProgram, 'mist'), parseFloat(document.querySelector('#mist').value));
    gl.uniform1f(gl.getUniformLocation(quadProgram, 'heightScale'), parseFloat(document.querySelector('#heightScale').value));

    for (let i = 0; i < Math.ceil(gl.canvas.width / chunkSize); i++) {
        for (let j = 0; j < Math.ceil(gl.canvas.height / chunkSize); j++) {
            gl.viewport(chunkSize * i, chunkSize * j, chunkSize, chunkSize);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            await delay(isMobile ? 100 : 3);
        }
    }
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

function save() {
    var data = glCanvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    var canvasLink = document.querySelector('#canvasLink');
    canvasLink.setAttribute('download', 'render.png');
    canvasLink.setAttribute('href', data);
    canvasLink.click();
}

window.onload = main;