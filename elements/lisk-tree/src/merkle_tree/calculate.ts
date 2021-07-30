import { hash } from '../../../lisk-cryptography/dist-node';
import { LEAF_PREFIX, NODE_HASH_SIZE } from './constants';
import { NodeIndex, NodeInfo, NodeLocation, NodeSide, NonNullableStruct } from './types';
import {
	buildBranch,
	createNewBranchNode,
	createNewLeafNode,
	generateNode,
	getBinaryString,
	getHeight,
	getLocationFromIndex,
	getPairLocation,
	getParentLocation,
	getSortedLocationsAndQueryData,
} from './utils';

export const calculatePathNodes = (
	queryData: ReadonlyArray<Buffer>,
	size: number,
	idxs: ReadonlyArray<number>,
	siblingHashes: ReadonlyArray<Buffer>,
) => {
	if (queryData.length !== idxs.length) {
		throw new Error("Amount of query hashes doesn't match amount of indexes");
	}

	if (queryData.length === 0 && idxs.length === 0) {
		throw new Error('No data is provided');
	}

	const pairHashes = [...siblingHashes];

	const tree: Record<string, NodeInfo> = {};

	const locations: NodeIndex[] = [];

	for (const index of idxs) {
		const location = getLocationFromIndex(index, size);
		locations.push(location);
	}

	const { sortedLocations, sortedQueryData } = getSortedLocationsAndQueryData(locations, queryData);

	for (const [i, location] of Object.entries(sortedLocations)) {
		const currentQueryDataIndex = Number(i);
		const { nodeIndex: currentNodeIndex, layerIndex: currentLayerIndex } = location;

		if (currentLayerIndex === undefined || currentNodeIndex === undefined) {
			locations.shift();
			continue;
		}

		const value = sortedQueryData[currentQueryDataIndex];

		const binaryIndex = getBinaryString(
			currentNodeIndex,
			getHeight(size) - currentLayerIndex,
		).toString();
		const isCurrentQueryDataLeaf = currentLayerIndex === 0;

		let newNode;
		if (isCurrentQueryDataLeaf) {
			newNode = createNewLeafNode(value, currentNodeIndex, true);
		} else {
			const rightHash = value.slice(-1 * NODE_HASH_SIZE);
			const leftHash = value.slice(-2 * NODE_HASH_SIZE, -1 * NODE_HASH_SIZE);
			const newNodeData = buildBranch(leftHash, rightHash, currentLayerIndex, currentNodeIndex);
			newNode = generateNode(newNodeData.branchHash, newNodeData.branchValue);
		}

		tree[binaryIndex] = newNode;
	}

	while ((sortedLocations[0].layerIndex as number) < getHeight(size) - 1) {
		const location = sortedLocations[0] as NonNullableStruct<NodeIndex>;
		const { nodeIndex: currentNodeIndex, layerIndex: currentLayerIndex } = location;
		const binaryIndex = getBinaryString(
			currentNodeIndex,
			getHeight(size) - currentLayerIndex,
		).toString();
		const currentNode = tree[binaryIndex];

		const pairLocation = getPairLocation({
			layerIndex: currentLayerIndex,
			nodeIndex: currentNodeIndex,
			size,
		});
		const { layerIndex: pairLayerIndex, nodeIndex: pairNodeIndex, side: pairSide } = pairLocation;
		const pairBinaryIndex = getBinaryString(
			pairNodeIndex,
			getHeight(size) - pairLayerIndex,
		).toString();

		const parentLocation: NodeLocation = getParentLocation(location, pairLocation);
		const { layerIndex: parentLayerIndex, nodeIndex: parentNodeIndex } = parentLocation;
		const parentBinaryIndex = getBinaryString(
			parentNodeIndex,
			getHeight(size) - parentLayerIndex,
		).toString();

		const currentSiblingHash = pairHashes[0];
		if (
			tree[pairBinaryIndex] &&
			tree[pairBinaryIndex].hash !== currentSiblingHash &&
			currentNode.hash !== currentSiblingHash
		) {
			const newParentNode = createNewBranchNode(
				parentLocation,
				tree[pairBinaryIndex].hash,
				currentNode.hash,
				pairSide as NodeSide,
			);

			if (!tree[parentBinaryIndex]) {
				tree[parentBinaryIndex] = newParentNode;
				sortedLocations.push(parentLocation);
			}

			sortedLocations.shift();
			continue;
		}

		let pairNodeHash;
		if (tree[pairBinaryIndex]) {
			pairNodeHash = tree[pairBinaryIndex].hash;
		} else {
			// eslint-disable-next-line prefer-destructuring
			pairNodeHash = pairHashes[0];
			pairHashes.shift();
		}

		const newParentNode = createNewBranchNode(
			parentLocation,
			pairNodeHash,
			currentNode.hash,
			pairSide as NodeSide,
		);
		if (!tree[parentBinaryIndex]) {
			tree[parentBinaryIndex] = newParentNode;
			sortedLocations.push(parentLocation);
		}

		sortedLocations.shift();
	}

	return tree;
};

export const calculateRootFromUpdateData = (
	updateData: Buffer[],
	proof: {
		siblingHashes: Buffer[];
		indexes: number[];
		size: number;
	},
) => {
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
		(indexes as unknown) as ReadonlyArray<number>,
		(siblingHashes as unknown) as ReadonlyArray<Buffer>,
	);
	const calculatedRoot = calculatedTree['0'].hash;

	return calculatedRoot;
};
