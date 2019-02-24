import { Account } from './account';
import { BlockJSON, DataStore, TransactionJSON } from './types';

export const BUCKET_HEIGHT_BLOCK_ID = 'height:block_id';
export const BUCKET_BLOCK_ID_BLOCK = 'block_id:block';
export const BUCKET_ADDRESS_ACCOUNT = 'address:account';
export const BUCKET_BLOCK_ID_TX_ID = 'block_id:transaction_ids';
export const BUCKET_TX_ID_TX = 'transaction_id:transaction';

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
