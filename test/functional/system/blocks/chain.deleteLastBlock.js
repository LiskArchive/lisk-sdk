'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var lisk = require('lisk-js');

var test = require('../../../test');
var _  = test._;
var accountFixtures = require('../../../fixtures/accounts');

var application = require('../../../common/application');
var randomUtil = require('../../../common/utils/random');

var localCommon = require('../common');

describe('blocks/chain', function () {
	var library;

	before('init sandboxed application', function (done) {
		application.init({sandbox: {name: 'lisk_test_block_chain'}}, function (err, scope) {
			library = scope;
			done();
		});
	});

	after('cleanup sandboxed application', function (done) {
		application.cleanup(done);
	});

	describe('deleteLastBlock', function () {

		describe('errors', function () {

		});

		describe('single transaction scenarios: create transaction, forge, delete block, forge again', function () {

		});

		describe('multiple transactions scenarios: create transactions, forge, delete block, forge again', function () {

		});
	});
});