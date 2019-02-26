# dtn-client

`npm install dtn-client`

Browser DTN client. There are 3 ways to utilize this package. Via a webpack compilation system, in requireJS, or via a direct script.

* Webpack - `import { GamClient } from "dtn-client"`
* RequireJS - `require(["dtn-client"], function(dtnClient) {})`
* Script - `<script src="https://unpkg.com/@simpleview/dtn-client"></script>`. When using the script include, it will add a global variable at `window.dtnClient`.

For the requireJS variant you will need to point your RequireJs config to the `dist/index.min.js` file.

Init the `GamClient` in one portion of your page.

```html
<script>
	var dtn = new dtnClient.GamClient();
</script>
```

# GamClient

GamClient is for interfacing with the Google Ad Manager system. It can handle the following use-cases.

1. Render all ads on a page with a single function call.
1. Won't re-render ads if it doesn't need to.
1. Pull the creative of an ad for custom ad rendering.

## Ad Containers

For most use-cases ads are loaded by marking dom elements with specific data attributes allowing GamClient to fill them with content from the ad server. The following are data attributes available and their purposes. Each attribute assumes you are using the default values. If you pass a custom value to the constructor, you will need to pass the appropriate value below.

* `data-sv-adunit` - The name of the adunit in the form of `/NETWORK_CODE/ADUNIT_CODE`.
* `data-sv-adstyle` - default `iframe` - The type of ad to render. Must be one of `iframe`, `html`, `template`, `recid`. See below for examples of each adstyle.
* `data-sv-adrecid` - The recid to use for targeting when using ad style `recid`.
* `data-sv-adsize` - The size of the ad in the form of `WIDTHxHEIGHT` e.g. `300x250`. Used in ad style `iframe`, `html`, `template`.
* `data-sv-adclick` - A url to count as a clickthrough when using ad style `recid`.

Mark the divs on your page with the above attributes, and then call `renderAds()` to render all ads.

```html
<script>
	dtn.renderAds();
</script>
```

It is safe to call `renderAds()` multiple times. If you call `renderAds()` more than once, it will not re-render an ad that has already rendered. If you dynamically add containers to the page you will need to call `renderAds()` again to render them.

## Banner ad, default, `data-sv-adstyle="iframe"`

Renders an ad within an iframe. The default behavior of `data-sv-adstyle`.

```html
<div data-sv-adunit="/NETWORK_CODE/ADUNIT_CODE" data-sv-adsize="WIDTHxHEIGHT"></div>
```

## HTML Banner Ads `data-sv-adstyle="html"`

When you want to render HTML NOT inside of an iframe, you can utilize `data-sv-adstyle="html"`. This allows the page to style the rendered HTML. This method will generally be used with ads of type "html" or "custom" in GAM.

```html
<div data-sv-adunit="/NETWORK_CODE/ADUNIT_CODE" data-sv-adsize="WIDTHxHEIGHT" data-sv-adstyle="html"></div>
```

Requirements:

* Ensure links are tracked with `<a href='%%CLICK_URL_UNESC%%%%DEST_URL%%'>` in order to click track and redirect to the appropriate location.
* Ensure your ad creative contains `<img src="%%VIEW_URL_UNESC%%" style="display:none">` to track the impression.

## Template Ads `data-sv-adstyle="template"`

The Creative Template ad type allows you to declare ads as a data object of key value pairs. This allows you to simply declare the data of an ad, but keep the template with the site's codebase (instead of copy-pasting the HTML into the ad server).

In order to use this type of ad specify `data-sv-adstyle="template"` and declare the template inside the div. The `{{key}}` will be filled from the data passed from the creative.

The template below assumes that the key value pairs return a key called `url`, `imageurl`, `title`, and `impressionUrl`. There are no requirements on the naming of your keys. Just make sure the template and the naming of the keys match exactly.

```html
<div data-sv-adunit="/NETWORK_CODE/ADUNIT_CODE" data-sv-adsize="WIDTHxHEIGHT" data-sv-adstyle="template">
	<template>
		<a href="{{url}}">
			<img src="{{imageurl}}"/>
			<div>{{title}}</div>
		</a>
		<img src="{{impressionUrl}}" style="display:none">
	</template>
</div>
```

