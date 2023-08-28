import { db } from 'lisk-sdk';
import { KVStore, InclusionProofWithHeightAndStateRoot } from '../types';
import { codec } from '@liskhq/lisk-codec';
import { inclusionProofsWithHeightAndStateRootSchema } from '../schemas';
import { DB_KEY_MESSAGE_RECOVERY } from '../constants';

export class MessageRecoveryDb {
	private readonly _db: KVStore;

	public constructor(db: KVStore) {
		this._db = db;
	}

	public async close() {
		await this._db.close();
	}

	public async getAll(): Promise<InclusionProofWithHeightAndStateRoot[]> {
		let proofs: InclusionProofWithHeightAndStateRoot[] = [];
		try {
			const encodedInfo = await this._db.get(DB_KEY_MESSAGE_RECOVERY);
			proofs = codec.decode<{ inclusionProofs: InclusionProofWithHeightAndStateRoot[] }>(
				inclusionProofsWithHeightAndStateRootSchema,
				encodedInfo,
			).inclusionProofs;
		} catch (error) {
			if (!(error instanceof db.NotFoundError)) {
				throw error;
			}
		}
		return proofs;
	}

	public async getByHeight(
		height: number,
	): Promise<InclusionProofWithHeightAndStateRoot | undefined> {
		return (await this.getAll()).find(proof => proof.height === height);
	}

	/**
	 * This will save proofs >= to input height
	 * @param height Last certified height
	 */
	public async deleteUntilHeight(height: number) {
		const filteredProofs = (await this.getAll()).filter(proofs => proofs.height >= height);

		await this._db.set(
			DB_KEY_MESSAGE_RECOVERY,
			codec.encode(inclusionProofsWithHeightAndStateRootSchema, {
				inclusionProofs: filteredProofs,
			}),
		);
	}

	public async save(inclusionProofWithHeightAndStateRoot: InclusionProofWithHeightAndStateRoot) {
		const proofs = await this.getAll();
		proofs.push(inclusionProofWithHeightAndStateRoot);

		const encodedInfo = codec.encode(inclusionProofsWithHeightAndStateRootSchema, {
			inclusionProofs: proofs,
		});
		await this._db.set(DB_KEY_MESSAGE_RECOVERY, encodedInfo);
	}
}
