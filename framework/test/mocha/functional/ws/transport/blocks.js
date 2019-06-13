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

require('../../functional');
const { P2P } = require('@liskhq/lisk-p2p');
const { generatePeerHeader } = require('../../../common/generatePeerHeader');
const waitFor = require('../../../common/utils/wait_for');
const SwaggerEndpoint = require('../../../common/swagger_spec');

describe('WS transport blocks', () => {
	let p2p;

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

	describe('blocks', () => {
		it('using valid headers should be ok', async () => {
			const blocksEndpoint = new SwaggerEndpoint('GET /blocks');

			const blockRes = await blocksEndpoint.makeRequest({ height: 2 }, 200);
			const blockId = blockRes.body.data[0].id;
			const { data } = await p2p.request({
				procedure: 'blocks',
				data: { lastBlockId: blockId },
			});
			expect(data)
				.to.have.property('blocks')
				.that.is.an('array');
			data.blocks.forEach(block => {
				expect(block)
					.to.have.property('b_id')
					.that.is.a('string');
				expect(block)
					.to.have.property('b_version')
					.that.is.a('number');
				expect(block)
					.to.have.property('b_timestamp')
					.that.is.a('number');
				expect(block)
					.to.have.property('b_height')
					.that.is.a('number');
				expect(block).to.have.property('b_previousBlock');
				expect(block)
					.to.have.property('b_numberOfTransactions')
					.that.is.a('number');
				expect(block)
					.to.have.property('b_totalAmount')
					.that.is.a('string');
				expect(block)
					.to.have.property('b_totalFee')
					.that.is.a('string');
				expect(block)
					.to.have.property('b_reward')
					.that.is.a('string');
				expect(block)
					.to.have.property('b_payloadLength')
					.that.is.a('number');
				expect(block)
					.to.have.property('b_payloadHash')
					.that.is.a('string');
				expect(block)
					.to.have.property('b_generatorPublicKey')
					.that.is.a('string');
				expect(block)
					.to.have.property('b_blockSignature')
					.that.is.a('string');
				expect(block).to.have.property('t_id');
				expect(block).to.have.property('t_type');
				expect(block).to.have.property('t_timestamp');
				expect(block).to.have.property('t_senderPublicKey');
				expect(block).to.have.property('t_senderId');
				expect(block).to.have.property('t_recipientId');
				expect(block).to.have.property('t_amount');
				expect(block).to.have.property('t_fee');
				expect(block).to.have.property('t_signature');
				expect(block).to.have.property('t_signSignature');
				expect(block).to.have.property('s_publicKey');
				expect(block).to.have.property('d_username');
				expect(block).to.have.property('v_votes');
				expect(block).to.have.property('m_min');
				expect(block).to.have.property('m_lifetime');
				expect(block).to.have.property('m_keysgroup');
				expect(block).to.have.property('dapp_name');
				expect(block).to.have.property('dapp_description');
				expect(block).to.have.property('dapp_tags');
				expect(block).to.have.property('dapp_type');
				expect(block).to.have.property('dapp_link');
				expect(block).to.have.property('dapp_category');
				expect(block).to.have.property('dapp_icon');
				expect(block).to.have.property('in_dappId');
				expect(block).to.have.property('ot_dappId');
				expect(block).to.have.property('ot_outTransactionId');
				expect(block).to.have.property('t_requesterPublicKey');
				expect(block).to.have.property('t_signatures');
			});
		});

		it('using empty headers should not be ok', async () => {
			const { data } = await p2p.request({ procedure: 'blocks', data: {} });
			expect(data)
				.to.have.property('success')
				.that.is.a('boolean').and.is.false;
		});

		it('using invalid headers should not be ok', async () => {
			const { data } = await p2p.request({ procedure: 'blocks', data: {} });
			expect(data).to.have.property('success', false);
		});
	});

	describe('getCommonBlocks', () => {
		it('using no params should fail', async () => {
			let res;
			try {
				const { data } = await p2p.request({ procedure: 'getCommonBlocks' });
				res = data;
			} catch (err) {
				__testContext.debug(
					'> Error / Response:'.grey,
					JSON.stringify(err.response),
					JSON.stringify(res)
				);
				expect(err.response.message).to.equal(
					'Missing required property: ids: #/'
				);
				expect(res).to.be.undefined;
			}
		});

		it('using non unique ids should fail', async () => {
			let res;
			try {
				res = await p2p.request({
					procedure: 'getCommonBlocks',
					data: { ids: ['1', '2', '2'] },
				});
			} catch (err) {
				__testContext.debug(
					'> Error / Response:'.grey,
					JSON.stringify(err.response),
					JSON.stringify(res)
				);
				expect(err.response.message).to.equal(
					'Array items are not unique (indexes 1 and 2): #/ids'
				);
			}
		});

		it('using an empty array should fail', async () => {
			let res;
			try {
				res = await p2p.request({
					procedure: 'getCommonBlocks',
					data: { ids: [] },
				});
			} catch (err) {
				__testContext.debug(
					'> Error / Response:'.grey,
					JSON.stringify(err.response),
					JSON.stringify(res)
				);
				expect(err.response.message).to.equal(
					'Array is too short (0), minimum 1: #/ids'
				);
			}
		});

		it('not using an array should fail', async () => {
			let res;
			try {
				res = await p2p.request({
					procedure: 'getCommonBlocks',
					data: { ids: '1,2,3,4,5,6' },
				});
			} catch (err) {
				__testContext.debug(
					'> Error / Response:'.grey,
					JSON.stringify(err.response),
					JSON.stringify(res)
				);
				expect(err.response.message).to.equal(
					'Expected type array but found type string: #/ids'
				);
			}
		});

		it('using ids which include genesisBlock.id should be ok', async () => {
			const { data } = await p2p.request({
				procedure: 'getCommonBlocks',
				data: {
					ids: [__testContext.config.genesisBlock.id.toString(), '2', '3'],
				},
			});
			__testContext.debug('> Error / Response:'.grey, JSON.stringify(data));

			expect(data.length).to.equal(1);
			expect(data[0]).to.equal(__testContext.config.genesisBlock.id.toString());
		});

		it('using ["1","2","3"] should return an empty array (no common blocks)', async () => {
			const { data } = await p2p.request({
				procedure: 'getCommonBlocks',
				data: {
					ids: ['1', '2', '3'],
				},
			});
			__testContext.debug('> Error / Response:'.grey, JSON.stringify(data));

			expect(data).to.be.empty;
		});
	});

	describe('postBlock', () => {
		it('should broadcast valid block', async () => {
			testBlock.transactions.forEach(transaction => {
				if (transaction.asset && transaction.asset.delegate) {
					transaction.asset.delegate.publicKey = transaction.senderPublicKey;
				}
			});
			await p2p.send({ event: 'postBlock', data: { block: testBlock } });
		});
	});
});
