// var Buffer = require('buffer/').Buffer;
var cryptoLib = require('crypto-browserify');
var should = require('should');
var chai = require('chai');

global.chai = chai;
global.assert = chai.assert;
global.expect = chai.expect;
chai.config.includeStack = true;
global.should = require('should');

process.env.NODE_ENV = 'test';

var lisk = require('../index.js');

exports.lisk = lisk;
exports.cryptoLib = cryptoLib;
exports.should = should;
global.LiskAPI = require('../lib/api/liskApi');
