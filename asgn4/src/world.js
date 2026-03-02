var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 1)));
    // v_Normal = a_Normal;
    v_VertPos = u_ModelMatrix * a_Position;
  }`;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec4 v_VertPos;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform int u_whichTexture;
  uniform vec3 u_lightPos;
  uniform vec3 u_cameraPos;
  uniform bool u_lightOn;
  uniform vec3 u_lightColor;

  // spotlight uniforms
  uniform vec3 u_spotPos;
  uniform vec3 u_spotDir;
  uniform vec3 u_spotColor;
  uniform float u_spotCutoff; // cosine of cutoff angle

  void main() {
    if (u_whichTexture == -3) {
      gl_FragColor = vec4((v_Normal+1.0)/2.0, 1.0); // Use normal debug color
    
    } else if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;           // Use color

    } else if (u_whichTexture == -5) {
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
    if (u_lightOn) {
      vec3 lightVector = u_lightPos - vec3(v_VertPos);
      float r = length(lightVector);
      // if (r < 1.0) {
      //   gl_FragColor = vec4(1.0, 0, 0, 1.0);

      // } else if (r < 2.0) {
      //   gl_FragColor = vec4(0, 1.0, 0, 1.0);
      // }

      // gl_FragColor = vec4(vec3(gl_FragColor)/(r*r), 1);

      vec3 L = normalize(lightVector);
      vec3 N = normalize(v_Normal);
      float nDotL = max(dot(N, L), 0.0);

      // refelction
      vec3 R = reflect(-L, N);

      // eye
      vec3 E = normalize(u_cameraPos - vec3(v_VertPos));
      float specular = 0.0;

      if (u_whichTexture != -5) {
        specular = pow(max(dot(R, E), 0.0), 20.0);
      }

      vec3 diffuse = vec3(gl_FragColor) * nDotL * 0.7 * u_lightColor;
      vec3 ambient = vec3(gl_FragColor) * 0.3 * u_lightColor;
      vec3 spec = specular * u_lightColor;
      // spotlight contribution
      vec3 spotContrib = vec3(0);
      vec3 Sv = u_spotPos - vec3(v_VertPos);
      vec3 Sdir = normalize(Sv);
      float spotCos = dot(Sdir, normalize(-u_spotDir));
      if (spotCos > u_spotCutoff) {
        float spotEffect = pow(spotCos, 15.0);
        spotContrib = (diffuse + spec) * u_spotColor * spotEffect;
      }
      gl_FragColor = vec4(spec + diffuse + ambient + spotContrib, 1.0);
    }
  }
`;

// Global Variables
let canvas;
let gl;
let a_Position;
let a_UV;
let a_Normal;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_Sampler0;
let u_Sampler1;
let u_whichTexture;
let u_lightPos;
let u_cameraPos;
let u_lightOn;
let u_lightColor;
// spotlight uniforms
let u_spotPos;
let u_spotDir;
let u_spotColor;
let u_spotCutoff;
let u_NormalMatrix;

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
let g_normalOn = false;
let g_lightPos = [0, 1, 2];
let g_lightOn = true;
let g_lightColor = [1,1,1];
// spotlight parameters (fixed)
let g_spotPos = [0, 5, 0];
let g_spotDir = [0, -1, 0];
let g_spotColor = [1,1,1];
let g_spotCutoff = Math.cos(5 * Math.PI/180); // 5-degree cone
let g_teapot;


