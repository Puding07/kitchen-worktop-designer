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
 * with the help of (https://pomax.github.io/bezierinfo/#circles_cubic)
 */

const RoundedRect = new fabric.util.createClass(fabric.Rect, {
  type: "roundedRect",
  topLeft: 20,
  topRight: 20,
  bottomLeft: 20,
  bottomRight: 20,

  _render: function (ctx) {
    var w = this.width,
      h = this.height,
      x = -this.width / 2,
      y = -this.height / 2,
      /*
       * "magic number" for bezier approximations of arcs (http://hansmuller-flex.blogspot.com/2011/04/approximating-circular-arc-with-cubic.html)
       * example is at: (https://codepen.io/nfarahani/pen/QwrMyW)
       */
      k = 1 - 0.5522847498; // quarter circle k = 0.551785
    ctx.beginPath();

    // top left
    ctx.moveTo(x + this.topLeft, y);

    // line to top right
    ctx.lineTo(x + w - this.topRight, y);
    ctx.bezierCurveTo(
      x + w - k * this.topRight,
      y,
      x + w,
      y + k * this.topRight,
      x + w,
      y + this.topRight
    );

    // line to bottom right
    ctx.lineTo(x + w, y + h - this.bottomRight);
    ctx.bezierCurveTo(
      x + w,
      y + h - k * this.bottomRight,
      x + w - k * this.bottomRight,
      y + h,
      x + w - this.bottomRight,
      y + h
    );

    // line to bottom left
    ctx.lineTo(x + this.bottomLeft, y + h); // 10, 10
    ctx.bezierCurveTo(
      x + k * this.bottomLeft,
      y + h,
      x,
      y + h - k * this.bottomLeft,
      x,
      y + h - this.bottomLeft
    );

    // line to top left
    ctx.lineTo(x, y + this.topLeft); // -10, 10
    ctx.bezierCurveTo(
      x,
      y + k * this.topLeft,
      x + k * this.topLeft,
      y,
      x + this.topLeft,
      y
    );

    ctx.closePath();

    this._renderPaintInOrder(ctx);
  },
});

canvas.zoomToPoint({ x: 250, y: 50 }, 0.08);

var grid = 10;
var vertM, horM, vertTenCm, horTenCm, vertCm, horCm, verMm, horMm;

var scaleX = 0;
var scaleY = 0;
var width = 0;
var height = 0;
var selected = false;

var gridView = {
  m: true,
  tenCm: false,
  cm: false,
  mm: false,
};

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
  }
}

addM(10);

// add objects

const rect = new RoundedRect({
  topLeft: 0,
  topRight: 0,
  bottomLeft: 0,
  bottomRight: 0,
  left: 1000,
  top: 1000,
  width: 2000,
  height: 600,
  fill: "#244",
  borderColor: "green",
  stroke: "#244",
  strokeWidth: 0.1,
  strokeUniform: true,
  originX: "left",
  originY: "top",
  centeredRotation: true,
  padding: 0,
  objectCaching: false,
});

rect.setControlsVisibility({
  tl: false,
  tr: false,
  bl: false,
  br: false,
  ml: false,
  mt: false,
  mr: false,
  mb: false,
  mtr: false,
});

canvas.add(rect);

function findNewPos(distX, distY, target, obj) {
  // See whether to focus on X or Y axis
  if (Math.abs(distX) > Math.abs(distY)) {
    if (distX > 0) {
      target.set({ left: obj.left - target.width });
    } else {
      target.set({ left: obj.left + obj.width });
    }
  } else {
    if (distY > 0) {
      target.set({ top: obj.top - target.height });
    } else {
      target.set({ top: obj.top + obj.height });
    }
  }
}

var canvasWidth = 10000,
  canvasHeight = 10000,
  counter = 0,
  rectLeft = 0,
  snap = 100; // Pixels to snap

// Move snap to grid

