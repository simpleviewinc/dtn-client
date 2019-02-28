var _eventNode = document.createElement("div");

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
	ads = _nodesToArray(ads);
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

				slot.addService(window.googletag.pubads());
				var defaultTargeting = _getDefaultTargeting();
				for(var key in defaultTargeting) {
					slot.setTargeting(key, defaultTargeting[key]);
				}
				
				var fn = function(e) {
					self._dispatchEvent(domAd, {
						adSlot : adSlot
					});
					
					_eventNode.removeEventListener(eventName, fn, false)
				}
				
				// bind to our event rebroadcaster
				var eventName = "slotRenderEnded-" + adSlot.id;
				_eventNode.addEventListener(eventName, fn, false);
				
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
				
				self._dispatchEvent(domAd, {
					adSlot : adSlot,
					data : result
				});
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
				
				if (data.impressionUrl === undefined) {
					return console.error("Template adunit '" + adSlot.adunit + "' requires an 'impressionUrl' in it's creative.");
				}
				
				_imgTrack(data.impressionUrl);
				
				var str = adSlot.template;
				
				// fill tags from the data
				for(var i in data) {
					str = str.replace(new RegExp("{{" + i + "}}", "g"), data[i]);
				}
				
				// remove template tags
				str = str.replace(/<\/?template>/g, "");
				
				domAd.innerHTML = str;
				
				self._dispatchEvent(domAd, {
					adSlot : adSlot,
					data : data
				});
			});
		} else if (adSlot.adstyle === "recid") {
			if (adSlot.adrecid === null) {
				return console.error("Adunit '" + adSlot.adunit + "' requires " + self._attrs.adrecid + ".");
			}
			
			self.getAd({
				adunit : adSlot.adunit,
				size : "1x1",
				targeting : {
					recid : adSlot.adrecid
				}
			}, function(err, result) {
				if (err) {
					return console.error(err);
				}
				
				if (result.length === 0) { return; }
				
				var data = JSON.parse(result);
				
				var validKeys = ["recid", "impressionUrl", "clickUrl"];
				for(var i = 0; i < validKeys.length; i++) {
					var key = validKeys[i];
					if (data[key] === undefined || typeof data[key] !== "string" || data[key].length === 0) {
						return console.error("Featured listing ad templates require a valid '" + key + "'");
					}
				}
				
				// track impression
				_imgTrack(data.impressionUrl);
				
				// by binding in the capture phase, it will fire before the event actually reaches the click target
				var capture = true;
				
				var captureFn = function(e) {
					// the clicked element must have the adclick attribute or be inside an element that has it
					// recurse through the parents until we reach one with the attribute, or our root ad node
					var target = e.target;
					var trackable = false;
					while(target !== domAd) {
						if (target.hasAttribute(self._attrs.adclick) === true) {
							trackable = true;
							break;
						}
						
						target = target.parentElement;
					}
					
					if (trackable === false) {
						return;
					}
					
					_track(data.clickUrl);
					
					domAd.removeEventListener("click", captureFn, capture);
				}
				
				domAd.addEventListener("click", captureFn, capture);
				
				// call events for more complicated use-cases
				self._dispatchEvent(domAd, {
					adSlot : adSlot,
					data : data
				});
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
	
	var targeting = {};
	if (args.targeting !== undefined) {
		// if the user passed targeting, merge it in
		_merge(targeting, args.targeting);
	}
	// merge the in the default targeting params
	_merge(targeting, _getDefaultTargeting());
	
	var tArr = [];
	for(var i in targeting) {
		tArr.push(encodeURIComponent(i) + "=" + encodeURIComponent(targeting[i]));
	}
	var tStr = tArr.join("&");
	
	// create Http request object
	var http = new XMLHttpRequest(); 
	var url = "https://pubads.g.doubleclick.net/gampad/adx?iu="+encodeURIComponent(args.adunit)+"&sz="+encodeURIComponent(args.size)+"&c="+self._c+"&tile="+(self._getAdTile++) + "&t=" + encodeURIComponent(tStr);
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

GamClient.prototype._dispatchEvent = function(domAd, data) {
	var self = this;
	
	var e = document.createEvent("CustomEvent");
	e.initCustomEvent(self._args.loadEvent, true, true, data);
	domAd.dispatchEvent(e);
}

function _init(addScript) {
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
		window.googletag.pubads().addEventListener("slotRenderEnded", function(event) {
			var e = document.createEvent("CustomEvent");
			e.initCustomEvent("slotRenderEnded-" + event.slot.getSlotElementId(), true, true, {});
			_eventNode.dispatchEvent(e);
		});
	});
}

function _imgTrack(url) {
	var img = document.createElement("img");
	img.src = url;
	img.style.display = "none";
	document.querySelector("body").appendChild(img);
}

function _beaconTrack(url) {
	navigator.sendBeacon(url);
}

// utilize the best available method to track a url
function _track(url) {
	if (navigator.sendBeacon) {
		_beaconTrack(url);
	} else {
		_imgTrack(url);
	}
}

// IE NodesList lacks Array capabilities, so we have to convert to a real array
function _nodesToArray(nodes) {
	var arr = [];
	for(var i = 0; i < nodes.length; i++) {
		arr.push(nodes[i]);
	}
	return arr;
}

function _getDefaultTargeting() {
	return {
		pathname : document.location.pathname,
		absolute_pathname : document.location.origin + document.location.pathname,
		href : document.location.href,
		
	}
}

function _merge(obj1, obj2) {
	for(var i in obj2) {
		obj1[i] = obj2[i];
	}
}

module.exports = GamClient;