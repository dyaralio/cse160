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