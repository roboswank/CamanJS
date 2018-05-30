// Represents a single Pixel in an image.
class Pixel {
	static coordinatesToLocation(x, y, width) {
		return (y * width + x) * 4;
	}

	static locationToCoordinates(loc, width) {
		var x, y;
		y = Math.floor(loc / (width * 4));
		x = (loc % (width * 4)) / 4;
		return {
			x: x,
			y: y
		};
	}

	constructor(r = 0, g = 0, b = 0, a = 255, c1 = null) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
		this.c = c1;
		this.loc = 0;
	}

	setContext(c) {
		return this.c = c;
	}

	// Retrieves the X, Y location of the current pixel. The origin is at the bottom left corner of 
	// the image, like a normal coordinate system.
	locationXY() {
		var x, y;
		if (this.c == null) {
			throw "Requires a CamanJS context";
		}
		y = this.c.dimensions.height - Math.floor(this.loc / (this.c.dimensions.width * 4));
		x = (this.loc % (this.c.dimensions.width * 4)) / 4;
		return {
			x: x,
			y: y
		};
	}

	pixelAtLocation(loc) {
		if (this.c == null) {
			throw "Requires a CamanJS context";
		}
		return new Pixel(this.c.pixelData[loc], this.c.pixelData[loc + 1], this.c.pixelData[loc + 2], this.c.pixelData[loc + 3], this.c);
	}

	// Returns an RGBA object for a pixel whose location is specified in relation to the current 
	// pixel.
	getPixelRelative(horiz, vert) {
		var newLoc;
		if (this.c == null) {
			throw "Requires a CamanJS context";
		}
		// We invert the vert_offset in order to make the coordinate system non-inverted. In laymans
		// terms: -1 means down and +1 means up.
		newLoc = this.loc + (this.c.dimensions.width * 4 * (vert * -1)) + (4 * horiz);
		if (newLoc > this.c.pixelData.length || newLoc < 0) {
			return new Pixel(0, 0, 0, 255, this.c);
		}
		return this.pixelAtLocation(newLoc);
	}

	// The counterpart to getPixelRelative, this updates the value of a pixel whose location is 
	// specified in relation to the current pixel.
	putPixelRelative(horiz, vert, rgba) {
		var nowLoc;
		if (this.c == null) {
			throw "Requires a CamanJS context";
		}
		nowLoc = this.loc + (this.c.dimensions.width * 4 * (vert * -1)) + (4 * horiz);
		if (newLoc > this.c.pixelData.length || newLoc < 0) {
			return;
		}
		this.c.pixelData[newLoc] = rgba.r;
		this.c.pixelData[newLoc + 1] = rgba.g;
		this.c.pixelData[newLoc + 2] = rgba.b;
		this.c.pixelData[newLoc + 3] = rgba.a;
		return true;
	}

	// Gets an RGBA object for an arbitrary pixel in the canvas specified by absolute X, Y coordinates
	getPixel(x, y) {
		var loc;
		if (this.c == null) {
			throw "Requires a CamanJS context";
		}
		loc = this.coordinatesToLocation(x, y, this.width);
		return this.pixelAtLocation(loc);
	}

	// Updates the pixel at the given X, Y coordinate
	putPixel(x, y, rgba) {
		var loc;
		if (this.c == null) {
			throw "Requires a CamanJS context";
		}
		loc = this.coordinatesToLocation(x, y, this.width);
		this.c.pixelData[loc] = rgba.r;
		this.c.pixelData[loc + 1] = rgba.g;
		this.c.pixelData[loc + 2] = rgba.b;
		return this.c.pixelData[loc + 3] = rgba.a;
	}

	toString() {
		return this.toKey();
	}

	toHex(includeAlpha = false) {
		var hex;
		hex = '#' + this.r.toString(16) + this.g.toString(16) + this.b.toString(16);
		if (includeAlpha) {
			return hex + this.a.toString(16);
		} else {
			return hex;
		}
	}
};

module.exports = ( Caman ) => {
	Caman.Pixel = Pixel;
	return Pixel;
};