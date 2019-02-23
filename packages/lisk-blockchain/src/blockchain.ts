import { EventEmitter } from 'events';
import { Block } from './block';
import { getBlockHeaderByHeight } from './repo';
import { StateStore } from './state_store';
import { BlockJSON, DataStore, TransactionMap } from './types';

const EVENT_BLOCK_ADDED = 'block_added';
const EVENT_BLOCK_DELETED = 'block_deleted';

export class Blockchain extends EventEmitter {
	private _db: DataStore;
	private _genesis: Block;
	private _lastBlock?: Block;
	private _txMap: TransactionMap;

	public constructor(genesis: BlockJSON, db: DataStore, txMap: TransactionMap) {
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
		const store = new StateStore(this._db);
		block.apply(store);

		return store.finalize();
	}

	public get lastBlock(): Block {
		if (!this._lastBlock) {
			throw new Error('LastBlock cannot be called before initialize');
		}

		return this._lastBlock;
	}

	public async addBlock(block: BlockJSON): Promise<void> {
		// Recalculate blockID
		// Check if blockID exists
		// Validate block
		// Verify block
		// Fork choice
		// Apply block
	}
}
