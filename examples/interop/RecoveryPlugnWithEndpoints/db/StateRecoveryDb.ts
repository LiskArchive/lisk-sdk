import { KVStore, InclusionProof } from '../types';
import { codec } from '@liskhq/lisk-codec';
import { db } from 'lisk-sdk';
import { DB_KEY_STATE_RECOVERY } from '../constants';
import { inclusionProofsSchema } from '../schemas';

export class StateRecoveryDB {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public close() {
		this._db.close();
	}

	public async getAll(): Promise<InclusionProof[]> {
		let inclusionProofs: InclusionProof[] = [];
		try {
			const encodedInfo = await this._db.get(DB_KEY_STATE_RECOVERY);
			inclusionProofs = codec.decode<{ inclusionProofs: InclusionProof[] }>(
				inclusionProofsSchema,
				encodedInfo,
			).inclusionProofs;
		} catch (error) {
			if (!(error instanceof db.NotFoundError)) {
				throw error;
			}
		}
		return inclusionProofs;
	}

	public async getByHeight(height: number): Promise<InclusionProof | undefined> {
		const inclusionProofs = await this.getAll();

		return inclusionProofs.find(proofs => proofs.height === height);
	}

	public async deleteUntilHeight(height: number) {
		const inclusionProofs = await this.getAll();
		const encodedInfo = codec.encode(inclusionProofsSchema, {
			inclusionProofs: inclusionProofs.filter(proofs => proofs.height > height),
		});
		await this._db.set(DB_KEY_STATE_RECOVERY, encodedInfo);
	}

	public async save(inclusionProof: InclusionProof) {
		const allInclusionProofs = await this.getAll();
		allInclusionProofs.push(inclusionProof);
		const encodedInfo = codec.encode(inclusionProofsSchema, {
			inclusionProofs: allInclusionProofs,
		});
		await this._db.set(DB_KEY_STATE_RECOVERY, encodedInfo);
	}
}
