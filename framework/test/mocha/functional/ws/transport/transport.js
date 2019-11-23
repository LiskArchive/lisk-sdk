/*
 * Copyright © 2019 Lisk Foundation
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

require('../../functional');
const { P2P } = require('@liskhq/lisk-p2p');
const { transfer } = require('@liskhq/lisk-transactions');
const { generatePeerHeader } = require('../../../common/generatePeerHeader');
const waitFor = require('../../../common/utils/wait_for');
const SwaggerEndpoint = require('../../../common/swagger_spec');
const randomUtil = require('../../../common/utils/random');
const accountFixtures = require('../../../fixtures/accounts');
const apiHelpers = require('../../../common/helpers/api');
const { getNetworkIdentifier } = require('../../../common/network_identifier');

const { MAX_TRANSACTIONS_PER_BLOCK } = __testContext.config.constants;

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

describe('WS transport', () => {
	let p2p;
	let transaction;

	before('establish client WS connection to server', async () => {
		// Setup stub for blocks endpoints
		p2p = new P2P(generatePeerHeader());
		await p2p.start();

		await waitFor.blocksPromise(1, null);
	});

	after(async () => {
		await p2p.stop();
	});

	const testBlock = {
		id: '2807833455815592401',
		version: 0,
		timestamp: 39997040,
		height: 1258,
		previousBlock: '3863141986505461614',
		numberOfTransactions: 0,
		transactions: [],
		totalAmount: 0,
		totalFee: 0,
		reward: 0,
		payloadLength: 0,
		payloadHash:
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		generatorPublicKey:
			'bf9f5cfc548d29983cc0dfa5c4ec47c66c31df0f87aa669869678996902ab47f',
		generatorId: '9950029393097476480L',
		blockSignature:
			'd54ac91d2f712f408e16ff5057f7ceaa2e3a1ad4bde759e1025b16ec48bdd8ea1d3adaf5e8b94ef205f9f365f6ebae0f178a3cb3f6354c28e74ba7a05fce600c',
		confirmations: 2,
		totalForged: '0',
	};

	describe('getBlocksFromId', () => {
		it('should return height', async () => {
			const blocksEndpoint = new SwaggerEndpoint('GET /blocks');
			const blockRes = await blocksEndpoint.makeRequest({ height: 2 }, 200);
			const blockId = blockRes.body.data[0].id;
			const { data } = await p2p.request({
				procedure: 'getBlocksFromId',
				data: { blockId },
			});
			expect(data).to.be.an('array');
		});

		it('should be ok to use a valid payload', async () => {
			const blocksEndpoint = new SwaggerEndpoint('GET /blocks');

			const blockRes = await blocksEndpoint.makeRequest({ height: 2 }, 200);
			const blockId = blockRes.body.data[0].id;
			const { data } = await p2p.request({
				procedure: 'getBlocksFromId',
				data: { blockId },
			});
			expect(data).that.is.an('array');
			for (const block of data) {
				expect(block)
					.to.have.property('id')
					.that.is.a('string');
				expect(block)
					.to.have.property('version')
					.that.is.a('number');
				expect(block)
					.to.have.property('timestamp')
					.that.is.a('number');
				expect(block)
					.to.have.property('height')
					.that.is.a('number');
				expect(block).to.have.property('previousBlockId');
				expect(block)
					.to.have.property('numberOfTransactions')
					.that.is.a('number');
				expect(block)
					.to.have.property('totalAmount')
					.that.is.a('string');
				expect(block)
					.to.have.property('totalFee')
					.that.is.a('string');
				expect(block)
					.to.have.property('reward')
					.that.is.a('string');
				expect(block)
					.to.have.property('payloadLength')
					.that.is.a('number');
				expect(block)
					.to.have.property('payloadHash')
					.that.is.a('string');
				expect(block)
					.to.have.property('generatorPublicKey')
					.that.is.a('string');
				expect(block)
					.to.have.property('blockSignature')
					.that.is.a('string');
				expect(block)
					.to.have.property('transactions')
					.that.is.an('array');
			}
		});
	});

	describe('getTransactions', () => {
		describe('when any transaction exists in the database', () => {
			beforeEach(async () => {
				const accountAdditionalData = randomUtil.account();
				transaction = transfer({
					networkIdentifier,
					amount: '1',
					passphrase: accountFixtures.genesis.passphrase,
					recipientId: accountAdditionalData.address,
				});

				await apiHelpers.sendTransactionPromise(transaction);
				return waitFor.blocksPromise(1, null);
			});

			it('should return object containing an array of transactions', async () => {
				const { data } = await p2p.request({
					procedure: 'getTransactions',
					data: { transactionIds: [transaction.id] },
				});
				expect(data).to.have.property('transactions');
				expect(data.transactions).to.be.an('array').not.empty;
				expect(data.transactions[0])
					.to.have.property('id')
					.equal(transaction.id);
			});
		});

		describe('when any transaction is in the queues', () => {
			let transactionInQueues;
			before(async () => {
				let accountAdditionalData;
				transactionInQueues = [];
				for (let i = 0; i < MAX_TRANSACTIONS_PER_BLOCK * 2; i++) {
					accountAdditionalData = randomUtil.account();
					transaction = transfer({
						networkIdentifier,
						amount: '1',
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: accountAdditionalData.address,
					});
					transactionInQueues.push(transaction);
					await apiHelpers.sendTransactionPromise(transaction);
				}
			});

			it('should return object containing an array with one transaction', async () => {
				const { data } = await p2p.request({
					procedure: 'getTransactions',
					data: {
						transactionIds: [
							transactionInQueues[transactionInQueues.length - 1].id,
						],
					},
				});
				expect(data).to.have.property('transactions');
				expect(data.transactions).to.be.an('array').not.empty;
				expect(data.transactions[0])
					.to.have.property('id')
					.equal(transaction.id);
			});

			it('should return object containing an array with several transactions', async () => {
				const { data } = await p2p.request({
					procedure: 'getTransactions',
					data: {
						transactionIds: [
							transactionInQueues[transactionInQueues.length - 1].id,
							transactionInQueues[transactionInQueues.length - 2].id,
						],
					},
				});
				expect(data).to.have.property('transactions');
				expect(data.transactions).to.have.length(2);
				expect(data.transactions[0])
					.to.have.property('id')
					.equal(transactionInQueues[transactionInQueues.length - 1].id);
				expect(data.transactions[1])
					.to.have.property('id')
					.equal(transactionInQueues[transactionInQueues.length - 2].id);
			});
		});

		describe('when all the transactions ids are unknown', () => {
			it('should return object containing an array of empty transactions', async () => {
				const { data } = await p2p.request({
					procedure: 'getTransactions',
					data: {
						transactionIds: ['10000000000000000000', '9600000000000000000'],
					},
				});
				expect(data).to.have.property('transactions');
				expect(data.transactions).to.be.an.empty('array');
			});
		});
	});

	describe('getHighestCommonBlock', () => {
		it('using ["1","2","3"] should return an empty array (no common blocks)', async () => {
			const { data } = await p2p.request({
				procedure: 'getHighestCommonBlock',
				data: {
					ids: ['1', '2', '3'],
				},
			});
			__testContext.debug('> Error / Response:'.grey, JSON.stringify(data));
			expect(data).to.be.undefined;
		});
	});

	describe('postBlock', () => {
		it('should broadcast valid block', async () => {
			testBlock.transactions.forEach(_transaction => {
				if (_transaction.asset && _transaction.asset.delegate) {
					_transaction.asset.delegate.publicKey = _transaction.senderPublicKey;
				}
			});
			await p2p.send({ event: 'postBlock', data: { block: testBlock } });
		});
	});

	describe('postSignatures', () => {
		it('should not crash the application when sending the correct signatures', async () => {
			await p2p.send({
				event: 'postSignatures',
				data: {
					signatures: [
						{
							signature:
								'60d28cfbb67ee0dd7f4cc5c5b686445bf66883276f05136f605d77f7b1c6316587b752624379e26fa2a4e247cc49a60fce57fa7c43a28afb8152262364e00d01',
							transactionId: '15778222267241153095',
							publicKey:
								'633698916662935403780f04fd01119f32f9cd180a3b104b67c5ae5ebb6d5593',
						},
					],
				},
			});
		});
	});
});
