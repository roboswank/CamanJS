// NodeJS compatibility
var Caman, Canvas, Fiber, Image, fs, http,
	hasProp = {}.hasOwnProperty,
	boundMethodCheck = function(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new Error('Bound instance method accessed before binding'); } };

if (typeof exports !== "undefined" && exports !== null) {
	Canvas = require('canvas');
	Image = Canvas.Image;
	Fiber = require('fibers');
	fs = require('fs');
	http = require('http');
}

const Module = require('./module');
const Util = require('./util');

// Here it begins. Caman is defined.
// There are many different initialization for Caman, which are described on the 
// [Guides](http://camanjs.com/guides).

// Initialization is tricky because we need to make sure everything we need is actually fully 
// loaded in the DOM before proceeding. When initialized on an image, we need to make sure that the 
// image is done loading before converting it to a canvas element and writing the pixel data. If we 
// do this prematurely, the browser will throw a DOM Error, and chaos will ensue. In the event that 
// we initialize Caman on a canvas element while specifying an image URL, we need to create a new 
// image element, load the image, then continue with initialization.

// The main goal for Caman was simplicity, so all of this is handled transparently to the end-user. 
class Caman extends Module {
	// Custom toString()
	// @return [String] Version and release information.
	static toString() {
		return "Version " + Caman.version.release + ", Released " + Caman.version.date;
	}

	static getAttrId(canvas) {
		if (Caman.NodeJS) {
			return true;
		}
		if (typeof canvas === "string") {
			canvas = $(canvas);
		}
		if (!((canvas != null) && (canvas.getAttribute != null))) {
			return null;
		}
		return canvas.getAttribute('data-caman-id');
	}

	// The Caman function. While technically a constructor, it was made to be called without
	// the `new` keyword. Caman will figure it out.

	// @param [DOMObject, String] initializer The DOM selector or DOM object to initialize.
	// @overload Caman(initializer)
	//	 Initialize Caman without a callback.

	// @overload Caman(initializer, callback)
	//	 Initialize Caman with a callback.
	//	 @param [Function] callback Function to call once initialization completes.

	// @overload Caman(initializer, url)
	//	 Initialize Caman with a URL to an image and no callback.
	//	 @param [String] url URl to an image to draw to the canvas.

	// @overload Caman(initializer, url, callback)
	//	 Initialize Caman with a canvas, URL to an image, and a callback.
	//	 @param [String] url URl to an image to draw to the canvas.
	//	 @param [Function] callback Function to call once initialization completes.

	// @overload Caman(file)
	//	 **NodeJS**: Initialize Caman with a path to an image file and no callback.
	//	 @param [String, File] file File object or path to image to read.

	// @overload Caman(file, callback)
	//	 **NodeJS**: Initialize Caman with a file and a callback.
	//	 @param [String, File] file File object or path to image to read.
	//	 @param [Function] callback Function to call once initialization completes.

	// @return [Caman] Initialized Caman instance.
	constructor() {
		var args, callback, id;
		if (arguments.length === 0) {
			throw "Invalid arguments";
		}
		super();
		this.nodeFileReady = this.nodeFileReady.bind(this);
		if (this instanceof Caman) {
			// We have to do this to avoid polluting the global scope
			// because of how Coffeescript binds functions specified 
			// with => and the fact that Caman can be invoked as both
			// a function and as a 'new' object.
			this.finishInit = this.finishInit.bind(this);
			this.imageLoaded = this.imageLoaded.bind(this);
			args = arguments[0];
			if (!Caman.NodeJS) {
				id = parseInt(Caman.getAttrId(args[0]), 10);
				callback = typeof args[1] === "function" ? args[1] : typeof args[2] === "function" ? args[2] : function() {};
				if (!isNaN(id) && Store.has(id)) {
					return Store.execute(id, callback);
				}
			}
			// Every instance gets a unique ID. Makes it much simpler to check if two variables are the 
			// same instance.
			this.id = Util.uniqid.get();
			this.initializedPixelData = this.originalPixelData = null;
			this.cropCoordinates = {
				x: 0,
				y: 0
			};
			this.cropped = false;
			this.resized = false;
			this.pixelStack = []; // Stores the pixel layers
			this.layerStack = []; // Stores all of the layers waiting to be rendered
			this.canvasQueue = []; // Stores all of the canvases to be processed
			this.currentLayer = null;
			this.scaled = false;
			this.analyze = new Analyze(this);
			this.renderer = new Renderer(this);
			this.domIsLoaded(() => {
				this.parseArguments(args);
				return this.setup();
			});
			return this;
		} else {
			return new Caman(arguments);
		}
	}

