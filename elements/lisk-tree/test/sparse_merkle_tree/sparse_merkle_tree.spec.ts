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

import { SparseMerkleTree } from '../../src/sparse_merkle_tree/sparse_merkle_tree';

describe('SparseMerkleTree', () => {
    describe('dummy', () => {
        it('is a dummy test', () => {
            expect(SparseMerkleTree).toBeDefined();
        });
    });
    describe('constructor', () => {});
    describe('update', () => {});
    describe('remove', () => {});
    describe('generateSingleProof', () => {});
    describe('generateMultiProof', () => {});
    describe('verifyMultiProof', () => {});
})