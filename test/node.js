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

// Exports
module.exports = node;
