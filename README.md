# dtn-client

`npm install dtn-client`

Browser DTN client. There are 3 ways to utilize this package. Via a webpack compilation system, in requireJS, or via a direct script.

* Webpack - `import { GamClient } from "dtn-client"`
* RequireJS - `require(["dtn-client"], function(dtnClient) {})`
* Script - `<script src="https://unpkg.com/@simpleview/dtn-client"></script>`. When using the script include, it will add a global variable at `window.dtnClient`.

For the requireJS variant you will need to point your RequireJs config to the `dist/index.min.js` file.

# GamClient

GamClient is for interfacing with the Google Ad Manager system. It can handle the following use-cases.

1. Render all ads on a page with a single function call.
1. Won't re-render ads if it doesn't need to.
1. Pull the creative of an ad for custom ad rendering.

## Banner Ads

Define all of your ads with empty divs containing the network, adunit, and size of the ad(s) to be displayed. 

```html
<div data-sv-adunit="/NETWORK_CODE/ADUNIT_CODE" data-sv-adsize="WIDTHxHEIGHT"></div>
```

Then, include the following script.

```html
<script>
	var dtn = new dtnClient.GamClient();
	dtn.renderAds();
</script>
```

If you ever load content after the initial call to `renderAds` you can call it again to re-render the ads.

## HTML Banner Ads

By default all ads appear inside an iframe, which means that page-level stylings aren't available to them. If you do not want the iframe you can pass `data-sv-adstyle="html"` and it will extract the ad from the iFrame. This method will generally be used with ads of type "html" or "custom" in GAM.

```html
<div data-sv-adunit="/NETWORK_CODE/ADUNIT_CODE" data-sv-adsize="WIDTHxHEIGHT" data-sv-adstyle="html"></div>
```

Requirements:

* Ensure links are tracked with `<a href='%%CLICK_URL_UNESC%%%%DEST_URL%%'>` in order to click track and redirect to the appropriate location.
* Ensure your ad creative contains `<img src="%%VIEW_URL_UNESC%%" style="display:none">` to track the impression.

## Template Ads

The Creative Template ad type allows you to declare ads as a data object of key value pairs. This allows you to simply declare the data of an ad, but keep the template with the site's codebase (instead of copy pasting HTML into the ad server).

In order to use this type of ad specify `data-sv-adstyle="template"` and declare the template inside the div. The `{{key}}` will be filled from the data passed from the creative.

```html
<div data-sv-adunit="/NETWORK_CODE/ADUNIT_CODE" data-sv-adsize="WIDTHxHEIGHT" data-sv-adstyle="html">
	<template>
		<a href="{{url}}">
			<img src="{{imageurl}}"/>
			<div>{{title}}</div>
		</a>
		
	</template>
</div>
```

Requirements:

* Ensure a key contains `%%CLICK_URL_UNESC%%%%DEST_URL%%` in order to click track the ad as well as redirect to the creative's url.
* Ensure a key contains `%%VIEW_URL_UNESC%%` and your template places `<img src="{{impressionUrl}}" style="display:none">` to track the impression.

## Custom Rendered Ads

For ads where you want to manually pull a creative associated with an ad so you can render it yourself, utilize `GamClient.getAd()`.

```js
// manually pull an ad's creative
var dtn = new dtnClient.GamClient();
dtn.getAd({ adunit : "/NETWORK_CODE/ADUNIT_CODE", size : "WIDTHxHEIGHT" }, function(data) {
	// do something to render result of data
});
```

## API Documentation

### GamClient(addScript)

Constructor that initializes the GamClient object. This must be called in order to use `GamClient.renderAds()` or `GamClient.getAd(args, cb)`.

* `addScript` - `boolean` - default `false` - If true, will inject Google's gpt.js script into the dom.

### GamClient.renderAds()

Renders all ads on a page. Calling this multiple times will not reload an add but will render ads that have been added to the dom after the previous renderAds() call. 

### GamClient.getAd(args, cb)

Returns the creative for and ad. Impression tracking, and display of the ad must be manually done when using this function. 

* `args` - `object` - The args object.
	* `adunit` - `string` - The network code and adunit code for the ad in the following format: "/`NETWORK_CODE`/`ADUNIT_CODE`".
	* `size` - `string` - The size of the adunit in the following format "`WIDTH`x`HEIGHT`".
* `cb` - `function` - The callback function. This function returns 1 parameter `data` which contains the entirety of the creative for the defined adunit. Errors thrown by this function are completely ignored and not reported. 

# Development

`npm run docker` - To load the dev environment.
`npm start` - To combile the `index.min.js` for UMD. Browse to http://kube.simpleview.io:8080/ . Any changes made to files in the `src` folder will automatically trigger a rebuild of the `dist/index.min.js` file.

# GAM Documentation

* GPT Libary Reference - https://developers.google.com/doubleclick-gpt/reference
* Load Creative with URL - https://support.google.com/admanager/answer/2623168?hl=en
* Macros - https://support.google.com/admanager/answer/2376981?hl=en
* GPT Samples - https://support.google.com/admanager/answer/4578089?hl=en