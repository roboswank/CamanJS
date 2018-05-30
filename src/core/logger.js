// Simple console logger class that can be toggled on and off based on Caman.DEBUG
class Logger {
	constructor() {
		var i, len, name, ref;
		ref = ['log', 'info', 'warn', 'error'];
		for (i = 0, len = ref.length; i < len; i++) {
			name = ref[i];
			this[name] = (function(name) {
				return function(...args) {
					var e;
					if (!Caman.DEBUG) {
						return;
					}
					try {
						return console[name].apply(console, args);
					} catch (error) {
						e = error;
						// We're probably using IE9 or earlier
						return console[name](args);
					}
				};
			})(name);
		}
		this.debug = this.log;
	}
};

module.exports = ( Caman ) => {
	Caman.Logger = Logger;
	Caman.Log = new Caman.Logger();
	return Logger;
};