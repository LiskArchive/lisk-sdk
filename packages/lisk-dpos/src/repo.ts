import { Round } from './round';
import { DataStore } from './type';

export const BUCKET_ROUND = 'round';

export const getRound = async (db: DataStore, round: number): Promise<Round> =>
	db.get(BUCKET_ROUND, round);

export const getLatestRound = async (db: DataStore): Promise<Round> =>
	new Promise((resolve, reject) => {
		db.createReadStream({ gt: BUCKET_ROUND, limit: 1 })
			.on('data', resolve)
			.on('error', reject);
	});

export const updateRound = async (
	db: DataStore,
	roundNumber: string,
	value: Round,
) => db.put(BUCKET_ROUND, roundNumber, value);
