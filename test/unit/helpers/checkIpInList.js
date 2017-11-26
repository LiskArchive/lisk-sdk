'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var ip = require('ip');

var checkIpInList = require('../../../helpers/checkIpInList');

describe('checkIpInList', function () {

	describe('CheckIpInList', function () {

		var validReturnListIsEmpty;
		var validList;
		var validAddress;
		var spyConsoleError;
		var checkIpInListResult;

		before(function () {
			validReturnListIsEmpty = true;
			validList = ['1.2.3.4','5.6.7.8'];
			validAddress = '1.2.3.4';
			spyConsoleError = sinon.spy(console, 'error');
		});

		beforeEach(function () {
			checkIpInListResult = checkIpInList(validList, validAddress, validReturnListIsEmpty);
		});

		afterEach(function () {
		});

		after(function () {
		});

		describe('when returnListIsEmpty is not a boolean', function () {

			before(function () {
				validReturnListIsEmpty = null;
			});

			it('should set returnListIsEmpty to true', function () {
				expect(checkIpInListResult).to.eq(true);
			});
		});

		describe('when validList is not an array', function () {

			before(function () {
				validReturnListIsEmpty = true;
				validList = null;
			});

			it('should return validReturnListIsEmpty', function () {
				expect(checkIpInListResult).to.eq(validReturnListIsEmpty);
			});
		});

		describe('when validList is an empty list', function () {

			before(function () {
				validList = [];
			});

			it('should return validReturnListIsEmpty', function () {
				expect(checkIpInListResult).to.eq(validReturnListIsEmpty);
			});
		});

		describe('when all the entries in validList are not in the right format', function () {

			before(function () {
				validList = ['abc', 'shzduvsg'];
			});

			it('should return validReturnListIsEmpty', function () {
				expect(checkIpInListResult).to.eq(validReturnListIsEmpty);
			});

			it('should call console.error with "CheckIpInList:" + error', function () {
				sinon.assert.called(spyConsoleError);
			});
		});

		describe('when some entries in validList are not in the right format', function () {

			before(function () {
				validList = ['abc', '1.2.3.4'];
			});

			it('should call console.error with "CheckIpInList:" + error', function () {
				sinon.assert.called(spyConsoleError);
			});
		});

		describe('when validList does not contain validAddress', function () {

			before(function () {
				validList = ['1.2.3.4','5.6.7.8'];
				validAddress = '127.0.0.1';
			});

			it('should return validReturnListIsEmpty', function () {
				expect(checkIpInListResult).to.eq(false);
			});
		});

		describe('when validList contains validAddress', function () {

			before(function () {
				validAddress = '1.2.3.4';
			});

			it('should return validReturnListIsEmpty', function () {
				expect(checkIpInListResult).to.eq(true);
			});
		});
	});
});
