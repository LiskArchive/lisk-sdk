const {
	RoundDelegates,
} = require('../../../../../../../../../../src/modules/chain/components/storage/entities');
const { PgHelper } = require('../../../../../../../utils/pg-helper');

describe('storage.entities.RoundDelegates.delete', () => {
	let pgHelper;
	let storage;
	let db;

	beforeAll(async () => {
		// Arrange
		pgHelper = new PgHelper({ dbName: 'RoundDelegatesDelete' });

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

	beforeEach(async () => {
		await db.query('DELETE FROM round_delegates');
	});

	describe('Given arguments = ({round_gt}, tx)', () => {
		it('should delete delegate list after round', async () => {
			// Arrange
			const delegateList = ['pk1', 'pk2', 'pk3'];
			await db.query(
				'INSERT INTO round_delegates ("round", "delegatePublicKeys") VALUES ($1, $2), ($3, $4), ($5, $6)',
				[
					5,
					JSON.stringify(delegateList),
					6,
					JSON.stringify(['pk11', 'pk21', 'pk31']),
					7,
					JSON.stringify(['pk12', 'pk22', 'pk32']),
				],
			);

			// Act
			await storage.entities.RoundDelegates.delete({
				round_gt: 5,
			});

			// Assert
			const result = await db.query(
				'SELECT "delegatePublicKeys" FROM round_delegates WHERE round >= $1 ',
				5,
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ delegatePublicKeys: delegateList });
		});
	});

	describe('Given arguments = ({round_lt}, tx)', () => {
		it('should delete delegate list before round', async () => {
			// Arrange
			const delegateList = ['pk1', 'pk2', 'pk3'];
			await db.query(
				'INSERT INTO round_delegates ("round", "delegatePublicKeys") VALUES ($1, $2), ($3, $4), ($5, $6)',
				[
					5,
					JSON.stringify(['pk11', 'pk21', 'pk31']),
					6,
					JSON.stringify(['pk12', 'pk22', 'pk32']),
					7,
					JSON.stringify(delegateList),
				],
			);

			// Act
			await storage.entities.RoundDelegates.delete({
				round_lt: 7,
			});

			// Assert
			const result = await db.query(
				'SELECT "delegatePublicKeys" FROM round_delegates WHERE round <= $1 ',
				7,
			);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({ delegatePublicKeys: delegateList });
		});
	});
});
