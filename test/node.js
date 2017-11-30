'use strict';

// Root object
var node = {};

// Requires
node.bignum = require('../helpers/bignum.js');
node.chai = require('chai');
node.chai.config.includeStack = true;
node.chai.use(require('chai-bignumber')(node.bignum));
node.expect = node.chai.expect;
node.should = node.chai.should();

node.normalizer = 100000000; // Use this to convert LISK amount to normal value

// Exports
module.exports = node;
