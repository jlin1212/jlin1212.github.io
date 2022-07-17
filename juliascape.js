var glCanvas, gl, zoomUniformLocation, quadProgram;

var complexA = 0.285;
var complexB = 0.01;
var cameraX = 0;
var cameraY = 4;
var cameraZ = -2;
var zoomFactor = 1.3;
var sceneX = 3.8;
var sceneY = 3.5;
var sceneZ = -1;

function main() {
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

    glCanvas = document.querySelector('#glCanvas');
    gl = glCanvas.getContext('webgl');

    document.querySelector('#renderButton').onmousedown = draw;
    document.querySelector('#saveButton').onmousedown = save;

    glCanvas.height = window.innerHeight;
    glCanvas.width = window.innerWidth;

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

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(quadProgram);

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

    var colormapTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colormapTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 255, 255, 255]));

    var colormapImage = new Image();
    colormapImage.src = 'colormap-iridescent.png';
    
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

function draw() {
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
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function save() {
    alert('Right click on the image and choose "Save Image As...", ya dingus!');
}

window.onload = main;