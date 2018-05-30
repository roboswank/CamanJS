// Built-in layer blenders. Many of these mimic Photoshop blend modes.
class Blender {
	// Registers a blender. Can be used to add your own blenders outside of
	// the core library, if needed.
	
	// @param [String] name Name of the blender.
	// @param [Function] func The blender function.
	static register(name, func) {
		return this.blenders[name] = func;
	}
	
	// Executes a blender to combine a layer with its parent.
	
	// @param [String] name Name of the blending function to invoke.
	// @param [Object] rgbaLayer RGBA object of the current pixel from the layer.
	// @param [Object] rgbaParent RGBA object of the corresponding pixel in the parent layer.
	// @return [Object] RGBA object representing the blended pixel.
	static execute(name, rgbaLayer, rgbaParent) {
		return this.blenders[name](rgbaLayer, rgbaParent);
	}
}

Blender.blenders = {};

module.exports = ( Caman ) => {
	Caman.Blender = Blender;
	return Blender;
};