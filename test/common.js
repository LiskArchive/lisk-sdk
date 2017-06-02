// var Buffer = require('buffer/').Buffer;
var cryptoLib = require('crypto-browserify');
var should = require('should');
var chai = require('chai');
var sinon = require('sinon');

global.chai = chai;
global.assert = chai.assert;
global.expect = chai.expect;
chai.config.includeStack = true;
global.should = require('should');
global.sinon = require('sinon');

process.env.NODE_ENV = 'test';

var lisk = require('../index.js');

exports.lisk = lisk;
exports.cryptoLib = cryptoLib;
exports.should = should;
exports.sinon = sinon;
