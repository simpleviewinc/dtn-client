function GamClient(args) {
	var self = this;
	
	args = args || {};
	
	args.addScript = args.addScript !== undefined ? args.addScript : true;
	args.loadEvent = args.loadEvent !== undefined ? args.loadEvent : "sv-adloaded";
	args.attrs = args.attrs !== undefined ? args.attrs : {};
	args.attrs.adcomplete = args.attrs.complete !== undefined ? args.attrs.complete : "data-sv-adcomplete";
	args.attrs.adunit = args.attrs.adunit !== undefined ? args.attrs.adunit : "data-sv-adunit";
	args.attrs.adrecid = args.attrs.adrecid !== undefined ? args.attrs.adrecid : "data-sv-adrecid";
	args.attrs.adsize = args.attrs.adsize !== undefined ? args.attrs.adsize : "data-sv-adsize";
	args.attrs.adstyle = args.attrs.adstyle !== undefined ? args.attrs.adstyle : "data-sv-adstyle";
	args.attrs.adclick = args.attrs.adclick !== undefined ? args.attrs.adclick : "data-sv-adclick";
	
	_init(args.addScript);
	
	self._c = Math.floor(Math.random() * 100000);
	self._getAdTile = 0;
	self._slotId = 0;
	
	self._args = args;
	self._attrs = args.attrs;
}

GamClient.prototype.renderAds = function() {
	var self = this;
	
	// select all current ads on page
	var ads = document.querySelectorAll("[" + self._attrs.adunit + "]:not([" + self._attrs.adcomplete + "])");
	ads.forEach(function(domAd, i) {
		// "" sets it to boolean true, per spec
		domAd.setAttribute(self._attrs.adcomplete, "");
		
		// set unique ad id if not present
		if (domAd.id === "") {
			domAd.id = "sv-ad-" + self._slotId++;
		}
		
		var adSlot = {
			id : domAd.id,
			adunit : domAd.getAttribute(self._attrs.adunit),
			adrecid : domAd.getAttribute(self._attrs.adrecid),
			adsize : domAd.getAttribute(self._attrs.adsize),
			adstyle : domAd.getAttribute(self._attrs.adstyle) || "iframe",
			template : domAd.innerHTML
		}
		
		if (adSlot.adstyle === "iframe") {
			if (adSlot.adsize === null) {
				return console.error("Adunit '" + adSlot.adunit + "' requires " + self._attrs.adsize + ".");
			}
			
			// convert from "300x250" to [300, 250] for Google
			var sizeArr = adSlot.adsize.split("x").map(function(val) { return Number(val); });
			
			window.googletag.cmd.push(function() {
				var slot = window.googletag.defineSlot(adSlot.adunit, sizeArr, adSlot.id);

				// slot will be null if no available slots left (don't re-render)
				if (slot === null) { return; }

				slot = slot.addService(window.googletag.pubads());

				// display ads
				window.googletag.display(adSlot.id);
			});
		} else if (adSlot.adstyle === "html") {
			if (adSlot.adsize === null) {
				return console.error("Adunit '" + adSlot.adunit + "' requires " + self._attrs.adsize + ".");
			}
			
			self.getAd({ adunit : adSlot.adunit, size : adSlot.adsize }, function(err, result) {
				if (err) {
					return console.error(err);
				}
				
				domAd.innerHTML = result;
			});
		} else if (adSlot.adstyle === "template") {
			if (adSlot.adsize === null) {
				return console.error("Adunit '" + adSlot.adunit + "' requires " + self._attrs.adsize + ".");
			}
			
			self.getAd({ adunit : adSlot.adunit, size : adSlot.adsize }, function(err, result) {
				if (err) {
					return console.error(err);
				}
				
				if (result.length === 0) { return; }
				
				var data = JSON.parse(result);
				var str = adSlot.template;
				
				// fill tags from the data
				for(var i in data) {
					str = str.replace(new RegExp("{{" + i + "}}", "g"), data[i]);
				}
				
				// remove remaining tags
				str = str.replace(/{{[^}]*}}/g, "");
				// remove template tags
				str = str.replace(/<\/?template>/g, "");
				
				domAd.innerHTML = str;
			});
		} else if (adSlot.adstyle === "recid") {
			if (adSlot.adrecid === null) {
				return console.error("Adunit '" + adSlot.adunit + "' requires " + self._attrs.adrecid + ".");
			}
			
			self.getAd({
				adunit : adSlot.adunit,
				size : "1x1",
				targeting : "recid=" + adSlot.adrecid
			}, function(err, result) {
				if (err) {
					return console.error(err);
				}
				
				if (result.length === 0) { return; }
				
				var data = JSON.parse(result);
				
				// track impression
				var img = document.createElement("img");
				img.src = data.impressionUrl;
				img.style = "display: none;";
				document.querySelector("body").appendChild(img);
				
				var links = domAd.querySelectorAll("[" + self._attrs.adclick + "]");
				links.forEach(function(domLink) {
					var url = domLink.getAttribute("href");
					if (url === null) { return; }
					
					if (url.match(/^https?:\/\//) === null) {
						return console.error(new Error("Unable to track non-absolute url '" + url + "'"));
					}
					
					domLink.setAttribute("href", data.clickUrl + url);
				});
				
				var e = document.createEvent("CustomEvent");
				e.initCustomEvent(self._args.loadEvent, true, true, data);
				domAd.dispatchEvent(e);
			});
		}
	});
}

/**
* args.adunit
* args.size
* cb
*/
GamClient.prototype.getAd = function(args, cb) {
	var self = this;
	
	args = args || {};
	if (args.adunit === undefined || args.size === undefined) {
		return cb(new Error("getAd requires args.adunit and args.size"));
	}
	
	var tStr = "";
	if (args.targeting !== undefined) {
		tStr = "&t=" + encodeURIComponent(args.targeting);
	}
	
	// create Http request object
	var http = new XMLHttpRequest(); 
	var url = "https://pubads.g.doubleclick.net/gampad/adx?iu="+encodeURIComponent(args.adunit)+"&sz="+encodeURIComponent(args.size)+"&c="+self._c+"&tile="+(self._getAdTile++)+tStr;
	http.open("GET", url);
	
	// readystatechange cb
	http.onload = function() {
		if (http.status === 200) {
			return cb(null, http.responseText);
		} else {
			return cb(new Error("GAM returned '" + http.status + "' status code."));
		}
	}

	// send request
	http.send();
}

var _init = function(addScript) {
	if (addScript === true) {
		// inject GPT script before self
		(function(d,s){var f=d.getElementsByTagName(s)[0],
		j=d.createElement(s);j.async=true;j.src=
		"//www.googletagservices.com/tag/js/gpt.js";f.parentNode.insertBefore(j,f);
		})(document,"script");
	}

	window.googletag = window.googletag || {};
	window.googletag.cmd = window.googletag.cmd || [];

	window.googletag.cmd.push(function() {
		// allows multiple ads to be fetched at once
		window.googletag.pubads().enableSingleRequest();
		window.googletag.enableServices();
	});
}

module.exports = GamClient;