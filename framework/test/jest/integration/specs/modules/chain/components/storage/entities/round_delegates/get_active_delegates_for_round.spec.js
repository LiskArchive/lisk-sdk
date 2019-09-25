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

const {
	RoundDelegates,
} = require('../../../../../../../../../../src/modules/chain/components/storage/entities');
const { PgHelper } = require('../../../../../../../utils/pg-helper');

describe('storage.entities.RoundDelegates.getActiveDelegatesForRound', () => {
	let pgHelper;
	let storage;
	let db;

	beforeAll(async () => {
		// Arrange
		pgHelper = new PgHelper({ dbName: 'RoundDelegatesGetRoundDelegates' });

		// Create second postgres connection
		db = await pgHelper.bootstrap();

		// Setup storage for Accounts
		storage = await pgHelper.createStorage();
		storage.registerEntity('RoundDelegates', RoundDelegates);
	});

	afterAll(async () => {
		await pgHelper.cleanup();
	});

	beforeEach(async () => {
		await db.query('DELETE FROM round_delegates');
	});

	describe('Given arguments = (round)', () => {
		it('should return list of round delegates', async () => {
			// Arrange
			const round = '6';
			const delegateList = ['pk1', 'pk2', 'pk3'];
			await db.query(
				'INSERT INTO round_delegates ("round", "delegatePublicKeys") VALUES ($1, $2)',
				[round, JSON.stringify(delegateList)],
			);

			// Act
			const roundDelegates = await storage.entities.RoundDelegates.getActiveDelegatesForRound(
				round,
			);

			// Assert
			expect(roundDelegates).toBeArray(delegateList);
		});
	});

	describe('Given arguments = (round: nonExistingRound)', () => {
		it('should return an empty array', async () => {
			// Arrange
			const round = '6';
			const delegateList = ['pk1', 'pk2', 'pk3'];
			await db.query(
				'INSERT INTO round_delegates ("round", "delegatePublicKeys") VALUES ($1, $2)',
				[round, JSON.stringify(delegateList)],
			);

			// Act
			const roundDelegates = await storage.entities.RoundDelegates.getActiveDelegatesForRound(
				'11',
			);

			// Assert
			expect(roundDelegates).toEqual([]);
		});
	});
});
