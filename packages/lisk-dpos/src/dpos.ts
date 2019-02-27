import { EventEmitter } from 'events';
import { Delegate, generateDelegateList, sortDelegates } from './delegate';
import { Slot, validateBlockSlot, validateBlockSlotWindow } from './slot';
import { Block, DataStore } from './type';
import {
	calculateRound,
	Reward,
	isStartingRound,
	defaultRound,
	isFinishingRound,
	calculateRewards,
	Round,
	applyRound,
} from './round';
import { getLatestRound, getRound, updateRound } from './repo';

export interface DPOSOptions {
	readonly db: DataStore;
	readonly numberOfActiveDelegates: number;
	readonly slotTime: number;
	readonly epochTime: number;
	// tslint:disable-next-line no-mixed-interface
	getCandidate(): Promise<ReadonlyArray<Delegate>>;
}

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
	private readonly _getCandidate: () => Promise<ReadonlyArray<Delegate>>;
	private readonly _slot: Slot;

	public constructor(options: DPOSOptions) {
		super();
		this._db = options.db;
		this._slotTime = options.slotTime;
		this._numberOfActiveDelegates = options.numberOfActiveDelegates;
		this._getCandidate = options.getCandidate;
		this._slot = new Slot({
			epochTime: options.epochTime,
			slotInterval: options.slotTime,
		});
	}

	public async getLatestHeight(): Promise<number> {
		const latestRound = await getLatestRound(this._db);

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
			? await this._getCandidate()
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
			? await this._getCandidate()
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
		const delegates = await this._getCandidate();

		return defaultRound(
			calculateRound(height, this._numberOfActiveDelegates),
			delegates,
		);
	}
}
