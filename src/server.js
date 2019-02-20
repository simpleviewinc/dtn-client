const express = require("express");
const chokidar = require("chokidar");
const child_process = require("child_process");
const app = express();

const watcher = chokidar.watch(`${__dirname}`, {
	usePolling : true,
	ignoreInitial : true
});

watcher.on("all", function() {
	child_process.execSync(`npm run build`, { stdio : "inherit" });
	console.log("Files built.");
});

app.use(express.static(`${__dirname}/static`));

app.use("/index.min.js", express.static(`${__dirname}/../dist/index.min.js`));

app.listen(80, function() {
	console.log("booted");
});