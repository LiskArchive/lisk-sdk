/*
 * Copyright © 2020 Lisk Foundation
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

import { verifyProof } from './merkle_tree/verify_proof';
import { calculateRootFromUpdateData } from './merkle_tree/calculate';
import { MerkleTree } from './merkle_tree/merkle_tree';
import { calculateMerkleRoot, calculateMerkleRootWithLeaves } from './merkle_tree/utils';
import { SparseMerkleTree } from './sparse_merkle_tree/sparse_merkle_tree';
import { verify, calculateRoot } from './sparse_merkle_tree/utils';
import { Proof as SMTProof, Query as SMTQuery } from './sparse_merkle_tree/types';

export const regularMerkleTree = {
	verifyProof,
	calculateRootFromUpdateData,
	calculateMerkleRoot,
	calculateMerkleRootWithLeaves,
	MerkleTree,
};

export const sparseMerkleTree = {
	verify,
	calculateRoot,
	SparseMerkleTree,
};

export { MerkleTree, SparseMerkleTree, SMTProof, SMTQuery };
