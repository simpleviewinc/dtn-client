var dtn_client = function(addScript = false) {
	var self = this;

	self._init(addScript);

	self.adSlots = [];
	self._c = Math.floor(Math.random() * 100000);
	self._tile = 0;
}

dtn_client.prototype._init = function(addScript) {
	var self = this;

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

dtn_client.prototype.renderAds = function() {
	var self = this;

	// select all current ads on page
	var ads = document.querySelectorAll("[data-sv-adunit][data-sv-adsize]");
		ads.forEach(function(domAd, i) {
			// set unique ad id if not present
			if (domAd.id === "") {
				domAd.id = "sv-ad-"+self.adSlots.length;
			}
			// convert size to array of number for Google
			var sizeArr = domAd.getAttribute("data-sv-adsize").split("x");
			sizeArr = sizeArr.map(function(val) { return Number(val); });

			// push ad's id into slot array
			self.adSlots.push({ id : domAd.id, adunit : domAd.getAttribute("data-sv-adunit"), size : sizeArr });
		});

		self.adSlots.forEach(function(adSlot) {
			// define slots for ads
			window.googletag.cmd.push(function() {
			var slot = window.googletag.defineSlot(adSlot.adunit, adSlot.size, adSlot.id);

			// slot will be null if no available slots left (don't re-render)
			if (slot === null) { return; }

			slot = slot.addService(window.googletag.pubads());
			// apply targeting if available
			if (adSlot.targeting !== undefined) {
				slot = slot.setTargeting(...adSlot.targeting);
			}

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
dtn_client.prototype.getAd = function(args, cb) {
	var self = this;

	// create Http request object
	var Http = new XMLHttpRequest(); 
	var url = "https://pubads.g.doubleclick.net/gampad/adx?iu="+args.adunit+"&sz="+args.size+"&c="+self._c+"&tile="+self._tile++;
	Http.open("GET", url);

	// readystatechange cb
	Http.onreadystatechange = function() {
		// eat the error
		if (this.readyState === 4 && this.status === 200) {
			return cb(Http.responseText);
		}
	}

	// send request
	Http.send();
}

module.exports = { dtn_client };