Requirements:

* Ensure a key contains `%%CLICK_URL_UNESC%%%%DEST_URL%%` which is used in any `a` tags in order to track the click through, as well as redirect to the creative's url.
* Ensure a key contains `%%VIEW_URL_UNESC%%` and your template places `<img src="{{impressionUrl}}" style="display:none">` to track the impression.

## Recid Ads `data-sv-adstyle="recid"`

Recid ads are used when you have content that has already loaded on your page but you want to track it's impression and click through in the ad server. This is commonly used for tracking Featured Listings.

In the following template, it will track the impression to the ad that is returned for that recid. It will also cause the click through to be tracked if the user clicks either link with the `data-sv-adclick` attribute.

```html
<div data-sv-adunit="/NETWORK_CODE/ADUNIT_CODE" data-sv-adstyle="recid" data-sv-adrecid="RECID">
	<p><a href="http://www.google.com/" data-sv-adclick>Title 0</a></p>
	<p>Some description <a href="http://www.reddit.com/" data-sv-adclick>Read More</a></p>
</div>
```

## API Documentation

### GamClient(args)

Constructor that initializes the GamClient object. This must be called in order to use `GamClient.renderAds()` or `GamClient.getAd(args, cb)`.

* args - `object`
	* `addScript` - `boolean` - default `true` - If true, will inject Google's gpt.js script into the dom.
	* `attrs` - `object`
		* `adcomplete` - `string` - default `data-sv-adcomplete` - Attribute used for marking when an ad has loaded.
		* `adunit` - `string` - default `data-sv-adunit` - Attribute used for determining the GAM adunit.
		* `adstyle` - `string` - default `data-sv-adstyle` - Attribute used for determining the ad style.
		* `adrecid` - `string` - default `data-sv-adrecid` - Attribute used for determining the recid used when ad style is `recid`.
		* `adsize` - `string` - default `data-sv-adsize` - Attribute used for determining the ad size when ad style is `iframe`, `template`, or `html`.
		* `adclick` - `string` - default `data-sv-adclick` - Attribute used for marking URLs to count as ad click throughs when ad style is `recid`.

### GamClient.renderAds()

Renders all ads on a page. Calling this multiple times will not reload an add but will render ads that have been added to the dom after the previous `renderAds()` call. 

### GamClient.getAd(args, cb)

For ads where you want to manually pull a creative associated with an ad so you can render it yourself, utilize `GamClient.getAd()`. This returns the creative for and ad. Impression tracking, and display of the ad must be manually done when using this function.

* `args` - `object` - The args object.
	* `adunit` - `string` - The network code and adunit code for the ad in the following format: "/`NETWORK_CODE`/`ADUNIT_CODE`".
	* `size` - `string` - The size of the adunit in the following format "`WIDTH`x`HEIGHT`".
	* `targeting` - `string` - The targeting param. Passed in the form of `key=value&key2=value2`. Keys cannot contain special characters. If the value contains special characters you must `encodeURIComponent()` ONLY the `value` portion.
* `cb` - `function` - The callback function. This function returns 1 parameter `data` which contains the entirety of the creative for the defined adunit. Errors thrown by this function are completely ignored and not reported. 

```js
// manually pull an ad's creative
dtn.getAd({ adunit : "/NETWORK_CODE/ADUNIT_CODE", size : "WIDTHxHEIGHT" }, function(data) {
	// do something to render result of data
});
```

# Development

`npm run docker` - To load the dev environment.
`npm start` - To combile the `index.min.js` for UMD. Browse to http://kube.simpleview.io:8080/ . Any changes made to files in the `src` folder will automatically trigger a rebuild of the `dist/index.min.js` file.

# GAM Documentation

* GPT Libary Reference - https://developers.google.com/doubleclick-gpt/reference
* Load Creative with URL - https://support.google.com/admanager/answer/2623168?hl=en
* Macros - https://support.google.com/admanager/answer/2376981?hl=en
* GPT Samples - https://support.google.com/admanager/answer/4578089?hl=en