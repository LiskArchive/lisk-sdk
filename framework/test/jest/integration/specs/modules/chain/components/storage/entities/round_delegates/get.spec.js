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

describe('storage.entities.RoundDelegates.get', () => {
	let pgHelper;
	let storage;
	let db;

	beforeAll(async () => {
		// Arrange
		pgHelper = new PgHelper({ database: 'RoundDelegatesGet' });

		// Create second postgres connection
		db = await pgHelper.bootstrap();

		// Setup storage for Accounts
		storage = await pgHelper.createStorage();
		storage.registerEntity('RoundDelegates', RoundDelegates);
	});

	afterAll(async () => {
		await pgHelper.cleanup();
	});

	describe('Given arguments = ({}, {sort, limit})', () => {
		it('should return sorted and limited delegate lists from "round_delegates" table', async () => {
			// Arrange
			const numberOfRecords = 15;
			const limit = 6;

			const records = [];

			for (let i = 1; i <= numberOfRecords; i += 1) {
				const round = i.toString();
				const delegatePublicKeys = [`pk${i}_1`, `pk${i}_2`, `pk${i}_3`];
				await db.query(
					'INSERT INTO round_delegates ("round", "delegatePublicKeys") VALUES ($1, $2)',
					[round, JSON.stringify(delegatePublicKeys)],
				);
				records.push({
					round,
					delegatePublicKeys,
				});
			}

			const expectedResults = records.reverse().slice(0, limit);

			// Act
			let results;

			await db.tx(async tx => {
				results = await storage.entities.RoundDelegates.get(
					{},
					{ sort: 'round:desc', limit },
					tx,
				);
			});

			// Assert
			expect.assertions(limit);
			results.forEach((result, index) => {
				expect(result).toEqual(expectedResults[index]);
			});
		});
	});
});
