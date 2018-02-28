/* eslint-disable mocha/no-pending-tests, mocha/no-skipped-tests */
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

var crypto = require('crypto');
var lisk = require('lisk-js');
var accountFixtures = require('../../../../fixtures/accounts');
var randomUtil = require('../../../../common/utils/random');
var application = require('../../../../common/application'); // eslint-disable-line no-unused-vars

var previousBlock;

function createBlock(
	blocksModule,
	blockLogic,
	secret,
	timestamp,
	transactions
) {
	var keypair = blockLogic.scope.ed.makeKeypair(
		crypto
			.createHash('sha256')
			.update(secret, 'utf8')
			.digest()
	);
	blocksModule.lastBlock.set(previousBlock);
	var newBlock = blockLogic.create({
		keypair,
		timestamp,
		previousBlock: blocksModule.lastBlock.get(),
		transactions,
	});
	newBlock.id = blockLogic.getId(newBlock);
	newBlock.height = previousBlock ? previousBlock.height + 1 : 1;
	return newBlock;
}

describe('blocks/chain', () => {
	var blocksModule;
	var blocksChainModule;
	var blockLogic;
	var genesisBlock;
	var db;

	before(done => {
		// Force rewards start at 150-th block
		application.init(
			{
				sandbox: { name: 'lisk_test_blocks_chain' },
				waitForGenesisBlock: true,
			},
			(err, scope) => {
				db = scope.db;
				blocksModule = scope.modules.blocks;
				blocksChainModule = scope.modules.blocks.chain;
				blockLogic = scope.logic.block;
				genesisBlock = scope.genesisblock.block;
				blocksModule.onBind(scope.modules);
				blocksChainModule.onBind(scope.modules);

				previousBlock = genesisBlock;

				done();
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('applyBlock', () => {
		var secret =
			'lend crime turkey diary muscle donkey arena street industry innocent network lunar';
		var block;
		var transactions;

		beforeEach(done => {
			transactions = [];
			var account = randomUtil.account();
			var transaction = lisk.transaction.createTransaction(
				account.address,
				randomUtil.number(100000000, 1000000000),
				accountFixtures.genesis.password
			);
			transaction.senderId = accountFixtures.genesis.address;
			transactions.push(transaction);
			done();
		});

		afterEach(done => {
			previousBlock = block;
			done();
		});

		it('should apply a valid block successfully', done => {
			block = createBlock(
				blocksModule,
				blockLogic,
				secret,
				32578370,
				transactions
			);

			blocksChainModule.applyBlock(block, true, err => {
				if (err) {
					return done(err);
				}

				blocksModule.shared.getBlocks({ id: block.id }, (err, data) => {
					expect(data).to.have.lengthOf(1);
					expect(data[0].id).to.be.equal(block.id);
					done(err);
				});
			});
		});

		// TODO: Need to enable it after making block part of the single transaction
		it.skip('should apply block in a single transaction', done => {
			block = createBlock(
				blocksModule,
				blockLogic,
				secret,
				32578370,
				transactions
			);

			db.$config.options.query = function(event) {
				if (
					!(
						event.ctx &&
						event.ctx.isTX &&
						event.ctx.txLevel === 0 &&
						event.ctx.tag === 'Chain:applyBlock'
					)
				) {
					return done(
						`Some query executed outside transaction context: ${event.query}`,
						event
					);
				}
			};

			var connect = sinonSandbox.stub();
			var disconnect = sinonSandbox.stub();

			db.$config.options.connect = connect;
			db.$config.options.disconnect = disconnect;

			blocksChainModule.applyBlock(block, true, err => {
				if (err) {
					done(err);
				}

				expect(connect.calledOnce).to.be.true;
				expect(disconnect.calledOnce).to.be.true;

				delete db.$config.options.connect;
				delete db.$config.options.disconnect;
				delete db.$config.options.query;

				blocksModule.shared.getBlocks({ id: block.id }, err => {
					done(err);
				});
			});
		});
	});
});
