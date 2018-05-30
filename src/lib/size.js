// Allows us to crop the canvas and produce a new smaller
// canvas.
module.exports = ( Caman ) => {
	Caman.Plugin.register("crop", function(width, height, x = 0, y = 0) {
		var canvas, ctx;
		// Create our new canvas element
		if (typeof exports !== "undefined" && exports !== null) {
			canvas = new Canvas(width, height);
		} else {
			canvas = document.createElement('canvas');
			Util.copyAttributes(this.canvas, canvas);
			canvas.width = width;
			canvas.height = height;
		}
		ctx = canvas.getContext('2d');
		// Perform the cropping by drawing to the new canvas
		ctx.drawImage(this.canvas, x, y, width, height, 0, 0, width, height);
		this.cropCoordinates = {
			x: x,
			y: y
		};
		// Update all of the references
		this.cropped = true;
		return this.replaceCanvas(canvas);
	});

	// Resize the canvas and the image to a new size
	Caman.Plugin.register("resize", function(newDims = null) {
		var canvas, ctx;
		// Calculate new size
		if (newDims === null || ((newDims.width == null) && (newDims.height == null))) {
			Log.error("Invalid or missing dimensions given for resize");
			return;
		}
		if (newDims.width == null) {
			// Calculate width
			newDims.width = this.canvas.width * newDims.height / this.canvas.height;
		} else if (newDims.height == null) {
			// Calculate height
			newDims.height = this.canvas.height * newDims.width / this.canvas.width;
		}
		if (typeof exports !== "undefined" && exports !== null) {
			canvas = new Canvas(newDims.width, newDims.height);
		} else {
			canvas = document.createElement('canvas');
			Util.copyAttributes(this.canvas, canvas);
			canvas.width = newDims.width;
			canvas.height = newDims.height;
		}
		ctx = canvas.getContext('2d');
		ctx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, newDims.width, newDims.height);
		this.resized = true;
		return this.replaceCanvas(canvas);
	});

	Caman.Filter.register("crop", function() {
		return this.processPlugin("crop", Array.prototype.slice.call(arguments, 0));
	});

	Caman.Filter.register("resize", function() {
		return this.processPlugin("resize", Array.prototype.slice.call(arguments, 0));
	});
};