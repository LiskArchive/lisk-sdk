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
		await db.done();
		await pgHelper.cleanup();
	});

	describe('Given arguments = (round, activeDelegates, tx)', () => {
		it.skip('should update rewards, fees and balance fields for given account', async () => {
			// Act
			let roundSummary;
			await db.tx(async tx => {
				roundSummary = await storage.entities.RoundDelegates.summedRound(
					1,
					101,
					tx,
				);
			});

			// console.log('roundSummary', roundSummary);

			// Assert
			expect(roundSummary).toBeArray();
		});
	});
});
