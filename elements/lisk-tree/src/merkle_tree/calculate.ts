import { hash } from '../../../lisk-cryptography/dist-node';
import { LEAF_PREFIX } from './constants';
import {
	calculatePathNodes,
} from './utils';

export const calculateRootFromUpdateData = (
	updateData: Buffer[],
	proof: {
		siblingHashes: Buffer[];
		indexes: number[];
		size: number;
	},
): Buffer => {
	const { indexes, size, siblingHashes } = proof;

	if (updateData.length !== indexes.length) {
		throw new Error("Amount of update data doesn't match amount of indexes");
	}

	const updateHashes = [];

	for (const data of updateData) {
		const leafValueWithoutNodeIndex = Buffer.concat(
			[LEAF_PREFIX, data],
			LEAF_PREFIX.length + data.length,
		);
		const leafHash = hash(leafValueWithoutNodeIndex);
		updateHashes.push(leafHash);
	}

	const calculatedTree = calculatePathNodes(
		updateHashes,
		size,
		indexes,
		siblingHashes,
	);
	const calculatedRoot = calculatedTree.get(2); // 2 is the index for root "10"
	return calculatedRoot as Buffer;
};
