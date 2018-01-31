var IMG_INIT ="mona_lisa_crop.jpg"; // mona_lisa_crop.jpg mondrian.jpg
var DEPTH = 4;

var INIT_TYPE = "color"; // random color
var INIT_R = 0;
var INIT_G = 0;
var INIT_B = 0;
var INIT_A = 0.001;

var mutateDNA = mutate_medium; // mutate_soft mutate_medium mutate_hard

var CANVAS_INPUT = 0;
var CANVAS_OUTPUT = 0;
var CANVAS_BEST = 0;

var CONTEXT_INPUT = 0;
var CONTEXT_TEST = 0;
var CONTEXT_BEST = 0;

var IMAGE = new Image();
var IWIDTH = 0;
var IHEIGHT = 0;
var SUBPIXELS = 0;

var EV_TIMEOUT = 0;
var EV_ID = 0;

var COUNTER_TOTAL = 0;
var COUNTER_BENEFIT = 0;

var LAST_COUNTER = 0;
var LAST_START = 0.0;
var ELAPSED_TIME = 0.0;

var EL_FITNESS = 0;
var EL_ELAPSED_TIME = 0;

var MAX_SHAPES = 50;    // max capacity
var MAX_POINTS = 6;

var ACTUAL_SHAPES = MAX_SHAPES; // current size
var ACTUAL_POINTS = MAX_POINTS;

var DNA_BEST = new Array(MAX_SHAPES);
var DNA_TEST = new Array(MAX_SHAPES);

var CHANGED_SHAPE_INDEX = 0;

var FITNESS_MAX = 999923400656;
var FITNESS_TEST = FITNESS_MAX;
var FITNESS_BEST = FITNESS_MAX;

var FITNESS_BEST_NORMALIZED = 0; // pixel match: 0% worst - 100% best
var NORM_COEF = IWIDTH*IHEIGHT*3*255; // maximum distance between black and white images

var DATA_INPUT = 0;
var DATA_TEST = 0;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function hide(id) {
  var el = document.getElementById(id);
  if(el)
    el.style.display = "none";
}

