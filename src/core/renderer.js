// Handles all of the various rendering methods in Caman. Most of the image modification happens 
// here. A new Renderer object is created for every render operation.
class Renderer {
	constructor(c) {
		// Grabs the next operation from the render queue and passes it to Renderer
		// for execution
		this.processNext = this.processNext.bind(this);
		this.c = c;
		this.renderQueue = [];
		this.modPixelData = null;
	}

	add(job) {
		if (job == null) {
			return;
		}
		return this.renderQueue.push(job);
	}

	processNext() {
		var layer;
		// If the queue is empty, fire the finished callback
		if (this.renderQueue.length === 0) {
			Event.trigger(this, "renderFinished");
			if (this.finishedFn != null) {
				this.finishedFn.call(this.c);
			}
			return this;
		}
		this.currentJob = this.renderQueue.shift();
		switch (this.currentJob.type) {
			case Filter.Type.LayerDequeue:
				layer = this.c.canvasQueue.shift();
				this.c.executeLayer(layer);
				return this.processNext();
			case Filter.Type.LayerFinished:
				this.c.applyCurrentLayer();
				this.c.popContext();
				return this.processNext();
			case Filter.Type.LoadOverlay:
				return this.loadOverlay(this.currentJob.layer, this.currentJob.src);
			case Filter.Type.Plugin:
				return this.executePlugin();
			default:
				return this.executeFilter();
		}
	}

	execute(callback) {
		this.finishedFn = callback;
		this.modPixelData = Util.dataArray(this.c.pixelData.length);
		return this.processNext();
	}

	eachBlock(fn) {
		var blockN, blockPixelLength, bnum, end, f, i, l, lastBlockN, n, ref, results, start;
		// Prepare all the required render data
		this.blocksDone = 0;
		n = this.c.pixelData.length;
		blockPixelLength = Math.floor((n / 4) / Renderer.Blocks);
		blockN = blockPixelLength * 4;
		lastBlockN = blockN + ((n / 4) % Renderer.Blocks) * 4;
		results = [];
		for (i = l = 0, ref = Renderer.Blocks; undefined !== 0 && (0 <= ref ? 0 <= l && l < ref : 0 >= l && l > ref); i = 0 <= ref ? ++l : --l) {
			start = i * blockN;
			end = start + (i === Renderer.Blocks - 1 ? lastBlockN : blockN);
			if (Caman.NodeJS) {
				f = Fiber(() => {
					return fn.call(this, i, start, end);
				});
				bnum = f.run();
				results.push(this.blockFinished(bnum));
			} else {
				results.push(setTimeout(((i, start, end) => {
					return () => {
						return fn.call(this, i, start, end);
					};
				})(i, start, end), 0));
			}
		}
		return results;
	}

	// The core of the image rendering, this function executes the provided filter.

	// NOTE: this does not write the updated pixel data to the canvas. That happens when all filters 
	// are finished rendering in order to be as fast as possible.
	executeFilter() {
		Event.trigger(this.c, "processStart", this.currentJob);
		if (this.currentJob.type === Filter.Type.Single) {
			return this.eachBlock(this.renderBlock);
		} else {
			return this.eachBlock(this.renderKernel);
		}
	}

	// Executes a standalone plugin
	executePlugin() {
		Log.debug(`Executing plugin ${this.currentJob.plugin}`);
		Plugin.execute(this.c, this.currentJob.plugin, this.currentJob.args);
		Log.debug(`Plugin ${this.currentJob.plugin} finished!`);
		return this.processNext();
	}

	// Renders a single block of the canvas with the current filter function
	renderBlock(bnum, start, end) {
		var i, l, pixel, ref, ref1;
		Log.debug(`Block #${bnum} - Filter: ${this.currentJob.name}, Start: ${start}, End: ${end}`);
		Event.trigger(this.c, "blockStarted", {
			blockNum: bnum,
			totalBlocks: Renderer.Blocks,
			startPixel: start,
			endPixel: end
		});
		pixel = new Pixel();
		pixel.setContext(this.c);
		for (i = l = ref = start, ref1 = end; 4 !== 0 && (ref <= ref1 ? ref <= l && l < ref1 : ref >= l && l > ref1); i = l += 4) {
			pixel.loc = i;
			pixel.r = this.c.pixelData[i];
			pixel.g = this.c.pixelData[i + 1];
			pixel.b = this.c.pixelData[i + 2];
			pixel.a = this.c.pixelData[i + 3];
			this.currentJob.processFn(pixel);
			this.c.pixelData[i] = Util.clampRGB(pixel.r);
			this.c.pixelData[i + 1] = Util.clampRGB(pixel.g);
			this.c.pixelData[i + 2] = Util.clampRGB(pixel.b);
			this.c.pixelData[i + 3] = Util.clampRGB(pixel.a);
		}
		if (Caman.NodeJS) {
			return Fiber.yield(bnum);
		} else {
			return this.blockFinished(bnum);
		}
	}

