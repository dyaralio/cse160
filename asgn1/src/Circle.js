class Circle {
  constructor(x, y, radius, r, g, b, numSegments, a) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.r = r;
    this.g = g;
    this.b = b;
    this.numSegments = numSegments;
    this.a = a;
  }

  render() {
    let vertices = [this.x, this.y];
    for (let i = 0; i <= this.numSegments; i++) {
      let angle = (i / this.numSegments) * 2 * Math.PI;
      let x = this.x + this.radius * Math.cos(angle);
      let y = this.y + this.radius * Math.sin(angle);
      vertices.push(x, y);
    }

    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.uniform4f(u_FragColor, this.r, this.g, this.b, this.a);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.numSegments + 2);
  }
}