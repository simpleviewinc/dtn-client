# dtn-client

`npm install dtn-client`

Wrapper library for Google Ad Manager

* Server - `require("dtn-client")`
* Webpack - `import { dtn_client } from "dtn-client"`
* RequireJS - `require(["dtn-client"], function(dtn_client) {})`

For the requireJS variant you will need to point your RequireJs config to the `dist/index.min.js` file.

# Features

1. Render all ads on a page with a single function call.
1. Won't re-render ads if it doesn't need to.
1. Pull the creative of an ad for custom ad handling.
1. Automatically append gpt.js script to the dom.

# Getting Started

`npm install dtn-client`

Define all of your ads with empty divs containing the network, adunit, and size of the ad(s) to be displayed. 

```html
<div data-sv-adunit="/NETWORK_CODE/ADUNIT_CODE" data-sv-adsize="WIDTHxHEIGHT"></div>
```
dtn-client is very simple to use - only requiring 2 lines of javascript code to render all of your ads. 

```js
// basic syntax
var dtn = new dtn_client(true);
dtn.renderAds();
```

```js
// manually pull an ad's creative
var dtn = new dtn_client(true);
dtn.getAd({ adunit : "/NETWORK_CODE/ADUNIT_CODE", size : "WIDTHxHEIGHT" }, function(data) {
	$("#ad_container").html(data);
});

```

## Examples

### Basic Example

```html
<body>
	<div id="ad_container_1" data-sv-adunit="/214662569/DTN_header_test" data-sv-adsize="700x300"></div>

	<div id="ad_container_2"></div>

	<script>
		var dtn = new dtn_client(true);

		// will render ad in #ad_container_1
		dtn.renderAds();

		// pull the creative for an ad and insert into #ad_container_2
		dtn.getAd({ adunit : "/214662569/dtn_test_300x250", size : "300x250" }, function(data) {
			$("#ad_container_2").html(data)
		});
	</script>
</body>
```

# API Documentation

## dtn_client(addScript)

Constructor that initializes the dtn_client object. This must be called in order to use `dtn_client.renderAds()` or `dtn_client.getAds(args, cb)`.

* `addScript` - `boolean` - default `false` - If true, will inject Google's gpt.js script into the dom.

## dtn_client.renderAds()

Renders all ads on a page. Calling this multiple times will not reload an add but will render ads that have been added to the dom after the previous renderAds() call. 

## dtn_client.getAd(args, cb)

Returns the creative for and ad. Impression tracking, and display of the ad must be manually done when using this function. 

* `args` - `object` - The args object.
	* `adunit` - `string` - The network code and adunit code for the ad in the following format: "/`NETWORK_CODE`/`ADUNIT_CODE`".
	* `size` - `string` - The size of the adunit in the following format "`WIDTH`x`HEIGHT`".
* `cb` - `function` - The callback function. This function returns 1 parameter `data` which contains the entirety of the creative for the defined adunit. Errors thrown by this function are completely ignored and not reported. 

# Development

`npm run docker` - To load the dev environment.
`npm run build` - To combile the `index.min.js` for UMD.