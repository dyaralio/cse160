class Triangle {
  constructor(x1, y1, x2, y2, x3, y3, r, g, b, a) {
    this.vertices = [x1, y1, x2, y2, x3, y3];
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  render() {
    let vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
      console.log('Failed to create the buffer object');
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.uniform4f(u_FragColor, this.r, this.g, this.b, this.a);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

let g_vertexBuffer = null;

function initBuffers() {
    g_vertexBuffer = gl.createBuffer();
    if (!g_vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }
}

function drawTriangle3D(vertices) {
    var n = vertices.length / 3; 

    if (g_vertexBuffer === null) initBuffers();

    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, n);
}

// Shared static buffers for performance
let g_cubeVertexBuffer = null;
let g_cubeUVBuffer = null;

function drawTriangle3DUV(vertices, uv) {
  var n = vertices.length/3; // The number of vertices

  // Create and reuse static buffers
  if (!g_cubeVertexBuffer) {
    g_cubeVertexBuffer = gl.createBuffer();
  }
  if (!g_cubeUVBuffer) {
    g_cubeUVBuffer = gl.createBuffer();
  }

  // Bind and update vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Bind and update UV buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeUVBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  // Draw the triangles
  gl.drawArrays(gl.TRIANGLES, 0, n);
}