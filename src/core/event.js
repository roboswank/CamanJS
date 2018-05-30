// Event system that can be used to register callbacks that get fired
// during certain times in the render process.
var indexOf = [].indexOf;
	
class Event {
	// Trigger an event.
	// @param [Caman] target Instance of Caman emitting the event.
	// @param [String] type The event type.
	// @param [Object] data Extra data to send with the event.
	static trigger(target, type, data = null) {
		var event, i, len, ref, results;
		if (this.events[type] && this.events[type].length) {
			ref = this.events[type];
			results = [];
			for (i = 0, len = ref.length; i < len; i++) {
				event = ref[i];
				if (event.target === null || target.id === event.target.id) {
					results.push(event.fn.call(target, data));
				} else {
					results.push(void 0);
				}
			}
			return results;
		}
	}

	
	// Listen for an event. Optionally bind the listen to a single instance
	// or all instances.

	// @overload listen(target, type, fn)
	//	 Listen for events emitted from a particular Caman instance.
	//	 @param [Caman] target The instance to listen to.
	//	 @param [String] type The type of event to listen for.
	//	 @param [Function] fn The function to call when the event occurs.

	// @overload listen(type, fn)
	//	 Listen for an event from all Caman instances.
	//	 @param [String] type The type of event to listen for.
	//	 @param [Function] fn The function to call when the event occurs.
	static listen(target, type, fn) {
		var _fn, _type;
		// Adjust arguments if target is omitted
		if (typeof target === "string") {
			_type = target;
			_fn = type;
			target = null;
			type = _type;
			fn = _fn;
		}
		if (indexOf.call(this.types, type) < 0) {
			// Validation
			return false;
		}
		if (!this.events[type]) {
			this.events[type] = [];
		}
		this.events[type].push({
			target: target,
			fn: fn
		});
		return true;
	}

};

Event.events = {};

// All of the supported event types
Event.types = ["processStart", "processComplete", "renderStart", "renderFinished", "blockStarted", "blockFinished"];

module.exports = ( Caman ) => {
	Caman.Event = Event;
	return Event;
};
