/* SCREEN *
A simple container for basic screen related functions
*/
function Screen() {
	this.canvas = null;
	this.context = null;
	this.width = 0;
	this.height = 0;
	this.clearColor = "16, 16, 24";
	this.clearAlpha = 1.0;
}

Screen.prototype.init = function(id, width, height) {
	this.canvas = document.getElementById(id);
	if (this.canvas != null) {
		this.context = this.canvas.getContext('2d');
		this.canvas.width = width;
		this.canvas.height = height;
		this.width = width;
		this.height = height;
	} else {
		alert("canvas with id \'" + id + "\' could not be found");
	}
}

Screen.prototype.clear = function() {
	if (this.context != null) {
		this.context.fillStyle = "rgba(" + this.clearColor + ", " + this.clearAlpha + ")";
		this.context.fillRect(0, 0, this.width, this.height);
	}
}


/* NEAREST NEIGHBOUR IMAGE SCALING *
based on the following code. just 500x slower ;)
http://tech-algorithm.com/articles/nearest-neighbor-image-scaling/
optionally lightens each pixel by a certain amount
*/
function nearestNeighbour(pix1, pix2, w1, h1, w2, h2, lighten) {
	lighten = lighten || 0;
	var ratioX, ratioY, x, y, i1, i2;
	xRatio = w1 / w2;
	yRatio = h1 / h2;
	
	for (x = 0; x < w2; x++) {
		for (y = 0; y < h2; y++) {
			i2 = 4 * (y * w2 + x);
			i1 = 4 * (Math.floor(y * yRatio) * w1 + Math.floor(x * xRatio));
		
			pix2[i2] = clampValue(pix1[i1] + lighten, 0, 255);
			pix2[i2 + 1] = clampValue(pix1[i1 + 1] + lighten, 0, 255);
			pix2[i2 + 2] = clampValue(pix1[i1 + 2] + lighten, 0, 255);
			pix2[i2 + 3] = 255;
		}
	}
}

function clampValue(val, min, max) {
	if (val < min) {
		val = min;
	} else if (val > max) {
		val = max;
	}
	return val;
}


/* MOUSE *
simple container for mouse input
*/
function Mouse() {
	this.x = 0;
	this.y = 0;
}


/* MAGNIFYING GLASS *
magnifying glass object that samples image data from the canvas and
blows it up to the current zoom level.
*/
function MagnifyingGlass(width, zoom) {
	this.width = width || 96;
	this.zoom = zoom || 3;
}

MagnifyingGlass.prototype.draw = function(canvas, cx, cy) {
	var zw = Math.floor(this.width / this.zoom); //zoomed width
	var hzw = Math.floor(0.5 * this.width / this.zoom); //half zoomed width

	var ctx = canvas.getContext('2d');
	
	var small = ctx.getImageData(cx - hzw, cy - hzw, zw, zw); //take small square around cursor
	var large = ctx.createImageData(this.width, this.width); //scale into this one
	
	nearestNeighbour(small.data, large.data, zw, zw, this.width, this.width, 24);
	
	//draw to canvas
	ctx.putImageData(large, cx - this.width * 0.5, cy - this.width * 0.5);
}


/* CONWAY'S GAME OF LIFE *
Cell adjacency is tested by looking at cells that are vertically, horizontally
or diagonally adjacent.
1. any living cell with less than 2 live neighbours dies (starvation)
2. any living cell with 2 or 3 neighbours survives
3. any living cell with more than 3 live neighbours dies (overcrowding)
4. any dead cell with exactly 3 neighbours becomes live (reproduction)

TO DO:
* allow editing of the grid whilst the game is running
* create some basic templates that allow placement of glider guns etc.
* speed, pause and step controls
* look out for any further easy optimisations
*/
function Cell() {
	this.alive = (Math.random() < 0.5) ? true : false;
	this.survive = false; //die on next generation
	this.age = 0; //number of generations cell has survived for
}

