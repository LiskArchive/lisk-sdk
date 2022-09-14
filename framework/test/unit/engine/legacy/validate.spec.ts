/* eslint-disable max-classes-per-file */
/*
 * Copyright © 2022 Lisk Foundation
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

import { encodeBlock } from '../../../../src/engine/legacy/codec';
import { validateLegacyBlock } from '../../../../src/engine/legacy/validate';
import { blockFixtures } from './fixtures';

describe('Legacy valdate', () => {
	let encodedBlock: Buffer;

	beforeEach(() => {
		encodedBlock = encodeBlock(blockFixtures[0]);
	});

	describe('validateBlock', () => {
		it('should fail if property includes invalid generator public key length', () => {
			const invalidEncodedBlock = encodeBlock({
				header: {
					...blockFixtures[0].header,
					generatorPublicKey: Buffer.from([0, 0, 1]),
				},
				transactions: [...blockFixtures[0].transactions],
			});
			expect(() => validateLegacyBlock(invalidEncodedBlock, blockFixtures[1])).toThrow(
				"Property '.generatorPublicKey' minLength not satisfied",
			);
		});

		it('should fail if property includes invalid transaction root length', () => {
			const invalidEncodedBlock = encodeBlock({
				header: {
					...blockFixtures[0].header,
					transactionRoot: Buffer.from([0, 0, 1]),
				},
				transactions: [...blockFixtures[0].transactions],
			});
			expect(() => validateLegacyBlock(invalidEncodedBlock, blockFixtures[1])).toThrow(
				"Property '.transactionRoot' minLength not satisfied",
			);
		});

		it('should fail if property includes invalid previous block id length', () => {
			const invalidEncodedBlock = encodeBlock({
				header: {
					...blockFixtures[0].header,
					previousBlockID: Buffer.from([0, 0, 1]),
				},
				transactions: [...blockFixtures[0].transactions],
			});
			expect(() => validateLegacyBlock(invalidEncodedBlock, blockFixtures[1])).toThrow(
				"Property '.previousBlockID' minLength not satisfied",
			);
		});

		it('should fail if property includes invalid signature length', () => {
			const invalidEncodedBlock = encodeBlock({
				header: {
					...blockFixtures[0].header,
					signature: Buffer.from([0, 0, 1]),
				},
				transactions: [...blockFixtures[0].transactions],
			});
			expect(() => validateLegacyBlock(invalidEncodedBlock, blockFixtures[1])).toThrow(
				"Property '.signature' minLength not satisfied",
			);
		});

		it('should fail if height is not consecutive', () => {
			expect(() =>
				validateLegacyBlock(encodedBlock, {
					header: {
						...blockFixtures[1].header,
						height: 3333,
					},
					transactions: blockFixtures[1].transactions,
				}),
			).toThrow('Received block at height 19583714 is not consecutive to next block 3333');
		});

		it('should fail if previous id does not match', () => {
			expect(() =>
				validateLegacyBlock(encodedBlock, {
					header: {
						...blockFixtures[1].header,
						previousBlockID: Buffer.from(
							'79b3bc7ae93a090cbba85b5518448463abc4618dc798a13a05e55fdaa4b51679',
							'hex',
						),
					},
					transactions: blockFixtures[1].transactions,
				}),
			).toThrow('is not previous block of');
		});

		it('should fail if transaction root does not match', () => {
			const invalidEncodedBlock = encodeBlock({
				header: {
					...blockFixtures[0].header,
				},
				transactions: [],
			});
			expect(() => validateLegacyBlock(invalidEncodedBlock, blockFixtures[1])).toThrow(
				'Received block has invalid transaction root',
			);
		});

		it('should not throw when received block is a valid previous block', () => {
			expect(() => validateLegacyBlock(encodedBlock, blockFixtures[1])).not.toThrow();
		});
	});
});
