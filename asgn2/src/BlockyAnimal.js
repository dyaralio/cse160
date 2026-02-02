var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_GlobalRotateMatrix;\n' +
  'void main() {\n' +
  '  gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;\n' +
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
let u_ModelMatrix;
let u_GlobalRotateMatrix;

// FPS Counter
let g_frameCount = 0;
let g_lastTime = Date.now();
let g_fps = 0;
let g_fpsDisplay = null;

// Global Data Structures
let g_jointAngle = 0;
let g_headAngle = 20;
let g_flipperAngle = 0;
let g_mouthScale = 1.0;
let g_globalAngle = 0;
let g_mouseX = 0;
let g_mouseY = 0;
let g_bodyAnimation = false;
let g_headAnimation = false;
let g_flipperAnimation = false;
let g_mouthAnimation = false;
let g_pokeAnimation = false;
let g_pokeTime = 0;

function main() {
  setupWebGL();

  connectVariablesToGLSL();

  addActionsForHtmlUI();

  // Create FPS display element
  g_fpsDisplay = document.createElement('div');
  g_fpsDisplay.style.position = 'fixed';
  g_fpsDisplay.style.top = '10px';
  g_fpsDisplay.style.left = '10px';
  g_fpsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  g_fpsDisplay.style.color = '#0f0';
  g_fpsDisplay.style.padding = '10px';
  g_fpsDisplay.style.fontFamily = 'monospace';
  g_fpsDisplay.style.fontSize = '12px';
  g_fpsDisplay.style.zIndex = '9999';
  document.body.appendChild(g_fpsDisplay);

  canvas.onmousedown = function(ev) { click(ev); };
  canvas.onmousemove = function(ev) {
    updateCoordinates(ev);
    if (ev.buttons === 1) { // If left button is pressed
      updateMouseRotation(ev);
      click(ev);
    }
  };
  
  gl.clearColor(0.2, 0.2, 0.2, 1.0);
  renderScene();
  requestAnimationFrame(tick);

}

function addActionsForHtmlUI() {
  document.getElementById('angleSlide').addEventListener('mousemove', function() { g_globalAngle = parseFloat(this.value); renderScene(); });
  document.getElementById('bodySlide').addEventListener('mousemove', function() { g_jointAngle = parseFloat(this.value); renderScene(); });
  document.getElementById('headSlide').addEventListener('mousemove', function() { g_headAngle = parseFloat(this.value); renderScene(); });
  document.getElementById('flipperSlide').addEventListener('mousemove', function() { g_flipperAngle = parseFloat(this.value); renderScene(); });
  document.getElementById('mouthScaleSlide').addEventListener('mousemove', function() { g_mouthScale = parseFloat(this.value); renderScene(); });

  document.getElementById('animationOnBody').addEventListener('click', function() { g_bodyAnimation = true; });
  document.getElementById('animationOffBody').addEventListener('click', function() { g_bodyAnimation = false; });
  document.getElementById('animationOnHead').addEventListener('click', function() { g_headAnimation = true; });
  document.getElementById('animationOffHead').addEventListener('click', function() { g_headAnimation = false; });
  document.getElementById('animationOnFlipper').addEventListener('click', function() { g_flipperAnimation = true; });
  document.getElementById('animationOffFlipper').addEventListener('click', function() { g_flipperAnimation = false; });
  document.getElementById('animationOnMouth').addEventListener('click', function() { g_mouthAnimation = true; });
  document.getElementById('animationOffMouth').addEventListener('click', function() { g_mouthAnimation = false; });
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Enable depth testing for 3D
  gl.enable(gl.DEPTH_TEST);
  
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
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
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

/**
 * updateMouseRotation(ev)
 * Maps mouse position to animal rotation.
 * X-position controls rotation around Y-axis, Y-position controls rotation around X-axis.
 */
function updateMouseRotation(ev) {
  let x = ev.clientX;
  let y = ev.clientY;
  let rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2) / (canvas.width/2);
  y = (canvas.height/2 - (y - rect.top)) / (canvas.height/2);

  // Store normalized mouse position for rotation
  g_mouseX = x * 180; // Map to rotation in degrees (-180 to 180)
  g_mouseY = y * 90;  // Map to rotation in degrees (-90 to 90)
}

function click(ev) {
  // Check for shift+click to trigger poke animation
  if (ev.shiftKey) {
    g_pokeAnimation = true;
    g_pokeTime = 0;
  }
  renderScene();
}

var g_start_time = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_start_time;

