import { Block } from './block';
import { MAX_DIGITS } from './constants';
import {
	BUCKET_BLOCK_ID_BLOCK,
	BUCKET_BLOCK_ID_TX_ID,
	BUCKET_HEIGHT_BLOCK_ID,
	BUCKET_TX_ID_TX,
} from './repo';
import { BatchCommand, CacheMap } from './types';

export const cacheToBatch = (map: CacheMap): ReadonlyArray<BatchCommand> =>
	Object.entries(map).reduce(
		(accumulated, [bucket, values]) => {
			const reducedPerBucket = Object.entries(values).reduce(
				(prev, [key, value]) => {
					prev.push({
						type: 'put',
						bucket,
						key,
						value,
					});

					return [...prev];
				},
				[] as BatchCommand[],
			);

			return accumulated.concat(reducedPerBucket);
		},
		[] as BatchCommand[],
	);

export const deleteMapToBatch = (
	deleteMap: Map<string, string>,
): ReadonlyArray<BatchCommand> =>
	Object.entries(deleteMap).reduce(
		(accumulated, [bucket, values]) => {
			const reducedPerBucket = Object.keys(values).reduce(
				(prev, key) => {
					prev.push({
						type: 'del',
						bucket,
						key,
					});

					return [...prev];
				},
				[] as BatchCommand[],
			);

			return accumulated.concat(reducedPerBucket);
		},
		[] as BatchCommand[],
	);

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
			value: transactions.map(tx => tx.id as string),
		},
		{
			type: 'put',
			bucket: BUCKET_HEIGHT_BLOCK_ID,
			key: (blockHeader.height as number).toString().padStart(MAX_DIGITS, '0'),
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
			key: (blockHeader.height as number).toString().padStart(MAX_DIGITS, '0'),
		},
		...transactionBatch,
	];
};
