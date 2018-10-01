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
	describe('@propagation : multisig transactions', () => {
		let transactions = [];
		const accounts = [];
		const numberOfTransactions = 3;

		const postSignatures = signature => {
			const postSignatures = {
				signatures: [signature],
			};
			return Promise.all(
				network.sockets.map(socket => {
					return socket.emit('postSignatures', postSignatures);
				})
			);
		};

		before(() => {
			return network.waitForAllNodesToBeReady();
		});

		describe('prepare accounts', () => {
			before(() => {
				transactions = [];
				return Promise.all(
					_.range(numberOfTransactions).map(() => {
						const tmpAccount = randomUtil.account();
						const transaction = lisk.transaction.transfer({
							amount: 2500000000,
							passphrase: accountFixtures.genesis.passphrase,
							recipientId: tmpAccount.address,
							ready: true,
						});
						accounts.push(tmpAccount);
						transactions.push(transaction);
						return sendTransactionPromise(transaction);
					})
				);
			});

			it('should confirm all transactions on all nodes', done => {
				// Adding two extra blocks as a safety timeframe
				const blocksToWait =
					Math.ceil(numberOfTransactions / MAX_TRANSACTIONS_PER_BLOCK) + 2;
				network.waitForBlocksOnAllNodes(blocksToWait)
				.then(() => {
					return confirmTransactionsOnAllNodes(transactions, configurations);
				})
				.then(done)
				.catch(done);
			});
		});

		describe('sending multisignature registrations', () => {
			const signatures = [];
			const numbers = _.range(numberOfTransactions);
			let i = 0;
			let j = 0;

			before(() => {
				transactions = [];
				return Promise.all(
					numbers.map(num => {
						i = (num + 1) % numbers.length;
						j = (num + 2) % numbers.length;
						const transaction = lisk.transaction.registerMultisignature({
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
							expect(res.statusCode).to.be.eql(200);
						});
					})
				);
			});

			it('pending multisignatures should remain in the pending queue', () => {
				return Promise.map(transactions, transaction => {
					const parameters = [`id=${transaction.id}`];

					return getPendingMultisignaturesPromise(parameters).then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.data[0].id).to.be.equal(transaction.id);
					});
				});
			});

			it('sending the required signatures in the keysgroup agreement', () => {
				return Promise.all(
					numbers.map(member => {
						postSignatures(signatures[member][0]).then(() => {
							return postSignatures(signatures[member][1]);
						});
					})
				);
			});

			it('check all the nodes received the transactions', done => {
				// Adding two extra blocks as a safety timeframe
				const blocksToWait =
					Math.ceil(numberOfTransactions / MAX_TRANSACTIONS_PER_BLOCK) + 2;
				network.waitForBlocksOnAllNodes(blocksToWait)
					.then(() => {
						return confirmTransactionsOnAllNodes(transactions, configurations);
					})
					.then(done)
					.catch(done);
			});
		});
	});
};