	// Applies an image kernel to the canvas
	renderKernel(bnum, start, end) {
		var adjust, adjustSize, bias, builder, builderIndex, divisor, i, j, k, kernel, l, m, n, name, o, p, pixel, ref, ref1, ref2, ref3, ref4, ref5, res;
		name = this.currentJob.name;
		bias = this.currentJob.bias;
		divisor = this.currentJob.divisor;
		n = this.c.pixelData.length;
		adjust = this.currentJob.adjust;
		adjustSize = Math.sqrt(adjust.length);
		kernel = [];
		Log.debug(`Rendering kernel - Filter: ${this.currentJob.name}`);
		start = Math.max(start, this.c.dimensions.width * 4 * ((adjustSize - 1) / 2));
		end = Math.min(end, n - (this.c.dimensions.width * 4 * ((adjustSize - 1) / 2)));
		builder = (adjustSize - 1) / 2;
		pixel = new Pixel();
		pixel.setContext(this.c);
		for (i = l = ref = start, ref1 = end; 4 !== 0 && (ref <= ref1 ? ref <= l && l < ref1 : ref >= l && l > ref1); i = l += 4) {
			pixel.loc = i;
			builderIndex = 0;
			for (j = m = ref2 = -builder, ref3 = builder; undefined !== 0 && (ref2 <= ref3 ? ref2 <= m && m <= ref3 : ref2 >= m && m >= ref3); j = ref2 <= ref3 ? ++m : --m) {
				for (k = o = ref4 = builder, ref5 = -builder; undefined !== 0 && (ref4 <= ref5 ? ref4 <= o && o <= ref5 : ref4 >= o && o >= ref5); k = ref4 <= ref5 ? ++o : --o) {
					p = pixel.getPixelRelative(j, k);
					kernel[builderIndex * 3] = p.r;
					kernel[builderIndex * 3 + 1] = p.g;
					kernel[builderIndex * 3 + 2] = p.b;
					builderIndex++;
				}
			}
			res = this.processKernel(adjust, kernel, divisor, bias);
			this.modPixelData[i] = Util.clampRGB(res.r);
			this.modPixelData[i + 1] = Util.clampRGB(res.g);
			this.modPixelData[i + 2] = Util.clampRGB(res.b);
			this.modPixelData[i + 3] = this.c.pixelData[i + 3];
		}
		if (Caman.NodeJS) {
			return Fiber.yield(bnum);
		} else {
			return this.blockFinished(bnum);
		}
	}

	// Called when a single block is finished rendering. Once all blocks are done, we signal that this
	// filter is finished rendering and continue to the next step.
	blockFinished(bnum) {
		var i, l, ref;
		if (bnum >= 0) {
			Log.debug(`Block #${bnum} finished! Filter: ${this.currentJob.name}`);
		}
		this.blocksDone++;
		Event.trigger(this.c, "blockFinished", {
			blockNum: bnum,
			blocksFinished: this.blocksDone,
			totalBlocks: Renderer.Blocks
		});
		if (this.blocksDone === Renderer.Blocks) {
			if (this.currentJob.type === Filter.Type.Kernel) {
				for (i = l = 0, ref = this.c.pixelData.length; undefined !== 0 && (0 <= ref ? 0 <= l && l < ref : 0 >= l && l > ref); i = 0 <= ref ? ++l : --l) {
					this.c.pixelData[i] = this.modPixelData[i];
				}
			}
			if (bnum >= 0) {
				Log.debug(`Filter ${this.currentJob.name} finished!`);
			}
			Event.trigger(this.c, "processComplete", this.currentJob);
			return this.processNext();
		}
	}

	// The "filter function" for kernel adjustments.
	processKernel(adjust, kernel, divisor, bias) {
		var i, l, ref, val;
		val = {
			r: 0,
			g: 0,
			b: 0
		};
		for (i = l = 0, ref = adjust.length; undefined !== 0 && (0 <= ref ? 0 <= l && l < ref : 0 >= l && l > ref); i = 0 <= ref ? ++l : --l) {
			val.r += adjust[i] * kernel[i * 3];
			val.g += adjust[i] * kernel[i * 3 + 1];
			val.b += adjust[i] * kernel[i * 3 + 2];
		}
		val.r = (val.r / divisor) + bias;
		val.g = (val.g / divisor) + bias;
		val.b = (val.b / divisor) + bias;
		return val;
	}

	// Loads an image onto the current canvas
	loadOverlay(layer, src) {
		var img, proxyUrl;
		img = new Image();
		img.onload = () => {
			layer.context.drawImage(img, 0, 0, this.c.dimensions.width, this.c.dimensions.height);
			layer.imageData = layer.context.getImageData(0, 0, this.c.dimensions.width, this.c.dimensions.height);
			layer.pixelData = layer.imageData.data;
			this.c.pixelData = layer.pixelData;
			return this.processNext();
		};
		proxyUrl = IO.remoteCheck(src);
		return img.src = proxyUrl != null ? proxyUrl : src;
	}

};

module.exports = ( Caman ) => {
	// The number of blocks to split the image into during the render process to simulate 
	// concurrency. This also helps the browser manage the (possibly) long running render jobs.
	Renderer.Blocks = Caman.NodeJS ? require('os').cpus().length : 4;
	
	Caman.Renderer = Renderer;
	return Renderer;
};