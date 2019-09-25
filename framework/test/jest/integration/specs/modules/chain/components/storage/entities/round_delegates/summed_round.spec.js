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

describe('storage.entities.RoundDelegates.summedRound', () => {
	let pgHelper;
	let storage;
	let db;

	beforeAll(async () => {
		// Arrange
		pgHelper = new PgHelper({ dbName: 'RoundDelegatesSummedRound' });

		// Create second postgres connection
		db = await pgHelper.bootstrap();

		// Setup storage for Accounts
		storage = await pgHelper.createStorage();
		storage.registerEntity('RoundDelegates', RoundDelegates);
	});

	afterAll(async () => {
		await pgHelper.cleanup();
	});

	describe('Given arguments = (round, activeDelegates, tx)', () => {
		it.skip('should return roundSummary', async () => {
			// Act
			let roundSummary;
			await db.tx(async tx => {
				roundSummary = await storage.entities.RoundDelegates.summedRound(
					1,
					101,
					tx,
				);
			});

			// Assert
			expect(roundSummary).toBeArray();
		});
	});
});
