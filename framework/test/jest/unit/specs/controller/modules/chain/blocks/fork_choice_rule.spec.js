const {
	isDifferentChain,
	isDoubleForging,
	isIdenticalBlock,
	isDuplicateBlock,
	isTieBreak,
	isValidBlock,
} = require('../../../../../../../../src/modules/chain/blocks/fork_choice_rule');
const {
	BlockSlots,
} = require('../../../../../../../../src/modules/chain/blocks/block_slots');

const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)).toISOString();
const BLOCK_TIME = 10;
const ACTIVE_DELEGATES = 101;

describe('Fork Choice Rule', () => {
	let blockSlots;

	beforeEach(() => {
		blockSlots = new BlockSlots({
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

	describe('_isTieBreak', () => {
		it('should return true if this._isDuplicateBlock(last, current) && slots.getSlotNumber(last.timestamp) < slots.getSlotNumber(current.timestamp) && !slots.isWithinTimeslot(slots.getSlotNumber(lastBlock.timestamp),lastReceivedAt) && slots.isWithinTimeslot(slots.getSlotNumber(currentBlock.timestamp), currentReceivedAt)', async () => {
			const lastReceivedAt = 100000;
			const currentReceivedAt = 200000;

			const last = {
				height: 1,
				prevotedConfirmedUptoHeight: 0,
				previousBlock: 0,
				id: '1',
				timestamp: 5000,
				generatorPublicKey: 'abc',
			};
			const current = {
				height: last.height,
				prevotedConfirmedUptoHeight: last.prevotedConfirmedUptoHeight,
				previousBlock: last.previousBlock,
				id: '2',
				timestamp: currentReceivedAt,
				generatorPublicKey: last.generatorPublicKey,
			};

			expect(
				isTieBreak({
					slots: blockSlots,
					lastBlock: last,
					currentBlock: current,
					lastReceivedAt,
					currentReceivedAt,
				})
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
