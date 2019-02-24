import { Account } from './account';
import { Block } from './block';
import { BatchCommand, BlockJSON, DataStore, TransactionJSON } from './types';

const BUCKET_HEIGHT_BLOCK_ID = 'height:block_id';
const BUCKET_BLOCK_ID_BLOCK = 'block_id:block';
export const BUCKET_ADDRESS_ACCOUNT = 'address:account';
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

export const getAccount = async (
	db: DataStore,
	address: string,
): Promise<Account> => db.get<Account>(BUCKET_ADDRESS_ACCOUNT, address);

export const getTransaction = async (
	db: DataStore,
	id: string,
): Promise<TransactionJSON> => db.get<TransactionJSON>(BUCKET_TX_ID_TX, id);

export const blockSaveToBatch = (block: Block): ReadonlyArray<BatchCommand> => {
	const fullBlock = block.toJSON();
	const { transactions, ...blockHeader } = fullBlock;
	const transactionBatch = transactions.map(tx => ({
		type: 'put',
		bucket: BUCKET_TX_ID_TX,
		key: tx.id as string,
		value: tx,
	})) as ReadonlyArray<BatchCommand>;

	return [
		{
			type: 'put',
			bucket: BUCKET_BLOCK_ID_BLOCK,
			key: blockHeader.id as string,
			value: blockHeader,
		},
		{
			type: 'put',
			bucket: BUCKET_BLOCK_ID_TX_ID,
			key: blockHeader.id as string,
			value: transactions.map(tx => tx.id as string).join(','),
		},
		{
			type: 'put',
			bucket: BUCKET_HEIGHT_BLOCK_ID,
			key: (blockHeader.height as number).toString(),
			value: blockHeader.id as string,
		},
		...transactionBatch,
	];
};

export const blockDeleteToBatch = (
	block: Block,
): ReadonlyArray<BatchCommand> => {
	const fullBlock = block.toJSON();
	const { transactions, ...blockHeader } = fullBlock;
	const transactionBatch = transactions.map(tx => ({
		type: 'del',
		bucket: BUCKET_TX_ID_TX,
		key: tx.id as string,
	})) as ReadonlyArray<BatchCommand>;

	return [
		{
			type: 'del',
			bucket: BUCKET_BLOCK_ID_BLOCK,
			key: blockHeader.id as string,
		},
		{
			type: 'del',
			bucket: BUCKET_BLOCK_ID_TX_ID,
			key: blockHeader.id as string,
		},
		{
			type: 'del',
			bucket: BUCKET_HEIGHT_BLOCK_ID,
			key: (blockHeader.height as number).toString(),
		},
		...transactionBatch,
	];
};
