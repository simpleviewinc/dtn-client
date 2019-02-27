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
			server.on("message", function() {
				return resolve();
			});
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
				$(".ad").on("sv-adloaded", function() {
					resolve(true);
				});
				
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
				$(".ad").on("sv-adloaded", function() {
					resolve(true);
				});
				
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
				$(".ad").on("sv-adloaded", function() {
					resolve(true);
				});
				
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
		
		await page.evaluate((adUnit) => {
			$("#testContainer").html(`
				<div class="ad" data-sv-adunit="/214662569/dtn_featured_listings" data-sv-adstyle="recid" data-sv-adrecid="0" data-sv-adclickcapture>
					<a href="http://www.google.com/" data-sv-adclick>Title</a>
					<p>Description</p>
				</div>
			`);
			
			return new Promise(function(resolve) {
				$(".ad").on("sv-adloaded", function() {
					resolve(true);
				});
				
				gamClient.renderAds();
			});
		}, adUnit);
		
		const html = await page.content();
		assertHtml(html, [
			{
				selector : ".ad a",
				attrs : {
					href : /https:\/\/adclick.g.doubleclick.net\/pcs\/click.*adurl=http:\/\/www.google.com\//
				}
			},
			{
				selector : ".ad p",
				html : "Description"
			}
		]);
		
		await Promise.all([
			new Promise(resolve => page.on("request", function(request) {
				assert.ok(request.url().match(/https:\/\/adclick.g.doubleclick.net\/pcs\/click/));
				resolve();
			})),
			page.click(".ad p")
		]);
	});
});