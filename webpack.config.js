'use strict';

var nodeExternals = require('webpack-node-externals');

module.exports = {
	entry: './workersController.js',
	output: {
		path: __dirname + '/release',
		filename: 'workersController.js'
	},
	target: 'node',
	externals: [nodeExternals()]
};