	// Checks to ensure the DOM is loaded. Ensures the callback is always fired, even
	// if the DOM is already loaded before it's invoked. The callback is also always
	// called asynchronously.

	// @param [Function] cb The callback function to fire when the DOM is ready.
	domIsLoaded(cb) {
		var listener;
		if (Caman.NodeJS) {
			return setTimeout(() => {
				return cb.call(this);
			}, 0);
		} else {
			if (document.readyState === "complete") {
				Log.debug("DOM initialized");
				return setTimeout(() => {
					return cb.call(this);
				}, 0);
			} else {
				listener = () => {
					if (document.readyState === "complete") {
						Log.debug("DOM initialized");
						return cb.call(this);
					}
				};
				return document.addEventListener("readystatechange", listener, false);
			}
		}
	}

	// Parses the arguments given to the Caman function, and sets the appropriate
	// properties on this instance.

	// @params [Array] args Array of arguments passed to Caman.
	parseArguments(args) {
		var key, ref, results, val;
		if (args.length === 0) {
			throw "Invalid arguments given";
		}
		// Defaults
		this.initObj = null;
		this.initType = null;
		this.imageUrl = null;
		this.callback = function() {};
		// First argument is always our canvas/image
		this.setInitObject(args[0]);
		if (args.length === 1) {
			return;
		}
		switch (typeof args[1]) {
			case "string":
				this.imageUrl = args[1];
				break;
			case "function":
				this.callback = args[1];
		}
		if (args.length === 2) {
			return;
		}
		this.callback = args[2];
		if (args.length === 4) {
			ref = args[4];
			results = [];
			for (key in ref) {
				if (!hasProp.call(ref, key)) continue;
				val = ref[key];
				results.push(this.options[key] = val);
			}
			return results;
		}
	}

	// Sets the initialization object for this instance.

	// @param [Object, String] obj The initialization argument.
	setInitObject(obj) {
		if (Caman.NodeJS) {
			this.initObj = obj;
			this.initType = 'node';
			return;
		}
		if (typeof obj === "object") {
			this.initObj = obj;
		} else {
			this.initObj = $(obj);
		}
		if (this.initObj == null) {
			throw "Could not find image or canvas for initialization.";
		}
		return this.initType = this.initObj.nodeName.toLowerCase();
	}

	// Begins the setup process, which differs depending on whether we're in NodeJS,
	// or if an image or canvas object was provided.
	setup() {
		switch (this.initType) {
			case "node":
				return this.initNode();
			case "img":
				return this.initImage();
			case "canvas":
				return this.initCanvas();
		}
	}

