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
const {
	transfer,
	registerMultisignature,
} = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../../../fixtures/accounts');
const randomUtil = require('../../../../../common/utils/random');
const {
	createSignatureObject,
	sendTransactionPromise,
	getPendingMultisignaturesPromise,
} = require('../../../../../common/helpers/api');
const confirmTransactionsOnAllNodes = require('../../../../utils/transactions')
	.confirmTransactionsOnAllNodes;

const { MAX_TRANSACTIONS_PER_BLOCK } = __testContext.config.constants;

module.exports = function(configurations, network) {
	// TODO: Unskip this test once we have transitioned to the new config format.
	// eslint-disable-next-line mocha/no-skipped-tests
	describe.skip('@propagation : multisig transactions', () => {
		let transactions = [];
		const accounts = [];
		const numberOfTransactions = 3;
		const signatures = [];
		const numbers = _.range(numberOfTransactions);
		// Adding two extra blocks as a safety timeframe
		const blocksToWait =
			Math.ceil(numberOfTransactions / MAX_TRANSACTIONS_PER_BLOCK) + 2;

		const postSignatures = signature => {
			const signaturesToPost = {
				signatures: [signature],
			};
			return Promise.all(
				network.sockets.map(socket => {
					return socket.emit('postSignatures', signaturesToPost);
				})
			);
		};

		describe('prepare accounts', () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(numberOfTransactions).map(() => {
						const tmpAccount = randomUtil.account();
						const transaction = transfer({
							amount: '2500000000',
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: tmpAccount.address,
							ready: true,
						});
						accounts.push(tmpAccount);
						transactions.push(transaction);
						return sendTransactionPromise(transaction);
					})
				).then(() => {
					return network.waitForBlocksOnAllNodes(blocksToWait);
				});
			});

			it('should confirm all transactions on all nodes', async () => {
				return confirmTransactionsOnAllNodes(transactions, configurations);
			});
		});

		describe('sending multisignature registrations', () => {
			before(() => {
				let i = 0;
				let j = 0;
				transactions = [];
				return Promise.all(
					numbers.map(num => {
						i = (num + 1) % numbers.length;
						j = (num + 2) % numbers.length;
						const transaction = registerMultisignature({
							keysgroup: [accounts[i].publicKey, accounts[j].publicKey],
							lifetime: 24,
							minimum: 1,
							passphrase: accounts[num].passphrase,
						});
						transactions.push(transaction);
						signatures.push([
							createSignatureObject(transaction, accounts[i]),
							createSignatureObject(transaction, accounts[j]),
						]);
						return sendTransactionPromise(transaction).then(res => {
							expect(res.statusCode).to.equal(200);
						});
					})
				).then(() => {
					return network.waitForBlocksOnAllNodes(blocksToWait);
				});
			});

			it('pending multisignatures should remain in the pending queue', async () => {
				return Promise.map(transactions, transaction => {
					const parameters = [`id=${transaction.id}`];

					return getPendingMultisignaturesPromise(parameters).then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.data[0].id).to.be.equal(transaction.id);
					});
				});
			});
		});

		describe('sending signatures for the multisig registration', () => {
			before(() => {
				return Promise.all(
					numbers.map(member => {
						return postSignatures(signatures[member][0]).then(() => {
							return postSignatures(signatures[member][1]);
						});
					})
				).then(() => {
					return network.waitForBlocksOnAllNodes(blocksToWait);
				});
			});

			it('check all the nodes received the transactions', async () => {
				return confirmTransactionsOnAllNodes(transactions, configurations);
			});
		});
	});
};
