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

describe('duplicate_signatures', () => {
	describe('given signatures are unique', () => {
		describe('ehwn multisignature account registration', () => {
			beforeEach('credit new account');

			it.todo('should add transaction to transaction pool');

			it.todo('should accept all signatures');

			it.todo('should forge a block');
		});

		describe('when spend from multisignature account', () => {
			beforeEach('create multisignature account');

			it.todo('should add transaction to transaction pool');

			it.todo('should accept all signatures');

			it.todo('should forge a block');
		});
	});

	describe('given signatures contains duplicate', () => {
		describe('when multisignature account registration', () => {
			beforeEach('credit new account');

			it.todo('should add transaction to transaction pool');

			it.todo('should reject duplicated signature');

			it.todo('should forge a block');
		});

		describe('when spend from multisignature account', () => {
			beforeEach('create multisignature account');

			it.todo('should add transaction to transaction pool');

			it.todo('should reject duplicated signature');

			it.todo('should forge a block');
		});
	});
});
