'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var crypto = require('crypto');

var constants = require('../../../helpers/constants');

// ToDo: Ensure that different app instance is not running - port collision
describe.skip('app', function () {

	var app;

	before(function (done) {
		// Run the app
		require('../../../app');
		// Wait for modules to be initialized
		setTimeout(done, 3000);
		done();
	});

	describe('setting constants', function () {

		describe('nonce', function () {

			it('should be set after app starts', function () {
				var nonce = constants.getConst('headers').nonce;
				expect(nonce).not.to.be.empty;
			});

			it('should be a string', function () {
				var nonce = constants.getConst('headers').nonce;
				expect(nonce).to.be.a('string');
			});
		});
	});
});
