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

var ws = require('../../common/ws/communication');

var genesisblock = require('../../data/genesisBlock.json');
var verify = require('../../../modules/blocks/verify');
var bson = require('../../../helpers/bson');

describe('WS transport blocks', function () {

	var testBlock = {
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
		payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		generatorPublicKey: 'bf9f5cfc548d29983cc0dfa5c4ec47c66c31df0f87aa669869678996902ab47f',
		generatorId: '9950029393097476480L',
		blockSignature: 'd54ac91d2f712f408e16ff5057f7ceaa2e3a1ad4bde759e1025b16ec48bdd8ea1d3adaf5e8b94ef205f9f365f6ebae0f178a3cb3f6354c28e74ba7a05fce600c',
		confirmations: 2,
		totalForged: '0'
	};

	describe('blocks', function () {

		it('using valid headers should be ok', function (done) {
			ws.call('blocks', null, function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				res.should.have.property('blocks').that.is.an('array');
				res.blocks.forEach(function (block) {
					block.should.have.property('b_id').that.is.a('string');
					block.should.have.property('b_version').that.is.a('number');
					block.should.have.property('b_timestamp').that.is.a('number');
					block.should.have.property('b_height').that.is.a('number');
					block.should.have.property('b_previousBlock');
					block.should.have.property('b_numberOfTransactions').that.is.a('number');
					block.should.have.property('b_totalAmount').that.is.a('string');
					block.should.have.property('b_totalFee').that.is.a('string');
					block.should.have.property('b_reward').that.is.a('string');
					block.should.have.property('b_payloadLength').that.is.a('number');
					block.should.have.property('b_payloadHash').that.is.a('string');
					block.should.have.property('b_generatorPublicKey').that.is.a('string');
					block.should.have.property('b_blockSignature').that.is.a('string');
					block.should.have.property('t_id');
					block.should.have.property('t_rowId');
					block.should.have.property('t_type');
					block.should.have.property('t_timestamp');
					block.should.have.property('t_senderPublicKey');
					block.should.have.property('t_senderId');
					block.should.have.property('t_recipientId');
					block.should.have.property('t_amount');
					block.should.have.property('t_fee');
					block.should.have.property('t_signature');
					block.should.have.property('t_signSignature');
					block.should.have.property('s_publicKey');
					block.should.have.property('d_username');
					block.should.have.property('v_votes');
					block.should.have.property('m_min');
					block.should.have.property('m_lifetime');
					block.should.have.property('m_keysgroup');
					block.should.have.property('dapp_name');
					block.should.have.property('dapp_description');
					block.should.have.property('dapp_tags');
					block.should.have.property('dapp_type');
					block.should.have.property('dapp_link');
					block.should.have.property('dapp_category');
					block.should.have.property('dapp_icon');
					block.should.have.property('in_dappId');
					block.should.have.property('ot_dappId');
					block.should.have.property('ot_outTransactionId');
					block.should.have.property('t_requesterPublicKey');
					block.should.have.property('t_signatures');
				});
				done();
			});
		});
	});

	describe('blocksCommon', function () {

		it('using no params should fail', function (done) {
			ws.call('blocksCommon', function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				should.not.exist(res);
				err.should.equal('Missing required property: ids: ');
				done();
			});
		});

		it('using ids == "";"";"" should fail', function (done) {
			ws.call('blocksCommon', {ids: '"";"";""'}, function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				err.should.equal('Invalid block id sequence');
				done();
			});
		});

		it('using ids == \'\',\'\',\'\' should fail', function (done) {
			ws.call('blocksCommon',  {ids: '\'\',\'\',\'\''}, function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));

				err.should.equal('Invalid block id sequence');
				done();
			});
		});

		it('using ids == "","","" should fail', function (done) {
			ws.call('blocksCommon', {ids: '"","",""'}, function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				err.should.equal('Invalid block id sequence');
				done();
			});
		});

		it('using ids == one,two,three should fail', function (done) {
			ws.call('blocksCommon', {ids: 'one,two,three'}, function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				err.should.equal('Invalid block id sequence');
				done();
			});
		});

		it('using ids == "1","2","3" should be ok and return null common block', function (done) {
			ws.call('blocksCommon', {ids: '"1","2","3"'}, function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));

				res.should.have.property('common').to.be.null;
				done();
			});
		});

		it('using ids == \'1\',\'2\',\'3\' should be ok and return null common block', function (done) {
			ws.call('blocksCommon', {ids: '\'1\',\'2\',\'3\''}, function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));

				res.should.have.property('common').to.be.null;
				done();
			});
		});

		it('using ids == 1,2,3 should be ok and return null common block', function (done) {
			ws.call('blocksCommon', {ids: '1,2,3'}, function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));

				res.should.have.property('common').to.be.null;
				done();
			});
		});

		it('using ids which include genesisblock.id should be ok', function (done) {
			ws.call('blocksCommon', {ids: [genesisblock.id.toString(),'2','3'].join(',')}, function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));

				res.should.have.property('common').to.be.an('object');
				res.common.should.have.property('height').that.is.a('number');
				res.common.should.have.property('id').that.is.a('string');
				res.common.should.have.property('previousBlock').that.is.null;
				res.common.should.have.property('timestamp').that.is.equal(0);
				done();
			});
		});
	});

	describe('postBlock', function () {

		it('using no block should fail', function (done) {
			ws.call('postBlock', function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				err.should.contain('Failed to validate block schema');
				done();
			});
		});

		it('using invalid block schema should fail', function (done) {
			var blockSignature = genesisblock.blockSignature;
			genesisblock.blockSignature = null;
			genesisblock = verify.prototype.deleteBlockProperties(genesisblock);

			ws.call('postBlock', { block: bson.serialize(genesisblock) }, function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				err.should.contain('Failed to validate block schema');
				genesisblock.blockSignature = blockSignature;
				done();
			});
		});

		it('using valid block schema should be ok', function (done) {
			testBlock.transactions.forEach(function (transaction) {
				if (transaction.asset && transaction.asset.delegate) {
					transaction.asset.delegate.publicKey = transaction.senderPublicKey;
				}
			});
			ws.call('postBlock', { block: bson.serialize(testBlock) }, function (err, res) {
				__testContext.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				res.should.have.property('blockId').to.equal('2807833455815592401');
				done();
			});
		});
	});
});
