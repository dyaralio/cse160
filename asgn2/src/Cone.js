class Cone {
  constructor() {
    this.type = 'cone';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }

  render(color) {
    drawCone(this.matrix, color || this.color);
  }
}

// Draw a unit cone (apex at z=1, base centered at z=0) transformed by M.
// Composed of triangular side faces and a triangular fan for the base.
function drawCone(M, color, segments=24) {
  var rgba = color || [1.0, 1.0, 1.0, 1.0];
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  // Apex and base center in unit-cone coordinates
  var ax = 0.5, ay = 0.5, az = 1.0; // apex
  var bx = 0.5, by = 0.5, bz = 0.0; // base center

  // Draw side triangles (apex, p_i, p_{i+1})
  for (var i = 0; i < segments; i++) {
    var t1 = (i / segments) * 2.0 * Math.PI;
    var t2 = ((i + 1) / segments) * 2.0 * Math.PI;
    var x1 = 0.5 + 0.5 * Math.cos(t1);
    var y1 = 0.5 + 0.5 * Math.sin(t1);
    var z1 = 0.0;
    var x2 = 0.5 + 0.5 * Math.cos(t2);
    var y2 = 0.5 + 0.5 * Math.sin(t2);
    var z2 = 0.0;

    // Draw side triangle (apex, p1, p2)
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    drawTriangle3D([
      ax, ay, az,
      x1, y1, z1,
      x2, y2, z2
    ]);

    // base triangle (center, p2, p1) to keep consistent winding
    drawTriangle3D([
      bx, by, bz,
      x2, y2, z2,
      x1, y1, z1
    ]);
  }
}
