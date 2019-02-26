const express = require("express");
const chokidar = require("chokidar");
const child_process = require("child_process");
const app = express();

function build() {
	child_process.execSync(`npm run build`, { stdio : "inherit" });
	console.log("Files built.");
}

const watcher = chokidar.watch(`${__dirname}`, {
	usePolling : true,
	ignoreInitial : true
});

watcher.on("all", build);

app.use(express.static(`${__dirname}/static`));

app.use("/index.min.js", express.static(`${__dirname}/../dist/index.min.js`));

build();

app.listen(80, function() {
	console.log("booted");
});