const lisky = require('../index');
const util = require('util');
const lisk = require('lisk-js');
const should = require('should');

// See https://github.com/shouldjs/should.js/issues/41
Object.defineProperty(global, 'should', { value: should });
global.sinon = require('sinon');

process.env.NODE_ENV = 'test';

exports.lisk = lisk.api(require('../config.json').liskJS);
exports.lisky = lisky;
exports.sinon = sinon;
exports.util = util;
// See https://github.com/shouldjs/should.js/issues/41
Object.defineProperty(exports, 'should', { value: should });
