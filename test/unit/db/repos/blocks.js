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

const DBSandbox = require('../../../common/db_sandbox').DBSandbox;
const blocksFixtures = require('../../../fixtures').blocks;
const sql = require('../../../../db/sql').blocks;
const seeder = require('../../../common/db_seed');

let db;
let dbSandbox;

describe('db', () => {
	before(done => {
		dbSandbox = new DBSandbox(__testContext.config.db, 'lisk_test_db_blocks');

		dbSandbox.create((err, __db) => {
			db = __db;

			done(err);
		});
	});

	after(() => {
		dbSandbox.destroy();
	});

	beforeEach(done => {
		seeder
			.seed(db)
			.then(() => done(null))
			.catch(done);
	});

	afterEach(done => {
		sinonSandbox.restore();
		seeder
			.reset(db)
			.then(() => done(null))
			.catch(done);
	});

	it('should initialize db.blocks repo', () => {
		expect(db.blocks).to.be.not.null;
	});

	describe('AccountsRepository', () => {
		describe('constructor()', () => {
			it('should assign param and data members properly', () => {
				expect(db.blocks.db).to.be.eql(db);
				expect(db.blocks.pgp).to.be.eql(db.$config.pgp);
				expect(db.blocks.dbTable).to.be.eql('blocks');

				expect(db.blocks.dbFields).to.be.an('array');
				expect(db.blocks.dbFields).to.have.lengthOf(13);

				expect(db.blocks.sortFields).to.be.an('array');
				expect(db.blocks.sortFields).to.have.lengthOf(9);

				// TODO: Need to explore way to rewire an initialized module to fetch private members
				// expect(db.blocks.cs).to.be.an('object');
				// expect(db.blocks.cs).to.be.not.empty;
				// expect(db.blocks.cs).to.have.all.keys(['insert']);
			});
		});

		describe('getGenesisBlock()', () => {
			it('should use the correct SQL file with no parameters', function*() {
				sinonSandbox.spy(db, 'any');
				yield db.blocks.getGenesisBlock();

				expect(db.any.firstCall.args[0]).to.eql(sql.getGenesisBlock);
				expect(db.any.firstCall.args[1]).to.eql(undefined);
				expect(db.any).to.be.calledOnce;
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

				expect(payloadHash).to.be.eql(__testContext.config.nethash);
			});
		});

		describe('getGenesisBlockId()', () => {
			it('should use the correct SQL file with one parameters', function*() {
				sinonSandbox.spy(db, 'query');
				yield db.blocks.getGenesisBlockId('1111111');

				expect(db.query.firstCall.args[0]).to.eql(sql.getGenesisBlockId);
				expect(db.query.firstCall.args[1]).to.eql(['1111111']);
				expect(db.query).to.be.calledOnce;
			});

			it('should return block id if block exists for given id', function*() {
				const genesisBlock = blocksFixtures.GenesisBlock();
				const block = yield db.blocks.getGenesisBlockId(genesisBlock.id);

				expect(block).to.be.not.empty;
				expect(block).to.be.an('array');
				expect(block).to.have.lengthOf(1);
				expect(block[0].id).to.be.eql(genesisBlock.id);
			});

			it('should return empty array if block does not exists for given id', function*() {
				const block = yield db.blocks.getGenesisBlockId('111111');

				expect(block).to.be.empty;
				expect(block).to.be.an('array');
			});
		});

		describe('deleteBlock()', () => {
			it('should use the correct SQL file with one parameters', function*() {
				sinonSandbox.spy(db, 'none');
				yield db.blocks.deleteBlock('1111111');

				expect(db.none.firstCall.args[0]).to.eql(sql.deleteBlock);
				expect(db.none.firstCall.args[1]).to.eql(['1111111']);
				expect(db.none).to.be.calledOnce;
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
				expect(after.count).to.be.equal('0');
			});

			it('should not throw an error if a block with given id does not exists', () => {
				return expect(db.blocks.deleteBlock('111111')).to.be.eventually.equal(
					null
				);
			});
		});

		describe('aggregateBlocksReward()', () => {
			it('should use the correct SQL file with three parameters', function*() {
				sinonSandbox.spy(db, 'query');
				const params = {
					generatorPublicKey: 'afafafafaf',
					start: (+new Date() / 1000).toFixed(0),
					end: (+new Date() / 1000).toFixed(0),
				};
				yield db.blocks.aggregateBlocksReward(params);

				expect(db.query.firstCall.args[0]).to.eql(sql.aggregateBlocksReward);
				expect(db.query.firstCall.args[1]).to.eql([
					params.generatorPublicKey,
					params.start,
					params.end,
				]);
				expect(db.query).to.be.calledOnce;
			});

			it('should throw error if invalid public key is passed', () => {
				return expect(
					db.blocks.aggregateBlocksReward({
						generatorPublicKey: 'xxxxxxxxx',
						start: (+new Date() / 1000).toFixed(0),
						end: (+new Date() / 1000).toFixed(0),
					})
				).to.be.eventually.rejectedWith('invalid hexadecimal digit: "x"');
			});

			it('should aggregate rewards and response in valid format', function*() {
				const account = yield db.one(
					'SELECT encode("publicKey", \'hex\') as "publicKey" FROM mem_accounts LIMIT 1'
				);
				const rewards = yield db.blocks.aggregateBlocksReward({
					generatorPublicKey: account.publicKey,
					start: (+new Date('2017.01.01') / 1000).toFixed(0),
					end: (+new Date() / 1000).toFixed(0),
				});

				expect(rewards).to.be.not.empty;
				expect(rewards).to.be.an('array');
				expect(rewards[0]).to.have.all.keys(
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
				expect(db.one).to.be.calledOnce;
			});

			it('should return integer type count of total blocks', function*() {
				const count = yield db.blocks.count();

				expect(count).to.be.an('number');
				expect(count).to.be.eql(5); // Number of blocks in seed (db_seed.js#23)
			});
		});

		describe('list()', () => {
			it('should use raw sql with provided parameters', function*() {
				sinonSandbox.spy(db, 'query');
				const params = {
					where: '',
					sortField: '',
					limit: 10,
					offset: 0,
				};
				yield db.blocks.list(params);

				expect(db.query.firstCall.args[0]).to.be.a('string');
				expect(db.query.firstCall.args[1]).to.eql(params);
				expect(db.query).to.be.calledOnce;
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
				expect(blocks[0]).to.have.all.keys([
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

				expect(firstResult[1]).to.be.eql(secondResult[0]);
			});

			it('should return valid blocks for single condition', function*() {
				const genesisBlock = blocksFixtures.GenesisBlock();
				const result = yield db.blocks.list({
					where: [`b_id = '${genesisBlock.id}'`],
					limit: 10,
					offset: 0,
				});

				expect(result.length).to.be.above(0);

				result.forEach(block => {
					expect(block.b_id).to.be.eql(genesisBlock.id);
				});
			});

			it('should return valid blocks with composite conditions', function*() {
				const genesisBlock = blocksFixtures.GenesisBlock();
				const result = yield db.blocks.list({
					where: [`b_id = '${genesisBlock.id}'`, 'b_height = 2'],
					limit: 10,
					offset: 0,
				});

				expect(result).to.be.empty;
			});

			it('should return blocks with valid ascending sorting order ', function*() {
				const result = yield db.blocks.list({
					sortField: 'b_height',
					sortMethod: 'ASC',
					limit: 10,
					offset: 0,
				});

				expect(result.length).to.be.above(0);
				expect(result).to.be.eql(
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
				expect(result).to.be.eql(
					_(result)
						.orderBy('b_height', 'desc')
						.value()
				);
			});
		});
	});
});
