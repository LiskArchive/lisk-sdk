import { Account } from './account';
import { Reward } from './reward';
import { BlockJSON, DataStore, TransactionJSON } from './types';

export const BUCKET_HEIGHT_BLOCK_ID = 'block_height:block_id';
export const BUCKET_BLOCK_ID_BLOCK = 'block_id:block';
export const BUCKET_ADDRESS_ACCOUNT = 'address:account';
export const BUCKET_BLOCK_ID_TX_ID = 'block_id:transaction_ids';
export const BUCKET_TX_ID_TX = 'transaction_id:transaction';
export const BUCKET_BLOCK_HEIGHT_REWARDS = 'block_height:rewards';
export const BUCKET_CANDIDATE = 'candidate';

export const getBlockHeaderByHeight = async (
	db: DataStore,
	height: number,
): Promise<BlockJSON> => {
	const blockId = await db.get<string>(
		BUCKET_HEIGHT_BLOCK_ID,
		height.toString(),
	);

	return db.get<BlockJSON>(BUCKET_BLOCK_ID_BLOCK, blockId);
};

export const getBlockByHeight = async (
	db: DataStore,
	height: number,
): Promise<BlockJSON> => {
	const blockId = await db.get<string>(
		BUCKET_HEIGHT_BLOCK_ID,
		height.toString(),
	);

	return db.get<BlockJSON>(BUCKET_BLOCK_ID_BLOCK, blockId);
};

export const getBlockHeaderById = async (
	db: DataStore,
	id: string,
): Promise<BlockJSON> => db.get<BlockJSON>(BUCKET_BLOCK_ID_BLOCK, id);

export const getAccount = async (
	db: DataStore,
	address: string,
): Promise<Account> => db.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);

export const getTransaction = async (
	db: DataStore,
	id: string,
): Promise<TransactionJSON> => db.get<TransactionJSON>(BUCKET_TX_ID_TX, id);

export const getRewardIfExist = async (
	db: DataStore,
	height: number,
): Promise<ReadonlyArray<Reward> | undefined> => {
	try {
		return db.get<ReadonlyArray<Reward>>(BUCKET_TX_ID_TX, height);
	} catch (error) {
		return undefined;
	}
};

export const getCandidateAddresses = async (
	db: DataStore,
	limit: number,
): Promise<ReadonlyArray<string>> =>
	new Promise((resolve, reject) => {
		const addresses: string[] = [];
		db.createReadStream({ gte: BUCKET_CANDIDATE, limit })
			.on('data', data => addresses.push(data.value))
			.on('error', reject)
			.on('close', () => {
				resolve(addresses);
			});
	});

export const getCandidates = async (
	db: DataStore,
	limit: number = 101,
): Promise<ReadonlyArray<Account>> => {
	const addresses = await getCandidateAddresses(db, limit);

	return Promise.all(addresses.map(async address => getAccount(db, address)));
};
