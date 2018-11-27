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

const ed = require('../../../../helpers/ed.js');
const DBSandbox = require('../../../common/db_sandbox').DBSandbox;
const blocksFixtures = require('../../../fixtures').blocks;
const accountsFixtures = require('../../../fixtures').accounts;
const sql = require('../../../../db/sql').blocks;
const seeder = require('../../../common/db_seed');

const numSeedRecords = 5;

let db;
let dbSandbox;

const blockListFields = [
	'b_blockSignature',
	'b_generatorPublicKey',
	'b_height',
	'b_id',
	'b_numberOfTransactions',
	'b_payloadHash',
	'b_payloadLength',
	'b_previousBlock',
	'b_reward',
	'b_timestamp',
	'b_totalAmount',
	'b_totalFee',
	'b_version',
	'd_username',
	'dapp_category',
	'dapp_description',
	'dapp_icon',
	'dapp_link',
	'dapp_name',
	'dapp_tags',
	'dapp_type',
	'in_dappId',
	'm_keysgroup',
	'm_lifetime',
	'm_min',
	'ot_dappId',
	'ot_outTransactionId',
	's_publicKey',
	't_amount',
	't_fee',
	't_id',
	't_recipientId',
	't_requesterPublicKey',
	't_rowId',
	't_senderId',
	't_senderPublicKey',
	't_signSignature',
	't_signature',
	't_signatures',
	't_timestamp',
	't_type',
	'tf_data',
	'v_votes',
];

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(__testContext.config.db, 'lisk_test_db_blocks');

		dbSandbox.create((err, __db) => {
			db = __db;

			done(err);
		});
	});

	after(done => {
		dbSandbox.destroy();
		done();
	});

	beforeEach(done => {
		seeder
			.seed(db)
			.then(() => done())
			.catch(done);
	});

	afterEach(done => {
		sinonSandbox.restore();
		seeder
			.reset(db)
			.then(() => done(null))
			.catch(done);
	});

	it('should initialize db.blocks repo', done => {
		expect(db.blocks).to.be.not.null;
		done();
	});

	describe('BlocksRepository', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(db.blocks.db).to.be.eql(db);
				expect(db.blocks.pgp).to.be.eql(db.$config.pgp);
				expect(db.blocks.dbTable).to.be.eql('blocks');

				expect(db.blocks.dbFields).to.be.eql([
					'id',
					'version',
					'timestamp',
					'height',
					'previousBlock',
					'numberOfTransactions',
					'totalAmount',
					'totalFee',
					'reward',
					'payloadLength',
					'payloadHash',
					'generatorPublicKey',
					'blockSignature',
				]);

				expect(db.blocks.sortFields).to.be.eql([
					'id',
					'timestamp',
					'height',
					'previousBlock',
					'totalAmount',
					'totalFee',
					'reward',
					'numberOfTransactions',
					'generatorPublicKey',
				]);
				expect(db.blocks.cs).to.an('object');
				expect(db.blocks.cs).to.have.all.keys(['insert']);
				return expect(db.blocks.cs.insert.columns.map(c => c.name)).to.be.eql([
					'id',
					'version',
					'timestamp',
					'height',
					'previousBlock',
					'numberOfTransactions',
					'totalAmount',
					'totalFee',
					'reward',
					'payloadLength',
					'payloadHash',
					'generatorPublicKey',
					'blockSignature',
				]);
			});
		});

		describe('getGenesisBlock()', () => {
			it('should use the correct SQL file with no parameters', function*() {
				sinonSandbox.spy(db, 'any');
				yield db.blocks.getGenesisBlock();

				expect(db.any.firstCall.args[0]).to.eql(sql.getGenesisBlock);
				expect(db.any.firstCall.args[1]).to.eql(undefined);
				return expect(db.any).to.be.calledOnce;
			});

			it('should return genesis block with correct values', function*() {
				const genesisBlock = yield db.blocks.getGenesisBlock();

				expect(genesisBlock).to.not.be.empty;
				expect(genesisBlock).to.have.lengthOf(1);
				expect(genesisBlock[0]).to.have.all.keys(
					'id',
					'payloadHash',
					'blockSignature'
				);

				const payloadHash = genesisBlock[0].payloadHash.toString('hex');

				return expect(payloadHash).to.be.eql(__testContext.config.nethash);
			});
		});

		describe('getGenesisBlockId()', () => {
			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'query');
				yield db.blocks.getGenesisBlockId('1111111');

				expect(db.query.firstCall.args[0]).to.eql(sql.getGenesisBlockId);
				expect(db.query.firstCall.args[1]).to.eql(['1111111']);
				return expect(db.query).to.be.calledOnce;
			});

			it('should return block id if block exists for given id', function*() {
				const genesisBlock = blocksFixtures.GenesisBlock();
				const block = yield db.blocks.getGenesisBlockId(genesisBlock.id);

				expect(block).to.be.not.empty;
				expect(block).to.be.an('array');
				expect(block).to.have.lengthOf(1);
				return expect(block[0].id).to.be.eql(genesisBlock.id);
			});

			it('should return empty array if block does not exist for given id', function*() {
				const block = yield db.blocks.getGenesisBlockId('111111');

				expect(block).to.be.empty;
				return expect(block).to.be.an('array');
			});
		});

		describe('deleteBlock()', () => {
			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.blocks.deleteBlock('1111111');

				expect(db.none.firstCall.args[0]).to.eql(sql.deleteBlock);
				expect(db.none.firstCall.args[1]).to.eql(['1111111']);
				return expect(db.none).to.be.calledOnce;
			});

			it('should delete a block for given id if it exists', function*() {
				const genesisBlock = blocksFixtures.GenesisBlock();
				const before = yield db.one(
					'SELECT count(*) from blocks WHERE id = $1',
					[genesisBlock.id]
				);
				const status = yield db.blocks.deleteBlock(genesisBlock.id);
				const after = yield db.one(
					'SELECT count(*) from blocks WHERE id = $1',
					[genesisBlock.id]
				);

				expect(before.count).to.be.equal('1');
				expect(status).to.be.null;
				return expect(after.count).to.be.equal('0');
			});

			it('should not throw an error if a block with given id does not exist', () => {
				return expect(db.blocks.deleteBlock('111111')).to.be.eventually.equal(
					null
				);
			});
		});

		describe('deleteBlocksAfterHeight()', () => {
			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.blocks.deleteBlocksAfterHeight(1);

				expect(db.none.firstCall.args[0]).to.eql(sql.deleteBlocksAfterHeight);
				expect(db.none.firstCall.args[1]).to.eql({ height: 1 });
				return expect(db.none).to.be.calledOnce;
			});

			it('should delete blocks above provided height', function*() {
				const before = yield db.query('SELECT * FROM blocks');
				const result = yield db.blocks.deleteBlocksAfterHeight(2);
				const after = yield db.query('SELECT * FROM blocks');

				// Assuming that we seed 5 blocks
				expect(before).to.have.lengthOf(numSeedRecords);

				// Truncation does not resolve to any result
				expect(result).to.be.eql(null);

				// After truncation we will have two records for height below equal to particular height
				expect(after).to.have.lengthOf(2);
				return expect(after.map(b => b.height)).to.be.eql([1, 2]);
			});

			it('should resolve with null if block with particular height does not exists', () => {
				return expect(
					db.blocks.deleteBlocksAfterHeight(1234)
				).to.be.eventually.eql(null);
			});
		});

		describe('aggregateBlocksReward()', () => {
			it('should use the correct SQL file with three parameters', function*() {
				sinonSandbox.spy(db, 'query');
				const params = {
					generatorPublicKey: 'afafafafaf',
					start: (+new Date() / 1000).toFixed(),
					end: (+new Date() / 1000).toFixed(),
				};
				yield db.blocks.aggregateBlocksReward(params);

				expect(db.query.firstCall.args[0]).to.eql(sql.aggregateBlocksReward);
				expect(db.query.firstCall.args[1]).to.eql([
					params.generatorPublicKey,
					params.start,
					params.end,
				]);
				return expect(db.query).to.be.calledOnce;
			});

			it('should throw error if invalid public key is passed', () => {
				return expect(
					db.blocks.aggregateBlocksReward({
						generatorPublicKey: 'xxxxxxxxx',
						start: (+new Date() / 1000).toFixed(),
						end: (+new Date() / 1000).toFixed(),
					})
				).to.be.eventually.rejectedWith('invalid hexadecimal digit: "x"');
			});

			it('should return empty data set if a valid but non existant key is passed', function*() {
				const account = accountsFixtures.Account();
				const rewards = yield db.blocks.aggregateBlocksReward({
					generatorPublicKey: account.publicKey,
					start: (+new Date() / 1000).toFixed(),
					end: (+new Date() / 1000).toFixed(),
				});
				expect(rewards).to.be.not.empty;
				expect(rewards).to.be.an('array');
				expect(rewards[0]).to.have.all.keys(
					'delegate',
					'count',
					'fees',
					'rewards'
				);
				expect(rewards[0].count).to.be.eql('0');
				expect(rewards[0].delegate).to.be.null;
				expect(rewards[0].fees).to.be.null;
				return expect(rewards[0].rewards).to.be.null;
			});

			it('should return empty data set if a valid public key of a non-delegate account is passed', function*() {
				const account = accountsFixtures.Account({ isDelegate: false });
				yield db.accounts.insert(account);

				const rewards = yield db.blocks.aggregateBlocksReward({
					generatorPublicKey: account.publicKey,
					start: (+new Date() / 1000).toFixed(),
					end: (+new Date() / 1000).toFixed(),
				});
				expect(rewards).to.be.not.empty;
				expect(rewards).to.be.an('array');
				expect(rewards[0]).to.have.all.keys(
					'delegate',
					'count',
					'fees',
					'rewards'
				);
				expect(rewards[0].count).to.be.eql('0');
				expect(rewards[0].delegate).to.be.null;
				expect(rewards[0].fees).to.be.null;
				return expect(rewards[0].rewards).to.be.null;
			});

			it('should aggregate rewards and response in valid format', function*() {
				const account = yield db.one(
					'SELECT encode("publicKey", \'hex\') as "publicKey" FROM mem_accounts LIMIT 1'
				);
				const rewards = yield db.blocks.aggregateBlocksReward({
					generatorPublicKey: account.publicKey,
					start: (+new Date('2017.01.01') / 1000).toFixed(),
					end: (+new Date() / 1000).toFixed(),
				});

				expect(rewards).to.be.not.empty;
				expect(rewards).to.be.an('array');
				return expect(rewards[0]).to.have.all.keys(
					'delegate',
					'count',
					'fees',
					'rewards'
				);
			});
		});

		describe('count()', () => {
			it('should use the correct SQL file with no parameters', function*() {
				sinonSandbox.spy(db, 'one');
				yield db.blocks.count();

				expect(db.one.firstCall.args[0]).to.eql(sql.count);
				expect(db.one.firstCall.args[1]).to.eql([]);
				return expect(db.one).to.be.calledOnce;
			});

			it('should return integer type count of total blocks', function*() {
				const count = yield db.blocks.count();

				expect(count).to.be.an('number');
				return expect(count).to.be.eql(5); // Number of blocks in seed (db_seed.js#23)
			});
		});

		describe('list()', () => {
			it('should use a function with provided parameters', function*() {
				sinonSandbox.spy(db, 'any');
				const params = {
					where: '',
					sortField: '',
					limit: 10,
					offset: 0,
				};
				yield db.blocks.list(params);

				expect(db.any.firstCall.args[0]).to.be.a('function');
				expect(db.any.firstCall.args[1]).to.eql(params);
				return expect(db.any).to.be.calledOnce;
			});

			it('should be rejected with error if where param is not provided as array', () => {
				return expect(
					db.blocks.list({ where: "b_id = '1111'", offset: 0, limit: 1 })
				).to.be.eventually.rejectedWith('Invalid parameter "where" provided.');
			});

			it('should be rejected with error if limit parameter is not specified', () => {
				return expect(
					db.blocks.list({ offset: 0 })
				).to.be.eventually.rejectedWith("Property 'limit' doesn't exist.");
			});

			it('should be rejected with error if offset parameter is not specified', () => {
				return expect(
					db.blocks.list({ limit: 10 })
				).to.be.eventually.rejectedWith("Property 'offset' doesn't exist.");
			});

			it('should return blocks with valid format', function*() {
				const blocks = yield db.blocks.list({ limit: 1, offset: 0 });

				expect(blocks).to.be.an('array');
				expect(blocks).to.have.lengthOf(1);
				return expect(blocks[0]).to.have.all.keys([
					'b_blockSignature',
					'b_confirmations',
					'b_generatorPublicKey',
					'b_height',
					'b_id',
					'b_numberOfTransactions',
					'b_payloadHash',
					'b_payloadLength',
					'b_previousBlock',
					'b_reward',
					'b_timestamp',
					'b_totalAmount',
					'b_totalFee',
					'b_version',
				]);
			});

			it('should paginate the blocks properly', function*() {
				const firstResult = yield db.blocks.list({ limit: 2, offset: 0 });
				const secondResult = yield db.blocks.list({ limit: 2, offset: 1 });

				return expect(firstResult[1]).to.be.eql(secondResult[0]);
			});

			it('should return valid blocks for single condition', function*() {
				const genesisBlock = blocksFixtures.GenesisBlock();
				const result = yield db.blocks.list({
					where: [`b_id = '${genesisBlock.id}'`],
					limit: 10,
					offset: 0,
				});

				expect(result.length).to.be.above(0);

				return result.forEach(block => {
					expect(block.b_id).to.be.eql(genesisBlock.id);
				});
			});

			it('should return valid response with composite conditions joining with AND', function*() {
				const genesisBlock = blocksFixtures.GenesisBlock();
				const result = yield db.blocks.list({
					where: [`b_id = '${genesisBlock.id}'`, 'b_height = 2'],
					limit: 10,
					offset: 0,
				});

				return expect(result).to.be.empty;
			});

			it('should return blocks with valid ascending sorting order ', function*() {
				const result = yield db.blocks.list({
					sortField: 'b_height',
					sortMethod: 'ASC',
					limit: 10,
					offset: 0,
				});

				expect(result.length).to.be.above(0);
				return expect(result).to.be.eql(
					_(result)
						.orderBy('b_height', 'asc')
						.value()
				);
			});

			it('should return blocks with valid descending sorting order ', function*() {
				const result = yield db.blocks.list({
					sortField: 'b_height',
					sortMethod: 'DESC',
					limit: 10,
					offset: 0,
				});

				expect(result.length).to.be.above(0);
				return expect(result).to.be.eql(
					_(result)
						.orderBy('b_height', 'desc')
						.value()
				);
			});
		});

		describe('getIdSequence()', () => {
			it('should use the correct SQL file with no parameters', function*() {
				sinonSandbox.spy(db, 'any');

				const params = {
					delegates: 1,
					height: 1,
					limit: 1,
				};
				yield db.blocks.getIdSequence(params);

				expect(db.any.firstCall.args[0]).to.eql(sql.getIdSequence);
				expect(db.any.firstCall.args[1]).to.eql(params);
				return expect(db.any).to.be.calledOnce;
			});

			it('should be rejected if required param "delegates" is missing', () => {
				return expect(
					db.blocks.getIdSequence({
						height: 1,
						limit: 1,
					})
				).to.be.eventually.rejectedWith("Property 'delegates' doesn't exist.");
			});

			it('should be rejected if required param "limit" is missing', () => {
				return expect(
					db.blocks.getIdSequence({
						delegates: 1,
						height: 1,
					})
				).to.be.eventually.rejectedWith("Property 'limit' doesn't exist.");
			});

			it('should be rejected if required param "height" is missing', () => {
				return expect(
					db.blocks.getIdSequence({
						delegates: 1,
						limit: 1,
					})
				).to.be.eventually.rejectedWith("Property 'height' doesn't exist.");
			});

			it('should return response with valid format', function*() {
				const params = {
					delegates: 2,
					height: 2,
					limit: 2,
				};
				const sequence = yield db.blocks.getIdSequence(params);

				expect(sequence).to.be.not.empty;
				return expect(sequence).to.be.an('array');
			});
		});

		describe('getCommonBlock()', () => {
			it('should call SQL file with parameters', function*() {
				sinonSandbox.spy(db, 'any');

				const params = {
					id: '1111',
					height: 1,
					previousBlock: '6524861224470851795',
				};
				yield db.blocks.getCommonBlock(params);

				expect(db.any.firstCall.args[0]).to.eql(sql.getCommonBlock);
				expect(db.any.firstCall.args[1]).to.eql(params);
				return expect(db.any).to.be.calledOnce;
			});

			it('should be rejected if required param "id" is missing', () => {
				return expect(
					db.blocks.getCommonBlock({
						height: 1,
					})
				).to.be.eventually.rejectedWith("Property 'id' doesn't exist.");
			});

			it('should be rejected if required param "height" is missing', () => {
				return expect(
					db.blocks.getCommonBlock({
						id: '111111',
					})
				).to.be.eventually.rejectedWith("Property 'height' doesn't exist.");
			});

			it('should be rejected if required param "previousBlock" is missing', () => {
				return expect(
					db.blocks.getCommonBlock({
						id: '111111',
						height: 1,
					})
				).to.be.eventually.rejectedWith(
					"Property 'previousBlock' doesn't exist."
				);
			});

			it('should return the count of blocks matching the id and height', function*() {
				const params = {
					id: blocksFixtures.GenesisBlock().id,
					height: 1,
					previousBlock: null,
				};
				const commonBlock = yield db.blocks.getCommonBlock(params);

				expect(commonBlock).to.be.not.empty;
				expect(commonBlock).to.be.an('array');
				expect(commonBlock).to.be.lengthOf(1);
				expect(commonBlock[0]).to.have.all.keys('count');
				return expect(commonBlock[0].count).to.be.eql(0);
			});

			it('should return the count of blocks matching "previousBlock", "id" and "height" condition', function*() {
				const params = {
					id: blocksFixtures.GenesisBlock().id,
					height: 1,
					previousBlock: '111111',
				};
				const commonBlock = yield db.blocks.getCommonBlock(params);

				expect(commonBlock).to.be.not.empty;
				expect(commonBlock).to.be.an('array');
				expect(commonBlock).to.be.lengthOf(1);
				expect(commonBlock[0]).to.have.all.keys('count');
				return expect(commonBlock[0].count).to.be.eql(0);
			});
		});

		describe('getHeightByLastId()', () => {
			it('should use the correct SQL file with no parameters', function*() {
				sinonSandbox.spy(db, 'query');

				yield db.blocks.getHeightByLastId('11111');

				expect(db.query.firstCall.args[0]).to.eql(sql.getHeightByLastId);
				expect(db.query.firstCall.args[1]).to.eql(['11111']);
				return expect(db.query).to.be.calledOnce;
			});

			it('should be fulfilled with empty response if required param "lastId" is missing', () => {
				return expect(db.blocks.getHeightByLastId()).to.be.eventually.eql([]);
			});

			it('should resolve with correct height of the given block id', function*() {
				const genesisBlock = blocksFixtures.GenesisBlock();
				const height = yield db.blocks.getHeightByLastId(genesisBlock.id);

				expect(height).to.be.not.empty;
				expect(height).to.be.an('array');
				expect(height).to.be.lengthOf(1);
				expect(height[0]).to.have.all.keys('height');
				return expect(height[0].height).to.be.eql(genesisBlock.height);
			});
		});

		describe('loadBlocksData()', () => {
			it('should use a function for the query', function*() {
				sinonSandbox.spy(db, 'any');

				const params = {
					id: '1111',
					lastId: '1111',
					height: 1,
					limit: 10,
				};
				yield db.blocks.loadBlocksData(params);
				expect(db.any.firstCall.args[1]).to.eql(params);
				return expect(db.any).to.be.calledOnce;
			});

			it('should be rejected if required param "limit" is missing', () => {
				return expect(
					db.blocks.loadBlocksData({
						id: '1111',
						lastId: '1111',
						height: 1,
					})
				).to.be.eventually.rejectedWith("Property 'limit' doesn't exist.");
			});

			it('should be rejected if required param "height" is missing', () => {
				return expect(
					db.blocks.loadBlocksData({
						id: '1111',
						lastId: '1111',
						limit: 10,
					})
				).to.be.eventually.rejectedWith("Property 'height' doesn't exist.");
			});

			it('should return data for given block id', function*() {
				const block = blocksFixtures.GenesisBlock();
				const data = yield db.blocks.loadBlocksData({
					id: block.id,
					limit: 10,
				});

				expect(data).to.be.not.empty;
				expect(data).to.be.an('array');
				expect(data).to.be.lengthOf(1);
				expect(data[0].b_id).to.be.eql(block.id);
				return expect(data[0]).to.have.all.keys(blockListFields);
			});

			it('should return data for given lastBlock id', function*() {
				const block = blocksFixtures.GenesisBlock();
				const data = yield db.blocks.loadBlocksData({
					lastId: block.id,
					height: 1,
					limit: 10,
				});

				expect(data).to.be.not.empty;
				expect(data).to.be.an('array');
				// There are 5 total blocks in the seed and we are skipping one by lastId
				return expect(data).to.be.lengthOf(4);
			});

			it('should use condition limit condition as height if both "id" and "lastId" is not provided', function*() {
				const data = yield db.blocks.loadBlocksData({
					height: 1,
					limit: 3,
				});

				expect(data).to.be.not.empty;
				expect(data).to.be.an('array');
				// There are 5 total blocks in the seed and we are skipping one by height=1
				return expect(data).to.be.lengthOf(2);
			});
		});

		describe('loadBlocksOffset()', () => {
			it('should use the correct SQL file two parameters', function*() {
				sinonSandbox.spy(db, 'any');

				yield db.blocks.loadBlocksOffset(10, 20);

				expect(db.any.firstCall.args[0]).to.eql(sql.loadBlocksOffset);
				expect(db.any.firstCall.args[1]).to.eql([10, 20]);
				return expect(db.any).to.be.calledOnce;
			});

			it('should not be rejected if param "offset" is missing', () => {
				return expect(
					db.blocks.loadBlocksOffset(null, 10)
				).to.be.eventually.eql([]);
			});

			it('should not be rejected if param "limit" is missing', () => {
				return expect(db.blocks.loadBlocksOffset(0, null)).to.be.eventually.eql(
					[]
				);
			});

			it('should return data with valid format', function*() {
				const data = yield db.blocks.loadBlocksOffset(0, 5);

				expect(data).to.be.not.empty;
				expect(data).to.be.an('array');
				expect(data[0]).to.have.all.keys(blockListFields);

				return data.forEach(block => {
					expect(block.b_height).to.be.above(0);
					expect(block.b_height).to.be.below(5);
				});
			});
		});

		describe('loadLastBlock()', () => {
			it('should use the correct SQL file with no parameters', function*() {
				sinonSandbox.spy(db, 'query');

				yield db.blocks.loadLastBlock();

				expect(db.query.firstCall.args[0]).to.eql(sql.loadLastBlock);
				expect(db.query.firstCall.args[1]).to.eql(undefined);
				return expect(db.query).to.be.calledOnce;
			});

			it('should return last block with valid data format', function*() {
				const data = yield db.blocks.loadLastBlock();

				expect(data).to.be.not.empty;
				expect(data).to.be.an('array');
				expect(data).to.have.lengthOf(1);
				expect(data[0]).to.have.all.keys(blockListFields);

				// As we only see 5 blocks
				return expect(data[0].b_height).to.be.eql(5);
			});
		});

		describe('loadLastNBlockIds()', () => {
			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'query');

				yield db.blocks.loadLastNBlockIds(1);

				expect(db.query.firstCall.args[0]).to.eql(sql.loadLastNBlockIds);
				expect(db.query.firstCall.args[1]).to.eql([1]);
				return expect(db.query).to.be.calledOnce;
			});

			it('should return last block ids', function*() {
				const genesisBlock = blocksFixtures.GenesisBlock();
				const data = yield db.blocks.loadLastNBlockIds(5);

				expect(data).to.be.not.empty;
				expect(data).to.be.an('array');
				expect(data).to.have.lengthOf(5); // As look for 5 blocks
				expect(data[0]).to.have.all.keys('id');

				// Due to descending order on height genesis block will appear in last
				return expect(data[data.length - 1].id).to.be.eql(genesisBlock.id);
			});
		});

		describe('blockExists()', () => {
			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'oneOrNone');

				yield db.blocks.blockExists('1111');

				expect(db.oneOrNone.firstCall.args[0]).to.eql(sql.blockExists);
				expect(db.oneOrNone.firstCall.args[1]).to.eql(['1111']);
				return expect(db.oneOrNone).to.be.calledOnce;
			});

			it('should return block id if provided id exists', function*() {
				const genesisBlock = blocksFixtures.GenesisBlock();
				const data = yield db.blocks.blockExists(genesisBlock.id);

				expect(data).to.be.not.empty;
				expect(data).to.be.an('object');
				expect(data).to.have.all.keys('id');
				return expect(data.id).to.be.eql(genesisBlock.id);
			});

			it('should return empty response if provided id does not exist', function*() {
				const data = yield db.blocks.blockExists('111111');

				return expect(data).to.be.null;
			});
		});

		describe('deleteAfterBlock()', () => {
			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'none');

				yield db.blocks.deleteAfterBlock('1111');

				expect(db.none.firstCall.args[0]).to.eql(sql.deleteAfterBlock);
				expect(db.none.firstCall.args[1]).to.eql(['1111']);
				return expect(db.none).to.be.calledOnce;
			});

			it('should delete all blocks with height above or equal to given block id', function*() {
				const genesisBlock = blocksFixtures.GenesisBlock();
				const before = yield db.query(
					'SELECT height FROM blocks WHERE height >= $1',
					[genesisBlock.height]
				);
				const data = yield db.blocks.deleteAfterBlock(genesisBlock.id);
				const after = yield db.query(
					'SELECT height FROM blocks WHERE height >= $1',
					[genesisBlock.height]
				);

				expect(data).to.be.null;
				expect(before).to.have.length(5);
				return expect(after).to.have.length(0);
			});

			it('should return empty response if provided id does not exist', function*() {
				const data = yield db.blocks.deleteAfterBlock('111111');

				return expect(data).to.be.null;
			});
		});

		describe('getBlockForTransport()', () => {
			it('should use the correct SQL file with one parameter', function*() {
				sinonSandbox.spy(db, 'query');

				yield db.blocks.getBlockForTransport('1111');

				expect(db.query.firstCall.args[0]).to.eql(sql.getBlockForTransport);
				expect(db.query.firstCall.args[1]).to.eql(['1111']);
				return expect(db.query).to.be.calledOnce;
			});

			it('should get block information for transport with valid format order by height', function*() {
				const blockInfo = yield db.one(
					'SELECT height, id, "previousBlock", timestamp from blocks ORDER BY height DESC LIMIT 1'
				);
				const data = yield db.blocks.getBlockForTransport(blockInfo.id);

				expect(data).to.be.not.empty;
				expect(data).to.be.an('Object');
				expect(data).to.have.all.keys(
					'height',
					'id',
					'previousBlock',
					'timestamp'
				);
				return expect(data.id).to.be.eql(blockInfo.id);
			});

			it('should return empty response if provided id do not exist', function*() {
				const data = yield db.blocks.getBlockForTransport('111111');
				return expect(data).to.be.a('null');
			});

			it('should resolve with null if parameter "id" is missing', function*() {
				const data = yield db.blocks.getBlockForTransport();
				return expect(data).to.be.a('null');
			});
		});

		describe('save()', () => {
			it('should use pgp.helpers.insert with correct parameters', function*() {
				sinonSandbox.spy(db.$config.pgp.helpers, 'insert');

				const block = blocksFixtures.Block();
				yield db.blocks.save(block);

				block.payloadHash = ed.hexToBuffer(block.payloadHash);
				block.generatorPublicKey = ed.hexToBuffer(block.generatorPublicKey);
				block.blockSignature = ed.hexToBuffer(block.blockSignature);
				block.reward = block.reward;

				return expect(db.$config.pgp.helpers.insert).to.be.calledWithExactly(
					block,
					db.blocks.cs.insert
				);
			});

			it('should save a valid block without any error', function*() {
				sinonSandbox.spy(db, 'none');

				const block = blocksFixtures.Block();
				yield db.blocks.save(block);
				expect(db.none).to.be.calledOnce;

				const result = yield db.query('SELECT id FROM blocks WHERE id = $1', [
					block.id,
				]);

				expect(result).to.be.not.empty;
				return expect(result).to.have.lengthOf(1);
			});

			it('should be rejected with error, if invalid block "id" is not provided', () => {
				const block = blocksFixtures.Block();
				delete block.id;

				return expect(db.blocks.save(block)).to.be.eventually.rejectedWith(
					"Property 'id' doesn't exist"
				);
			});

			it('should be rejected with error, if invalid block "payloadHash" is provided', () => {
				const block = blocksFixtures.Block();
				delete block.payloadHash;

				return expect(db.blocks.save(block)).to.be.eventually.rejectedWith(
					'Argument must be a string'
				);
			});

			it('should be rejected with error, if invalid block "generatorPublicKey" is provided', () => {
				const block = blocksFixtures.Block();
				delete block.generatorPublicKey;

				return expect(db.blocks.save(block)).to.be.eventually.rejectedWith(
					'Argument must be a string'
				);
			});

			it('should be rejected with error, if invalid block "blockSignature" is provided', () => {
				const block = blocksFixtures.Block();
				delete block.blockSignature;

				return expect(db.blocks.save(block)).to.be.eventually.rejectedWith(
					'Argument must be a string'
				);
			});

			it('should be rejected with error if duplicate block id is provided', () => {
				const block = blocksFixtures.Block();
				block.id = blocksFixtures.GenesisBlock().id;

				return expect(db.blocks.save(block)).to.be.eventually.rejectedWith(
					'duplicate key value violates unique constraint "blocks_pkey"'
				);
			});
		});
	});
});
