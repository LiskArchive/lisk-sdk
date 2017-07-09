'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var crypto = require('crypto');

var constants = require('../../../helpers/constants');

describe('app', function () {

	before(function (done) {
		//run the app
		require('../../../app');
		//wait for modules to be initialized
		setTimeout(done, 3000);
	});

	describe('connectionPrivateKey', function () {

		it('should have connectionPrivateKey set after app starts', function () {
			var privateKey = constants.getConst('connectionPrivateKey');
			expect(privateKey).not.to.be.empty;
		});

		it('connectionPrivateKey should be a Buffer type', function () {
			var privateKey = constants.getConst('connectionPrivateKey');
			expect(Buffer.isBuffer(privateKey)).to.be.ok;
		});
	});

	describe('nonce', function () {

		it('should have nonce set after app starts', function () {
			var nonce = constants.getConst('headers').nonce;
			expect(nonce).not.to.be.empty;
		});

		it('nonce should be a string type', function () {
			var nonce = constants.getConst('headers').nonce;
			expect(nonce).to.be.a('string');
		});
	});

});

