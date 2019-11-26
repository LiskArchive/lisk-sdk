const { chainUtils, storageUtils, configUtils } = require('../utils');

const {
	createTransferTransaction,
	generateAndApplyBlock,
	applyBlock,
	generateBlock,
} = chainUtils;

const maxTimeout = 2147483647; // Math.pow(2, 31) - 1;

const genesisPassphrase =
	'wagon stock borrow episode laundry kitten salute link globe zero feed marble';

const keypairA = {
	publicKey: Buffer.from(
		'27f43391cca75cbc82d1750307649508d1d318cd015f1f172b97318f17ab954e',
		'hex',
	),
	privateKey: Buffer.from(
		'6b9649abc3345af02ac58b93d0ac283e84b5e7e087a844b9f4debd2ee3d372b227f43391cca75cbc82d1750307649508d1d318cd015f1f172b97318f17ab954e',
		'hex',
	),
};

/**
 * Forge 2 next correct blocks, so there will be 3 in total with GenesisBlock - baseBlocks.
 * Each fork choice rule tests processes 2 contradicting blocks A and B, which will be attempted to forged on top of baseBlocks.
 * After each test, the database is cleared to the height 3 - only baseBlocks are staying.
 */
describe('forks', () => {
	const dbName = 'forks';
	process.env.NODE_ENV = 'test';
	const storage = new storageUtils.StorageSandbox(
		configUtils.storageConfig({ database: dbName }),
	);

	let chainModule;
	let baseBlocks;

	beforeAll(async () => {
		await storage.bootstrap();
		chainModule = await chainUtils.createAndLoadChainModule(dbName);

		await chainModule.forger.loadDelegates();

		baseBlocks = [
			await generateAndApplyBlock(chainModule.forger, []),
			await generateAndApplyBlock(chainModule.forger, []),
		];
	}, maxTimeout);

	afterAll(async () => {
		await chainModule.cleanup();
		await storage.cleanup();
	});

	describe('Fork scenarios', () => {
		afterEach(async () => {
			await chainModule.processor.deleteLastBlock();
			expect(chainModule.forger.blocksModule.lastBlock.height).toBe(3); // only baseBlocks
		});

		it('Fork 1 - different previous blocks', async () => {
			const blockA = await generateAndApplyBlock(chainModule.forger, [], {
				previousBlock: baseBlocks[1],
			}); // Correct
			const blockB = await generateBlock(chainModule.forger, [], {
				previousBlock: baseBlocks[0],
			}); // Correct
			const isBApplied = await applyBlock(chainModule.forger, blockB);

			expect(isBApplied).toBeFalsy();
			expect(chainModule.forger.blocksModule.lastBlock.id).toBe(blockA.id);
		});

		it('Fork 2 - duplicated transaction in blocks A and B', async () => {
			const transaction = chainModule.interfaceAdapters.transactions.fromJson(
				// :(
				createTransferTransaction(genesisPassphrase, '123L', 10 ** 8),
			);
			const blockA = await generateAndApplyBlock(chainModule.forger, [
				transaction,
			]); // Correct
			const blockB = await generateBlock(chainModule.forger, [transaction]); // Correct
			await expect(applyBlock(chainModule.forger, blockB)).rejects.toThrow(
				'duplicate key value violates unique constraint "trs_pkey"',
			);

			expect(chainModule.forger.blocksModule.lastBlock.id).toBe(blockA.id);
		});

		it('Fork 3 - wrong delegate for the slot', async () => {
			const blockA = await generateAndApplyBlock(chainModule.forger, [], {
				keypair: keypairA,
			}); // Correct
			const keypairBWrong = {
				publicKey: Buffer.from(
					'1e82c7db09da2010e7f5fef24d83bc46238a20ef7ecdf12d9f32e4318a818777',
					'hex',
				),
				privateKey: Buffer.from(
					'f52eb5f70a7f1c43f1567629a120e102c85424a31ce805bea650d765fe2afeec1e82c7db09da2010e7f5fef24d83bc46238a20ef7ecdf12d9f32e4318a818777',
					'hex',
				),
			};
			const blockB = await generateBlock(chainModule.forger, [], {
				keypair: keypairBWrong,
			}); // Random delegate from the front
			await expect(applyBlock(chainModule.forger, blockB)).rejects.toThrow(
				'Failed to verify slot: 4. Block ID: 13255247269097755147. Block Height: 5',
			);
			expect(chainModule.forger.blocksModule.lastBlock.id).toBe(blockA.id);
		});

		it('Fork 5 - double forging -- change the block id for the same slot by adding an extra transaction', async () => {
			const blockA = await generateAndApplyBlock(chainModule.forger, [], {
				keypair: keypairA,
			}); // Correct
			const transaction = chainModule.interfaceAdapters.transactions.fromJson(
				// :(
				createTransferTransaction(genesisPassphrase, '123L', 10 ** 8),
			);
			const blockB = await generateBlock(chainModule.forger, [transaction], {
				...blockA,
				keypair: keypairA,
				previousBlock: baseBlocks[1],
			}); // Also correct
			await applyBlock(chainModule.forger, blockB);
			expect(chainModule.forger.blocksModule.lastBlock.id).toBe(blockA.id);
		});
	});
});
