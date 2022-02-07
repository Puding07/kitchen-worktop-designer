function resizeCanvas() {
  const canvas = document.querySelector("#canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();

document.addEventListener("resize", resizeCanvas);

document.querySelector("#remove").addEventListener("click", remove);
document.querySelector("#remove").addEventListener("ontouch", remove);

document.querySelector("#add").addEventListener("click", addObject);
document.querySelector("#add").addEventListener("ontouch", addObject);

document.querySelector("#export").addEventListener("click", Export);
document.querySelector("#export").addEventListener("ontouch", Export);

document.querySelector("#radius").addEventListener("click", radius);
document.querySelector("#radius").addEventListener("ontouch", radius);

var canvas = new fabric.Canvas("canvas", {
  selection: false,
});

/**
 * To add radius I have to play with the bezierCurveTo and magic number...
 */

const RoundedRect = new fabric.util.createClass(fabric.Rect, {
  type: "roundedRect",
  topLeft: [20, 20],
  topRight: [20, 20],
  bottomLeft: [20, 20],
  bottomRight: [20, 20],

  _render: function (ctx) {
    var w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2,
      /*
       * "magic number" for bezier approximations of arcs (http://hansmuller-flex.blogspot.com/2011/04/approximating-circular-arc-with-cubic.html)
       * example is at: (https://codepen.io/nfarahani/pen/QwrMyW)
       */
      k = 1 - 0.5522847498;
    ctx.beginPath();

    // top left
    ctx.moveTo(x + this.topLeft[0], y);

    // line to top right
    ctx.lineTo(x + w - this.topRight[0], y);
    ctx.bezierCurveTo(
      x + w - k * this.topRight[0],
      y,
      x + w,
      y + k * this.topRight[1],
      x + w,
      y + this.topRight[1]
    );

    // line to bottom right
    ctx.lineTo(x + w, y + h - this.bottomRight[1]);
    ctx.bezierCurveTo(
      x + w,
      y + h - k * this.bottomRight[1],
      x + w - k * this.bottomRight[0],
      y + h,
      x + w - this.bottomRight[0],
      y + h
    );

    // line to bottom left
    ctx.lineTo(x + this.bottomLeft[0], y + h);
    ctx.bezierCurveTo(
      x + k * this.bottomLeft[0],
      y + h,
      x,
      y + h - k * this.bottomLeft[1],
      x,
      y + h - this.bottomLeft[1]
    );

    // line to top left
    ctx.lineTo(x, y + this.topLeft[1]);
    ctx.bezierCurveTo(
      x,
      y + k * this.topLeft[1],
      x + k * this.topLeft[0],
      y,
      x + this.topLeft[0],
      y
    );

    ctx.closePath();

    this._renderPaintInOrder(ctx);
  },
});

canvas.zoomToPoint({ x: 725, y: 223 }, 0.05);

var grid = 10;
var vertM, horM, vertCm, horCm, verMm, horMm;

var scaleX = 0;
var scaleY = 0;
var width = 0;
var height = 0;
var selected = false;

// create grid

for (var i = 0; i < 10001 / grid; i++) {
  if (i % 100 === 0) {
    var vertText = new fabric.Text((i / 100).toString(), {
      left: i * 10 - 100,
      top: -500,
      fontSize: 400,
      fill: "black",
      selectable: false,
    });
    canvas.add(vertText);
    if (i === 1000) {
      var horText = new fabric.Text((i / 100).toString(), {
        left: -600,
        top: i * 10 - 200,
        fontSize: 400,
        fill: "black",
        selectable: false,
      });
      canvas.add(horText);
    } else if (i !== 0) {
      var horText = new fabric.Text((i / 100).toString(), {
        left: -500,
        top: i * 10 - 200,
        fontSize: 400,
        fill: "black",
        selectable: false,
      });
      canvas.add(horText);
    }
    vertM = new fabric.Line([i * grid, 0, i * grid, 10001], {
      stroke: "#080808",
      strokeWidth: 10,
      selectable: false,
    });
    canvas.add(vertM);
    horM = new fabric.Line([0, i * grid, 10001, i * grid], {
      stroke: "#080808",
      strokeWidth: 10,
      selectable: false,
    });
    canvas.add(horM);
  }
}

// add objects

canvas.add(
  new RoundedRect({
    topLeft: [0, 0],
    topRight: [0, 0],
    bottomLeft: [0, 0],
    bottomRight: [0, 0],
    left: 1000,
    top: 1000,
    width: 2000,
    height: 600,
    fill: "#244",
    stroke: "#244",
    strokeUniform: true,
    originX: "left",
    originY: "top",
    centeredRotation: true,
    padding: 20,
  })
);

// Move snap to grid

canvas.on("object:moving", function (opt) {
  if (opt.target.aCoords.tl.x < 0) {
    opt.target.left = 0;
  } else if (opt.target.aCoords.tl.y < 0) {
    opt.target.top = 0;
  } else {
    var zoom = canvas.getZoom();
    if (zoom < 0.15) {
      opt.target
        .set({
          left: Math.round(opt.target.left / grid / 100) * grid * 100,
          top: Math.round(opt.target.top / grid / 100) * grid * 100,
        })
        .setCoords();
    } else if (zoom < 0.7) {
      opt.target
        .set({
          left: Math.round(opt.target.left / grid / 10) * grid * 10,
          top: Math.round(opt.target.top / grid / 10) * grid * 10,
        })
        .setCoords();
    } else if (zoom > 0.7) {
      opt.target
        .set({
          left: Math.round(opt.target.left / grid) * grid,
          top: Math.round(opt.target.top / grid) * grid,
        })
        .setCoords();
    }
  }
});

canvas.on("mouse:down", function (opt) {
  const e = opt.e;
  if (e.altKey === true) {
    this.isDragging = true;
    this.selection = false;
    this.lastPosX = e.clientX;
    this.lastPosY = e.clientY;
  } else if (selected) {
    const target = opt.target;
    if (!width || !height) {
      width = target.width;
      height = target.height;
    }
  }
});

canvas.on("mouse:up", function (opt) {
  this.setViewportTransform(this.viewportTransform);
  this.isDragging = false;
  this.selection = true;

  if (selected) {
    const target = opt.target;

    width = target.width;
    height = target.height;

    if (scaleX && scaleY) {
      target.set({
        scaleX,
        scaleY,
      });
    }

    if (opt.target.aCoords.tl.x < 0) {
      opt.target.left = 0;
    } else if (opt.target.aCoords.tl.y < 0) {
      opt.target.top = 0;
    }
  }
});

// Resize snap to grid

canvas.on("object:scaling", function (opt) {
  let newWidth, newHeight;
  var zoom = canvas.getZoom();
  if (zoom < 0.15) {
    newWidth =
      Math.round((opt.target.aCoords.br.x - opt.target.aCoords.bl.x) / 1000) *
      1000;
    newHeight =
      Math.round((opt.target.aCoords.bl.y - opt.target.aCoords.tl.y) / 1000) *
      1000;
  } else if (zoom < 0.7) {
    newWidth =
      Math.round((opt.target.aCoords.br.x - opt.target.aCoords.bl.x) / 100) *
      100;
    newHeight =
      Math.round((opt.target.aCoords.bl.y - opt.target.aCoords.tl.y) / 100) *
      100;
  } else if (zoom > 0.7) {
    newWidth =
      Math.round((opt.target.aCoords.br.x - opt.target.aCoords.bl.x) / 10) * 10;
    newHeight =
      Math.round((opt.target.aCoords.bl.y - opt.target.aCoords.tl.y) / 10) * 10;
  }

  scaleX = newWidth / width;
  scaleY = newHeight / height;

  opt.target.setCoords();
});

canvas.on("object:rotating", function (opt) {
  if (opt.e.shiftKey === true) {
    var step = 15;
    opt.target.snapAngle = step;
  } else {
    opt.target.snapAngle = 1;
  }
});

canvas.on("selection:created", function (e) {
  selected = true;
});

canvas.on("selection:cleared", function () {
  selected = false;

  width = 0;
  height = 0;
  scaleX = 0;
  scaleY = 0;
});

canvas.on("selection:updated", function () {
  selected = true;

  width = 0;
  height = 0;
  scaleX = 0;
  scaleY = 0;
});

canvas.on("mouse:wheel", function (opt) {
  var delta = opt.e.deltaY;
  var zoom = canvas.getZoom();
  zoom *= 0.999 ** delta;
  if (zoom > 20) zoom = 20;
  if (zoom < 0.01) zoom = 0.01;
  if (delta === -100) {
    zoomIn(zoom);
  } else {
    zoomOut(zoom);
  }
  canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  // console.log("Zoom: ", zoom);
  // console.log("X: ", opt.e.offsetX);
  // console.log("Y: ", opt.e.offsetY);
  opt.e.preventDefault();
  opt.e.stopPropagation();
});

canvas.on("mouse:move", function (opt) {
  if (this.isDragging) {
    var e = opt.e;
    var vpt = this.viewportTransform;
    vpt[4] += e.clientX - this.lastPosX;
    vpt[5] += e.clientY - this.lastPosY;
    this.requestRenderAll();
    this.lastPosX = e.clientX;
    this.lastPosY = e.clientY;
  }
});

function zoomOut(zoom) {
  if (zoom < 0.7 && zoom > 0.6) {
    removeMm();
  } else if (zoom < 0.15 && zoom > 0.05) {
    removeCm();
  }
}

function zoomIn(zoom) {
  // Innen
  if (zoom > 0.7 && zoom < 0.8) {
    addMm();
  } else if (zoom > 0.15 && zoom < 0.2) {
    addCm();
  }
}

function removeCm() {
  const objects = canvas.getObjects();

  for (var i = 0; i < objects.length; i++) {
    if (objects[i].strokeWidth === 5) {
      canvas.remove(objects[i]);
    }
  }
  canvas.renderAll();
}

function removeMm() {
  const objects = canvas.getObjects();
  for (var i = 0; i < objects.length; i++) {
    if (objects[i].stroke === "#ccc") {
      canvas.remove(objects[i]);
    }
  }
  canvas.renderAll();
}

function addCm() {
  for (var i = 0; i < 10001 / grid; i++) {
    if (i % 10 === 0 && i % 100 !== 0) {
      vertCm = new fabric.Line([i * grid, 0, i * grid, 10001], {
        stroke: "#808080",
        strokeWidth: 5,
        selectable: false,
      });
      canvas.add(vertCm);
      canvas.sendToBack(vertCm);
      horCm = new fabric.Line([0, i * grid, 10001, i * grid], {
        stroke: "#808080",
        strokeWidth: 5,
        selectable: false,
      });
      canvas.add(horCm);
      canvas.sendToBack(horCm);
    }
  }
}

function addMm() {
  for (var i = 0; i < 10001 / grid; i++) {
    if (i % 10 !== 0) {
      verMm = new fabric.Line([i * grid, 0, i * grid, 10001], {
        stroke: "#ccc",
        selectable: false,
      });
      canvas.add(verMm);
      canvas.sendToBack(verMm);
      horMm = new fabric.Line([0, i * grid, 10001, i * grid], {
        stroke: "#ccc",
        selectable: false,
      });
      canvas.add(horMm);
      canvas.sendToBack(horMm);
    }
  }
}

function radius() {
  var activeObject = canvas.getActiveObject();

  var val = 200;
  console.log(activeObject);
  activeObject.set({ topLeft: [10, 10] });

  activeObject.setCoords();

  canvas.renderAll();
}

function remove() {
  const selected = canvas.getActiveObject();
  canvas.remove(selected);
}

function addObject() {
  document.querySelector(".add").style.display = "flex";
  document.querySelector("#close").addEventListener("click", () => close());
  document.querySelector("#close").addEventListener("ontouch", () => close());

  document.querySelector("#ok").addEventListener("click", () => addToCanvas());
  document
    .querySelector("#ok")
    .addEventListener("ontouch", () => addToCanvas());
}

function close() {
  document.querySelector(".add").style.display = "none";
}

function addToCanvas() {
  const width = document.querySelector("#width").value;
  const height = document.querySelector("#length").value;

  console.log(width);

  canvas.add(
    new RoundedRect({
      topLeft: [0, 0],
      topRight: [0, 0],
      bottomLeft: [0, 0],
      bottomRight: [0, 0],
      left: 3000,
      top: 3000,
      width: Number(width),
      height: Number(height),
      fill: "#244",
      stroke: "#244",
      strokeUniform: true,
      originX: "left",
      originY: "top",
      centeredRotation: true,
      padding: 20,
    })
  );

  close();
}

function Export(e) {
  removeMm();
  removeCm();

  canvas.backgroundColor = "white";
  canvas.zoomToPoint({ x: 725, y: 223 }, 0.05);
  canvas.renderAll();

  this.href = canvas.toDataURL({
    format: "jpeg",
    quality: 0.8,
  });
  this.download = "canvas.png";
}
