import { join } from 'path';
import * as os from 'os';
import { ensureDir } from 'fs-extra';
import { checkDBError } from '@liskhq/lisk-framework-chain-connector-plugin/dist-node/db';

type KVStore = db.Database;
const DB_KEY_EVENTS = Buffer.from([1]);

interface Data {
	readonly blockHeader: chain.BlockHeaderJSON;
}

const getDBInstance = async (dataPath: string, dbName = 'events.db'): Promise<KVStore> => {
	const dirPath = join(dataPath.replace('~', os.homedir()), 'plugins/data', dbName);
	console.log(`dirPath: ${dirPath}`);

	await ensureDir(dirPath);
	return new db.Database(dirPath);
};

const ccmsInfoSchema = {
	$id: 'msgRecoveryPlugin/ccmsFromEvents',
	type: 'object',
	properties: {
		ccms: {
			type: 'array',
			fieldNumber: 1,
			items: {
				...ccmSchema,
			},
		},
	},
};

interface CCMsInfo {
	ccms: CCMsg[];
}

export class EventsModel {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public async close() {
		await this._db.close();
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
