// For the parts of this code adapted from http://arcturo.github.com/library/coffeescript/03_classes.html
// below is the required copyright notice.

// Copyright (c) 2011 Alexander MacCaw (info@eribium.org)
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
var moduleKeywords,
	indexOf = [].indexOf;

moduleKeywords = ['extended', 'included'];

class Module {
	// Extend the base object itself like a static method
	static extends(obj) {
		var key, ref, value;
		for (key in obj) {
			value = obj[key];
			if (indexOf.call(moduleKeywords, key) < 0) {
				this[key] = value;
			}
		}
		if ((ref = obj.extended) != null) {
			ref.apply(this);
		}
		return this;
	}

	// Include methods on the object prototype
	static includes(obj) {
		var key, ref, value;
		for (key in obj) {
			value = obj[key];
			if (indexOf.call(moduleKeywords, key) < 0) {
				// Assign properties to the prototype
				this.prototype[key] = value;
			}
		}
		if ((ref = obj.included) != null) {
			ref.apply(this);
		}
		return this;
	}

	// Add methods on this prototype that point to another method
	// on another object's prototype.
	static delegate(...args) {
		var i, len, results, source, target;
		target = args.pop();
		results = [];
		for (i = 0, len = args.length; i < len; i++) {
			source = args[i];
			results.push(this.prototype[source] = target.prototype[source]);
		}
		return results;
	}

	// Create an alias for a function
	static aliasFunction(to, from) {
		return this.prototype[to] = (...args) => {
			return this.prototype[from].apply(this, args);
		};
	}

	// Create an alias for a property
	static aliasProperty(to, from) {
		return Object.defineProperty(this.prototype, to, {
			get: function() {
				return this[from];
			},
			set: function(val) {
				return this[from] = val;
			}
		});
	}

	// Execute a function in the context of the object, and pass
	// a reference to the object's prototype.
	static included(func) {
		return func.call(this, this.prototype);
	}

};

module.exports = Module;