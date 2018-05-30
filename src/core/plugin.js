// Stores and registers standalone plugins
class Plugin {
	static register(name, plugin) {
		return this.plugins[name] = plugin;
	}

	static execute(context, name, args) {
		return this.plugins[name].apply(context, args);
	}

};

Plugin.plugins = {};

module.exports = ( Caman ) => {
	Caman.Plugin = Plugin;
	return Plugin;
};