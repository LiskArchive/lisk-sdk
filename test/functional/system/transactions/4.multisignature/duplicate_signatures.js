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

const Promise = require('bluebird');
const async = require('async');
const elements = require('lisk-elements').default;
const accountsFixtures = require('../../../../fixtures/accounts');
const randomUtil = require('../../../../common/utils/random');
const localCommon = require('../../common');

describe('duplicate_signatures', () => {
	let library;
	let addTransactionsAndForgePromise;
	let transactionPool;

	localCommon.beforeBlock('lisk_functional_duplicate_signatures', lib => {
		library = lib;

		addTransactionsAndForgePromise = Promise.promisify(
			localCommon.addTransactionsAndForge
		);

		transactionPool = library.rewiredModules.transactions.__get__(
			'__private.transactionPool'
		);
	});

	describe('process multiple signatures for the same transaction', () => {
		describe('when signatures are unique', () => {
			describe('during multisignature account registration', () => {
				it('should add transaction to transaction pool', () => {

				});

				it('should accept all signatures', () => {

				});

				it('should forge a block', () => {

				});
			});

			describe('during spend from multisignature account', () => {
				it('should add transaction to transaction pool', () => {

				});

				it('should accept all signatures', () => {

				});

				it('should forge a block', () => {

				});
			});
		});

		describe('when signatures contains duplicate', () => {
			describe('during multisignature account registration', () => {
				it('should add transaction to transaction pool', () => {

				});

				it('should reject duplicated signature', () => {

				});

				it('should forge a block', () => {

				});
			});

			describe('during spend from multisignature account', () => {
				it('should add transaction to transaction pool', () => {

				});

				it('should reject duplicated signature', () => {

				});

				it('should forge a block', () => {

				});
			});
		});
	});
});
