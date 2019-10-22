/* eslint-disable mocha/no-pending-tests */
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

const BigNum = require('@liskhq/bignum');
const { StorageSandbox } = require('../../../../../../common/storage_sandbox');
const seeder = require('../../../../../../common/storage_seed');

describe('RoundDelegates', () => {
	let adapter;
	let storage;
	let RoundDelegatesEntity;
	let SQLs;

	before(async () => {
		storage = new StorageSandbox(
			__testContext.config.components.storage,
			'lisk_test_storage_custom_round_delegates_chain_module',
		);
		await storage.bootstrap();

		adapter = storage.adapter;
		RoundDelegatesEntity = storage.entities.RoundDelegates;
		SQLs = RoundDelegatesEntity.SQLs;
	});

	beforeEach(() => seeder.seed(storage));

	afterEach(() => {
		sinonSandbox.restore();
		return seeder.reset(storage);
	});

	describe('summedRound()', () => {
		it('should use the correct SQL file with one parameter', async () => {
			sinonSandbox.spy(adapter, 'executeFile');
			await RoundDelegatesEntity.summedRound(1, 2);

			expect(adapter.executeFile.firstCall.args[0]).to.eql(SQLs.summedRound);
			expect(adapter.executeFile.firstCall.args[1]).to.eql({
				round: 1,
				activeDelegates: 2,
			});
			expect(adapter.executeFile).to.be.calledOnce;
		});

		it('should return the summed result in valid format', async () => {
			// Sum the round 1 with active delegates to 2
			const result = await RoundDelegatesEntity.summedRound(1, 2);
			const blocks = seeder.getBlocks();

			// The blocks for round 1 would be with height 1 and 2
			// referred as index 0 and 1 in the array
			const computedBlocks = [blocks[0], blocks[1]];

			expect(result).to.be.not.empty;
			expect(result).to.have.lengthOf(1);
			expect(result[0]).to.have.all.keys('fees', 'rewards', 'delegates');
			expect(result[0].rewards).to.be.an('array');
			expect(result[0].delegates).to.be.an('array');
			expect(result[0].fees).to.be.eql(
				new BigNum(computedBlocks[0].totalFee)
					.plus(computedBlocks[1].totalFee)
					.toString(),
			);
			expect(result[0].rewards).to.be.eql(computedBlocks.map(b => b.reward));
			expect(result[0].delegates).to.be.eql(
				computedBlocks.map(b => b.generatorPublicKey),
			);
		});
	});
});
