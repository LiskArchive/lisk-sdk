'use strict';

// Root object
var node = {};

// Requires
node.bignum = require('../helpers/bignum.js');
node.dappCategories = require('../helpers/dappCategories.js');
node.dappTypes = require('../helpers/dappTypes.js');
node.transactionTypes = require('../helpers/transactionTypes.js');
node.async = require('async');
node.chai = require('chai');
node.chai.config.includeStack = true;
node.chai.use(require('chai-bignumber')(node.bignum));
node.expect = node.chai.expect;
node.should = node.chai.should();
node.lisk = require('lisk-js');

node.normalizer = 100000000; // Use this to convert LISK amount to normal value
node.blockTime = 10000; // Block time in miliseconds
node.blockTimePlus = 12000; // Block time + 2 seconds in miliseconds

// Exports
module.exports = node;
