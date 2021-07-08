/*
 * Copyright © 2021 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

import { EMPTY_HASH, NodeSide, PREFIX_HASH_TO_VALUE } from './constants';
import { Leaf } from './leaf';
import { Database } from './types';
import { binaryExpansion, getBranchData, getLeafData, isLeaf } from './utils';
import { PrefixStore } from './prefix_store';
import { Branch } from './branch';
import { Empty } from './empty';

type TreeNode = Branch | Leaf | Empty;
export class SparseMerkleTree {
	private readonly _db: Database;
	private readonly _rootHash: Buffer;
	private readonly _keyLength: number;
	private readonly _hashToValueMap: PrefixStore;
	public constructor(db: Database, rootHash?: Buffer, keyLength = 36) {
		this._db = db;
		this._keyLength = keyLength;
		this._rootHash = rootHash ?? EMPTY_HASH;
		this._hashToValueMap = new PrefixStore(this._db, PREFIX_HASH_TO_VALUE);
	}
	public get rootHash(): Buffer {
		return this._rootHash;
	}
	// temporary, to be removed
	public get keyLength(): number {
		return this._keyLength;
	}
	// temporary, to be removed
	public get db(): Database {
		return this._db;
	}

	public async getNode(nodeHash: Buffer): Promise<TreeNode> {
		const data = await this._hashToValueMap.get(nodeHash);

		if (!data) {
			throw new Error(`Hash does not exist in merkle tree: ${nodeHash.toString('hex')}`);
		}

		if (isLeaf(data)) {
			const { key, value } = getLeafData(data, this.keyLength);
			return new Leaf(key, value);
		}

		const { leftHash, rightHash } = getBranchData(data);

		return new Branch(leftHash, rightHash);
	}
	// As specified in from https://github.com/LiskHQ/lips/blob/master/proposals/lip-0039.md
	public async update(key: Buffer, value: Buffer) {
		if (!value) {
			throw new Error('Value cannot be empty');
		}

		if (key.byteLength !== this.keyLength) {
			throw new Error(`Key is not equal to defined key length of ${this.keyLength}`);
		}

		const newLeaf = new Leaf(key, value);
		await this._hashToValueMap.set(newLeaf.hash, newLeaf.data); // Set leafNode in memory
		const ancestorNodes: TreeNode[] = [];
		let bottomNode: TreeNode = new Empty();
		let currentNode = await this.getNode(this.rootHash);
		const binaryKey = binaryExpansion(key, this.keyLength);
		let h = 0;

		while (!isLeaf((currentNode as Leaf | Branch).data)) {
			// Append currentNode to ancestorNodes
			ancestorNodes.push(currentNode);
			const d = binaryKey[h];
			if (d === '0') {
				currentNode = await this.getNode((currentNode as Branch).leftHash);
			} else if (d === '1') {
				currentNode = await this.getNode((currentNode as Branch).rightHash);
			}
			h += 1;
			// The currentNode is an empty default node or a leaf node
		}
		// The currentNode is an empty node, newLeaf will replace the default empty node or currentNode will be updated to newLeaf
		if (
			currentNode.hash.equals(EMPTY_HASH) ||
			(currentNode instanceof Leaf && key.equals(currentNode.key))
		) {
			bottomNode = newLeaf;
		} else {
			// We need to create new branches in the tree to fulfill the
			// Condition of one leaf per empty subtree
			// Note: h is set to the last value from the previous loop
			let d = binaryKey[h];
			const currentNodeBinaryKey = binaryExpansion((currentNode as Leaf).key, this.keyLength);
			let t = currentNodeBinaryKey[h];
			while (d === t) {
				// Create branch node with empty value
				const defaultBranch = new Branch(EMPTY_HASH, EMPTY_HASH);
				// Append defaultBranch to ancestorNodes
				ancestorNodes.push(defaultBranch);
				h += 1;
				d = binaryKey[h];
				t = currentNodeBinaryKey[h];
			}
			// Create last branch node, parent of node and newLeaf
			if (d === '0') {
				bottomNode = new Branch(newLeaf.hash, currentNode.hash);
			} else if (d === '1') {
				bottomNode = new Branch(currentNode.hash, newLeaf.hash);
			}
		}
		// Finally update all branch nodes in ancestorNodes
		// Starting from the last
		while (h > 0) {
			const d = binaryKey[h - 1];
			const p = ancestorNodes[h - 1];
			if (d === '0' && p instanceof Branch) {
				// Let siblingNode be the right child node of p
				const siblingNodeHash = p.rightHash;
				// Update p.data to bottomNode.hash|siblingNode.hash
				p.update(bottomNode.hash, NodeSide.LEFT);
				// Update p.hash to branchHash(p.data)
				p.update(siblingNodeHash, NodeSide.RIGHT);
				// set ancestor node in memory
				await this._hashToValueMap.set(p.hash, p.data);
			} else if (d === '1' && p instanceof Branch) {
				// Let siblingNode be the left child node of p
				const siblingNodeHash = p.rightHash;
				// Update p.data to siblingNode.hash|bottomNode.hash
				p.update(bottomNode.hash, NodeSide.RIGHT);
				// Update p.hash to branchHash(p.data)
				p.update(siblingNodeHash, NodeSide.LEFT);
				// set ancestor node in memory
				await this._hashToValueMap.set(p.hash, p.data);
			}
			bottomNode = p;
			h -= 1;
		}
		// The final value of bottomNode is the root node of the tree
		return bottomNode;
	}

	/*
    public remove() {}
    public generateSingleProof() {}
    public generateMultiProof() {}
    public verifyMultiProof() {}
    */
}
