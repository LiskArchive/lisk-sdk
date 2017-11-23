'use strict';

var Logger = require('../../../logger');

module.exports = {
	http: require('./http'),
	ws: require('./ws'),
	transactions: require('./transactions'),
	logger: new Logger({filename: __dirname + '/integrationTestsLogger.logs', echo: 'log'})
};