function LifeGrid(width, height) {
	this.width = width || 32;
	this.height = height || 32;
	this.cells = new Array(this.width * this.height);
	this.neighbourIndices = new Array(8); //array for storing neighbour array indices
	this.generation = 0;
	this.clamp = false;
	
	//variables for detecting stability
	this.cellsChangedLastGeneration = 0;
	this.cellsChangedCurrentGeneration = 0;
	this.stableGenerations = 0;
	
	//initialise cells
	for (var i = 0; i < this.width * this.height; ++i) {
		this.cells[i] = new Cell();
	}
}

LifeGrid.prototype.seed = function(chance) {
	if (chance < 0) { chance = 0; }
	else if (chance > 1) { chance = 1; }
	
	this.generation = 0;
	this.cellsChangedLastGeneration = 0;
	this.cellsChangedCurrentGeneration = 0;
	this.stableGenerations = 0;

	for (var i = 0; i < this.cells.length; ++i) {
		this.cells[i].alive = (Math.random() < chance) ? true : false;
		this.cells[i].survive = false;
	}
}

LifeGrid.prototype.clear = function() {
	for (var i = 0; i < this.cells.length; ++i) {
		this.cells[i].survive = false;
		this.cells[i].alive = false;
		this.cells[i].age = 0;
	}
}

LifeGrid.prototype.draw = function(canvas) {
	var i, x, y, pi; //pi is pixels index
	var ctx = canvas.getContext('2d');
	
	//get canvas pixel data
	var imgData = ctx.getImageData(0, 0, this.width, this.height);
	var pixels = imgData.data;
	
	//write the grid to the pixels
	for (x = 0; x < this.width; ++x) {
		for (y = 0; y < this.height; ++y) {
			i = y * this.width + x;
			if (this.cells[i].alive === true) {
				pi = 4*(y * this.width + x);
				pixels[pi]   = (this.cells[i].age < 8) ? Math.floor(this.cells[i].age / 4 * 255) : 255;
				pixels[pi+1] = 0;
				pixels[pi+2] = 255;
			}
		}
	}
	
	//optionally scale then write data back to canvas
	if (this.width != canvas.width) {
		var imgDataScaled = ctx.createImageData(canvas.width, canvas.height);
		nearestNeighbour(imgData.data, imgDataScaled.data, this.width, this.height, canvas.width, canvas.height);
		ctx.putImageData(imgDataScaled, 0, 0);
	} else {
		ctx.putImageData(imgData, 0, 0);
	}
}

LifeGrid.prototype.update = function() {
	var i, aliveNeighbours;
	this.cellsChangedLastGeneration = this.cellsChangedCurrentGeneration;
	this.cellsChangedCurrentGeneration = 0;

	//update survival of cells
	for (i = 0; i < this.cells.length; ++i) {
		aliveNeighbours = this.getNumAliveNeighbours(i);
		if (aliveNeighbours == 3) {
			this.cells[i].survive = true;
		} else if (aliveNeighbours < 2 || aliveNeighbours > 3) {
			this.cells[i].survive = false;
		}
	}
	
	//set current state of cells
	for (i = 0; i < this.cells.length; ++i) {
		if (this.cells[i].alive != this.cells[i].survive) {
			this.cellsChangedCurrentGeneration += 1;
			this.cells[i].age = 0;
		} else {
			this.cells[i].age += 1;
		}
		this.cells[i].alive = this.cells[i].survive;
	}
	
	if (this.cellsChangedCurrentGeneration == this.cellsChangedLastGeneration) {
		this.stableGenerations += 1;
	} else {
		this.stableGenerations = 0;
	}
	this.generation += 1;
}

LifeGrid.prototype.getNumAliveNeighbours = function(index) {
	var aliveNeighbours = 0;
	
	this.updateNeighbourIndices(index);
	//alert(index + ": " + this.neighbourIndices);

	for (var i = 0; i < 8; ++i) {
		if (this.neighbourIndices[i] > -1 && this.cells[this.neighbourIndices[i]].alive) {
			aliveNeighbours += 1;
		}
	}
	
	return aliveNeighbours;
}

