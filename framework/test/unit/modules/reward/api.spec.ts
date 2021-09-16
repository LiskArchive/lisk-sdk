import { getRandomBytes, hash } from '@liskhq/lisk-cryptography';
import { RewardModule } from '../../../../src/modules/reward';
import { EventQueue } from '../../../../src/node/state_machine';

describe('RewardModuleAPI', () => {
	const genesisConfig: any = {};
	const moduleConfig: any = {
		distance: 3000000,
		offset: 2160,
		brackets: [
			BigInt('500000000'), // Initial Reward
			BigInt('400000000'), // Milestone 1
			BigInt('300000000'), // Milestone 2
			BigInt('200000000'), // Milestone 3
			BigInt('100000000'), // Milestone 4
		],
		tokenIDReward: { chainID: 0, localID: 0 },
	};
	const generatorConfig: any = {};

	const context = {
		getStore: jest.fn(),
		eventQueue: new EventQueue(),
	};

	const blockAsset = {
		getAsset: jest.fn(),
	};

	const fakeBlockHeader = (height: number) => ({
		version: 2,
		height: height ?? 1,
		timestamp: 0,
		previousBlockID: hash(getRandomBytes(4)),
		generatorAddress: getRandomBytes(32),
		maxHeightPrevoted: 0,
		maxHeightGenerated: 0,
		aggregateCommit: {
			height: 0,
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
		},
	});

	const { brackets, offset, distance } = moduleConfig as {
		brackets: ReadonlyArray<bigint>;
		offset: number;
		distance: number;
	};

	let rewardModule: RewardModule;
	beforeEach(async () => {
		rewardModule = new RewardModule();
		await rewardModule.init({ genesisConfig, moduleConfig, generatorConfig });
	});

	for (const [index, rewardFromConfig] of Object.entries(brackets)) {
		const nthBracket = +index;
		const currentHeight = offset + nthBracket * distance;

		// eslint-disable-next-line no-loop-func
		it(`should getBlockReward return full reward for bracket ${nthBracket}`, async () => {
			rewardModule.addDependencies(
				{ mint: jest.fn() } as any,
				{ isValidSeedReveal: jest.fn().mockReturnValue(true) } as any,
				{ impliesMaximalPrevotes: jest.fn().mockReturnValue(true) } as any,
			);
			const blockHeader = fakeBlockHeader(currentHeight);
			const rewardFromAPI = await rewardModule.api.getBlockReward(context, blockHeader, blockAsset);

			expect(rewardFromAPI).toBe(rewardFromConfig);
		});

		// eslint-disable-next-line no-loop-func
		it(`should getBlockReward return quarter reward for bracket ${nthBracket} due to bft violation`, async () => {
			rewardModule.addDependencies(
				{ mint: jest.fn() } as any,
				{ isValidSeedReveal: jest.fn().mockReturnValue(true) } as any,
				{ impliesMaximalPrevotes: jest.fn().mockReturnValue(false) } as any,
			);
			const blockHeader = fakeBlockHeader(currentHeight);
			const rewardFromAPI = await rewardModule.api.getBlockReward(context, blockHeader, blockAsset);

			expect(rewardFromAPI).toBe(rewardFromConfig / BigInt(4));
		});

		// eslint-disable-next-line no-loop-func
		it(`should getBlockReward return no reward for bracket ${nthBracket} due to seedReveal violation`, async () => {
			rewardModule.addDependencies(
				{ mint: jest.fn() } as any,
				{ isValidSeedReveal: jest.fn().mockReturnValue(false) } as any,
				{ impliesMaximalPrevotes: jest.fn().mockReturnValue(true) } as any,
			);
			const blockHeader = fakeBlockHeader(currentHeight);
			const rewardFromAPI = await rewardModule.api.getBlockReward(context, blockHeader, blockAsset);

			expect(rewardFromAPI).toBe(BigInt(0));
		});
	}

	it(`should getBlockReward return no reward for the height below offset`, async () => {
		rewardModule.addDependencies(
			{ mint: jest.fn() } as any,
			{ isValidSeedReveal: jest.fn().mockReturnValue(true) } as any,
			{ impliesMaximalPrevotes: jest.fn().mockReturnValue(true) } as any,
		);
		const blockHeader = fakeBlockHeader(1);
		const rewardFromAPI = await rewardModule.api.getBlockReward(context, blockHeader, blockAsset);

		expect(rewardFromAPI).toBe(BigInt(0));
	});
});
