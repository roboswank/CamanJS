// Responsible for registering and storing all of the filters.
class Filter {
	// Registers a filter function.
	// @param [String] name The name of the filter.
	// @param [Function] filterFunc The filter function.
	static register(name, filterFunc) {
		return Caman.prototype[name] = filterFunc;
	}

};

// All of the different render operatives
Filter.Type = {
	Single: 1,
	Kernel: 2,
	LayerDequeue: 3,
	LayerFinished: 4,
	LoadOverlay: 5,
	Plugin: 6
};

module.exports = ( Caman ) => {
	Caman.Filter = Filter;
	return Filter;
};