function show(id) {
  var el = document.getElementById(id);
  if(el)
    el.style.display = "block";
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function rand_int(maxval) {
  return Math.round(maxval*Math.random());
}

function rand_float(maxval) {
  return maxval*Math.random();
}

function clamp(val, minval, maxval) {
  if(val<minval) return minval;
  if(val>maxval) return maxval;
  return val;
}

function stop() {
  clearTimeout(EV_ID);

  ELAPSED_TIME += get_timestamp() - LAST_START;

  hide("stop");
  show("start");
}

function start() {
  EV_ID = setInterval(evolve, EV_TIMEOUT);

  LAST_START = get_timestamp();
  LAST_COUNTER = COUNTER_TOTAL;

  hide("start");
  show("stop");
}

function get_timestamp() {
  return 0.001*(new Date).getTime();
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function redrawDNA() {
  drawDNA(CONTEXT_TEST, DNA_TEST);
  drawDNA(CONTEXT_BEST, DNA_BEST);
}

function render_nice_time(s) {
  if(s<60) {
    return Math.floor(s).toFixed(0)+"s";
  }
  else if(s<3600) {
    var m = Math.floor(s/60);
    return m+"m"+" "+render_nice_time(s-m*60);
  }
  else if(s<86400) {
    var h = Math.floor(s/3600);
    return h+"h"+" "+render_nice_time(s-h*3600);
  }
  else {
    var d = Math.floor(s/86400);
    return d+"d"+" "+render_nice_time(s-d*86400);
  }
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function drawShape(ctx, shape, color) {
  ctx.fillStyle = "rgba("+color.r+","+color.g+","+color.b+","+color.a+")";
  ctx.beginPath();
  ctx.moveTo(shape[0].x, shape[0].y);
  for(var i=1;i<ACTUAL_POINTS;i++) {
    ctx.lineTo(shape[i].x, shape[i].y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawDNA(ctx, dna) {
  ctx.fillStyle = "rgb(255,255,255)";
  ctx.fillRect(0, 0, IWIDTH, IHEIGHT);
  for(var i=0;i<ACTUAL_SHAPES;i++) {
    drawShape(ctx, dna[i].shape, dna[i].color);
  }
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function mutate_medium(dna_out) {
  CHANGED_SHAPE_INDEX = rand_int(ACTUAL_SHAPES-1);

  var roulette = rand_float(2.0);

  // mutate color
  if(roulette<1) {
    // red
    if(roulette<0.25) {
      dna_out[CHANGED_SHAPE_INDEX].color.r = rand_int(255);
    }
    // green
    else if(roulette<0.5) {
      dna_out[CHANGED_SHAPE_INDEX].color.g = rand_int(255);
    }
    // blue
    else if(roulette<0.75) {
      dna_out[CHANGED_SHAPE_INDEX].color.b = rand_int(255);
    }
    // alpha
    else if(roulette<1.0) {
      dna_out[CHANGED_SHAPE_INDEX].color.a = rand_float(1.0);
    }
  }

  // mutate shape
  else {
    var CHANGED_POINT_INDEX = rand_int(ACTUAL_POINTS-1);

    // x-coordinate
    if(roulette<1.5) {
      dna_out[CHANGED_SHAPE_INDEX].shape[CHANGED_POINT_INDEX].x = rand_int(IWIDTH);
    }

    // y-coordinate
    else {
      dna_out[CHANGED_SHAPE_INDEX].shape[CHANGED_POINT_INDEX].y = rand_int(IHEIGHT);
    }
  }
}

function compute_fitness(dna) {
  var fitness = 0;

  DATA_TEST = CONTEXT_TEST.getImageData(0, 0, IWIDTH, IHEIGHT).data;

  for(var i=0;i<SUBPIXELS;++i) {
    if(i%DEPTH!=3)
      fitness += Math.abs(DATA_INPUT[i]-DATA_TEST[i]);
  }

  return fitness;
}

function pass_gene_mutation(dna_from, dna_to, gene_index) {
  dna_to[gene_index].color.r = dna_from[gene_index].color.r;
  dna_to[gene_index].color.g = dna_from[gene_index].color.g;
  dna_to[gene_index].color.b = dna_from[gene_index].color.b;
  dna_to[gene_index].color.a = dna_from[gene_index].color.a;

  for(var i=0;i<MAX_POINTS;i++) {
    dna_to[gene_index].shape[i].x = dna_from[gene_index].shape[i].x;
    dna_to[gene_index].shape[i].y = dna_from[gene_index].shape[i].y;
  }
}

function copyDNA(dna_from, dna_to) {
  for(var i=0;i<MAX_SHAPES;i++)
    pass_gene_mutation(dna_from, dna_to, i);
}

function evolve() {
  mutateDNA(DNA_TEST);
  drawDNA(CONTEXT_TEST, DNA_TEST);

  FITNESS_TEST = compute_fitness(DNA_TEST);

  if(FITNESS_TEST<FITNESS_BEST) {
    pass_gene_mutation(DNA_TEST, DNA_BEST, CHANGED_SHAPE_INDEX);

    FITNESS_BEST = FITNESS_TEST;
    FITNESS_BEST_NORMALIZED = 100*(1-FITNESS_BEST/NORM_COEF);
    EL_FITNESS.innerHTML = FITNESS_BEST_NORMALIZED.toFixed(2)+"%";

    drawDNA(CONTEXT_BEST, DNA_BEST);
  }
  else {
    pass_gene_mutation(DNA_BEST, DNA_TEST, CHANGED_SHAPE_INDEX);
  }

  COUNTER_TOTAL++;

  if(COUNTER_TOTAL%10==0) {
    var passed = get_timestamp() - LAST_START;
    EL_ELAPSED_TIME.innerHTML = render_nice_time(ELAPSED_TIME+passed);
  }
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function init_dna(dna) {
  for(var i=0;i<MAX_SHAPES;i++) {
    var points = new Array(MAX_POINTS);
    for(var j=0;j<MAX_POINTS;j++) {
      points[j] = {'x':rand_int(IWIDTH),'y':rand_int(IHEIGHT)};
    }
    var color = {};
    if(INIT_TYPE=="random")
      color = {'r':rand_int(255),'g':rand_int(255),'b':rand_int(255),'a':0.001};
    else
      color = {'r':INIT_R,'g':INIT_G,'b':INIT_B,'a':INIT_A};
    var shape = {
    'color':color,
    'shape':points
    }
    dna[i] = shape;
  }
}

function init_canvas() {
  CANVAS_INPUT = document.getElementById('canvas_input');
  CONTEXT_INPUT = CANVAS_INPUT.getContext('2d');

  CANVAS_TEST = document.getElementById('canvas_test');
  CONTEXT_TEST = CANVAS_TEST.getContext('2d');

  CANVAS_BEST = document.getElementById('canvas_best');
  CONTEXT_BEST = CANVAS_BEST.getContext('2d');

  IWIDTH = IMAGE.width;
  IHEIGHT = IMAGE.height;

  SUBPIXELS = IWIDTH*IHEIGHT*DEPTH;
  NORM_COEF = IWIDTH*IHEIGHT*3*255;

  CANVAS_INPUT.setAttribute('width',IWIDTH);
  CANVAS_INPUT.setAttribute('height',IHEIGHT);

  CANVAS_TEST.setAttribute('width',IWIDTH);
  CANVAS_TEST.setAttribute('height',IHEIGHT);

  CANVAS_BEST.setAttribute('width',IWIDTH);
  CANVAS_BEST.setAttribute('height',IHEIGHT);

  // draw the image onto the canvas
  CONTEXT_INPUT.drawImage(IMAGE, 0, 0, IWIDTH, IHEIGHT);

  DATA_INPUT = CONTEXT_INPUT.getImageData(0, 0, IWIDTH, IHEIGHT).data;

  EL_FITNESS = document.getElementById("fitness");
  EL_ELAPSED_TIME = document.getElementById("time");

  init_dna(DNA_TEST);
  init_dna(DNA_BEST);
  copyDNA(DNA_BEST, DNA_TEST);

  redrawDNA();
}

function init() {
  IMAGE.onload = function() {
    if(IMAGE.complete) {
      init_canvas();
    }
    else {
      setTimeout(init_canvas, 100);
    }
  }
  IMAGE.src = IMG_INIT;

  document.getElementById("start").onclick = start;
  document.getElementById("stop").onclick = stop;
}

window.onload = init;