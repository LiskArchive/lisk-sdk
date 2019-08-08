const {
	isDifferentChain,
	isDoubleForging,
	isIdenticalBlock,
	isDuplicateBlock,
	isTieBreak,
	isValidBlock,
} = require('../../../../../../../src/modules/chain/blocks/fork_choice_rule');
const { Slots } = require('../../../../../../../src/modules/chain/dpos');

const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString();
const BLOCK_TIME = 10;
const ACTIVE_DELEGATES = 101;

describe('Fork Choice Rule', () => {
	let slots;

	beforeEach(() => {
		slots = new Slots({
			epochTime: EPOCH_TIME,
			interval: BLOCK_TIME,
			blocksPerRound: ACTIVE_DELEGATES,
		});
	});

	describe('_isValidBlock', () => {
		it('should return true if last.height + 1 === current.height && last.id === current.previousBlock', async () => {
			const last = {
				height: 1,
				id: '1',
			};
			const current = {
				height: last.height + 1,
				previousBlock: last.id,
			};

			expect(isValidBlock(last, current)).toBeTruthy();
		});
	});

	describe('_isDuplicateBlock', () => {
		it('should return true if last.height === current.height && last.heightPrevoted === current.heightPrevoted && last.previousBlock === current.previousBlock', async () => {
			const last = {
				height: 1,
				prevotedConfirmedUptoHeight: 0,
				previousBlock: 0,
				id: '1',
			};
			const current = {
				height: last.height,
				prevotedConfirmedUptoHeight: last.prevotedConfirmedUptoHeight,
				previousBlock: last.previousBlock,
				id: '2',
			};
			expect(isDuplicateBlock(last, current)).toBeTruthy();
		});
	});

	describe('_isIdenticalBlock', () => {
		it('should return true if last.id === current.id', async () => {
			const last = {
				height: 1,
				id: '1',
			};
			expect(isIdenticalBlock(last, last)).toBeTruthy();
		});
	});

	describe('_isDoubleForging', () => {
		it('should return true if _isDuplicateBlock(last, current) && last.generatorPublicKey === current.generatorPublicKey', async () => {
			const last = {
				height: 1,
				prevotedConfirmedUptoHeight: 0,
				previousBlock: 0,
				id: '1',
				generatorPublicKey: 'abc',
			};
			const current = {
				height: last.height,
				prevotedConfirmedUptoHeight: last.prevotedConfirmedUptoHeight,
				previousBlock: last.previousBlock,
				id: '2',
				generatorPublicKey: last.generatorPublicKey,
			};

			expect(isDoubleForging(last, current)).toBeTruthy();
		});
	});

	/**
	 *
	 * Determine if Case 4 fulfills
	 * @param slots
	 * @param lastAppliedBlock
	 * @param receivedBlock
	 * @param receivedBlockReceiptTime
	 * @param lastReceivedAndAppliedBlock
	 * @return {boolean}
	 */

	describe('_isTieBreak', () => {
		/**
		 * Explanation:
		 *
		 * It should return true if (AND):
		 *
		 * - The current tip of the chain and the received block are duplicate
		 * - The current tip of the chain was forged first
		 * - The the last block that was received from the network and then applied
		 *   was not received within its designated forging slot but the new received block is.
		 */
		it('should return true if it matches the conditions described in _isTieBreak', async () => {
			const lastReceivedAndAppliedBlock = {
				receivedTime: 100000,
				id: '1',
			};

			const lastAppliedBlock = {
				height: 1,
				prevotedConfirmedUptoHeight: 0,
				previousBlock: 0,
				id: '1',
				timestamp: lastReceivedAndAppliedBlock.receivedTime,
				generatorPublicKey: 'abc',
				receivedAt: 300000,
			};

			const receivedBlock = {
				...lastAppliedBlock,
				id: '2',
				timestamp: 200000,
				receivedAt: 200000,
			};

			expect(
				isTieBreak({
					slots,
					lastAppliedBlock,
					receivedBlock,
				}),
			).toBeTruthy();
		});
	});

	describe('_isDifferentChain', () => {
		it('should return true if last.heightPrevoted < current.heightPrevoted', async () => {
			const last = {
				height: 1,
				prevotedConfirmedUptoHeight: 0,
				previousBlock: 0,
				id: '1',
				timestamp: Date.now(),
				generatorPublicKey: 'abc',
			};
			const current = {
				height: last.height,
				prevotedConfirmedUptoHeight: last.prevotedConfirmedUptoHeight + 1,
				previousBlock: last.previousBlock,
				id: '2',
				timestamp: Date.now() + 1000,
				generatorPublicKey: last.generatorPublicKey,
			};

			expect(isDifferentChain(last, current)).toBeTruthy();
		});

		it('OR should return true if (last.height < current.height && last.heightPrevoted === current.heightPrevoted)', async () => {
			const last = {
				height: 1,
				prevotedConfirmedUptoHeight: 0,
				previousBlock: 0,
				id: '1',
				timestamp: Date.now(),
				generatorPublicKey: 'abc',
			};
			const current = {
				height: last.height + 1,
				prevotedConfirmedUptoHeight: last.prevotedConfirmedUptoHeight,
				previousBlock: last.previousBlock,
				id: '2',
				timestamp: Date.now() + 1000,
				generatorPublicKey: last.generatorPublicKey,
			};

			expect(isDifferentChain(last, current)).toBeTruthy();
		});
	});
});
