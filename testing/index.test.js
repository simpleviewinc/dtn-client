const puppeteer = require("puppeteer");
const child_process = require("child_process");
const util = require("util");
const { assertHtml } = require("@simpleview/assertlib");
const assert = require("assert");

const setTimeoutP = util.promisify(setTimeout);

describe(__filename, function() {
	this.timeout(10000);
	
	let server;
	let browser;
	let page;
	
	before(async function() {
		server = child_process.fork("src/server.js", { stdio : ["pipe", "pipe", "pipe", "ipc"] });
		
		server.on("close", function() {
			console.log("server closing!");
		});
		
		await new Promise(function(resolve) {
			server.on("message", resolve);
		});
		
		browser = await puppeteer.launch({
			executablePath: "/usr/bin/chromium-browser",
			headless : true,
			args : [
				"--no-sandbox",
				"--disable-setuid-sandbox"
			]
		});
		
		page = await browser.newPage();
		await page.goto("http://localhost/blank.html");
	});
	
	after(async function() {
		await browser.close();
	});
	
	afterEach(async function() {
		await page.evaluate(() => {
			$("#testContainer").html("");
		});
	});
	
	after(async function() {
		server.kill("SIGHUP");
	});
	
	it("render a normal ad", async function() {
		const adUnit = "/214662569/DTN_header_test";
		
		await page.evaluate((adUnit) => {
			$("#testContainer").html(`
				<div class="ad" data-sv-adunit="${adUnit}" data-sv-adsize="700x300"></div>
			`);
			
			return new Promise(function(resolve) {
				$(".ad").on("sv-adloaded", resolve);
				
				gamClient.renderAds();
			});
		}, adUnit);
		
		const html = await page.content();
		assertHtml(html, [
			{
				selector : ".ad",
				attrs : {
					"id" : "sv-ad-0",
					"data-sv-adcomplete" : ""
				}
			},
			{
				selector : `iframe`,
				eq : 0,
				attrs : {
					id : `google_ads_iframe_${adUnit}_0`,
					title : "3rd party ad content"
				}
			}
		]);
	});
	
	it("should render html ad", async function() {
		const adUnit = "/214662569/dtn_html_ads";
		
		await page.evaluate((adUnit) => {
			$("#testContainer").html(`
				<div class="ad" data-sv-adunit="/214662569/dtn_html_ads" data-sv-adsize="300x250" data-sv-adstyle="html"></div>
			`);
			
			return new Promise(function(resolve) {
				$(".ad").on("sv-adloaded", resolve);
				
				gamClient.renderAds();
			});
		}, adUnit);
		
		const html = await page.content();
		assertHtml(html, [
			{
				selector : ".ad a",
				attrs : {
					href : /http:\/\/adclick.g.doubleclick.net\/pcs\/click/
				}
			},
			{
				selector : ".ad img",
				eq : 1,
				attrs : {
					src : /https:\/\/securepubads.g.doubleclick.net\/pcs\/view/
				}
			}
		]);
	});
	
	it("should render template ads", async function() {
		const adUnit = "/214662569/dtn_template_ads";
		
		await page.evaluate((adUnit) => {
			$("#testContainer").html(`
				<div class="ad" data-sv-adunit="${adUnit}" data-sv-adsize="300x250" data-sv-adstyle="template">
					<template>
						<a href="{{url}}">
							<div class="description">{{description}}</div>
							<div class="title">{{title}}</div>
							<img src="{{image}}"/>
						</a>
					</template>
				</div>
			`);
			
			return new Promise(function(resolve) {
				$(".ad").on("sv-adloaded", resolve);
				
				gamClient.renderAds();
			});
		}, adUnit);
		
		const html = await page.content();
		assertHtml(html, [
			{
				selector : ".ad a",
				attrs : {
					href : /http:\/\/adclick.g.doubleclick.net\/pcs\/click/
				}
			},
			{
				selector : ".ad .description",
				text : "Testing Description"
			},
			{
				selector : ".ad .title",
				text : "Testing Title"
			},
			{
				selector : ".ad img",
				attrs : {
					src : /https:\/\/tpc.googlesyndication.com\/pagead\/imgad/
				}
			}
		]);
	});
	
	it("should render listing ads", async function() {
		const adUnit = "/214662569/dtn_featured_listings";
		
		var waitForRequest = function(url) {
			return new Promise(function(resolve) {
				var listener = function(request) {
					if (request.url().match(url)) {
						page.removeListener("request", listener);
						return resolve();
					}
				}
				
				page.on("request", listener);
			});
		}
		
		await Promise.all([
			waitForRequest("https://securepubads.g.doubleclick.net/pcs/view"),
			waitForRequest("https://securepubads.g.doubleclick.net/pcs/view"),
			waitForRequest("https://securepubads.g.doubleclick.net/pcs/view"),
			await page.evaluate((adUnit) => {
				$("#testContainer").html(`
					<div class="ad0" data-sv-adunit="/214662569/dtn_featured_listings" data-sv-adstyle="recid" data-sv-adrecid="0">
						<a href="http://www.google.com/">Title</a>
						<p data-sv-adclick>Description0</p>
					</div>
					
					<div class="ad1" data-sv-adunit="/214662569/dtn_featured_listings" data-sv-adstyle="recid" data-sv-adrecid="1">
						<a href="http://www.reddit.com/">Title</a>
						<p>Description1</p>
					</div>
					
					<div class="ad2" data-sv-adunit="/214662569/dtn_featured_listings" data-sv-adstyle="recid" data-sv-adrecid="2">
						<a href="http://www.facebook.com/">Title</a>
						<div data-sv-adclick>
							<p>Description2</p>
						</div>
					</div>
				`);
				
				return Promise.all([
					new Promise(function(resolve) {
						$(".ad0").on("sv-adloaded", resolve);
					}),
					new Promise(function(resolve) {
						$(".ad1").on("sv-adloaded", resolve);
					}),
					gamClient.renderAds()
				]);
			}, adUnit)
		]);
		
		const html = await page.content();
		assertHtml(html, [
			{
				selector : ".ad0 a",
				attrs : {
					href : "http://www.google.com/"
				}
			},
			{
				selector : ".ad0 p",
				html : "Description0"
			},
			{
				selector : ".ad1 a",
				attrs : {
					href : "http://www.reddit.com/"
				}
			},
			{
				selector : ".ad1 p",
				html : "Description1"
			},
			{
				selector : ".ad2 a",
				attrs : {
					href : "http://www.facebook.com/"
				}
			},
			{
				selector : ".ad2 p",
				html : "Description2"
			}
		]);
		
		// click on an element with data-sv-adclick
		await Promise.all([
			waitForRequest("https://adclick.g.doubleclick.net/pcs/click"),
			page.click(".ad0 p")
		]);
		
		// click on an element INSIDE something with data-sv-adclick
		await Promise.all([
			waitForRequest("https://adclick.g.doubleclick.net/pcs/click"),
			page.click(".ad2 p")
		]);
		
		const failHandler = function(request) {
			throw new Error("Should not get here!");
		}
		
		page.on("request", failHandler);
		
		// click on something NOT inside or with data-sv-adclick, should not trigger a track
		await page.click(".ad1 p");
		
		page.removeListener("request", failHandler);
	});
	
	// the ad targetted to this lineitem requires it to be on pathname /blank.html
	it("should add targeting for pathname", async function() {
		const adUnit = "/214662569/unit_test_300x250_pathname_blank.html";
		
		await page.evaluate((adUnit) => {
			$("#testContainer").html(`
				<div class="ad" data-sv-adunit="${adUnit}" data-sv-adsize="300x250"></div>
			`);
			
			return new Promise(function(resolve) {
				$(".ad").on("sv-adloaded", resolve);
				
				gamClient.renderAds();
			});
		}, adUnit);
		
		const html = await page.content();
		assertHtml(html, [
			{
				selector : ".ad",
				attrs : {
					"data-sv-adunit" : adUnit,
					"data-sv-adcomplete" : ""
				}
			},
			{
				selector : `iframe`,
				eq : 0,
				attrs : {
					id : `google_ads_iframe_${adUnit}_0`,
					title : "3rd party ad content"
				}
			}
		]);
	});
});