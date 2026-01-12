function main() {
    // Retrieve <canvas> element
    var canvas = document.getElementById('example');
    
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.fillRect(0, 0, 400, 400);

    var v1 = new Vector3([2.25, 2.25, 0.0]);
    drawVector(v1, "red");
}

function handleDrawEvent() {
    var canvas = document.getElementById('example');
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 400, 400);

    var v1x = document.getElementById('v1X').value;
    var v1y = document.getElementById('v1Y').value;
    var v1 = new Vector3([v1x, v1y, 0.0]);
    drawVector(v1, "red");

    var v2x = document.getElementById('v2X').value;
    var v2y = document.getElementById('v2Y').value;
    var v2 = new Vector3([v2x, v2y, 0.0]);
    drawVector(v2, "blue");
}


function handleDrawOperationEvent() {
    var canvas = document.getElementById('example');
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 400, 400);

    var v1 = new Vector3([document.getElementById('v1X').value, document.getElementById('v1Y').value, 0.0]);
    var v2 = new Vector3([document.getElementById('v2X').value, document.getElementById('v2Y').value, 0.0]);

    drawVector(v1, "red");
    drawVector(v2, "blue");

    var operation = document.getElementById('op-select').value;
    var scalar = document.getElementById('scalar').value;
    
    if (operation === "add") {
        var v3 = new Vector3(v1.elements);
        v3.add(v2);
        drawVector(v3, "green");
    } 
    else if (operation === "sub") {
        var v3 = new Vector3(v1.elements); 
        v3.sub(v2);
        drawVector(v3, "green");
    } 
    else if (operation === "mul") {
        var v3 = new Vector3(v1.elements);
        var v4 = new Vector3(v2.elements);
        
        v3.mul(scalar);
        v4.mul(scalar);
        
        drawVector(v3, "green");
        drawVector(v4, "green");
    } 
    else if (operation === "div") {
        var v3 = new Vector3(v1.elements);
        var v4 = new Vector3(v2.elements);
        
        v3.div(scalar);
        v4.div(scalar);
        
        drawVector(v3, "green");
        drawVector(v4, "green");
    } else if (operation === "angle") {
        angleBetween(v1, v2);
    }
    else if (operation === "area") {
        areaTriangle(v1, v2);
    }
}

function angleBetween(v1, v2) {
    let d = Vector3.dot(v1, v2);
    let a = d / (v1.magnitude() * v2.magnitude());
    a = Math.max(-1, Math.min(1, a)); 

    let angle = Math.acos(a) * (180 / Math.PI);
    console.log("Angle: " + angle);
}

function areaTriangle(v1, v2) {
    let v3 = Vector3.cross(v1, v2);
    let area = v3.magnitude() / 2;

    console.log("Area of the triangle: " + area);
}

function drawVector(v, color) {
    var canvas = document.getElementById('example');
    var ctx = canvas.getContext('2d');

    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(200, 200);
    ctx.lineTo(200 + v.elements[0] * 20, 200 - v.elements[1] * 20);
    
    ctx.stroke();
}
