class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }

  render(color) {
    drawCube(this.matrix, color || this.color);
  }
}

// Draw a unit cube transformed by matrix M; optional color array [r,g,b,a]
function drawCube(M, color) {
  var rgba = color || [1.0,1.0,1.0,1.0];
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  // Front face
  gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  drawTriangle3D([0,0,0,  1,1,0,  1,0,0]);
  drawTriangle3D([0,0,0,  0,1,0,  1,1,0]);

  // Back face (darker for depth)
  gl.uniform4f(u_FragColor, rgba[0]*.7, rgba[1]*.7, rgba[2]*.7, rgba[3]);
  drawTriangle3D([0,0,1,  1,1,1,  1,0,1]);
  drawTriangle3D([0,0,1,  0,1,1,  1,1,1]);

  // Top face
  gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);
  drawTriangle3D([0,1,0,  0,1,1,  1,1,1]);
  drawTriangle3D([0,1,0,  1,1,1,  1,1,0]);

  // Bottom face
  gl.uniform4f(u_FragColor, rgba[0]*.4, rgba[1]*.4, rgba[2]*.4, rgba[3]);
  drawTriangle3D([0,0,0,  0,0,1,  1,0,1]);
  drawTriangle3D([0,0,0,  1,0,1,  1,0,0]);

  // Left face
  gl.uniform4f(u_FragColor, rgba[0]*.6, rgba[1]*.6, rgba[2]*.6, rgba[3]);
  drawTriangle3D([0,0,0,  0,1,1,  0,1,0]);
  drawTriangle3D([0,0,0,  0,0,1,  0,1,1]);

  // Right face
  gl.uniform4f(u_FragColor, rgba[0]*.8, rgba[1]*.8, rgba[2]*.8, rgba[3]);
  drawTriangle3D([1,0,0,  1,1,1,  1,1,0]);
  drawTriangle3D([1,0,0,  1,0,1,  1,1,1]);
}