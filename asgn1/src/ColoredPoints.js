var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform float u_Size;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = u_Size;\n' +
  '}\n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

// Global Data Structures
let shapesList = [];  // Store all shapes
let g_size = 10.0;    // Current selected size
let currentShape = 'point';  // Current shape type
let g_segments = 12;  // Current number of segments for circle
let g_alpha = 1.0;    // Current alpha value

function main() {
  setupWebGL();

  connectVariablesToGLSL();
  canvas.onmousedown = function(ev) { click(ev); };
  canvas.onmousemove = function(ev) {
    updateCoordinates(ev);
    if (ev.buttons === 1) { // If left button is pressed
      click(ev);
    }
  };
  document.getElementById('size').oninput = function() { g_size = parseFloat(this.value); };
  document.getElementById('segments').oninput = function() { g_segments = parseInt(this.value); };
  document.getElementById('alpha').oninput = function() { g_alpha = parseFloat(this.value); };
  document.getElementById('clear').onclick = function() { shapesList = []; renderAllShapes(); };
  document.getElementById('point').onclick = function() { currentShape = 'point'; };
  document.getElementById('triangle').onclick = function() { currentShape = 'triangle'; };
  document.getElementById('circle').onclick = function() { currentShape = 'circle'; };
  document.getElementById('drawPicture').onclick = function() { drawPicture(); };
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Enable alpha blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

/**
 * updateCoordinates(ev)
 * Updates the displayed coordinates based on mouse position.
 */
function updateCoordinates(ev) {
  let x = ev.clientX;
  let y = ev.clientY;
  let rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2) / (canvas.width/2);
  y = (canvas.height/2 - (y - rect.top)) / (canvas.height/2);

  document.getElementById('coordinates').innerHTML = 'Coordinates: (' + x.toFixed(2) + ', ' + y.toFixed(2) + ')';
}

function click(ev) {
  // Extract coordinates
  let x = ev.clientX; 
  let y = ev.clientY; 
  let rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2) / (canvas.width/2);
  y = (canvas.height/2 - (y - rect.top)) / (canvas.height/2);
  let r = parseFloat(document.getElementById('red').value);
  let g = parseFloat(document.getElementById('green').value);
  let b = parseFloat(document.getElementById('blue').value);

  if (currentShape === 'point') {
    let point = new Point(x, y, r, g, b, g_size, g_alpha);
    shapesList.push(point);
  } else if (currentShape === 'triangle') {
    let size = g_size / 100;
    let triangle = new Triangle(
      x, y + size,
      x - size/2, y - size/2,
      x + size/2, y - size/2,
      r, g, b, g_alpha
    );
    shapesList.push(triangle);
  } else if (currentShape === 'circle') {
    let radius = g_size / 100;
    let circle = new Circle(x, y, radius, r, g, b, g_segments, g_alpha);
    shapesList.push(circle);
  }

  renderAllShapes();
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (let shape of shapesList) {
    shape.render();
  }
}

function drawPicture() {
  //background
  shapesList.push(new Triangle(-1, -1, -1, 1, 1, 1, 0.529, 0.808, 0.922, 1.0));
  shapesList.push(new Triangle(-1, -1, 1, -1, 1, 1, 0.529, 0.808, 0.922, 1.0));
  
  //ground
  shapesList.push(new Triangle(-1, -1, 1, -1, -1, -0.9, 0, 0.7, 0, 1.0));
  shapesList.push(new Triangle(1, -1, 1, -0.9, -1, -0.9, 0, 0.7, 0, 1.0));

  //house
  shapesList.push(new Triangle(-0.8, -0.9, -0.1, -0.9, -0.1, -0.3, 1, 1, 1, 1.0));
  shapesList.push(new Triangle(-0.8, -0.9, -0.1, -0.3, -0.8, -0.3, 1, 1, 1, 1.0));

  //door
  shapesList.push(new Triangle(-0.55, -0.9, -0.55, -0.55, -0.35, -0.55, 0.8, 0.3, 0.3, 1.0));
  shapesList.push(new Triangle(-0.55, -0.9, -0.35, -0.9, -0.35, -0.55, 0.8, 0.3, 0.3, 1.0));
  
  //roof
  shapesList.push(new Triangle(-0.8, -0.3, -0.1, -0.30, -0.45, 0.1, 1, 0, 0, 1.0));

  shapesList.push(new Triangle(-0.57, -0.1, -0.57, -0.2, -0.5, -0.15, 1, 1, 1, 1.0));
  shapesList.push(new Triangle(-0.56, -0.12, -0.56, -0.18, -0.52, -0.15, 1, 0, 0, 1.0));

  shapesList.push(new Triangle(-0.47, -0.1, -0.46, -0.14, -0.41, -0.15, 1, 1, 1, 1.0));
  shapesList.push(new Triangle(-0.39, -0.1, -0.43, -0.20, -0.39, -0.16, 1 , 1, 1, 1.0));  

  //window
  shapesList.push(new Triangle(-0.55, -0.35, -0.55, -0.5, -0.35, -0.35, 0.0, 0.1, 0.9, 1.0));
  shapesList.push(new Triangle(-0.35, -0.50, -0.55, -0.5, -0.35, -0.35, 0.0, 0.1, 0.9, 1.0));

  //sun
  shapesList.push(new Triangle(0.55, 0.55, 0.90, 0.55, 0.55, 0.90, 1, 1, 0, 1.0));
  shapesList.push(new Triangle(0.90, 0.55, 0.90, 0.90, 0.55, 0.90, 1, 1, 0, 1.0));

  //grass
  for (let i = 0; i < 40; i++) {
    let x = -1 + (i * 2 / 40);
    let height = 0.05 + Math.random() * 0.05;
    shapesList.push(new Triangle(x, -0.9, x + 0.05, -0.9, x + 0.025, -0.9 + height, 0, 0.7, 0, 1.0));
  }

  renderAllShapes();
}