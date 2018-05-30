// The filters define all of the built-in functionality that comes with Caman (as opposed to being 
// provided by a plugin). All of these filters are ratherbasic, but are extremely powerful when
// many are combined. For information on creating plugins, check out the 
// [Plugin Creation](http://camanjs.com/docs/plugin-creation) page, and for information on using 
// the plugins, check out the [Built-In Functionality](http://camanjs.com/docs/built-in) page.

// ## Fill Color
// Fills the canvas with a single solid color.

// ### Arguments
// Can take either separate R, G, and B values as arguments, or a single hex color value.
var hasProp = {}.hasOwnProperty;
module.exports = ( Filter ) => {
	Filter.register("fillColor", function() {
		var color;
		if (arguments.length === 1) {
			color = Convert.hexToRGB(arguments[0]);
		} else {
			color = {
				r: arguments[0],
				g: arguments[1],
				b: arguments[2]
			};
		}
		return this.process("fillColor", function(rgba) {
			rgba.r = color.r;
			rgba.g = color.g;
			rgba.b = color.b;
			rgba.a = 255;
			return rgba;
		});
	});

	// ## Brightness
	// Simple brightness adjustment

	// ### Arguments
	// Range is -100 to 100. Values < 0 will darken image while values > 0 will brighten.
	Filter.register("brightness", function(adjust) {
		adjust = Math.floor(255 * (adjust / 100));
		return this.process("brightness", function(rgba) {
			rgba.r += adjust;
			rgba.g += adjust;
			rgba.b += adjust;
			return rgba;
		});
	});

	// ## Saturation
	// Adjusts the color saturation of the image.

	// ### Arguments
	// Range is -100 to 100. Values < 0 will desaturate the image while values > 0 will saturate it.
	// **If you want to completely desaturate the image**, using the greyscale filter is highly 
	// recommended because it will yield better results.
	Filter.register("saturation", function(adjust) {
		adjust *= -0.01;
		return this.process("saturation", function(rgba) {
			var max;
			max = Math.max(rgba.r, rgba.g, rgba.b);
			if (rgba.r !== max) {
				rgba.r += (max - rgba.r) * adjust;
			}
			if (rgba.g !== max) {
				rgba.g += (max - rgba.g) * adjust;
			}
			if (rgba.b !== max) {
				rgba.b += (max - rgba.b) * adjust;
			}
			return rgba;
		});
	});

	// ## Vibrance
	// Similar to saturation, but adjusts the saturation levels in a slightly smarter, more subtle way. 
	// Vibrance will attempt to boost colors that are less saturated more and boost already saturated
	// colors less, while saturation boosts all colors by the same level.

	// ### Arguments
	// Range is -100 to 100. Values < 0 will desaturate the image while values > 0 will saturate it.
	// **If you want to completely desaturate the image**, using the greyscale filter is highly 
	// recommended because it will yield better results.
	Filter.register("vibrance", function(adjust) {
		adjust *= -1;
		return this.process("vibrance", function(rgba) {
			var amt, avg, max;
			max = Math.max(rgba.r, rgba.g, rgba.b);
			avg = (rgba.r + rgba.g + rgba.b) / 3;
			amt = ((Math.abs(max - avg) * 2 / 255) * adjust) / 100;
			if (rgba.r !== max) {
				rgba.r += (max - rgba.r) * amt;
			}
			if (rgba.g !== max) {
				rgba.g += (max - rgba.g) * amt;
			}
			if (rgba.b !== max) {
				rgba.b += (max - rgba.b) * amt;
			}
			return rgba;
		});
	});


	// ## Greyscale
	// An improved greyscale function that should make prettier results
	// than simply using the saturation filter to remove color. It does so by using factors
	// that directly relate to how the human eye perceves color and values. There are
	// no arguments, it simply makes the image greyscale with no in-between.

	// Algorithm adopted from http://www.phpied.com/image-fun/
	Filter.register("greyscale", function(adjust) {
		return this.process("greyscale", function(rgba) {
			var avg;
			// Calculate the average value of the 3 color channels 
			// using the special factors
			avg = Calculate.luminance(rgba);
			rgba.r = avg;
			rgba.g = avg;
			rgba.b = avg;
			return rgba;
		});
	});

	// ## Contrast
	// Increases or decreases the color contrast of the image.

	// ### Arguments
	// Range is -100 to 100. Values < 0 will decrease contrast while values > 0 will increase contrast.
	// The contrast adjustment values are a bit sensitive. While unrestricted, sane adjustment values 
	// are usually around 5-10.
	Filter.register("contrast", function(adjust) {
		adjust = Math.pow((adjust + 100) / 100, 2);
		return this.process("contrast", function(rgba) {
			// Red channel
			rgba.r /= 255;
			rgba.r -= 0.5;
			rgba.r *= adjust;
			rgba.r += 0.5;
			rgba.r *= 255;
			rgba.g /= 255;
			rgba.g -= 0.5;
			rgba.g *= adjust;
			rgba.g += 0.5;
			rgba.g *= 255;
			rgba.b /= 255;
			rgba.b -= 0.5;
			rgba.b *= adjust;
			rgba.b += 0.5;
			rgba.b *= 255;
			return rgba;
		});
	});

	// ## Hue
	// Adjusts the hue of the image. It can be used to shift the colors in an image in a uniform 
	// fashion. If you are unfamiliar with Hue, I recommend reading this 
	// [Wikipedia article](http://en.wikipedia.org/wiki/Hue).

	// ### Arguments
	// Range is 0 to 100
	// Sometimes, Hue is expressed in the range of 0 to 360. If that's the terminology you're used to, 
	// think of 0 to 100 representing the percentage of Hue shift in the 0 to 360 range.
	Filter.register("hue", function(adjust) {
		return this.process("hue", function(rgba) {
			var b, g, h, hsv, r;
			hsv = Convert.rgbToHSV(rgba.r, rgba.g, rgba.b);
			h = hsv.h * 100;
			h += Math.abs(adjust);
			h = h % 100;
			h /= 100;
			hsv.h = h;
			({r, g, b} = Convert.hsvToRGB(hsv.h, hsv.s, hsv.v));
			rgba.r = r;
			rgba.g = g;
			rgba.b = b;
			return rgba;
		});
	});

	// ## Colorize
	// Uniformly shifts the colors in an image towards the given color. The adjustment range is from 0 
	// to 100. The higher the value, the closer the colors in the image shift towards the given 
	// adjustment color.

	// ### Arguments
	// This filter is polymorphic and can take two different sets of arguments. Either a hex color 
	// string and an adjustment value, or RGB colors and an adjustment value.
	Filter.register("colorize", function() {
		var level, rgb;
		if (arguments.length === 2) {
			rgb = Convert.hexToRGB(arguments[0]);
			level = arguments[1];
		} else if (arguments.length === 4) {
			rgb = {
				r: arguments[0],
				g: arguments[1],
				b: arguments[2]
			};
			level = arguments[3];
		}
		return this.process("colorize", function(rgba) {
			rgba.r -= (rgba.r - rgb.r) * (level / 100);
			rgba.g -= (rgba.g - rgb.g) * (level / 100);
			rgba.b -= (rgba.b - rgb.b) * (level / 100);
			return rgba;
		});
	});

	// ## Invert
	// Inverts all colors in the image by subtracting each color channel value from 255. No arguments.
	Filter.register("invert", function() {
		return this.process("invert", function(rgba) {
			rgba.r = 255 - rgba.r;
			rgba.g = 255 - rgba.g;
			rgba.b = 255 - rgba.b;
			return rgba;
		});
	});


	// ## Sepia
	// Applies an adjustable sepia filter to the image.

	// ### Arguments
	// Assumes adjustment is between 0 and 100, which represents how much the sepia filter is applied.
	Filter.register("sepia", function(adjust = 100) {
		adjust /= 100;
		return this.process("sepia", function(rgba) {
			// All three color channels have special conversion factors that 
			// define what sepia is. Here we adjust each channel individually, 
			// with the twist that you can partially apply the sepia filter.
			rgba.r = Math.min(255, (rgba.r * (1 - (0.607 * adjust))) + (rgba.g * (0.769 * adjust)) + (rgba.b * (0.189 * adjust)));
			rgba.g = Math.min(255, (rgba.r * (0.349 * adjust)) + (rgba.g * (1 - (0.314 * adjust))) + (rgba.b * (0.168 * adjust)));
			rgba.b = Math.min(255, (rgba.r * (0.272 * adjust)) + (rgba.g * (0.534 * adjust)) + (rgba.b * (1 - (0.869 * adjust))));
			return rgba;
		});
	});

	// ## Gamma
	// Adjusts the gamma of the image.

	// ### Arguments
	// Range is from 0 to infinity, although sane values are from 0 to 4 or 5.
	// Values between 0 and 1 will lessen the contrast while values greater than 1 will increase it.
	Filter.register("gamma", function(adjust) {
		return this.process("gamma", function(rgba) {
			rgba.r = Math.pow(rgba.r / 255, adjust) * 255;
			rgba.g = Math.pow(rgba.g / 255, adjust) * 255;
			rgba.b = Math.pow(rgba.b / 255, adjust) * 255;
			return rgba;
		});
	});

	// ## Noise
	// Adds noise to the image on a scale from 1 - 100. However, the scale isn't constrained, so you 
	// can specify a value > 100 if you want a LOT of noise.
	Filter.register("noise", function(adjust) {
		adjust = Math.abs(adjust) * 2.55;
		return this.process("noise", function(rgba) {
			var rand;
			rand = Calculate.randomRange(adjust * -1, adjust);
			rgba.r += rand;
			rgba.g += rand;
			rgba.b += rand;
			return rgba;
		});
	});

	// ## Clip
	// Clips a color to max values when it falls outside of the specified range.

	// ### Arguments
	// Supplied value should be between 0 and 100.
	Filter.register("clip", function(adjust) {
		adjust = Math.abs(adjust) * 2.55;
		return this.process("clip", function(rgba) {
			if (rgba.r > 255 - adjust) {
				rgba.r = 255;
			} else if (rgba.r < adjust) {
				rgba.r = 0;
			}
			if (rgba.g > 255 - adjust) {
				rgba.g = 255;
			} else if (rgba.g < adjust) {
				rgba.g = 0;
			}
			if (rgba.b > 255 - adjust) {
				rgba.b = 255;
			} else if (rgba.b < adjust) {
				rgba.b = 0;
			}
			return rgba;
		});
	});

	// ## Channels
	// Lets you modify the intensity of any combination of red, green, or blue channels individually.

	// ### Arguments
	// Must be given at least one color channel to adjust in order to work.
	// Options format (must specify 1 - 3 colors):
	// <pre>{
	//	 red: 20,
	//	 green: -5,
	//	 blue: -40
	// }</pre>
	Filter.register("channels", function(options) {
		var chan, value;
		if (typeof options !== "object") {
			return this;
		}
		for (chan in options) {
			if (!hasProp.call(options, chan)) continue;
			value = options[chan];
			if (value === 0) {
				delete options[chan];
				continue;
			}
			options[chan] /= 100;
		}
		if (options.length === 0) {
			return this;
		}
		return this.process("channels", function(rgba) {
			if (options.red != null) {
				if (options.red > 0) {
					rgba.r += (255 - rgba.r) * options.red;
				} else {
					rgba.r -= rgba.r * Math.abs(options.red);
				}
			}
			if (options.green != null) {
				if (options.green > 0) {
					rgba.g += (255 - rgba.g) * options.green;
				} else {
					rgba.g -= rgba.g * Math.abs(options.green);
				}
			}
			if (options.blue != null) {
				if (options.blue > 0) {
					rgba.b += (255 - rgba.b) * options.blue;
				} else {
					rgba.b -= rgba.b * Math.abs(options.blue);
				}
			}
			return rgba;
		});
	});

	// ## Curves
	// Curves implementation using Bezier curve equation. If you're familiar with the Curves 
	// functionality in Photoshop, this works in a very similar fashion.

	// ### Arguments.
	// <pre>
	//	 chan - [r, g, b, rgb]
	//	 cps - [x, y]* (curve control points, min. 2; 0 - 255)
	//	 algo - function (optional)
	// </pre>

	// The first argument represents the channels you wish to modify with the filter. It can be an 
	// array of channels or a string (for a single channel). The rest of the arguments are 2-element 
	// arrays that represent point coordinates. They are specified in the same order as shown in this 
	// image to the right. The coordinates are in the range of 0 to 255 for both X and Y values.

	// It is possible to pass the function an optional function describing which curve algorithm to use.
	// It defaults to bezier.

	// The x-axis represents the input value for a single channel, while the y-axis represents the 
	// output value.
	Filter.register("curves", function(chans, ...cps) {
		var algo, bezier, end, i, j, k, last, ref, ref1, start;
		last = cps[cps.length - 1];
		if (typeof last === "function") {
			algo = last;
			cps.pop();
		} else if (typeof last === "string") {
			algo = Calculate[last];
			cps.pop();
		} else {
			algo = Calculate.bezier;
		}
		if (typeof chans === "string") {
			// If channels are in a string, split to an array
			chans = chans.split("");
		}
		if (chans[0] === "v") {
			chans = ['r', 'g', 'b'];
		}
		if (cps.length < 2) {
			// might want to give a warning now
			throw "Invalid number of arguments to curves filter";
		}
		// Generate a curve
		bezier = algo(cps, 0, 255);
		// If the curve starts after x = 0, initialize it with a flat line
		// until the curve begins.
		start = cps[0];
		if (start[0] > 0) {
			for (i = j = 0, ref = start[0]; undefined !== 0 && (0 <= ref ? 0 <= j && j < ref : 0 >= j && j > ref); i = 0 <= ref ? ++j : --j) {
				bezier[i] = start[1];
			}
		}
		// ... and the same with the end point
		end = cps[cps.length - 1];
		if (end[0] < 255) {
			for (i = k = ref1 = end[0]; undefined !== 0 && (ref1 <= 255 ? ref1 <= k && k <= 255 : ref1 >= k && k >= 255); i = ref1 <= 255 ? ++k : --k) {
				bezier[i] = end[1];
			}
		}
		return this.process("curves", function(rgba) {
			var l, ref2;
			for (i = l = 0, ref2 = chans.length; undefined !== 0 && (0 <= ref2 ? 0 <= l && l < ref2 : 0 >= l && l > ref2); i = 0 <= ref2 ? ++l : --l) {
				// Now that we have the bezier curve, we do a basic hashmap lookup
				// to find and replace color values.
				rgba[chans[i]] = bezier[rgba[chans[i]]];
			}
			return rgba;
		});
	});

	// ## Exposure
	// Adjusts the exposure of the image by using the curves function.

	// ### Arguments
	// Range is -100 to 100. Values < 0 will decrease exposure while values > 0 will increase exposure.
	Filter.register("exposure", function(adjust) {
		var ctrl1, ctrl2, p;
		p = Math.abs(adjust) / 100;
		ctrl1 = [0, 255 * p];
		ctrl2 = [255 - (255 * p), 255];
		if (adjust < 0) {
			ctrl1 = ctrl1.reverse();
			ctrl2 = ctrl2.reverse();
		}
		return this.curves('rgb', [0, 0], ctrl1, ctrl2, [255, 255]);
	});
};