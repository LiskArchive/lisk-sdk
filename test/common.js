var Buffer = require("buffer/").Buffer;
var crypto_lib = require("crypto-browserify");
var should = require("should");

global.chai = require('chai');
global.assert = chai.assert;
global.expect = chai.expect;
chai.config.includeStack = true;
global.should = require('should');

process.env.NODE_ENV = 'test';



var lisk = require("../index.js");

exports.lisk = lisk;
exports.crypto_lib = crypto_lib;
exports.should = should;
global.LiskAPI = require('../lib/api/liskApi');