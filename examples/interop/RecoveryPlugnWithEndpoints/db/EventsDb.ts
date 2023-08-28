import { CCMsg, codec } from 'lisk-sdk';
import { checkDBError } from '@liskhq/lisk-framework-chain-connector-plugin/dist-node/db';
import { KVStore, CCMsInfo } from '../types';
import { ccmsInfoSchema } from '../schemas';
import { DB_KEY_EVENTS } from '../constants';

export class EventsDb {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public async close() {
		await this._db.close();
	}

	public async getCCMsForChainID(chainID: Buffer): Promise<CCMsg[]> {
		let ccms: CCMsg[] = [];
		try {
			ccms = await this.getCCMs();
			return ccms.filter(ccm => ccm.receivingChainID.equals(chainID));
		} catch (error) {
			checkDBError(error);
		}
		return ccms;
	}

	public async getCCMs(): Promise<CCMsg[]> {
		let ccms: CCMsg[] = [];
		try {
			const encodedInfo = await this._db.get(DB_KEY_EVENTS);
			ccms = codec.decode<CCMsInfo>(ccmsInfoSchema, encodedInfo).ccms;
		} catch (error) {
			checkDBError(error);
		}
		return ccms;
	}

	public async setCCMs(ccms: CCMsg[]) {
		const encodedInfo = codec.encode(ccmsInfoSchema, { ccms });
		await this._db.set(DB_KEY_EVENTS, encodedInfo);
	}
}
