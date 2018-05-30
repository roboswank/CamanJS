class Analyze {
	constructor(c) {
		this.c = c;
	}

	// Calculates the number of occurances of each color value throughout the image.
	// @return {Object} Hash of RGB channels and the occurance of each value
	calculateLevels() {
		var i, j, k, l, levels, numPixels, ref;
		levels = {
			r: {},
			g: {},
			b: {}
		};
		// Initialize all values to 0 first so there are no data gaps
		for (i = j = 0; j <= 255; i = ++j) {
			levels.r[i] = 0;
			levels.g[i] = 0;
			levels.b[i] = 0;
		}
		// Iterate through each pixel block and increment the level counters
		for (i = k = 0, ref = this.c.pixelData.length; 4 !== 0 && (0 <= ref ? 0 <= k && k < ref : 0 >= k && k > ref); i = k += 4) {
			levels.r[this.c.pixelData[i]]++;
			levels.g[this.c.pixelData[i + 1]]++;
			levels.b[this.c.pixelData[i + 2]]++;
		}
		// Normalize all of the numbers by converting them to percentages between
		// 0 and 1.0
		numPixels = this.c.pixelData.length / 4;
		for (i = l = 0; l <= 255; i = ++l) {
			levels.r[i] /= numPixels;
			levels.g[i] /= numPixels;
			levels.b[i] /= numPixels;
		}
		return levels;
	}
};

module.exports = ( Caman ) => {
	Caman.Analyze = Analyze;
	return Analyze;
};