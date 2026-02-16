var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  varying vec2 v_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }`;

// Fragment shader program
var FSHADER_SOURCE = `
precision mediump float;
varying vec2 v_UV;
uniform vec4 u_FragColor;
uniform sampler2D u_Sampler0;
uniform sampler2D u_Sampler1;
uniform int u_whichTexture;

void main() {

  if (u_whichTexture == -2) {
    gl_FragColor = u_FragColor;           // Use color

  } else if (u_whichTexture == -1) {
    gl_FragColor = vec4(v_UV, 1.0, 1.0);  // Use UV debug color

  } else if (u_whichTexture == 0) {
    gl_FragColor = texture2D(u_Sampler0, v_UV); // Use texture0
  } else if (u_whichTexture == 1) {
    gl_FragColor = texture2D(u_Sampler1, v_UV); // Use texture1
  } else {
    gl_FragColor = vec4(1, .2, .2, 1);    // Error, put Redish
  }

}
`;

// Global Variables
let canvas;
let gl;
let a_Position;
let a_UV;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_Sampler0;
let u_Sampler1;
let u_whichTexture;

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
// moving target
let g_mover = {
  radius: 8.0,
  speed: 0.6, // radians per second multiplier
  angle: 0.0,
  won: false,
  color: [1.0, 1.0, 0.0, 1.0]
};

function main() {
  setupWebGL();

  connectVariablesToGLSL();

  addActionsForHtmlUI();

  document.onkeydown = keydown;

  initTextures();

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
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
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

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if (!u_ProjectionMatrix) {
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }

  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler0) {
    console.log('Failed to get the storage location of u_Sampler0');
    return false;
  }

  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
  if (!u_Sampler1) {
    console.log('Failed to get the storage location of u_Sampler1');
    return false;
  }

  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
    return false;
  }


  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

  // Set up view matrix (camera looking at origin)
  var viewM = new Matrix4();
  viewM.setLookAt(0, 0, 2, 0, 0, 0, 0, 1, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewM.elements);

  // Set up projection matrix (perspective)
  var projM = new Matrix4();
  projM.setPerspective(50, 1, 0.1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projM.elements);
}

function initTextures() {
  // Load texture 0
  var image0 = new Image();
  if (!image0) {
    console.log('Failed to create the image object');
    return false;
  }
  image0.onload = function() {
    sendImageToTEXTURE0(image0);
  };
  image0.src = 'texture.png';

  // Load texture 1
  var image1 = new Image();
  if (!image1) {
    console.log('Failed to create the image object');
    return false;
  }
  image1.onload = function() {
    sendImageToTEXTURE1(image1);
  };
  image1.src = 'floor.png';

  return true;
}

function sendImageToTEXTURE0(image) {
  var texture = gl.createTexture(); // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }
  
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
  
  // Enable texture unit0
  gl.activeTexture(gl.TEXTURE0);
  
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
  // Set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // Set the texture unit 0 to the sampler
  gl.uniform1i(u_Sampler0, 0);
}

function sendImageToTEXTURE1(image) {
  var texture = gl.createTexture(); // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }
  
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis
  
  // Enable texture unit1
  gl.activeTexture(gl.TEXTURE1);
  
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
  // Set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // Set the texture unit 1 to the sampler
  gl.uniform1i(u_Sampler1, 1);
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

function keydown(ev) {
  let forward = [
    g_at[0] - g_eye[0],
    g_at[1] - g_eye[1],
    g_at[2] - g_eye[2]
  ];
  
  // Normalize forward vector
  let forwardLen = Math.sqrt(forward[0]*forward[0] + forward[1]*forward[1] + forward[2]*forward[2]);
  forward[0] /= forwardLen;
  forward[1] /= forwardLen;
  forward[2] /= forwardLen;
  
  // Calculate right vector using cross product: right = forward × up
  let right = [
    forward[1] * g_up[2] - forward[2] * g_up[1],
    forward[2] * g_up[0] - forward[0] * g_up[2],
    forward[0] * g_up[1] - forward[1] * g_up[0]
  ];
  
  // Normalize right vector
  let rightLen = Math.sqrt(right[0]*right[0] + right[1]*right[1] + right[2]*right[2]);
  right[0] /= rightLen;
  right[1] /= rightLen;
  right[2] /= rightLen;
  
  // Recalculate up using cross product: up = right × forward
  let newUp = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0]
  ];
  
  const moveSpeed = 0.2;
  const rotSpeed = 5;
  
  if (ev.keyCode == 87) { // W key - move forward
    g_eye[0] += forward[0] * moveSpeed;
    g_eye[1] += forward[1] * moveSpeed;
    g_eye[2] += forward[2] * moveSpeed;
    g_at[0] += forward[0] * moveSpeed;
    g_at[1] += forward[1] * moveSpeed;
    g_at[2] += forward[2] * moveSpeed;
  } else if (ev.keyCode == 83) { // S key - move backward
    g_eye[0] -= forward[0] * moveSpeed;
    g_eye[1] -= forward[1] * moveSpeed;
    g_eye[2] -= forward[2] * moveSpeed;
    g_at[0] -= forward[0] * moveSpeed;
    g_at[1] -= forward[1] * moveSpeed;
    g_at[2] -= forward[2] * moveSpeed;
  } else if (ev.keyCode == 65) { // A key - strafe left
    g_eye[0] -= right[0] * moveSpeed;
    g_eye[1] -= right[1] * moveSpeed;
    g_eye[2] -= right[2] * moveSpeed;
    g_at[0] -= right[0] * moveSpeed;
    g_at[1] -= right[1] * moveSpeed;
    g_at[2] -= right[2] * moveSpeed;
  } else if (ev.keyCode == 68) { // D key - strafe right
    g_eye[0] += right[0] * moveSpeed;
    g_eye[1] += right[1] * moveSpeed;
    g_eye[2] += right[2] * moveSpeed;
    g_at[0] += right[0] * moveSpeed;
    g_at[1] += right[1] * moveSpeed;
    g_at[2] += right[2] * moveSpeed;
  } else if (ev.keyCode == 81) { // Q key - rotate left
    rotateCamera(forward, g_up, rotSpeed);
  } else if (ev.keyCode == 69) { // E key - rotate right
    rotateCamera(forward, g_up, -rotSpeed);
  } else if (ev.keyCode == 88) { // X key - add block in front
    addBlockInFront();
  } else if (ev.keyCode == 90) { // Z key - delete block in front
    removeBlockInFront();
  }
  
  renderScene();
}

function rotateCamera(forward, up, angle) {
  // Update yaw (g_mouseX) so keyboard rotation matches mouse-driven camera
  // Positive `angle` should rotate left (same as original implementation),
  // and renderScene uses g_mouseX to compute the look-at target.
  g_mouseX = (g_mouseX - angle) % 360;
  if (g_mouseX > 180) g_mouseX -= 360;
  if (g_mouseX < -180) g_mouseX += 360;
}

var g_eye = [0, 0, 2];
var g_at = [0, 0, 0];
var g_up = [0, 1, 0];
// var baseMap = [
//   [2, 3, 3, 3, 2, 3, 2, 3],
//   [3, 3, 2, 3, 0, 0, 0, 2],
//   [3, 3, 2, 3, 2, 1, 0, 3],
//   [2, 0, 2, 1, 1, 0, 0, 3],
//   [2, 2, 2, 0, 0, 1, 0, 2],
//   [3, 0, 0, 3, 2, 2, 1, 3],
//   [2, 1, 1, 0, 1, 0, 1, 2],
//   [2, 3, 2, 2, 2, 3, 3, 3]
// ];

// // Create a 32x32 map filled with 0s, then place each 8x8 cell at positions spaced by 4 (i*4, j*4).
// var g_map = [];
// for (let x = 0; x < 32; x++) {
//   g_map[x] = new Array(32).fill(0);
// }
// for (let i = 0; i < 8; i++) {
//   for (let j = 0; j < 8; j++) {
//     g_map[i * 4][j * 4] = baseMap[i][j];
//   }
// }
function randomMap() {
  // Generate a 32x32 map with mostly 0s and 1s, fewer 2s/3s, and local grouping
  const size = 32;
  const map = [];
  // Start with random values, balanced for all heights
  for (let x = 0; x < size; x++) {
    map[x] = [];
    for (let y = 0; y < size; y++) {
      // Weighted random: 0 (22%), 1 (28%), 2 (28%), 3 (22%)
      const r = Math.random();
      let val = 0;
      if (r < 0.22) val = 0;
      else if (r < 0.5) val = 1;
      else if (r < 0.78) val = 2;
      else val = 3;
      map[x][y] = val;
    }
  }
  // Grouping: only one pass for local similarity, to preserve variety
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      let sum = 0, count = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            sum += map[nx][ny];
            count++;
          }
        }
      }
      // Weighted average, then round to nearest int
      map[x][y] = Math.round((map[x][y] + sum) / (count + 1));
      // Clamp to 0..3
      map[x][y] = Math.max(0, Math.min(3, map[x][y]));
    }
  }

  // Guarantee one area with several h=3 cells
  let highX = Math.floor(Math.random() * (size - 4));
  let highY = Math.floor(Math.random() * (size - 4));
  for (let dx = 0; dx < 3; dx++) {
    for (let dy = 0; dy < 3; dy++) {
      map[highX + dx][highY + dy] = 3;
    }
  }
  // Guarantee one area with several h=0 cells
  let lowX = Math.floor(Math.random() * (size - 4));
  let lowY = Math.floor(Math.random() * (size - 4));
  // Ensure the low area does not overlap the high area
  while (Math.abs(lowX - highX) < 4 && Math.abs(lowY - highY) < 4) {
    lowX = Math.floor(Math.random() * (size - 4));
    lowY = Math.floor(Math.random() * (size - 4));
  }
  for (let dx = 0; dx < 3; dx++) {
    for (let dy = 0; dy < 3; dy++) {
      map[lowX + dx][lowY + dy] = 0;
    }
  }
  return map;
}

// Generate and save the map once
var terrainMap = randomMap();

function drawMap() {
  for (let x = 0; x < 32; x++) {
    for (let y = 0; y < 32; y++) {
      const h = (terrainMap[x] && terrainMap[x][y]) ? terrainMap[x][y] : 0; // height (0 = path)
      if (h > 0) {
        // stack `h` cubes vertically
        for (let k = 0; k < h; k++) {
          var block = new Cube();
          block.color = [1.0, 1.0, 1.0, 1.0];
          block.textureNum = h === 3 ? 1 : 0;
          // position each stacked cube so they sit on top of each other
          block.matrix.translate(0, -.75 + k * 0.3, 0);
          block.matrix.scale(0.3, 0.3, 0.3);
          block.matrix.translate(x - 16, 0, y - 16);
          block.render();
        }
      }
    }
  }
}

function renderScene() {
  var projMat = new Matrix4();
  projMat.setPerspective(60, canvas.width/canvas.height, 0.1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  // Update camera target from mouse-controlled yaw (g_mouseX) and pitch (g_mouseY)
  // g_mouseX is mapped to [-180,180], g_mouseY to [-90,90]
  var viewMat = new Matrix4();
  // clamp pitch to avoid gimbal lock
  var pitchDeg = Math.max(-89, Math.min(89, g_mouseY));
  var yawRad = g_mouseX * Math.PI / 180.0;
  var pitchRad = pitchDeg * Math.PI / 180.0;
  var fx = Math.sin(yawRad) * Math.cos(pitchRad);
  var fy = Math.sin(pitchRad);
  var fz = -Math.cos(yawRad) * Math.cos(pitchRad);
  var flen = Math.sqrt(fx*fx + fy*fy + fz*fz) || 1.0;
  fx /= flen; fy /= flen; fz /= flen;
  g_at[0] = g_eye[0] + fx;
  g_at[1] = g_eye[1] + fy;
  g_at[2] = g_eye[2] + fz;
  viewMat.setLookAt(g_eye[0], g_eye[1], g_eye[2], g_at[0], g_at[1], g_at[2], g_up[0], g_up[1], g_up[2]); // eye, at, up
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //drawing penguim
  var body = new Cube();
  body.color = [0.95, 0.95, 0.95, 1.0];
  body.textureNum = -2;
  body.matrix.rotate(g_jointAngle, 1, 0, 0);
  body.matrix.translate(-0.2, -0.2, -0.2);
  var bodyCoordinatesMat = new Matrix4(body.matrix);
  body.matrix.scale(0.4, 0.6, 0.4);
  body.render();

  var bottomBody = new Cube();
  bottomBody.color = [0.9, 0.9, 0.9, 1.0];
  bottomBody.textureNum = -2;
  bottomBody.matrix.translate(-0.225, -0.4, -0.225);
  bottomBody.matrix.scale(0.45, 0.3, 0.45);
  bottomBody.render();

  var leftArm = new Cube();
  leftArm.color = [0.1, 0.1, 0.1, 1.0];
  leftArm.textureNum = -2;
  leftArm.matrix = new Matrix4(bodyCoordinatesMat);
  leftArm.matrix.translate(-0.1, 0.4, 0.1); 
  leftArm.matrix.rotate(g_flipperAngle, 0, 0, 1); 
  leftArm.matrix.scale(0.13, -0.5, 0.2); 
  leftArm.matrix.translate(-0.2, -0.2, 0); 
  leftArm.render();


  var rightArm = new Cube();
  rightArm.color = [0.1, 0.1, 0.1, 1.0];
  rightArm.textureNum = -2;
  rightArm.matrix = new Matrix4(bodyCoordinatesMat);
  rightArm.matrix.translate(0.5, 0.4, 0.1); 
  rightArm.matrix.rotate(-g_flipperAngle, 0, 0, 1); 
  rightArm.matrix.scale(0.13, -0.5, 0.2); 
  rightArm.matrix.translate(-0.8, -0.2, 0); 
  rightArm.render();

  var head = new Cube();
  head.color = [0.1, 0.1, 0.1, 1.0];
  head.textureNum = -2;
  head.matrix = new Matrix4(bodyCoordinatesMat);
  head.matrix.translate(0.2, 0.6, 0.2); 
  head.matrix.rotate(g_headAngle, 0, 1, 0);
  head.matrix.scale(0.3, 0.3, 0.3);
  head.matrix.translate(-0.5, 0, -0.5);
  var headCoordinatesMat = new Matrix4(head.matrix);
  head.render();

  var beak = new Cube();
  beak.color = [0.9, 0.2, 0.2, 1.0];
  beak.textureNum = -2;
  beak.matrix = new Matrix4(headCoordinatesMat);
  beak.matrix.translate(0.45, 0.4, -0.13); 
  beak.matrix.scale(0.15, 0.15*g_mouthScale, 0.15);
  beak.render();

  var leftEye = new Cube();
  leftEye.color = [1, 1, 1, 1.0];
  leftEye.textureNum = -2;
  leftEye.matrix = new Matrix4(headCoordinatesMat);
  leftEye.matrix.translate(0.25, 0.5, -0.05); 
  leftEye.matrix.scale(0.15, 0.15, 0.15);
  leftEye.render();

  var rightEye = new Cube();
  rightEye.color = [1, 1, 1, 1.0];
  rightEye.textureNum = -2;
  rightEye.matrix = new Matrix4(headCoordinatesMat);
  rightEye.matrix.translate(0.63, 0.5, -0.05); 
  rightEye.matrix.scale(0.15, 0.15, 0.15);
  rightEye.render();

  var hat = new Cone();
  hat.color = [1.0, 0.0, 1.0, 1.0];
  hat.matrix = new Matrix4(headCoordinatesMat);
  hat.matrix.translate(0, 1, 1); 
  hat.matrix.rotate(-90, 1, 0, 0); 
  hat.matrix.scale(1, 1, 1); 
  hat.render();

  var floor = new Cube();
  floor.color = [0.2, 0.8, 0.2, 1.0];
  floor.textureNum = 1;
  floor.matrix.translate(0, -0.75, 0);
  floor.matrix.scale(10, 0, 10);
  floor.matrix.translate(-.5, 0, -.5);
  floor.render();

  var sky = new Cube();
  sky.color = [0.5, 0.7, 1.0, 1.0];
  sky.textureNum = -2;
  sky.matrix.scale(50, 50, 50);
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.render();

  // moving target block
  g_mover.angle = g_seconds * g_mover.speed;
  var mx = Math.sin(g_mover.angle) * g_mover.radius;
  var mz = -Math.cos(g_mover.angle) * g_mover.radius;
  // Find terrain height at mover's current position
  var moverGX = Math.round(mx + 16);
  var moverGY = Math.round(mz + 16);
  var moverHeight = 0;
  if (
    moverGX >= 0 && moverGX < 32 &&
    moverGY >= 0 && moverGY < 32 &&
    terrainMap[moverGX] && terrainMap[moverGX][moverGY] !== undefined
  ) {
    moverHeight = terrainMap[moverGX][moverGY];
  }
  // collision detection (check grid cell alignment and proximity)
  if (!g_mover.won) {
    var playerGX = Math.round(g_eye[0] + 16);
    var playerGY = Math.round(g_eye[2] + 16);
    var dx = g_eye[0] - mx;
    var dz = g_eye[2] - mz;
    var dist = Math.sqrt(dx*dx + dz*dz);
    if ((moverGX === playerGX && moverGY === playerGY) || dist < 0.9) {
      g_mover.won = true;
      if (g_fpsDisplay) g_fpsDisplay.innerText = 'YOU WIN!';
      console.log('Touched mover — dist:', dist.toFixed(3), ' moverGX/GY:', moverGX, moverGY, ' playerGX/GY:', playerGX, playerGY);
    }
  }
  var moverCube = new Cube();
  moverCube.color = g_mover.won ? [0.0, 1.0, 0.0, 1.0] : g_mover.color;
  moverCube.textureNum = -2;
  // Move cube to top of terrain
  var yPos = -0.75 + moverHeight * 0.3;
  moverCube.matrix.translate(0, yPos, 0);
  moverCube.matrix.scale(0.4, 0.4, 0.4);
  moverCube.matrix.translate(mx, 0, mz);
  moverCube.render();

  drawMap();
}

// Returns [gx, gy] grid indices for the map cell directly in front of the camera,
// or null if none in bounds.
function getCellInFront() {
  // compute horizontal forward vector using yaw only (ignore pitch for grid selection)
  var yawRad = g_mouseX * Math.PI / 180.0;
  var fx = Math.sin(yawRad);
  var fz = -Math.cos(yawRad);
  var hlen = Math.sqrt(fx*fx + fz*fz) || 1.0;
  var hvx = fx / hlen;
  var hvz = fz / hlen;

  // pick a reach distance (grid units) in front of camera
  var reach = 2.0;
  var tx = g_eye[0] + hvx * reach;
  var tz = g_eye[2] + hvz * reach;

  // map world coords to grid indices (grid cell at integer x corresponds to world x-16)
  var targetGX = Math.round(tx + 16);
  var targetGY = Math.round(tz + 16);
  if (targetGX < 0 || targetGX >= 32 || targetGY < 0 || targetGY >= 32) return null;
  return [targetGX, targetGY];
}

function addBlockInFront() {
  var cell = getCellInFront();
  if (!cell) return;
  var gx = cell[0], gy = cell[1];
  if (!terrainMap[gx]) terrainMap[gx] = new Array(32).fill(0);
  // increase height up to 3
  terrainMap[gx][gy] = Math.min(3, (terrainMap[gx][gy] || 0) + 1);
}

function removeBlockInFront() {
  var cell = getCellInFront();
  if (!cell) return;
  var gx = cell[0], gy = cell[1];
  if (!terrainMap[gx]) return;
  terrainMap[gx][gy] = Math.max(0, (terrainMap[gx][gy] || 0) - 1);
}