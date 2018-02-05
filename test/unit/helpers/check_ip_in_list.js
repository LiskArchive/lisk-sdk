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

		before(() => {
			validReturnListIsEmpty = true;
			validList = ['1.2.3.4', '5.6.7.8'];
			validAddress = '1.2.3.4';
			spyConsoleError = sinonSandbox.spy(console, 'error');
		});

		beforeEach(() => {
			checkIpInListResult = checkIpInList(
				validList,
				validAddress,
				validReturnListIsEmpty
			);
		});

		afterEach(() => {});

		after(() => {});

		describe('when returnListIsEmpty is not a boolean', () => {
			before(() => {
				validReturnListIsEmpty = null;
			});

			it('should set returnListIsEmpty to true', () => {
				expect(checkIpInListResult).to.eq(true);
			});
		});

		describe('when validList is not an array', () => {
			before(() => {
				validReturnListIsEmpty = true;
				validList = null;
			});

			it('should return validReturnListIsEmpty', () => {
				expect(checkIpInListResult).to.eq(validReturnListIsEmpty);
			});
		});

		describe('when validList is an empty list', () => {
			before(() => {
				validList = [];
			});

			it('should return validReturnListIsEmpty', () => {
				expect(checkIpInListResult).to.eq(validReturnListIsEmpty);
			});
		});

		describe('when all the entries in validList are not in the right format', () => {
			before(() => {
				validList = ['abc', 'shzduvsg'];
			});

			it('should return validReturnListIsEmpty', () => {
				expect(checkIpInListResult).to.eq(validReturnListIsEmpty);
			});

			it('should call console.error with "CheckIpInList:" + error', () => {
				sinonSandbox.assert.called(spyConsoleError);
			});
		});

		describe('when some entries in validList are not in the right format', () => {
			before(() => {
				validList = ['abc', '1.2.3.4'];
			});

			it('should call console.error with "CheckIpInList:" + error', () => {
				sinonSandbox.assert.called(spyConsoleError);
			});
		});

		describe('when validList does not contain validAddress', () => {
			before(() => {
				validList = ['1.2.3.4', '5.6.7.8'];
				validAddress = '127.0.0.1';
			});

			it('should return validReturnListIsEmpty', () => {
				expect(checkIpInListResult).to.eq(false);
			});
		});

		describe('when validList contains validAddress', () => {
			before(() => {
				validAddress = '1.2.3.4';
			});

			it('should return validReturnListIsEmpty', () => {
				expect(checkIpInListResult).to.eq(true);
			});
		});
	});
});
