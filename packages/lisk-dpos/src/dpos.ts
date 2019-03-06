import { EventEmitter } from 'events';
import { Delegate, generateDelegateList, sortDelegates } from './delegate';
import { getLatestRound, getRound, updateRound, roundExists } from './repo';
import {
	applyRound,
	calculateRewards,
	calculateRound,
	defaultRound,
	isFinishingRound,
	isStartingRound,
	Reward,
	Round,
} from './round';
import { Slot, validateBlockSlot, validateBlockSlotWindow } from './slot';
import { Block, DataStore } from './type';

interface CandidateGetter {
	readonly getCandidates: (num: number) => Promise<ReadonlyArray<Delegate>>;
}

export interface DPOSOptions {
	readonly numberOfActiveDelegates: number;
	readonly slotTime: number;
	readonly epochTime: number;
}

const defaultOptions = {
	numberOfActiveDelegates: 101,
	slotTime: 10,
	epochTime: 1464109200,
};

const verifyBlockSlot = (
	block: Block,
	delegates: ReadonlyArray<Delegate>,
	slot: Slot,
	activeDelegates: number,
): Error | undefined => {
	const round = calculateRound(block.height, activeDelegates);
	const sortedDelegates = sortDelegates(delegates as Delegate[]);
	const delegateList = generateDelegateList(round.toString(), sortedDelegates);
	const slotNumber = slot.slotNumber(block.timestamp);
	const delegate = delegateList[slotNumber % delegateList.length];
	if (
		delegate.publicKey === '' ||
		delegate.publicKey !== block.generatorPublicKey
	) {
		return new Error(
			`Invalid generator public key, expected: ${delegate.publicKey}, actual: ${
				block.generatorPublicKey
			}`,
		);
	}

	return undefined;
};

export class DPOS extends EventEmitter {
	private readonly _db: DataStore;
	private readonly _slotTime: number;
	private readonly _numberOfActiveDelegates: number;
	private readonly _getCandidates: (
		num: number,
	) => Promise<ReadonlyArray<Delegate>>;
	private readonly _slot: Slot;

	public constructor(
		db: DataStore,
		candidateGetter: CandidateGetter,
		options: DPOSOptions = defaultOptions,
	) {
		super();
		this._db = db;
		this._slotTime = options.slotTime;
		this._numberOfActiveDelegates = options.numberOfActiveDelegates;
		this._getCandidates = candidateGetter.getCandidates;
		this._slot = new Slot({
			epochTime: options.epochTime,
			slotInterval: options.slotTime,
		});
	}

	public async init(lastBlock: Block): Promise<void> {
		if (lastBlock.height !== 1) {
			return;
		}
		const exist = await roundExists(this._db, lastBlock.height);
		if (exist) {
			return;
		}
		const delegates = await this._getCandidates(this._numberOfActiveDelegates);
		const round = defaultRound(
			calculateRound(lastBlock.height, this._numberOfActiveDelegates),
			delegates,
		);
		await updateRound(this._db, '1', round);
	}

	public async getLatestHeight(): Promise<number> {
		const latestRound = await getLatestRound(this._db);
		if (!latestRound) {
			return 0;
		}

		return Math.max(...Object.keys(latestRound.result).map(parseInt));
	}

	public async verifyDownloadedBlock(
		lastBlock: Block,
		block: Block,
	): Promise<Error | undefined> {
		const blockSlotError = validateBlockSlot(block, lastBlock, this._slot);
		if (blockSlotError) {
			return blockSlotError;
		}

		const delegates = isStartingRound(
			block.height,
			this._numberOfActiveDelegates,
		)
			? await this._getCandidates(this._numberOfActiveDelegates)
			: (await getRound(
					this._db,
					calculateRound(block.height, this._numberOfActiveDelegates),
			  )).delegates;
		const veriyBlockSlotError = verifyBlockSlot(
			block,
			delegates,
			this._slot,
			this._numberOfActiveDelegates,
		);
		if (veriyBlockSlotError) {
			return veriyBlockSlotError;
		}

		return undefined;
	}

	public async verifyReceivedBlock(
		lastBlock: Block,
		block: Block,
	): Promise<Error | undefined> {
		const blockSlotError = validateBlockSlot(block, lastBlock, this._slot);
		if (blockSlotError) {
			return blockSlotError;
		}
		const blockSlotWindowError = validateBlockSlotWindow(
			block,
			this._slot,
			this._slotTime,
		);
		if (blockSlotWindowError) {
			return blockSlotWindowError;
		}
		const delegates = isStartingRound(
			block.height,
			this._numberOfActiveDelegates,
		)
			? await this._getCandidates(this._numberOfActiveDelegates)
			: (await getRound(
					this._db,
					calculateRound(block.height, this._numberOfActiveDelegates),
			  )).delegates;
		const veriyBlockSlotError = verifyBlockSlot(
			block,
			delegates,
			this._slot,
			this._numberOfActiveDelegates,
		);
		if (veriyBlockSlotError) {
			return veriyBlockSlotError;
		}

		return undefined;
	}

	public async getRewards(
		block: Block,
	): Promise<ReadonlyArray<Reward> | undefined> {
		if (!isFinishingRound(block.height, this._numberOfActiveDelegates)) {
			return undefined;
		}
		const roundNumber = calculateRound(
			block.height,
			this._numberOfActiveDelegates,
		);
		const round = await getRound(this._db, roundNumber);

		return calculateRewards(round);
	}

	public async process(block: Block): Promise<Error | undefined> {
		const roundNumber = calculateRound(
			block.height,
			this._numberOfActiveDelegates,
		);
		const round = isStartingRound(block.height, this._numberOfActiveDelegates)
			? await this._getStartingRound(block.height)
			: await getRound(this._db, roundNumber);

		const updatedRound = applyRound(round, block);

		try {
			await updateRound(this._db, roundNumber.toString(), updatedRound);

			return undefined;
		} catch (error) {
			return error;
		}
	}

	private async _getStartingRound(height: number): Promise<Round> {
		const delegates = await this._getCandidates(this._numberOfActiveDelegates);

		return defaultRound(
			calculateRound(height, this._numberOfActiveDelegates),
			delegates,
		);
	}
}
