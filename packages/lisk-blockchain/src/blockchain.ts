import { EventEmitter } from 'events';
import { Account } from './account';
import { Block, createBlock } from './block';
import {
	getBlockByHeight,
	getBlockHeaderByHeight,
	getCandidates,
	getRewardIfExist,
} from './repo';
import { applyReward, Reward, RewardsOption, undoReward } from './reward';
import { StateStore } from './state_store';
import { rawTransactionToInstance } from './transactions';
import {
	BlockJSON,
	DataStore,
	Transaction,
	TransactionJSON,
	TransactionMap,
} from './types';
import { verifyExist } from './verify';

export const EVENT_BLOCK_ADDED = 'block_added';
export const EVENT_BLOCK_DELETED = 'block_deleted';
export type ExceptionHandler = (
	errors: ReadonlyArray<Error>,
	store: StateStore,
	transactions: ReadonlyArray<Transaction>,
) => boolean;
export interface BlockchainOptions {
	readonly version: number;
	readonly rewards: RewardsOption;
	readonly maxTransactionsPerBlock: number;
	readonly epochTime: number;
}

const defaultOptions: BlockchainOptions = {
	version: 1,
	rewards: {
		milestones: [
			'500000000',
			'400000000',
			'300000000',
			'200000000',
			'100000000',
		],
		offset: 2160,
		distance: 3000000,
		totalAmount: '10000000000000000',
	},
	maxTransactionsPerBlock: 25,
	epochTime: 1464109200,
};

export class Blockchain extends EventEmitter {
	private readonly _db: DataStore;
	private readonly _genesis: Block;
	private readonly _txMap: TransactionMap;
	private readonly _exceptionHandler: ExceptionHandler;
	private readonly _options: BlockchainOptions;
	private _lastBlock?: Block;

	public constructor(
		genesis: BlockJSON,
		db: DataStore,
		txMap: TransactionMap,
		options: BlockchainOptions = defaultOptions,
		exceptionHander: ExceptionHandler = () => false,
	) {
		super();
		this._db = db;
		this._txMap = txMap;
		this._options = options;
		this._exceptionHandler = exceptionHander;
		const txs = rawTransactionToInstance(this._txMap, genesis.transactions);
		this._genesis = new Block(genesis, txs);
	}

	public async init(): Promise<void> {
		const genesis = await getBlockHeaderByHeight(this._db, 1);
		if (genesis && genesis.payloadHash === this._genesis.payloadHash) {
			return;
		}
		if (genesis && genesis.payloadHash !== this._genesis.payloadHash) {
			throw new Error('Nethash does not match with the genesis block');
		}
		const txs = rawTransactionToInstance(this._txMap, genesis.transactions);
		const block = new Block(genesis, txs);
		const store = new StateStore(this._db, block);
		await block.apply(store);
		await store.finalize();
		this.emit(EVENT_BLOCK_ADDED, {
			block,
			accounts: store.getUpdatedAccount(),
		});
	}

	public get nethash(): string {
		return this._genesis.payloadHash;
	}

	public get lastBlock(): Block {
		if (!this._lastBlock) {
			throw new Error('LastBlock cannot be called before initialize');
		}

		return this._lastBlock;
	}

	public async addBlock(
		rawBlock: BlockJSON,
		rewards?: ReadonlyArray<Reward>,
	): Promise<ReadonlyArray<Error> | undefined> {
		// Recalculate blockID
		const txs = rawTransactionToInstance(this._txMap, rawBlock.transactions);
		const block = new Block(rawBlock, txs);
		// Check if blockID exists
		const existError = await verifyExist(this._db, block.id);
		if (existError) {
			return [existError];
		}
		// Validate block
		const validateErrors = block.validate();
		if (validateErrors) {
			return validateErrors;
		}
		const store = new StateStore(this._db, block);
		// Verify block
		const verifyErrors = await block.verify(store);
		if (verifyErrors.length > 0) {
			return verifyErrors;
		}
		// Fork choice
		if (block.height === this.lastBlock.height) {
			const deleteError = await this._deleteBlock();
			if (deleteError) {
				throw deleteError;
			}

			return undefined;
		}
		// Apply block
		const applyErrors = await block.apply(store);
		if (
			applyErrors.length > 0 &&
			this._exceptionHandler(applyErrors, store, block.transactions)
		) {
			return applyErrors;
		}
		if (rewards) {
			await applyReward(store, block.height, rewards);
		}
		await store.finalize();
		this.emit(EVENT_BLOCK_ADDED, {
			block,
			accounts: store.getUpdatedAccount(),
		});

		return undefined;
	}

	public createBlock(
		transactions: ReadonlyArray<TransactionJSON>,
		passphrase: string,
	): Block {
		return createBlock({
			version: this._options.version,
			epochTime: this._options.epochTime,
			lastBlock: this.lastBlock,
			rewards: this._options.rewards,
			transactions,
			passphrase,
			txMap: this._txMap,
		});
	}

	public async getCandidates(num: number): Promise<ReadonlyArray<Account>> {
		return getCandidates(this._db, num);
	}

	private async _deleteBlock(): Promise<ReadonlyArray<Error> | undefined> {
		const store = new StateStore(this._db, this.lastBlock);
		const newLastBlockHeight = this.lastBlock.height - 1;
		const undoError = await this.lastBlock.undo(store);
		if (undoError) {
			return undoError;
		}
		// Check if last block had reward
		const rewards = await getRewardIfExist(this._db, this.lastBlock.height);
		if (rewards) {
			await undoReward(store, this.lastBlock.height, rewards);
		}
		await store.finalize();

		const newLastBlock = await getBlockByHeight(this._db, newLastBlockHeight);
		this._lastBlock = new Block(
			newLastBlock,
			rawTransactionToInstance(this._txMap, newLastBlock.transactions),
		);

		this.emit(EVENT_BLOCK_DELETED, {
			newLastBlock,
			accounts: store.getUpdatedAccount(),
		});

		return undefined;
	}
}
