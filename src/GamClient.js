function GamClient(args) {
	var self = this;
	
	args = args || {};
	
	args.addScript = args.addScript !== undefined ? args.addScript : true;
	
	_init(args.addScript);
	
	self._c = Math.floor(Math.random() * 100000);
	self._getAdTile = 0;
	self._slotId = 0;
}

GamClient.prototype.renderAds = function() {
	var self = this;
	
	// select all current ads on page
	var ads = document.querySelectorAll("[data-sv-adunit][data-sv-adsize]");
	ads.forEach(function(domAd, i) {
		// set unique ad id if not present
		if (domAd.id === "") {
			domAd.id = "sv-ad-" + self._slotId++;
		}
		
		// convert size to array of number for Google
		var sizeArr = domAd.getAttribute("data-sv-adsize").split("x");
		sizeArr = sizeArr.map(function(val) { return Number(val); });
		
		// push ad's id into slot array
		
		var adSlot = {
			id : domAd.id,
			adunit : domAd.getAttribute("data-sv-adunit"),
			size : sizeArr
		}
		
		window.googletag.cmd.push(function() {
			var slot = window.googletag.defineSlot(adSlot.adunit, adSlot.size, adSlot.id);

			// slot will be null if no available slots left (don't re-render)
			if (slot === null) { return; }

			slot = slot.addService(window.googletag.pubads());

			// display ads
			window.googletag.display(adSlot.id);
		});
	});
}

/**
* args.adunit
* args.size
* cb
*/
GamClient.prototype.getAd = function(args) {
	var self = this;
	
	return new Promise(function(resolve, reject) {
		args = args || {};
		if (args.adunit === undefined || args.size === undefined) {
			return reject(new Error("getAd requires args.adunit and args.size"));
		}
		
		// create Http request object
		var http = new XMLHttpRequest(); 
		var url = "https://pubads.g.doubleclick.net/gampad/adx?iu="+encodeURIComponent(args.adunit)+"&sz="+encodeURIComponent(args.size)+"&c="+self._c+"&tile="+self._getAdTile++;
		http.open("GET", url);
		
		// readystatechange cb
		http.onload = function() {
			if (http.status === 200) {
				resolve(http.responseText);
			} else {
				reject(new Error("GAM returned '" + http.status + "' status code."));
			}
		}

		// send request
		http.send();
	});
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