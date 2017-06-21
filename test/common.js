const lisky = require('../index');
const util = require('util');
const chai = require('chai');
const lisk = require('lisk-js');

global.chai = chai;
global.assert = chai.assert;
global.expect = chai.expect;
chai.config.includeStack = true;
global.should = require('should');
global.sinon = require('sinon');

process.env.NODE_ENV = 'test';

exports.lisk = lisk.api(require('../config.json').liskJS);
exports.lisky = lisky;
exports.should = should;
exports.sinon = sinon;
exports.util = util;
