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
 *
 */

describe('Proof-of-misbehavior transaction', () => {
    describe('validateAsset', () => {
        it.todo('when header1.height is greater than or equal to header2.height but equal maxHeighPrevoted it should not return errors', async () => {});

        it.todo('when header1.height is greater than header2.maxHeightPreviouslyForged it should not return errors', async () => {});

        it.todo('when header1.maxHeightPrevoted is greater than header2.maxHeightPrevoted it should not return errors', async () => {});

        it.todo('when header1 is not contradicting header 2 it should return errors', async () => {});
    });

    describe('applyAsset', () => {
        describe('asset block headers are contradicting', async () => {
            it.todo('should add reward to balance of the sender', async () => {});
            it.todo('should deduct reward to balance of the misbehaving delegate', async () => {});
        });
    });
});