function main() {
  setupWebGL();

  connectVariablesToGLSL();

  g_teapot = new Model(gl, "teapot.obj");
  g_teapot.color = [0.8, 0.3, 0.8, 1.0];

  addActionsForHtmlUI();

  document.onkeydown = keydown;

  initTextures();
  // ensure lighting color uniform matches slider default
  updateLightColor(parseFloat(document.getElementById('lightColorSlide').value));

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
  document.getElementById('normalOn').addEventListener('click', function() { g_normalOn = true; });
  document.getElementById('normalOff').addEventListener('click', function() { g_normalOn = false; });
  document.getElementById('lightXSlide').addEventListener('input', function() { g_lightPos[0] = parseFloat(this.value/100); renderScene(); });
  document.getElementById('lightYSlide').addEventListener('input', function() { g_lightPos[1] = parseFloat(this.value/100); renderScene(); });
  document.getElementById('lightZSlide').addEventListener('input', function() { g_lightPos[2] = parseFloat(this.value/100); renderScene(); });
  document.getElementById('lightOn').addEventListener('click', function() { g_lightOn = true; renderScene(); });
  document.getElementById('lightOff').addEventListener('click', function() { g_lightOn = false; renderScene(); });
  document.getElementById('lightColorSlide').addEventListener('input', function() { updateLightColor(parseFloat(this.value)); });

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

// simple utility to convert a hue (0-360°) to RGB
function hslToRgb(h, s, l) {
  h = h % 360;
  let c = (1 - Math.abs(2*l-1)) * s;
  let x = c * (1 - Math.abs((h/60) % 2 - 1));
  let m = l - c/2;
  let r=0,g=0,b=0;
  if (h < 60) { r=c; g=x; b=0; }
  else if (h < 120) { r=x; g=c; b=0; }
  else if (h < 180) { r=0; g=c; b=x; }
  else if (h < 240) { r=0; g=x; b=c; }
  else if (h < 300) { r=x; g=0; b=c; }
  else { r=c; g=0; b=x; }
  return [r+m, g+m, b+m];
}

function updateLightColor(sliderValue) {
  // sliderValue mapped from -100..100
  // default position (0) should be white; otherwise map to a hue
  if (sliderValue === 0) {
    g_lightColor = [1,1,1];
  } else {
    let t = sliderValue/100;
    let hue = (t + 1) * 180; // -1->0, 0->180, 1->360
    g_lightColor = hslToRgb(hue, 1, 0.5);
  }
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  renderScene();
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
  // gl.enable(gl.BLEND);
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
  if (!u_lightPos) {
    console.log('Failed to get the storage location of u_lightPos');
    return;
  }

  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  if (!u_cameraPos) {
    console.log('Failed to get the storage location of u_cameraPos');
    return;
  }

  u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
  if (!u_lightOn) {
    console.log('Failed to get the storage location of u_lightOn');
    return;
  }

  u_lightColor = gl.getUniformLocation(gl.program, 'u_lightColor');
  if (!u_lightColor) {
    console.log('Failed to get the storage location of u_lightColor');
    return;
  }
  // spotlight uniforms
  u_spotPos = gl.getUniformLocation(gl.program, 'u_spotPos');
  u_spotDir = gl.getUniformLocation(gl.program, 'u_spotDir');
  u_spotColor = gl.getUniformLocation(gl.program, 'u_spotColor');
  u_spotCutoff = gl.getUniformLocation(gl.program, 'u_spotCutoff');
  
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
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

  // initialize light color uniform (white by default)
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  // set spotlight uniforms once (static)
  gl.uniform3f(u_spotPos, g_spotPos[0], g_spotPos[1], g_spotPos[2]);
  gl.uniform3f(u_spotDir, g_spotDir[0], g_spotDir[1], g_spotDir[2]);
  gl.uniform3f(u_spotColor, g_spotColor[0], g_spotColor[1], g_spotColor[2]);
  gl.uniform1f(u_spotCutoff, g_spotCutoff);
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

  g_lightPos[0] = Math.cos(g_seconds);
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

  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);

  gl.uniform3f(u_cameraPos, g_eye[0], g_eye[1], g_eye[2]);

  gl.uniform1i(u_lightOn, g_lightOn);
  
  // light source
  var light = new Cube();
  light.color = [2, 2, 0, 1.0];
  light.textureNum = -2;
  light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  light.matrix.scale(-0.1, -0.1, -0.1);
  light.matrix.translate(-0.5, -0.5, -0.5);
  light.render();

  //drawing penguim
  var body = new Cube();
  body.color = [0.95, 0.95, 0.95, 1.0];
  if (g_normalOn) { 
    body.textureNum = -3;
  } else {
    body.textureNum = -2;
  }
  body.matrix.rotate(180, 0, 1, 0);
  body.matrix.rotate(g_jointAngle, 1, 0, 0);
  body.matrix.translate(-0.2, -0.2, -0.2);
  var bodyCoordinatesMat = new Matrix4(body.matrix);
  body.matrix.scale(0.4, 0.6, 0.4);
  body.normalMatrix.setInverseOf(body.matrix).transpose();
  body.render();

  var bottomBody = new Cube();
  bottomBody.color = [0.9, 0.9, 0.9, 1.0];
  if (g_normalOn) { 
    bottomBody.textureNum = -3;
  } else {
    bottomBody.textureNum = -2;
  }
  bottomBody.matrix.translate(-0.225, -0.4, -0.225);
  bottomBody.matrix.scale(0.45, 0.3, 0.45);
  bottomBody.normalMatrix.setInverseOf(bottomBody.matrix).transpose();
  bottomBody.render();

  var leftArm = new Cube();
  leftArm.color = [0.1, 0.1, 0.1, 1.0];
  if (g_normalOn) { 
    leftArm.textureNum = -3;
  } else {
    leftArm.textureNum = -2;
  }
  leftArm.matrix = new Matrix4(bodyCoordinatesMat);
  leftArm.matrix.translate(-0.1, 0.4, 0.1); 
  leftArm.matrix.rotate(g_flipperAngle, 0, 0, 1); 
  leftArm.matrix.scale(0.13, -0.5, 0.2); 
  leftArm.matrix.translate(-0.2, -0.2, 0); 
  leftArm.normalMatrix.setInverseOf(leftArm.matrix).transpose();
  leftArm.render();


  var rightArm = new Cube();
  rightArm.color = [0.1, 0.1, 0.1, 1.0];
  if (g_normalOn) { 
    rightArm.textureNum = -3;
  } else {
    rightArm.textureNum = -2;
  }
  rightArm.matrix = new Matrix4(bodyCoordinatesMat);
  rightArm.matrix.translate(0.5, 0.4, 0.1); 
  rightArm.matrix.rotate(-g_flipperAngle, 0, 0, 1); 
  rightArm.matrix.scale(0.13, -0.5, 0.2); 
  rightArm.matrix.translate(-0.8, -0.2, 0); 
  rightArm.normalMatrix.setInverseOf(rightArm.matrix).transpose();
  rightArm.render();

  var head = new Cube();
  head.color = [0.1, 0.1, 0.1, 1.0];
  if (g_normalOn) { 
    head.textureNum = -3;
  } else {
    head.textureNum = -2;
  }
  head.matrix = new Matrix4(bodyCoordinatesMat);
  head.matrix.translate(0.2, 0.6, 0.2); 
  head.matrix.rotate(g_headAngle, 0, 1, 0);
  head.matrix.scale(0.3, 0.3, 0.3);
  head.matrix.translate(-0.5, 0, -0.5);
  var headCoordinatesMat = new Matrix4(head.matrix);
  head.normalMatrix.setInverseOf(head.matrix).transpose();
  head.render();

  var beak = new Cube();
  beak.color = [0.9, 0.2, 0.2, 1.0];
  if (g_normalOn) { 
    beak.textureNum = -3;
  } else {
    beak.textureNum = -2;
  }
  beak.matrix = new Matrix4(headCoordinatesMat);
  beak.matrix.translate(0.45, 0.4, -0.13); 
  beak.matrix.scale(0.15, 0.15*g_mouthScale, 0.15);
  beak.normalMatrix.setInverseOf(beak.matrix).transpose();
  beak.render();

  var leftEye = new Cube();
  leftEye.color = [1, 1, 1, 1.0];
  if (g_normalOn) { 
    leftEye.textureNum = -3;
  } else {
    leftEye.textureNum = -2;
  }
  leftEye.matrix = new Matrix4(headCoordinatesMat);
  leftEye.matrix.translate(0.25, 0.5, -0.05); 
  leftEye.matrix.scale(0.15, 0.15, 0.15);
  leftEye.normalMatrix.setInverseOf(leftEye.matrix).transpose();
  leftEye.render();

  var rightEye = new Cube();
  rightEye.color = [1, 1, 1, 1.0];
  if (g_normalOn) { 
    rightEye.textureNum = -3;
  } else {
    rightEye.textureNum = -2;
  }
  rightEye.matrix = new Matrix4(headCoordinatesMat);
  rightEye.matrix.translate(0.63, 0.5, -0.05); 
  rightEye.matrix.scale(0.15, 0.15, 0.15);
  rightEye.normalMatrix.setInverseOf(rightEye.matrix).transpose();
  rightEye.render();

  var floor = new Cube();
  floor.color = [0.2, 0.8, 0.2, 1.0];
  floor.textureNum = 1;
  floor.matrix.translate(0, -0.4, 0);
  floor.matrix.scale(5, 0, 5);
  floor.matrix.translate(-.5, 0, -.5);
  floor.render();

  var sky = new Cube();
  sky.color = [0.5, 0.7, 1.0, 1.0];
  if (g_normalOn) { 
    sky.textureNum = -3;
  } else {
    sky.textureNum = -5;
  }
  sky.matrix.scale(-5, -5, -5);
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.render();

  var sphere = new Sphere();
  sphere.color = [1.0, 1.0, 0.0, 1.0];
  if (g_normalOn) { 
    sphere.textureNum = -3;
  } else {
    sphere.textureNum = 1;
  }
  sphere.matrix.scale(0.5, 0.5, 0.5);
  sphere.matrix.translate(2, 1, 0);
  sphere.render();

  g_teapot.textureNum = g_normalOn ? -3 : -2;
  g_teapot.matrix = new Matrix4();           // reset each frame
  g_teapot.matrix.rotate(30, 0, 1, 0);

  g_teapot.matrix.translate(-1, -0.2, 0.4);
  g_teapot.matrix.scale(0.1, 0.1, 0.1);
  g_teapot.render();
}