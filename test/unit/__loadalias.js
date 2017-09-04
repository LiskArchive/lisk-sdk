'use strict';
require.main.require('alias.js');
var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('alias', function () {

	describe('hasvaluesloaded', function () {

		it('should load config as a global', function () {
			expect(alias.config).to.have.a.property('version');
		});

		it('should load genesisblock as a global', function () {
			expect(alias.genesisblock).to.have.a.property('version');
		});

		it('should load a dynamic file from the root', function () {
			var bignum = alias.require('helpers/bignum');
			expect(new bignum(1234).toString()).eq('1234');
		});
	});
});
