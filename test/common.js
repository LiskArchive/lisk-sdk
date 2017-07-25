// var Buffer = require('buffer/').Buffer;
var cryptoLib = require('crypto-browserify');
var should = require('should');
var sinon = require('sinon');

should.use(function (should, Assertion) {
	Assertion.add('hexString', function () {
		this.params = {
			operator: 'to be hex string',
		};
		(Buffer.from(this.obj, 'hex').toString('hex'))
			.should.equal(this.obj);
	});
});

// See https://github.com/shouldjs/should.js/issues/41
Object.defineProperty(global, 'should', { value: should });
global.sinon = sinon;

process.env.NODE_ENV = 'test';

var lisk = require('../index.js');

exports.lisk = lisk;
exports.cryptoLib = cryptoLib;
exports.privateApi = require('../lib/api/privateApi');
exports.utils = require('../lib/api/utils');
Object.defineProperty(exports, 'should', { value: should });
exports.sinon = sinon;
