import { EventEmitter } from 'events';
import { Block, createBlock } from './block';
import { getBlockHeaderByHeight } from './repo';
import { applyReward, Reward } from './reward';
import { StateStore } from './state_store';
import { rawTransactionToInstance } from './transactions';
import { BlockJSON, DataStore, TransactionJSON, TransactionMap } from './types';
import { verifyExist } from './verify';

export const EVENT_BLOCK_ADDED = 'block_added';
export const EVENT_BLOCK_DELETED = 'block_deleted';
export type ExceptionHandler = () => boolean;
export interface BlockchainOptions {
	readonly blockTime?: number;
}

export class Blockchain extends EventEmitter {
	private _db: DataStore;
	private _genesis: Block;
	private _lastBlock?: Block;
	private _txMap: TransactionMap;

	public constructor(
		genesis: BlockJSON,
		db: DataStore,
		txMap: TransactionMap,
		options: BlockchainOptions = {},
		exceptionHander: ExceptionHandler = () => false,
	) {
		super();
		this._db = db;
		this._txMap = txMap;
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
		block.apply(store);
		await store.finalize();
		this.emit(EVENT_BLOCK_ADDED, {
			block,
			accounts: store.getUpdatedAccount(),
		});
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
		const existError = await verifyExist(this._db, block.id as string);
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
		// Apply block
		const applyErrors = await block.apply(store);
		if (applyErrors.length > 0) {
			return applyErrors;
		}
		if (rewards) {
			await applyReward(store, rewards);
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
			version: 1,
			height: this.lastBlock.height + 1,
			transactions,
			passphrase,
			txMap: this._txMap,
		});
	}
}