function tick() {
  g_frameCount++;
  let currentTime = Date.now();
  let elapsed = currentTime - g_lastTime;
  
  // Update FPS every 1 second (1000ms)
  if (elapsed >= 1000) {
    g_fps = Math.round(g_frameCount * 1000 / elapsed);
    g_fpsDisplay.innerText = 'FPS: ' + g_fps;
    g_frameCount = 0;
    g_lastTime = currentTime;
  }
  
  g_seconds = performance.now()/1000.0 - g_start_time;
  updateAnimationAngles();
  renderScene();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_pokeAnimation) {
    // Poke animation: make the animal "cry" - head wobbles, mouth opens, body shakes
    g_pokeTime += 0.016; // ~60 FPS
    if (g_pokeTime > 2.0) {
      g_pokeAnimation = false;
      g_pokeTime = 0;
    } else {
      // Head wobbles side-to-side
      g_headAngle = 20 + 25 * Math.sin(g_pokeTime * 8);
      // Mouth opens and closes rapidly (crying)
      g_mouthScale = 1.0 + 0.8 * Math.abs(Math.sin(g_pokeTime * 10));
      // Body shakes
      g_jointAngle = 180*g_pokeTime;
      // Flippers flap
      g_flipperAngle = 40 * Math.sin(g_pokeTime * 7);
    }
  } else {
    if (g_bodyAnimation) {
      g_jointAngle = 5*(Math.sin(g_seconds*3));
    }
    if (g_headAnimation) {
      g_headAngle = 10*(Math.sin(g_seconds*2))
    }
    if (g_flipperAnimation) {
      g_flipperAngle = 30*(-Math.abs(Math.sin(g_seconds*2)))
    }
    if (g_mouthAnimation) {
      g_mouthScale = (0.5 + 0.3*Math.abs(Math.sin(g_seconds*5)))
    }
  }
}

function renderScene() {
  // Clear both color and depth buffer

  // Combine global angle with mouse-controlled rotation
  var globalRotMat = new Matrix4();
  globalRotMat.rotate(g_globalAngle, 0, 1, 0);
  globalRotMat.rotate(g_mouseY, 1, 0, 0);  // Y-mouse controls X-rotation
  globalRotMat.rotate(-g_mouseX, 0, 1, 0);  // X-mouse controls Y-rotation (negated for intuitive control)
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var body = new Cube();
  body.color = [0.95, 0.95, 0.95, 1.0];
  body.matrix.rotate(g_jointAngle, 1, 0, 0);
  body.matrix.translate(-0.2, -0.2, -0.2);
  var bodyCoordinatesMat = new Matrix4(body.matrix);
  body.matrix.scale(0.4, 0.6, 0.4);
  drawCube(body.matrix, body.color);

  var bottomBody = new Cube();
  bottomBody.color = [0.9, 0.9, 0.9, 1.0];
  bottomBody.matrix.translate(-0.225, -0.4, -0.225);
  bottomBody.matrix.scale(0.45, 0.3, 0.45);
  drawCube(bottomBody.matrix, bottomBody.color);

  var leftArm = new Cube();
  leftArm.color = [0.1, 0.1, 0.1, 1.0];
  leftArm.matrix = new Matrix4(bodyCoordinatesMat);
  leftArm.matrix.translate(-0.1, 0.4, 0.1); 
  leftArm.matrix.rotate(g_flipperAngle, 0, 0, 1); 
  leftArm.matrix.scale(0.13, -0.5, 0.2); 
  leftArm.matrix.translate(-0.2, -0.2, 0); 
  drawCube(leftArm.matrix, leftArm.color);

  var rightArm = new Cube();
  rightArm.color = [0.1, 0.1, 0.1, 1.0];
  rightArm.matrix = new Matrix4(bodyCoordinatesMat);
  rightArm.matrix.translate(0.5, 0.4, 0.1); 
  rightArm.matrix.rotate(-g_flipperAngle, 0, 0, 1); 
  rightArm.matrix.scale(0.13, -0.5, 0.2); 
  rightArm.matrix.translate(-0.8, -0.2, 0); 
  drawCube(rightArm.matrix, rightArm.color);

  var head = new Cube();
  head.color = [0.1, 0.1, 0.1, 1.0];
  head.matrix = new Matrix4(bodyCoordinatesMat);
  head.matrix.translate(0.2, 0.6, 0.2); 
  head.matrix.rotate(g_headAngle, 0, 1, 0);
  head.matrix.scale(0.3, 0.3, 0.3);
  head.matrix.translate(-0.5, 0, -0.5);
  var headCoordinatesMat = new Matrix4(head.matrix);
  drawCube(head.matrix, head.color);

  var beak = new Cube();
  beak.color = [0.9, 0.2, 0.2, 1.0];
  beak.matrix = new Matrix4(headCoordinatesMat);
  beak.matrix.translate(0.45, 0.4, -0.13); 
  beak.matrix.scale(0.15, 0.15*g_mouthScale, 0.15);
  drawCube(beak.matrix, beak.color);

  var leftEye = new Cube();
  leftEye.color = [1, 1, 1, 1.0];
  leftEye.matrix = new Matrix4(headCoordinatesMat);
  leftEye.matrix.translate(0.25, 0.5, -0.05); 
  leftEye.matrix.scale(0.15, 0.15, 0.15);
  drawCube(leftEye.matrix, leftEye.color);

  var rightEye = new Cube();
  rightEye.color = [1, 1, 1, 1.0];
  rightEye.matrix = new Matrix4(headCoordinatesMat);
  rightEye.matrix.translate(0.63, 0.5, -0.05); 
  rightEye.matrix.scale(0.15, 0.15, 0.15);
  drawCube(rightEye.matrix, rightEye.color);

  var hat = new Cone();
  hat.color = [1.0, 0.0, 1.0, 1.0];
  hat.matrix = new Matrix4(headCoordinatesMat);
  hat.matrix.translate(0, 1, 1); 
  hat.matrix.rotate(-90, 1, 0, 0); 
  hat.matrix.scale(1, 1, 1); 
  drawCone(hat.matrix, hat.color);
}