LifeGrid.prototype.updateNeighbourIndices = function(index) {
	var ni = this.neighbourIndices; //for brevity
	var i, x, y, indexFunction; //convert index to x and y positions
	x = index % this.width;
	y = (index - x) / this.width;
	
	if (this.clamp == true) {
		indexFunction =  LifeGrid.prototype.getClampedIndex;
	} else {
		indexFunction =  LifeGrid.prototype.getWrappedIndex;
	}
	
	//if cell is not near an edge, neighbours can simply be shifted
	if(x < 2 || y < 2 || x > this.width - 2 || y > this.width - 2) {
		ni[0] = indexFunction(this, x - 1, y - 1);
		ni[1] = indexFunction(this, x,     y - 1);
		ni[2] = indexFunction(this, x + 1, y - 1);
		ni[3] = indexFunction(this, x - 1, y);
		ni[4] = indexFunction(this, x + 1, y);
		ni[5] = indexFunction(this, x - 1, y + 1);
		ni[6] = indexFunction(this, x,     y + 1);
		ni[7] = indexFunction(this, x + 1, y + 1);
	} else {
		for (i = 0; i < 8; ++i) {
			ni[i] += 1;
		}
	}
}

LifeGrid.prototype.getWrappedIndex = function(obj, x, y) {
	if (x < 0) {
		x = obj.width - 1;
	} else if (x >= obj.width) {
		x = 0;
	}
	if (y < 0) {
		y = obj.height - 1;
	} else if (y >= obj.height) {
		y = 0;
	}
	return obj.width * y + x;
}

LifeGrid.prototype.getClampedIndex = function(obj, x, y) {
	if(x < 0 || y < 0 || x >= obj.width || y >= obj.height) {
		return -1;
	} else {
		return obj.width * y + x;
	}
}


/* PROGRAM GLOBAL VARIABLES *
*/
var g_SCREEN = new Screen();
var g_MOUSE = new Mouse();
var g_LIFEGRID = new LifeGrid(256, 256);
var g_GLASS = new MagnifyingGlass(128, 2);


/* PROGRAM MAIN FUNCTIONS *
*/
function g_update() {
	//reseed if life has become stable
	if (g_LIFEGRID.stableGenerations > 200) {
		g_LIFEGRID.seed(0.25 + Math.random() * 0.75);
	}

	g_LIFEGRID.update();
	
	document.getElementById('debug').innerHTML =
	 "generation: " + g_LIFEGRID.generation +
	 ", cells changed: " + g_LIFEGRID.cellsChangedCurrentGeneration+
	 ", stable period: " + g_LIFEGRID.stableGenerations;
}

function g_draw() {
	/*
	var cx, cy;
	cx = (g_MOUSE.x < 0) ? 0 : g_MOUSE.x;
	if (cx > g_SCREEN.canvas.width) {
		cx = g_SCREEN.canvas.width;
	}
	cy = (g_MOUSE.y < 0) ? 0 : g_MOUSE.y;
	if (cy > g_SCREEN.canvas.height) {
		cy = g_SCREEN.canvas.height;
	}
	*/

	g_SCREEN.clear();
	g_LIFEGRID.draw(g_SCREEN.canvas);
	g_GLASS.draw(g_SCREEN.canvas, g_MOUSE.x, g_MOUSE.y);
}

function g_main() {
	g_update();
	g_draw();
}

function g_init() {
	g_SCREEN.init('canvas', 256, 256);
	g_SCREEN.clear();
	//g_SCREEN.clearAlpha = 0.25;
	setInterval(g_main, 17);
}

g_init();


document.onmousemove = function(e) {
	e = e || window.event;

	if (e.pageX || e.pageY)
	{
		g_MOUSE.x = e.pageX;
		g_MOUSE.y = e.pageY;
	}
	else
	{
		g_MOUSE.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		g_MOUSE.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	}
	
	g_MOUSE.x -= g_SCREEN.canvas.offsetLeft;
	g_MOUSE.y -= g_SCREEN.canvas.offsetTop;
}

document.onkeydown = function(e) {
	switch (e.keyCode) {
	case 32: //space
		g_LIFEGRID.clear();
		break;
	default:
		break;
	}
}
