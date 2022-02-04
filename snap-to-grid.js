function resizeCanvas() {
  const canvas = document.querySelector("#canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();

document.addEventListener("keydown", (e) => {
  if (e.altKey) {
    document.querySelector("canvas").style.cursor = "grab";
  }
});

var canvas = new fabric.Canvas("canvas", {
  selection: false,
});

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
    vertM = new fabric.Line([i * grid, 0, i * grid, 10001], {
      stroke: "#080808",
      selectable: false,
    });
    canvas.add(vertM);
    horM = new fabric.Line([0, i * grid, 10001, i * grid], {
      stroke: "#080808",
      selectable: false,
    });
    canvas.add(horM);
  } else if (i % 10 === 0) {
    vertCm = new fabric.Line([i * grid, 0, i * grid, 10001], {
      stroke: "#808080",
      selectable: false,
    });
    canvas.add(vertCm);
    horCm = new fabric.Line([0, i * grid, 10001, i * grid], {
      stroke: "#808080",
      selectable: false,
    });
    canvas.add(horCm);
  } else {
    verMm = new fabric.Line([i * grid, 0, i * grid, 10001], {
      stroke: "#ccc",
      selectable: false,
    });
    canvas.add(verMm);
    horMm = new fabric.Line([0, i * grid, 10001, i * grid], {
      stroke: "#ccc",
      selectable: false,
    });
    canvas.add(horMm);
  }
}

// add objects

canvas.add(
  new fabric.Rect({
    left: 100,
    top: 100,
    width: 2000,
    height: 2000,
    fill: "#faa",
    stroke: "#faa",
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
    if (zoom < 0.7) {
      opt.target
        .set({
          left: Math.round(opt.target.left / grid / 10) * grid * 10,
          top: Math.round(opt.target.top / grid / 10) * grid * 10,
        })
        .setCoords();
    } else {
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
  if (zoom < 0.7) {
    newWidth =
      Math.round((opt.target.aCoords.br.x - opt.target.aCoords.bl.x) / 100) *
      100;
    newHeight =
      Math.round((opt.target.aCoords.bl.y - opt.target.aCoords.tl.y) / 100) *
      100;
  } else {
    newWidth =
      Math.round((opt.target.aCoords.br.x - opt.target.aCoords.bl.x) / 10) * 10;
    newHeight =
      Math.round((opt.target.aCoords.bl.y - opt.target.aCoords.tl.y) / 10) * 10;
  }

  scaleX = newWidth / width;
  scaleY = newHeight / height;

  opt.target.setCoords();
});

canvas.on("selection:created", function (e) {
  console.log(e);
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
  if (zoom < 0.7 && zoom > 0.5) {
    const objects = canvas.getObjects();
    for (var i = 0; i < objects.length; i++) {
      if (objects[i].stroke === "#ccc") {
        canvas.remove(objects[i]);
      }
    }
    canvas.renderAll();
  }
}

function zoomIn(zoom) {
  // Innen
  if (zoom > 0.7 && zoom < 0.8) {
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
}
