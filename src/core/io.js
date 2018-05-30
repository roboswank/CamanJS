// Various I/O based operations
class IO {
	// Is the given URL remote?
	// If a cross-origin setting is set, we assume you have CORS
	// properly configured.

	// @param [DOMObject] img The image to check.
	// @return [Boolean]
	static isRemote(img) {
		if (img == null) {
			return false;
		}
		if (this.corsEnabled(img)) {
			return false;
		}
		return this.isURLRemote(img.src);
	}

	// Given an image, we check to see if a CORS policy has been defined.
	// @param [DOMObject] img The image to check.
	// @return [Boolean]
	static corsEnabled(img) {
		var ref;
		return (img.crossOrigin != null) && ((ref = img.crossOrigin.toLowerCase()) === 'anonymous' || ref === 'use-credentials');
	}

	// Does the given URL exist on a different domain than the current one?
	// This is done by comparing the URL to `document.domain`.
	// @param [String] url The URL to check.
	// @return [Boolean]
	static isURLRemote(url) {
		var matches;
		matches = url.match(this.domainRegex);
		if (matches) {
			return matches[1] !== document.domain;
		} else {
			return false;
		}
	}

	// Checks to see if the URL is remote, and if there is a proxy defined, it
	// @param [String] src The URL to check.
	// @return [String] The proxy URL if the image is remote. Nothing otherwise.
	static remoteCheck(src) {
		if (this.isURLRemote(src)) {
			if (!Caman.remoteProxy.length) {
				Caman.Log.info(`Attempting to load a remote image without a configured proxy. URL: ${src}`);
			} else {
				if (Caman.isURLRemote(Caman.remoteProxy)) {
					Caman.Log.info("Cannot use a remote proxy for loading images.");
					return;
				}
				return this.proxyUrl(src);
			}
		}
	}

	// Given a URL, get the proxy URL for it.
	// @param [String] src The URL to proxy.
	// @return [String] The proxy URL.
	static proxyUrl(src) {
		return `${Caman.remoteProxy}?${Caman.proxyParam}=${encodeURIComponent(src)}`;
	}

	// Shortcut for using one of the bundled proxies.
	// @param [String] lang String identifier for the proxy script language.
	// @return [String] A proxy URL.
	static useProxy(lang) {
		var langToExt;
		langToExt = {
			ruby: 'rb',
			python: 'py',
			perl: 'pl',
			javascript: 'js'
		};
		lang = lang.toLowerCase();
		if (langToExt[lang] != null) {
			lang = langToExt[lang];
		}
		return `proxies/caman_proxy.${lang}`;
	}

};

// Used for parsing image URLs for domain names.
IO.domainRegex = /(?:(?:http|https):\/\/)((?:\w+)\.(?:(?:\w|\.)+))/;

module.exports = ( Caman ) => {
	// Grabs the canvas data, encodes it to Base64, then sets the browser location to
	// the encoded data so that the user will be prompted to download it.
	// If we're in NodeJS, then we can save the image to disk.
	// @see Caman
	Caman.prototype.save = function() {
		if (typeof exports !== "undefined" && exports !== null) {
			return this.nodeSave.apply(this, arguments);
		} else {
			return this.browserSave.apply(this, arguments);
		}
	};

	Caman.prototype.browserSave = function(type = "png") {
		var image;
		type = type.toLowerCase();
		// Force download (its a bit hackish)
		image = this.toBase64(type).replace(`image/${type}`, "image/octet-stream");
		return document.location.href = image;
	};

	Caman.prototype.nodeSave = function(file, overwrite = true, callback = null) {
		var e, stats;
		try {
			stats = fs.statSync(file);
			if (stats.isFile() && !overwrite) {
				return false;
			}
		} catch (error) {
			e = error;
			Caman.Log.debug(`Creating output file ${file}`);
		}
		return fs.writeFile(file, this.canvas.toBuffer(), function(err) {
			Caman.Log.debug(`Finished writing to ${file}`);
			if (callback) {
				return callback.call(this, err);
			}
		});
	};

	// Takes the current canvas data, converts it to Base64, then sets it as the source 
	// of a new Image object and returns it.
	Caman.prototype.toImage = function(type) {
		var img;
		img = new Image();
		img.src = this.toBase64(type);
		img.width = this.dimensions.width;
		img.height = this.dimensions.height;
		if (window.devicePixelRatio) {
			img.width /= window.devicePixelRatio;
			img.height /= window.devicePixelRatio;
		}
		return img;
	};

	// Base64 encodes the current canvas
	Caman.prototype.toBase64 = function(type = "png") {
		type = type.toLowerCase();
		return this.canvas.toDataURL(`image/${type}`);
	};
	
	return IO;
};