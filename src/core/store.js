// Used for storing instances of CamanInstance objects such that, when Caman() is called on an 
// already initialized element, it returns that object instead of re-initializing.
class Store {
	static has(search) {
		return this.items[search] != null;
	}

	static get(search) {
		return this.items[search];
	}

	static put(name, obj) {
		return this.items[name] = obj;
	}

	static execute(search, callback) {
		setTimeout(() => {
			return callback.call(this.get(search), this.get(search));
		}, 0);
		return this.get(search);
	}

	static flush(name = false) {
		if (name) {
			return delete this.items[name];
		} else {
			return this.items = {};
		}
	}
};

Store.items = {};

module.exports = ( Caman ) => {
	Caman.Store = Store;
	return Store;
};