import { Block } from './block';
import { BlockJSON, DataStore } from './types';

const BUCKET_HEIGHT_BLOCK_ID = 'height:block_id';
const BUCKET_BLOCK_ID_BLOCK = 'block_id:block';
const BUCKET_ADDRESS_ACCOUNT = 'address:account';
const BUCKET_BLOCK_ID_TX_ID = 'block_id:transaction_ids';
const BUCKET_TX_ID_TX = 'transaction_id:transaction';

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

export const saveBlock = async (
	db: DataStore,
	block: Block,
): Promise<void> => [];
