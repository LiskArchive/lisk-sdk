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
