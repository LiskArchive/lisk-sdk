import { Account } from './account';
import { MAX_DIGITS } from './constants';
import { Reward } from './reward';
import { BlockJSON, DataStore, TransactionJSON } from './types';

export const BUCKET_HEIGHT_BLOCK_ID = 'block_height:block_id';
export const BUCKET_BLOCK_ID_BLOCK = 'block_id:block';
export const BUCKET_ADDRESS_ACCOUNT = 'address:account';
export const BUCKET_BLOCK_ID_TX_ID = 'block_id:transaction_ids';
export const BUCKET_TX_ID_TX = 'transaction_id:transaction';
export const BUCKET_BLOCK_HEIGHT_REWARDS = 'block_height:rewards';
export const BUCKET_CANDIDATE = 'candidate';

const numberKeyToString = (key: number): string =>
	key.toString().padStart(MAX_DIGITS, '0');

const getEndingKey = (key: string): string => {
	const lastChar = String.fromCharCode(key.charCodeAt(key.length - 1) + 1);

	return key.slice(0, -1) + lastChar;
};

export const getBlockHeaderByHeight = async (
	db: DataStore,
	height: number,
): Promise<BlockJSON> => {
	const blockId = await db.get<string>(
		BUCKET_HEIGHT_BLOCK_ID,
		numberKeyToString(height),
	);

	return db.get<BlockJSON>(BUCKET_BLOCK_ID_BLOCK, blockId);
};

export const getBlockByHeight = async (
	db: DataStore,
	height: number,
): Promise<BlockJSON> => {
	const blockId = await db.get<string>(
		BUCKET_HEIGHT_BLOCK_ID,
		numberKeyToString(height),
	);

	return db.get<BlockJSON>(BUCKET_BLOCK_ID_BLOCK, blockId);
};

export const getGenesisHeader = async (
	db: DataStore,
): Promise<BlockJSON | undefined> => {
	try {
		const block = await getBlockByHeight(db, 1);

		return block;
	} catch (error) {
		return undefined;
	}
};

const getBlockIdOrderHeight = async (
	db: DataStore,
	limit: number,
): Promise<ReadonlyArray<string>> =>
	new Promise((resolve, reject) => {
		const result: string[] = [];
		db.createReadStream({
			limit,
			gte: BUCKET_HEIGHT_BLOCK_ID,
			lt: getEndingKey(BUCKET_HEIGHT_BLOCK_ID),
			reverse: true,
		})
			.on('data', data => {
				result.push(data.value);
			})
			.on('error', reject)
			.on('end', () => {
				resolve(result);
			});
	});

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
		return db.get<ReadonlyArray<Reward>>(BUCKET_BLOCK_HEIGHT_REWARDS, height);
	} catch (error) {
		if (error.notFound) {
			return undefined;
		}
		throw error;
	}
};

export const getLatestBlock = async (db: DataStore): Promise<BlockJSON> => {
	const [heighestBlockId] = await getBlockIdOrderHeight(db, 1);
	const blockHeader = await db.get<BlockJSON>(
		BUCKET_BLOCK_ID_BLOCK,
		heighestBlockId,
	);
	const transactionIds = await db.get<ReadonlyArray<string>>(
		BUCKET_BLOCK_ID_TX_ID,
		heighestBlockId,
	);
	const transactions = await Promise.all(
		transactionIds.map(async id => getTransaction(db, id)),
	);

	return {
		...blockHeader,
		transactions,
	};
};

export const getCandidateAddresses = async (
	db: DataStore,
	limit: number,
): Promise<ReadonlyArray<string>> =>
	new Promise((resolve, reject) => {
		const addresses: string[] = [];
		db.createReadStream({
			gte: BUCKET_CANDIDATE,
			lt: getEndingKey(BUCKET_CANDIDATE),
			limit,
			reverse: true,
		})
			.on('data', data => {
				addresses.push(data.value);
			})
			.on('error', reject)
			.on('end', () => {
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
