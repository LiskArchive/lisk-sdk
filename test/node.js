'use strict';

// Root object
var node = {};

var Promise = require('bluebird');
var rewire  = require('rewire');
var sinon   = require('sinon');
var strftime = require('strftime').utc();

// Application specific
var slots     = require('../helpers/slots.js');
var swaggerHelper = require('../helpers/swagger');

// Requires
node.bignum = require('../helpers/bignum.js');
node.config = require('./data/config.json');
node.dappCategories = require('../helpers/dappCategories.js');
node.dappTypes = require('../helpers/dappTypes.js');
node.transactionTypes = require('../helpers/transactionTypes.js');
node._ = require('lodash');
node.async = require('async');
node.chai = require('chai');
node.chai.config.includeStack = true;
node.chai.use(require('chai-bignumber')(node.bignum));
node.expect = node.chai.expect;
node.should = node.chai.should();
node.lisk = require('lisk-js');
node.Promise = require('bluebird');

var jobsQueue = require('../helpers/jobsQueue.js');

node.config.root = process.cwd();

require('colors');

node.normalizer = 100000000; // Use this to convert LISK amount to normal value
node.blockTime = 10000; // Block time in miliseconds
node.blockTimePlus = 12000; // Block time + 2 seconds in miliseconds
node.version = node.config.version; // Node version

node.swaggerDef = swaggerHelper.getSwaggerSpec();

node._.mixin({
	/**
	 * Lodash mixin to sort collection case-insensitively.
	 * @param {Array} arr - Array to be sorted.
	 * @param {string} [sortOrder=asc] - Sorting order asc|desc
	 * @return {*}
	 */
	dbSort: function (arr, sortOrder) {
		var sortFactor = (sortOrder === 'desc' ? -1 : 1);

		return node._.clone(arr).sort(function (a, b ) {
			// If first element is empty push it downard
			if(!node._.isEmpty(a) && node._.isEmpty(b)) { return sortFactor * -1; }

			// If second element is empty pull it upward
			if(node._.isEmpty(a) && !node._.isEmpty(b)) { return sortFactor * 1; }

			// If both are empty keep same order
			if(node._.isEmpty(a) && node._.isEmpty(b)) { return sortFactor * 0; }

			// Convert to lower case and remove special characters
			var s1lower = a.toLowerCase().replace(/[^a-z0-9]/g, '');
			var s2lower = b.toLowerCase().replace(/[^a-z0-9]/g, '');

			return s1lower.localeCompare(s2lower) * sortFactor;
		});
	},

	/**
	 * Lodash mixin to check occurrence of a value in end of of array.
	 * @param {Array} arr - Array to be checked.
	 * @param {*} valueCheck - Value to check for.
	 * @return {boolean}
	 */
	appearsInLast: function (arr, valueCheck) {
		// Get list of indexes of desired value
		var indices = node._.compact(arr.map(function (data, index) {
			if (data === valueCheck ) { return index; }
		}));

			// If last occurrence appears at the end of array
		if (indices[indices.length - 1] === arr.length - 1 &&
			// If first and last occurrence appears without any gaps
			indices.length === (indices[indices.length - 1] - indices[0] + 1)) {
			return true;
		} else {
			return false;
		}
	},

	/**
	 * Lodash mixin to sort integer array correctly. Node default sort method sort them by ASCII codes.
	 * @param {Array} arr - Array to be sorted.
	 * @param {string} [sortOrder=asc] - Sorting order asc|desc
	 * @return {*}
	 */
	sortNumbers: function (arr, sortOrder) {
		var sortFactor = (sortOrder === 'desc' ? -1 : 1);

		return arr.sort(function (a, b) {
			return (a - b) * sortFactor;
		});
	}
}, {chain: false});

// Exports
module.exports = node;
