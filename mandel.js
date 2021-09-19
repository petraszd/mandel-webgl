/*
 * Copyright (c) 2010 Petras Zdanavicius
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */
var gl;
var program;

var zoom = [1.0, 1.0];
var zoom_to = [1.0, 1.0];
var zoom_from = [1.0, 1.0];

var anim_t = 0.0;
var anim_lock = 0;

var delta = [0.0, 0.0];
var delta_from = [0.0, 0.0];
var delta_to = [0.0, 0.0];


var buffers = {
  vertices: null,
  indexes: null
};

function error (msg) {
  alert(msg);
}

function initBuffers () {
  initVertices();
  initIndexes();
}

function initVertices () {
  buffers.vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
  data = new Float32Array([
    -1.0,  1.0, 0.0,
     1.0,  1.0, 0.0,
     1.0, -1.0, 0.0,
    -1.0, -1.0, 0.0
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}

function initIndexes () {
  buffers.indexes = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexes);
  data = new Uint16Array([0, 1, 2, 0, 2, 3]);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
}

function makeShader (domId) {
  var tag = document.getElementById(domId);
  var shaderSrc = tag.firstChild.textContent;

  var shader;
  if (tag.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (tag.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSrc);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    error(tag.type);
    error(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

function initShaders () {
  var fragmentShader = makeShader('shader-fs');
  var vertexShader = makeShader('shader-vs');

  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    error("Could not initialise shaders");
  }

  gl.useProgram(program);

  program.at_position = gl.getAttribLocation(program, "at_position");
  gl.enableVertexAttribArray(program.at_position);

  program.un_zoom = gl.getUniformLocation(program, "un_zoom");
  program.un_delta = gl.getUniformLocation(program, "un_delta");
  program.un_type = gl.getUniformLocation(program, "un_type");
}

function draw () {
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertices);
  gl.vertexAttribPointer(program.at_position, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexes);

  gl.uniform2f(program.un_zoom, zoom[0], zoom[1]);
  gl.uniform2f(program.un_delta, delta[0], delta[1]);

  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

  gl.flush();
}

function initGL () {
  var canvas = document.getElementById("mandel-canvas");
  try {
    gl = canvas.getContext("experimental-webgl");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.width = canvas.width;
    gl.height = canvas.height;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
  } catch (e) {
    error("Sorry, Your browser does not support WebGL");
  }
}

function initUI () {
  var canvas = document.getElementById("mandel-canvas");
  canvas.addEventListener('click', clicked, false);
  canvas.addEventListener('mousewheel', zoomed, false);
  canvas.addEventListener('DOMMouseScroll', zoomed, false);
}

function main () {
  initUI();
  initGL();
  initBuffers();
  initShaders()

  draw();

  setTimeout(function () {
    var node = document.getElementById('navigation-info');
    node.parentNode.removeChild(node);
  }, 1000);
}

function changeType (newType) {
  gl.uniform1i(program.un_type, newType);
  zoom = [1.0, 1.0];
  anim_lock = 0;
  anim_t = 0.0;
  delta = [0.0, 0.0];
  draw();
}

function anim_zoom () {
  if (anim_t > 1.0) {
    zoom = zoom_to;
    draw();
    anim_lock = 0;
    return;
  }
  anim_t += 0.05;

  zoom[0] = zoom_to[0] * anim_t + zoom_from[0] * (1.0 - anim_t);
  zoom[1] = zoom_to[1] * anim_t + zoom_from[1] * (1.0 - anim_t);

  draw();
  setTimeout(anim_zoom, 20);
}

function anim_delta () {
  if (anim_t > 1.0) {
    delta = delta_to;
    draw();
    anim_lock = 0;
    return;
  }

  anim_t += 0.05;
  delta[0] = delta_to[0] * anim_t + delta_from[0] * (1.0 - anim_t);
  delta[1] = delta_to[1] * anim_t + delta_from[1] * (1.0 - anim_t);

  draw();
  setTimeout(anim_delta, 20);
}

function clicked (evt) {
  evt.preventDefault();
  if (anim_lock) {
    return;
  }
  var evtx = evt.pageX - evt.target.offsetLeft;
  var evty = evt.pageY - evt.target.offsetTop;

  var x = (0.5 - evtx / gl.width) * 2.0 * zoom[0];
  var y = (0.5 - evty / gl.height) * 2.0 * zoom[1];


  anim_t = 0.0;
  delta_from = [delta[0], delta[1]];
  delta_to = [delta[0] - x, delta[1] + y];

  setTimeout(anim_delta, 20);
}

function zoomed (evt) {
  evt.preventDefault();
  if (anim_lock) {
    zoom = [zoom_to[0], zoom_to[1]];
  }

  zoom_from = [zoom[0], zoom[1]];
  var dir = evt.wheelDelta || -evt.detail;
  if (dir > 0.0) {
    zoom_to = [zoom[0] / 1.3, zoom[1] / 1.3];
  } else {
    zoom_to = [zoom[0] * 1.3, zoom[1] * 1.3];
  }

  anim_t = 0.0;

  if (!anim_lock) {
    anim_lock = 1;
    setTimeout(anim_zoom, 20);
  }
}
