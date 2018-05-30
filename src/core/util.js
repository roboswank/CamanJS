// Look what you make me do Javascript
var $, Util, slice,
	hasProp = {}.hasOwnProperty,
	indexOf = [].indexOf;

slice = Array.prototype.slice;

// DOM simplifier (no jQuery dependency)
// NodeJS compatible
$ = function(sel, root = document) {
	if (typeof sel === "object" || (typeof exports !== "undefined" && exports !== null)) {
		return sel;
	}
	return root.querySelector(sel);
};

class Util {
	// Helper function that extends one object with all the properies of other objects
	static extend(obj, ...src) {
		var copy, dest, i, len, prop;
		dest = obj;
		for (i = 0, len = src.length; i < len; i++) {
			copy = src[i];
			for (prop in copy) {
				if (!hasProp.call(copy, prop)) continue;
				dest[prop] = copy[prop];
			}
		}
		return dest;
	}

	// In order to stay true to the latest spec, RGB values must be clamped between
	// 0 and 255. If we don't do this, weird things happen.
	static clampRGB(val) {
		if (val < 0) {
			return 0;
		}
		if (val > 255) {
			return 255;
		}
		return val;
	}

	static copyAttributes(from, to, opts = {}) {
		var attr, i, len, ref, ref1, results;
		ref = from.attributes;
		results = [];
		for (i = 0, len = ref.length; i < len; i++) {
			attr = ref[i];
			if ((opts.except != null) && (ref1 = attr.nodeName, indexOf.call(opts.except, ref1) >= 0)) {
				continue;
			}
			results.push(to.setAttribute(attr.nodeName, attr.nodeValue));
		}
		return results;
	}

	// Support for browsers that don't know Uint8Array (such as IE9)
	static dataArray(length = 0) {
		if (Caman.NodeJS || (window.Uint8Array != null)) {
			return new Uint8Array(length);
		}
		return new Array(length);
	}

};

// Unique value utility
Util.uniqid = (function() {
	var id;
	id = 0;
	return {
		get: function() {
			return id++;
		}
	};
})();

module.exports = Util;