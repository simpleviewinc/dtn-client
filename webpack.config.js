module.exports = {
	mode : "production",
	entry : `./src/index.js`,
	output : {
		library : "dtnClient",
		path : `${__dirname}/dist`,
		filename : "index.min.js",
		libraryTarget : "umd"
	}
}