	// Initialization function for NodeJS.
	initNode() {
		Log.debug("Initializing for NodeJS");
		if (typeof this.initObj === "string" && this.initObj.match(/^https?:\/\//)) {
			return this.readFromHttp(this.initObj, this.nodeFileReady);
		} else if (typeof this.initObj === "string") {
			return fs.readFile(this.initObj, this.nodeFileReady);
		} else {
			return this.nodeFileReady(null, this.initObj);
		}
	}

	readFromHttp(url, callback) {
		var req;
		Log.debug(`Fetching image from ${url}`);
		req = http.get(url, function(res) {
			var buf;
			buf = '';
			res.setEncoding('binary');
			res.on('data', function(chunk) {
				return buf += chunk;
			});
			return res.on('end', function() {
				return callback(null, new Buffer(buf, 'binary'));
			});
		});
		return req.on('error', callback);
	}

	nodeFileReady(err, data) {
		boundMethodCheck(this, Caman);
		if (err) {
			throw err;
		}
		this.image = new Image();
		this.image.src = data;
		Log.debug(`Image loaded. Width = ${this.imageWidth()}, Height = ${this.imageHeight()}`);
		this.canvas = new Canvas(this.imageWidth(), this.imageHeight());
		return this.finishInit();
	}

	// Initialization function for the browser and image objects.
	initImage() {
		this.image = this.initObj;
		this.canvas = document.createElement('canvas');
		this.context = this.canvas.getContext('2d');
		Util.copyAttributes(this.image, this.canvas, {
			except: ['src']
		});
		if (this.image.parentNode != null) {
			// Swap out the image with the canvas element if the image exists
			// in the DOM.
			this.image.parentNode.replaceChild(this.canvas, this.image);
		}
		this.imageAdjustments();
		return this.waitForImageLoaded();
	}

	// Initialization function for the browser and canvas objects.
	initCanvas() {
		this.canvas = this.initObj;
		this.context = this.canvas.getContext('2d');
		if (this.imageUrl != null) {
			this.image = document.createElement('img');
			this.image.src = this.imageUrl;
			this.imageAdjustments();
			return this.waitForImageLoaded();
		} else {
			return this.finishInit();
		}
	}

	// Automatically check for a HiDPI capable screen and swap out the image if possible.
	// Also checks the image URL to see if it's a cross-domain request, and attempt to
	// proxy the image. If a cross-origin type is configured, the proxy will be ignored.
	imageAdjustments() {
		if (this.needsHiDPISwap()) {
			Log.debug(this.image.src, "->", this.hiDPIReplacement());
			this.swapped = true;
			this.image.src = this.hiDPIReplacement();
		}
		if (IO.isRemote(this.image)) {
			this.image.src = IO.proxyUrl(this.image.src);
			return Log.debug(`Remote image detected, using URL = ${this.image.src}`);
		}
	}

	// Utility function that fires {Caman#imageLoaded} once the image is finished loading.
	waitForImageLoaded() {
		if (this.isImageLoaded()) {
			return this.imageLoaded();
		} else {
			return this.image.onload = this.imageLoaded;
		}
	}

	// Checks if the given image is finished loading.
	// @return [Boolean] Is the image loaded?
	isImageLoaded() {
		if (!this.image.complete) {
			return false;
		}
		if ((this.image.naturalWidth != null) && this.image.naturalWidth === 0) {
			// Internet Explorer is weird.
			return false;
		}
		return true;
	}

	// Internet Explorer has issues figuring out image dimensions when they aren't
	// explicitly defined, apparently. We check the normal width/height properties first,
	// but fall back to natural sizes if they are 0.
	// @return [Number] Width of the initialization image.
	imageWidth() {
		return this.image.width || this.image.naturalWidth;
	}

	// @see Caman#imageWidth
	// @return [Number] Height of the initialization image.
	imageHeight() {
		return this.image.height || this.image.naturalHeight;
	}

	// Function that is called once the initialization image is finished loading.
	// We make sure that the canvas dimensions are properly set here.
	imageLoaded() {
		Log.debug(`Image loaded. Width = ${this.imageWidth()}, Height = ${this.imageHeight()}`);
		if (this.swapped) {
			this.canvas.width = this.imageWidth() / this.hiDPIRatio();
			this.canvas.height = this.imageHeight() / this.hiDPIRatio();
		} else {
			this.canvas.width = this.imageWidth();
			this.canvas.height = this.imageHeight();
		}
		return this.finishInit();
	}

	// Final step of initialization. We finish setting up our canvas element, and we
	// draw the image to the canvas (if applicable).
	finishInit() {
		var i, j, len, pixel, ref;
		if (this.context == null) {
			this.context = this.canvas.getContext('2d');
		}
		this.originalWidth = this.preScaledWidth = this.width = this.canvas.width;
		this.originalHeight = this.preScaledHeight = this.height = this.canvas.height;
		this.hiDPIAdjustments();
		if (!this.hasId()) {
			this.assignId();
		}
		if (this.image != null) {
			this.context.drawImage(this.image, 0, 0, this.imageWidth(), this.imageHeight(), 0, 0, this.preScaledWidth, this.preScaledHeight);
		}
		this.imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
		this.pixelData = this.imageData.data;
		if (Caman.allowRevert) {
			this.initializedPixelData = Util.dataArray(this.pixelData.length);
			this.originalPixelData = Util.dataArray(this.pixelData.length);
			ref = this.pixelData;
			for (i = j = 0, len = ref.length; j < len; i = ++j) {
				pixel = ref[i];
				this.initializedPixelData[i] = pixel;
				this.originalPixelData[i] = pixel;
			}
		}
		this.dimensions = {
			width: this.canvas.width,
			height: this.canvas.height
		};
		if (!Caman.NodeJS) {
			Store.put(this.id, this);
		}
		this.callback.call(this, this);
		// Reset the callback so re-initialization doesn't
		// trigger it again.
		return this.callback = function() {};
	}

	// If you have a separate context reference to this canvas outside of CamanJS
	// and you make a change to the canvas outside of CamanJS, you will have to call
	// this function to update our context reference to include those changes.
	reloadCanvasData() {
		this.imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
		return this.pixelData = this.imageData.data;
	}

	// Reset the canvas pixels to the original state at initialization.
	resetOriginalPixelData() {
		var i, j, len, pixel, ref, results;
		if (!Caman.allowRevert) {
			throw "Revert disabled";
		}
		this.originalPixelData = Util.dataArray(this.pixelData.length);
		ref = this.pixelData;
		results = [];
		for (i = j = 0, len = ref.length; j < len; i = ++j) {
			pixel = ref[i];
			results.push(this.originalPixelData[i] = pixel);
		}
		return results;
	}

	// Does this instance have an ID assigned?
	// @return [Boolean] Existance of an ID.
	hasId() {
		return Caman.getAttrId(this.canvas) != null;
	}

	// Assign a unique ID to this instance.
	assignId() {
		if (Caman.NodeJS || this.canvas.getAttribute('data-caman-id')) {
			return;
		}
		return this.canvas.setAttribute('data-caman-id', this.id);
	}

	// Is HiDPI support disabled via the HTML data attribute?
	// @return [Boolean]
	hiDPIDisabled() {
		return this.canvas.getAttribute('data-caman-hidpi-disabled') !== null;
	}

	// Perform HiDPI adjustments to the canvas. This consists of changing the
	// scaling and the dimensions to match that of the display.
	hiDPIAdjustments() {
		var ratio;
		if (Caman.NodeJS || !this.needsHiDPISwap()) {
			return;
		}
		ratio = this.hiDPIRatio();
		if (ratio !== 1) {
			Log.debug(`HiDPI ratio = ${ratio}`);
			this.scaled = true;
			this.preScaledWidth = this.canvas.width;
			this.preScaledHeight = this.canvas.height;
			this.canvas.width = this.preScaledWidth * ratio;
			this.canvas.height = this.preScaledHeight * ratio;
			this.canvas.style.width = `${this.preScaledWidth}px`;
			this.canvas.style.height = `${this.preScaledHeight}px`;
			this.context.scale(ratio, ratio);
			this.width = this.originalWidth = this.canvas.width;
			return this.height = this.originalHeight = this.canvas.height;
		}
	}

	// Calculate the HiDPI ratio of this display based on the backing store
	// and the pixel ratio.
	// @return [Number] The HiDPI pixel ratio.
	hiDPIRatio() {
		var backingStoreRatio, devicePixelRatio;
		devicePixelRatio = window.devicePixelRatio || 1;
		backingStoreRatio = this.context.webkitBackingStorePixelRatio || this.context.mozBackingStorePixelRatio || this.context.msBackingStorePixelRatio || this.context.oBackingStorePixelRatio || this.context.backingStorePixelRatio || 1;
		return devicePixelRatio / backingStoreRatio;
	}

	// Is this display HiDPI capable?
	// @return [Boolean]
	hiDPICapable() {
		return (window.devicePixelRatio != null) && window.devicePixelRatio !== 1;
	}

	// Do we need to perform an image swap with a HiDPI image?
	// @return [Boolean]
	needsHiDPISwap() {
		if (this.hiDPIDisabled() || !this.hiDPICapable()) {
			return false;
		}
		return this.hiDPIReplacement() !== null;
	}

	// Gets the HiDPI replacement for the initialization image.
	// @return [String] URL to the HiDPI version.
	hiDPIReplacement() {
		if (this.image == null) {
			return null;
		}
		return this.image.getAttribute('data-caman-hidpi');
	}

	// Replaces the current canvas with a new one, and properly updates all of the
	// applicable references for this instance.

	// @param [DOMObject] newCanvas The canvas to swap into this instance.
	replaceCanvas(newCanvas) {
		var oldCanvas;
		oldCanvas = this.canvas;
		this.canvas = newCanvas;
		this.context = this.canvas.getContext('2d');
		if (!Caman.NodeJS) {
			oldCanvas.parentNode.replaceChild(this.canvas, oldCanvas);
		}
		this.width = this.canvas.width;
		this.height = this.canvas.height;
		this.reloadCanvasData();
		return this.dimensions = {
			width: this.canvas.width,
			height: this.canvas.height
		};
	}

	// Begins the rendering process. This will execute all of the filter functions
	// called either since initialization or the previous render.

	// @param [Function] callback Function to call when rendering is finished.
	render(callback = function() {}) {
		Event.trigger(this, "renderStart");
		return this.renderer.execute(() => {
			this.context.putImageData(this.imageData, 0, 0);
			return callback.call(this);
		});
	}

	// Reverts the canvas back to it's original state while
	// maintaining any cropped or resized dimensions.

	// @param [Boolean] updateContext Should we apply the reverted pixel data to the
	//	 canvas context thus triggering a re-render by the browser?
	revert(updateContext = true) {
		var i, j, len, pixel, ref;
		if (!Caman.allowRevert) {
			throw "Revert disabled";
		}
		ref = this.originalVisiblePixels();
		for (i = j = 0, len = ref.length; j < len; i = ++j) {
			pixel = ref[i];
			this.pixelData[i] = pixel;
		}
		if (updateContext) {
			return this.context.putImageData(this.imageData, 0, 0);
		}
	}

	// Completely resets the canvas back to it's original state.
	// Any size adjustments will also be reset.
	reset() {
		var canvas, ctx, i, imageData, j, len, pixel, pixelData, ref;
		canvas = document.createElement('canvas');
		Util.copyAttributes(this.canvas, canvas);
		canvas.width = this.originalWidth;
		canvas.height = this.originalHeight;
		ctx = canvas.getContext('2d');
		imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		pixelData = imageData.data;
		ref = this.initializedPixelData;
		for (i = j = 0, len = ref.length; j < len; i = ++j) {
			pixel = ref[i];
			pixelData[i] = pixel;
		}
		ctx.putImageData(imageData, 0, 0);
		this.cropCoordinates = {
			x: 0,
			y: 0
		};
		this.resized = false;
		return this.replaceCanvas(canvas);
	}

	// Returns the original pixel data while maintaining any
	// cropping or resizing that may have occured.
	// **Warning**: this is currently in beta status.

	// @return [Array] Original pixel values still visible after cropping or resizing.
	originalVisiblePixels() {
		var canvas, coord, ctx, endX, endY, i, imageData, j, k, len, pixel, pixelData, pixels, ref, ref1, ref2, ref3, scaledCanvas, startX, startY, width;
		if (!Caman.allowRevert) {
			throw "Revert disabled";
		}
		pixels = [];
		startX = this.cropCoordinates.x;
		endX = startX + this.width;
		startY = this.cropCoordinates.y;
		endY = startY + this.height;
		if (this.resized) {
			canvas = document.createElement('canvas');
			canvas.width = this.originalWidth;
			canvas.height = this.originalHeight;
			ctx = canvas.getContext('2d');
			imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			pixelData = imageData.data;
			ref = this.originalPixelData;
			for (i = j = 0, len = ref.length; j < len; i = ++j) {
				pixel = ref[i];
				pixelData[i] = pixel;
			}
			ctx.putImageData(imageData, 0, 0);
			scaledCanvas = document.createElement('canvas');
			scaledCanvas.width = this.width;
			scaledCanvas.height = this.height;
			ctx = scaledCanvas.getContext('2d');
			ctx.drawImage(canvas, 0, 0, this.originalWidth, this.originalHeight, 0, 0, this.width, this.height);
			pixelData = ctx.getImageData(0, 0, this.width, this.height).data;
			width = this.width;
		} else {
			pixelData = this.originalPixelData;
			width = this.originalWidth;
		}
		for (i = k = 0, ref1 = pixelData.length; 4 !== 0 && (0 <= ref1 ? 0 <= k && k < ref1 : 0 >= k && k > ref1); i = k += 4) {
			coord = Pixel.locationToCoordinates(i, width);
			if (((startX <= (ref2 = coord.x) && ref2 < endX)) && ((startY <= (ref3 = coord.y) && ref3 < endY))) {
				pixels.push(pixelData[i], pixelData[i + 1], pixelData[i + 2], pixelData[i + 3]);
			}
		}
		return pixels;
	}

	// Pushes the filter callback that modifies the RGBA object into the
	// render queue.

	// @param [String] name Name of the filter function.
	// @param [Function] processFn The Filter function.
	// @return [Caman]
	process(name, processFn) {
		this.renderer.add({
			type: Filter.Type.Single,
			name: name,
			processFn: processFn
		});
		return this;
	}

	// Pushes the kernel into the render queue.

	// @param [String] name The name of the kernel.
	// @param [Array] adjust The convolution kernel represented as a 1D array.
	// @param [Number] divisor The divisor for the convolution.
	// @param [Number] bias The bias for the convolution.
	// @return [Caman]
	processKernel(name, adjust, divisor = null, bias = 0) {
		var i, j, ref;
		if (divisor == null) {
			divisor = 0;
			for (i = j = 0, ref = adjust.length; undefined !== 0 && (0 <= ref ? 0 <= j && j < ref : 0 >= j && j > ref); i = 0 <= ref ? ++j : --j) {
				divisor += adjust[i];
			}
		}
		this.renderer.add({
			type: Filter.Type.Kernel,
			name: name,
			adjust: adjust,
			divisor: divisor,
			bias: bias
		});
		return this;
	}

	// Adds a standalone plugin into the render queue.

	// @param [String] plugin Name of the plugin.
	// @param [Array] args Array of arguments to pass to the plugin.
	// @return [Caman]
	processPlugin(plugin, args) {
		this.renderer.add({
			type: Filter.Type.Plugin,
			plugin: plugin,
			args: args
		});
		return this;
	}

	// Pushes a new layer operation into the render queue and calls the layer
	// callback.

	// @param [Function] callback Function that is executed within the context of the layer.
	//	 All filter and adjustment functions for the layer will be executed inside of this function.
	// @return [Caman]
	newLayer(callback) {
		var layer;
		layer = new Layer(this);
		this.canvasQueue.push(layer);
		this.renderer.add({
			type: Filter.Type.LayerDequeue
		});
		callback.call(layer);
		this.renderer.add({
			type: Filter.Type.LayerFinished
		});
		return this;
	}

	// Pushes the layer context and moves to the next operation.
	// @param [Layer] layer The layer to execute.
	executeLayer(layer) {
		return this.pushContext(layer);
	}

	// Set all of the relevant data to the new layer.
	// @param [Layer] layer The layer whose context we want to switch to.
	pushContext(layer) {
		this.layerStack.push(this.currentLayer);
		this.pixelStack.push(this.pixelData);
		this.currentLayer = layer;
		return this.pixelData = layer.pixelData;
	}

	// Restore the previous layer context.
	popContext() {
		this.pixelData = this.pixelStack.pop();
		return this.currentLayer = this.layerStack.pop();
	}

	// Applies the current layer to its parent layer.
	applyCurrentLayer() {
		return this.currentLayer.applyToParent();
	}

};

// The current version.
Caman.version = {
	release: "4.1.2",
	date: "7/27/2013"
};

// @property [Boolean] Debug mode enables console logging.
Caman.DEBUG = false;

// @property [Boolean] Allow reverting the canvas?
//	 If your JS process is running out of memory, disabling
//	 this could help drastically.
Caman.allowRevert = true;

// @property [String] Default cross-origin policy.
Caman.crossOrigin = "anonymous";

// @property [String] Set the URL of the image proxy script.
Caman.remoteProxy = "";

// @proparty [String] The GET param used with the proxy script.
Caman.proxyParam = "camanProxyUrl";

// @property [Boolean] Are we in a NodeJS environment?
Caman.NodeJS = typeof exports !== "undefined" && exports !== null;

// @property [Boolean] Should we check the DOM for images with Caman instructions?
Caman.autoload = !Caman.NodeJS;

require('./logger')( Caman );

const Blender = require('./blender')( Caman );
const Filter = require('./filter')( Caman );

require('./analyze')( Caman );
require('./autoload')( Caman );
require('./calculate')( Caman );
require('./convert')( Caman );
require('./event')( Caman );
require('./io')( Caman );
require('./layer')( Caman );
require('./pixel')( Caman );
require('./plugin')( Caman );
require('./renderer')( Caman );
require('./store')( Caman );

require('../lib/blenders')( Blender );
require('../lib/filters')( Filter );
require('../lib/size')( Caman );

module.exports = Caman;