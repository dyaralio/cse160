class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.textureNum = -1;
  }

  render() {
    var rgba = this.color;
  
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Accumulate all vertices and UVs
    var vertices = [];
    var uvs = [];

    // Front face (z=0)
    vertices.push(0,0,0,  1,1,0,  1,0,0,  0,0,0,  0,1,0,  1,1,0);
    uvs.push(0,0,  1,1,  1,0,  0,0,  0,1,  1,1);

    // Back face (z=1)
    vertices.push(1,0,1,  0,0,1,  0,1,1,  1,0,1,  0,1,1,  1,1,1);
    uvs.push(1,0,  0,0,  0,1,  1,0,  0,1,  1,1);

    // Top face (y=1)
    vertices.push(0,1,1,  0,1,0,  1,1,0,  0,1,1,  1,1,0,  1,1,1);
    uvs.push(0,1,  0,0,  1,0,  0,1,  1,0,  1,1);

    // Bottom face (y=0)
    vertices.push(1,0,0,  0,0,0,  0,0,1,  1,0,0,  0,0,1,  1,0,1);
    uvs.push(1,0,  0,0,  0,1,  1,0,  0,1,  1,1);

    // Left face (x=0)
    vertices.push(0,1,1,  0,0,0,  0,1,0,  0,1,1,  0,0,1,  0,0,0);
    uvs.push(1,1,  0,0,  1,0,  1,1,  0,1,  0,0);

    // Right face (x=1)
    vertices.push(1,0,0,  1,1,0,  1,0,1,  1,1,0,  1,1,1,  1,0,1);
    uvs.push(0,0,  0,1,  1,0,  0,1,  1,1,  1,0);

    // Draw all vertices with a single call
    drawTriangle3DUV(vertices, uvs);
  }
}