canvas.on("object:moving", function (options) {
  // Sets corner position coordinates based on current angle, width and height
  options.target.setCoords();

  // Loop through objects
  canvas.forEachObject(function (obj) {
    if (obj === options.target) {
      return;
    } else if (!obj.selectable) {
      return;
    }

    // If objects intersect
    if (
      options.target.isContainedWithinObject(obj) ||
      options.target.intersectsWithObject(obj) ||
      obj.isContainedWithinObject(options.target)
    ) {
      var distX =
        (obj.left + obj.width) / 2 -
        (options.target.left + options.target.width) / 2;
      var distY =
        (obj.top + obj.height) / 2 -
        (options.target.top + options.target.height) / 2;

      // Set new position
      findNewPos(distX, distY, options.target, obj);
    }

    // Snap objects to each other horizontally

    // If bottom points are on same Y axis
    if (
      Math.abs(
        options.target.top + options.target.height - (obj.top + obj.height)
      ) < snap
    ) {
      // Snap target BL to object BR
      if (Math.abs(options.target.left - (obj.left + obj.width)) < snap) {
        options.target.set({ left: obj.left + obj.width });
        options.target.set({
          top: obj.top + obj.height - options.target.height,
        });
      }

      // Snap target BR to object BL
      if (
        Math.abs(options.target.left + options.target.width - obj.left) < snap
      ) {
        options.target.set({ left: obj.left - options.target.width });
        options.target.set({
          top: obj.top + obj.height - options.target.height,
        });
      }
    }

    // If top points are on same Y axis
    if (Math.abs(options.target.top - obj.top) < snap) {
      // Snap target TL to object TR
      if (Math.abs(options.target.left - (obj.left + obj.width)) < snap) {
        options.target.set({ left: obj.left + obj.width });
        options.target.set({ top: obj.top });
      }

      // Snap target TR to object TL
      if (
        Math.abs(options.target.left + options.target.width - obj.left) < snap
      ) {
        options.target.set({ left: obj.left - options.target.width });
        options.target.set({ top: obj.top });
      }
    }

    // Snap objects to each other vertically

    // If right points are on same X axis
    if (
      Math.abs(
        options.target.left + options.target.width - (obj.left + obj.width)
      ) < snap
    ) {
      // Snap target TR to object BR
      if (Math.abs(options.target.top - (obj.top + obj.height)) < snap) {
        options.target.set({
          left: obj.left + obj.width - options.target.width,
        });
        options.target.set({ top: obj.top + obj.height });
      }

      // Snap target BR to object TR
      if (
        Math.abs(options.target.top + options.target.height - obj.top) < snap
      ) {
        options.target.set({
          left: obj.left + obj.width - options.target.width,
        });
        options.target.set({ top: obj.top - options.target.height });
      }
    }

    // If left points are on same X axis
    if (Math.abs(options.target.left - obj.left) < snap) {
      // Snap target TL to object BL
      if (Math.abs(options.target.top - (obj.top + obj.height)) < snap) {
        options.target.set({ left: obj.left });
        options.target.set({ top: obj.top + obj.height });
      }

      // Snap target BL to object TL
      if (
        Math.abs(options.target.top + options.target.height - obj.top) < snap
      ) {
        options.target.set({ left: obj.left });
        options.target.set({ top: obj.top - options.target.height });
      }
    }
  });

  options.target.setCoords();

  // If objects still overlap

  var outerAreaLeft = null,
    outerAreaTop = null,
    outerAreaRight = null,
    outerAreaBottom = null;

  canvas.forEachObject(function (obj) {
    if (obj === options.target) {
      return;
    } else if (!obj.selectable) {
      return;
    }

    console.log(obj);
    // console.log(obj.selectable);

    if (
      options.target.isContainedWithinObject(obj) ||
      options.target.intersectsWithObject(obj) ||
      obj.isContainedWithinObject(options.target)
    ) {
      var intersectLeft = null,
        intersectTop = null,
        intersectWidth = null,
        intersectHeight = null,
        intersectSize = null,
        targetLeft = options.target.left,
        targetRight = targetLeft + options.target.width,
        targetTop = options.target.top,
        targetBottom = targetTop + options.target.height,
        objectLeft = obj.left,
        objectRight = objectLeft + obj.width,
        objectTop = obj.top,
        objectBottom = objectTop + obj.height;

      // Find intersect information for X axis
      if (targetLeft >= objectLeft && targetLeft <= objectRight) {
        intersectLeft = targetLeft;
        intersectWidth = obj.width - (intersectLeft - objectLeft);
      } else if (objectLeft >= targetLeft && objectLeft <= targetRight) {
        intersectLeft = objectLeft;
        intersectWidth = options.target.width - (intersectLeft - targetLeft);
      }

      // Find intersect information for Y axis
      if (targetTop >= objectTop && targetTop <= objectBottom) {
        intersectTop = targetTop;
        intersectHeight = obj.height - (intersectTop - objectTop);
      } else if (objectTop >= targetTop && objectTop <= targetBottom) {
        intersectTop = objectTop;
        intersectHeight = options.target.height - (intersectTop - targetTop);
      }

      // Find intersect size (this will be 0 if objects are touching but not overlapping)
      if (intersectWidth > 0 && intersectHeight > 0) {
        intersectSize = intersectWidth * intersectHeight;
      }

      // Set outer snapping area
      if (obj.left < outerAreaLeft || outerAreaLeft == null) {
        outerAreaLeft = obj.left;
      }

      if (obj.top < outerAreaTop || outerAreaTop == null) {
        outerAreaTop = obj.top;
      }

      if (obj.left + obj.width > outerAreaRight || outerAreaRight == null) {
        outerAreaRight = obj.left + obj.width;
      }

      if (obj.top + obj.height > outerAreaBottom || outerAreaBottom == null) {
        outerAreaBottom = obj.top + obj.height;
      }

      // If objects are intersecting, reposition outside all shapes which touch
      if (intersectSize) {
        var distX =
          outerAreaRight / 2 - (options.target.left + options.target.width) / 2;
        var distY =
          outerAreaBottom / 2 -
          (options.target.top + options.target.height) / 2;

        // Set new position
        findNewPos(distX, distY, options.target, obj);
      }
    }
  });

  // Inside canvas
  if (options.target.left < snap) {
    options.target.set({ left: 0 });
  }

  if (options.target.top < snap) {
    options.target.set({ top: 0 });
  }

  // Scale only in canvas
  if (options.target.width + options.target.left > canvasWidth - snap) {
    options.target.set({ left: canvasWidth - options.target.width });
  }

  if (options.target.height + options.target.top > canvasHeight - snap) {
    options.target.set({ top: canvasHeight - options.target.height });
  }

  var zoom = canvas.getZoom();

  // Snap to grid
  if (zoom < 0.45) {
    const left = Math.round(options.target.left / grid / 100) * grid * 100;
    const top = Math.round(options.target.top / grid / 100) * grid * 100;
    options.target.set({ left, top }).setCoords();
    /*
    * from here
    if (grid % (options.target.width / 1000) === 0) {
      const left = Math.round(options.target.left / grid / 100) * grid * 100;
      const top = Math.round(options.target.top / grid / 100) * grid * 100;
      options.target.set({ left, top }).setCoords();
    } else {
      const left =
        Math.round(options.target.left / grid / 100) * grid * 100 -
        options.target.width;
      options.target.set({ left }).setCoords();
    }
    */
  } else if (zoom < 1.5) {
    options.target
      .set({
        left: Math.round(options.target.left / grid / 10) * grid * 10,
        top: Math.round(options.target.top / grid / 10) * grid * 10,
      })
      .setCoords();
  } else if (zoom < 19) {
    options.target
      .set({
        left: Math.round(options.target.left / grid) * grid,
        top: Math.round(options.target.top / grid) * grid,
      })
      .setCoords();
  } else if (zoom >= 19) {
    options.target
      .set({
        left: Math.round(Math.round(options.target.left * 100) / 100),
        top: Math.round(Math.round(options.target.top * 100) / 100),
      })
      .setCoords();
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
  console.log(e);
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
  if (zoom < 0.04) zoom = 0.04;
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
  if (zoom < 19 && gridView.mm) {
    removeMm();
    removeCm();
    removeTenCm();
    removeM();
    addM(2);
    addTenCm(1);
    addCm(1);
  } else if (zoom < 1.5 && gridView.cm) {
    removeM();
    removeTenCm();
    removeCm();
    addM(3);
    addTenCm(2);
  } else if (zoom < 0.45 && gridView.tenCm) {
    removeTenCm();
    removeM();
    addM(5);
  } else if (zoom < 0.3 && zoom > 0.4) {
    removeM();
    removeTenCm();
    addM(10);
  }
}

function zoomIn(zoom) {
  // Innen
  if (zoom > 19 && !gridView.mm) {
    removeM();
    removeCm();
    removeTenCm();
    addM(0.1);
    addTenCm(0.1);
    addCm(0.1);
    addMm(0.1);
  } else if (zoom > 1.5 && !gridView.cm) {
    removeM();
    removeTenCm();
    addM(2);
    addTenCm(2);
    addCm(1);
  } else if (zoom > 0.45 && !gridView.tenCm) {
    removeM();
    addM(5);
    addTenCm(2);
  }
}

function addM(width) {
  gridView.m = true;

  for (var i = 0; i < 10001 / grid; i++) {
    if (i % 100 === 0) {
      vertM = new fabric.Line([i * grid, 0, i * grid, 10001], {
        stroke: "#080808",
        strokeWidth: width,
        selectable: false,
      });
      canvas.add(vertM);
      canvas.sendToBack(vertM);
      horM = new fabric.Line([0, i * grid, 10001, i * grid], {
        stroke: "#080808",
        strokeWidth: width,
        selectable: false,
      });
      canvas.add(horM);
      canvas.sendToBack(horM);
    }
  }
}

function removeM() {
  gridView.m = false;

  const objects = canvas.getObjects();

  for (var i = 0; i < objects.length; i++) {
    if (objects[i].stroke === "#080808") {
      canvas.remove(objects[i]);
    }
  }

  canvas.renderAll();
}

function addTenCm(width) {
  gridView.tenCm = true;

  for (var i = 0; i < 10001 / grid; i++) {
    if (i % 10 === 0 && i % 100 !== 0) {
      vertTenCm = new fabric.Line([i * grid, 0, i * grid, 10001], {
        stroke: "#808080",
        strokeWidth: width,
        selectable: false,
      });
      canvas.add(vertTenCm);
      canvas.sendToBack(vertTenCm);
      horTenCm = new fabric.Line([0, i * grid, 10001, i * grid], {
        stroke: "#808080",
        strokeWidth: width,
        selectable: false,
      });
      canvas.add(horTenCm);
      canvas.sendToBack(horTenCm);
    }
  }
}

function removeTenCm() {
  gridView.tenCm = false;

  const objects = canvas.getObjects();

  for (var i = 0; i < objects.length; i++) {
    if (objects[i].stroke === "#808080") {
      canvas.remove(objects[i]);
    }
  }

  canvas.renderAll();
}

function addCm(width) {
  gridView.cm = true;

  for (var i = 0; i < 10001 / grid; i++) {
    if (i % 1 === 0) {
      vertCm = new fabric.Line([i * grid, 0, i * grid, 10001], {
        stroke: "#ccc",
        strokeWidth: width,
        selectable: false,
      });
      canvas.add(vertCm);
      canvas.sendToBack(vertCm);
      horCm = new fabric.Line([0, i * grid, 10001, i * grid], {
        stroke: "#ccc",
        strokeWidth: width,
        selectable: false,
      });
      canvas.add(horCm);
      canvas.sendToBack(horCm);
    }
  }
}

function removeCm() {
  gridView.cm = false;

  const objects = canvas.getObjects();

  for (var i = 0; i < objects.length; i++) {
    if (objects[i].stroke === "#ccc") {
      canvas.remove(objects[i]);
    }
  }

  canvas.renderAll();
}

function addMm(width) {
  gridView.mm = true;

  for (var i = 0; i < 10001 / grid; i++) {
    for (let j = 0; j < 10; j++) {
      verMm = new fabric.Line(
        [(i + j / 10) * grid, 0, (i + j / 10) * grid, 10001],
        {
          stroke: "#e3e3e3",
          strokeWidth: width,
          selectable: false,
        }
      );
      canvas.add(verMm);
      canvas.sendToBack(verMm);
      horMm = new fabric.Line(
        [0, (i + j / 10) * grid, 10001, (i + j / 10) * grid],
        {
          stroke: "#e3e3e3",
          strokeWidth: width,
          selectable: false,
        }
      );
      canvas.add(horMm);
      canvas.sendToBack(horMm);
    }
  }
}

function removeMm() {
  gridView.mm = false;

  const objects = canvas.getObjects();
  for (var i = 0; i < objects.length; i++) {
    if (objects[i].stroke === "#e3e3e3") {
      canvas.remove(objects[i]);
    }
  }

  canvas.renderAll();
}

function radius() {
  var activeObject = canvas.getActiveObject();

  var val = 100;
  console.log(activeObject);
  activeObject.set({ topLeft: val });

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
  const newRect = new RoundedRect({
    topLeft: 0,
    topRight: 0,
    bottomLeft: 0,
    bottomRight: 0,
    left: 3000,
    top: 3000,
    width: Number(width),
    height: Number(height),
    fill: "#244",
    borderColor: "green",
    stroke: "#244",
    strokeWidth: 0.1,
    strokeUniform: true,
    originX: "left",
    originY: "top",
    centeredRotation: true,
    padding: 0,
    objectCaching: false,
  });

  newRect.setControlsVisibility({
    tl: false,
    tr: false,
    bl: false,
    br: false,
    ml: false,
    mt: false,
    mr: false,
    mb: false,
    mtr: false,
  });

  canvas.add(newRect);

  close();
}

function Export(e) {
  removeMm();
  removeCm();
  canvas.renderAll();

  addCm();
  addMm();
  canvas.renderAll();

  canvas.backgroundColor = "white";
  canvas.zoomToPoint({ x: 725, y: 223 }, 0.05);
  canvas.renderAll();
  const svg = canvas.toSVG();

  var parser = new DOMParser();
  var doc = parser.parseFromString(svg, "text/html");

  document.querySelector("body").appendChild(doc.body);

  //convert svg source to URI data scheme.
  var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

  this.href = url;
  this.download = "canvas.svg";

  setTimeout(() => {
    removeMm();
    removeCm();
  }, 5000);
}
