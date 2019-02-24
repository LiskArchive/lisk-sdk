import { EventEmitter } from 'events';
import { Block } from './block';
import { getBlockHeaderByHeight } from './repo';
import { StateStore } from './state_store';
import { BlockJSON, DataStore, TransactionMap } from './types';

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
		this._genesis = new Block(genesis, this._txMap);
	}

	public async init(): Promise<void> {
		const genesis = await getBlockHeaderByHeight(this._db, 1);
		if (genesis && genesis.payloadHash === this._genesis.payloadHash) {
			return;
		}
		if (genesis && genesis.payloadHash !== this._genesis.payloadHash) {
			throw new Error('Nethash does not match with the genesis block');
		}
		const block = new Block(genesis, this._txMap);
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
	): Promise<ReadonlyArray<Error> | undefined> {
		// Recalculate blockID
		const block = new Block(rawBlock, this._txMap);
		// Check if blockID exists
		const validateErrors = block.validate();
		if (validateErrors) {
			return validateErrors;
		}

		// Validate block
		// Verify block
		// Fork choice
		// Apply block
		return undefined;
	}
}
