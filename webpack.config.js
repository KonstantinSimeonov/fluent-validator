const path = require('path');
const webpack = require('webpack');

const BUILD_DIR = path.resolve(__dirname, 'dist');

const baseConfig = {
	mode: 'production',
	devtool: 'source-map',
	output: {
		path: BUILD_DIR,
		library: 'fluentSchemer',
		libraryTarget: 'umd',
		globalObject: `typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : this)`
	},
	entry: path.resolve(__dirname, 'index.ts'),
	resolve: {
		extensions: ['.ts', '.js']
	},
};

const es6Config = {
	...baseConfig,
	output: {
		...baseConfig.output,
		filename: 'index.js'
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: 'ts-loader'
			}
		]
	},
	plugins: [
		new webpack.WatchIgnorePlugin([BUILD_DIR])
	]
};

const es5MinConfig = {
	...baseConfig,
	output: {
		...baseConfig.output,
		filename: 'index.es5.min.js',
		sourceMapFilename: 'index.es5.min.js.map'
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				loader: 'ts-loader',
				options: {
					configFile: 'tsconfig.es5.json'
				}
			}
		]
	},
	plugins: [
		new webpack.WatchIgnorePlugin([BUILD_DIR])
	]
};

module.exports = [es5MinConfig, es6Config];
