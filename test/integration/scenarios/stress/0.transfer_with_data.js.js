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
const lisk = require('lisk-elements').default;
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const waitFor = require('../../../common/utils/wait_for');
const sendTransactionsPromise = require('../../../common/helpers/api')
	.sendTransactionsPromise;
const confirmTransactionsOnAllNodes = require('../../utils/transactions')
	.confirmTransactionsOnAllNodes;

const constants = __testContext.config.constants;

module.exports = function(
	configurations,
	TOTAL_PEERS,
	EXPECTED_OUTOGING_CONNECTIONS,
	BROADCASTING,
	NUMBER_OF_TRANSACTIONS
) {
	describe('@stress : type 0 transactions with data @slow', () => {
		let transactions = [];
		const waitForExtraBlocks = BROADCASTING ? 4 : 10; // Wait for extra blocks to ensure all the transactions are included in the blockchain

		describe(`sending ${NUMBER_OF_TRANSACTIONS} single transfers to random addresses`, () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(NUMBER_OF_TRANSACTIONS).map(() => {
						const transaction = lisk.transaction.transfer({
							amount: 500000000,
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: randomUtil.account().address,
							data: randomUtil.dataField(64),
						});
						transactions.push(transaction);
						return sendTransactionsPromise([transaction]);
					})
				);
			});

			it('should confirm all transactions on all nodes', done => {
				const blocksToWait =
					Math.ceil(
						NUMBER_OF_TRANSACTIONS / constants.maxTransactionsPerBlock
					) + waitForExtraBlocks;
				waitFor.blocks(blocksToWait, () => {
					confirmTransactionsOnAllNodes(transactions, configurations)
						.then(done)
						.catch(err => {
							done(err);
						});
				});
			});
		});
	});
};
