// Inform CamanJS that the DOM has been updated, and that it
// should re-scan for CamanJS instances in the document.
// Regex used for parsing options out of the data-caman attribute.
const INST_REGEX = "(\\w+)\\((.*?)\\)";

// Parses Caman instructions embedded in the HTML data-caman attribute.
class CamanParser {
	
	// Creates a new parser instance.

	// @param [DOMObject] ele DOM object to be instantiated with CamanJS
	// @param [Function] ready Callback function to pass to CamanJS
	constructor(ele, ready) {
		this.dataStr = ele.getAttribute('data-caman');
		this.caman = Caman(ele, ready.bind(this));
	}

	// Parse the DOM object and call the parsed filter functions on the Caman object.
	parse() {
		var args, e, filter, func, i, inst, instFunc, len, m, r, results, unparsedInstructions;
		this.ele = this.caman.canvas;
		// First we find each instruction as a whole using a global
		// regex search.
		r = new RegExp(INST_REGEX, 'g');
		unparsedInstructions = this.dataStr.match(r);
		if (!(unparsedInstructions.length > 0)) {
			return;
		}
		// Once we gather all the instructions, we go through each one
		// and parse out the filter name + it's parameters.
		r = new RegExp(INST_REGEX);
		results = [];
		for (i = 0, len = unparsedInstructions.length; i < len; i++) {
			inst = unparsedInstructions[i];
			[m, filter, args] = inst.match(r);
			// Create a factory function so we can catch any errors that
			// are produced when running the filters. This also makes it very
			// simple to support multiple/complex filter arguments.
			instFunc = new Function(`return function() { this.${filter}(${args}); };`);
			try {
				func = instFunc();
				results.push(func.call(this.caman));
			} catch (error) {
				e = error;
				results.push(Log.debug(e));
			}
		}
		return results;
	}

	// Execute {Caman#render} on this Caman instance.
	execute() {
		var ele;
		ele = this.ele;
		return this.caman.render(function() {
			return ele.parentNode.replaceChild(this.toImage(), ele);
		});
	}

};

module.exports = ( Caman ) => {
	// If enabled, we check the page to see if there are any
	// images with Caman instructions provided using HTML5
	// data attributes.
	if ( Caman.autoload ) {
		Caman.DOMUpdated = function() {
			var i, img, imgs, len, parser, results;
			imgs = document.querySelectorAll("img[data-caman]");
			if (!(imgs.length > 0)) {
				return;
			}
			results = [];
			for (i = 0, len = imgs.length; i < len; i++) {
				img = imgs[i];
				results.push(parser = new CamanParser(img, function() {
					this.parse();
					return this.execute();
				}));
			}
			return results;
		};
		
		return document.readyState === "complete" ?
			Caman.DOMUpdated() :
			document.addEventListener("DOMContentLoaded", Caman.DOMUpdated, false);
	}
};