/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

var checkIpInList = require('../../../helpers/check_ip_in_list');

describe('checkIpInList', () => {
	describe('CheckIpInList', () => {
		var validReturnListIsEmpty;
		var validList;
		var validAddress;
		var spyConsoleError;
		var checkIpInListResult;

		before(done => {
			validReturnListIsEmpty = true;
			validList = ['1.2.3.4', '5.6.7.8'];
			validAddress = '1.2.3.4';
			spyConsoleError = sinonSandbox.spy(console, 'error');
			done();
		});

		beforeEach(done => {
			checkIpInListResult = checkIpInList(
				validList,
				validAddress,
				validReturnListIsEmpty
			);
			done();
		});

		describe('when returnListIsEmpty is not a boolean', () => {
			before(done => {
				validReturnListIsEmpty = null;
				done();
			});

			it('should set returnListIsEmpty to true', done => {
				expect(checkIpInListResult).to.eq(true);
				done();
			});
		});

		describe('when validList is not an array', () => {
			before(done => {
				validReturnListIsEmpty = true;
				validList = null;
				done();
			});

			it('should return validReturnListIsEmpty', done => {
				expect(checkIpInListResult).to.eq(validReturnListIsEmpty);
				done();
			});
		});

		describe('when validList is an empty list', () => {
			before(done => {
				validList = [];
				done();
			});

			it('should return validReturnListIsEmpty', done => {
				expect(checkIpInListResult).to.eq(validReturnListIsEmpty);
				done();
			});
		});

		describe('when all the entries in validList are not in the right format', () => {
			before(done => {
				validList = ['abc', 'shzduvsg'];
				done();
			});

			it('should return validReturnListIsEmpty', done => {
				expect(checkIpInListResult).to.eq(validReturnListIsEmpty);
				done();
			});

			it('should call console.error with "CheckIpInList:" + error', done => {
				sinonSandbox.assert.called(spyConsoleError);
				done();
			});
		});

		describe('when some entries in validList are not in the right format', () => {
			before(done => {
				validList = ['abc', '1.2.3.4'];
				done();
			});

			it('should call console.error with "CheckIpInList:" + error', done => {
				sinonSandbox.assert.called(spyConsoleError);
				done();
			});
		});

		describe('when validList does not contain validAddress', () => {
			before(done => {
				validList = ['1.2.3.4', '5.6.7.8'];
				validAddress = '127.0.0.1';
				done();
			});

			it('should return validReturnListIsEmpty', done => {
				expect(checkIpInListResult).to.eq(false);
				done();
			});
		});

		describe('when validList contains validAddress', () => {
			before(done => {
				validAddress = '1.2.3.4';
				done();
			});

			it('should return validReturnListIsEmpty', done => {
				expect(checkIpInListResult).to.eq(true);
				done();
			});
		});
	});
});
