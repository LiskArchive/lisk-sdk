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

import { codec } from '@liskhq/lisk-codec';
import { blockHeaderSchemaV2, blockSchemaV2 } from '../../../../src/engine/legacy/schemas';
import { decodeBlock, decodeBlockJSON, encodeBlock } from '../../../../src/engine/legacy/codec';
import { blockFixtures } from './fixtures';

describe('Legacy codec', () => {
	describe('v2 block', () => {
		let encodedBlock: Buffer;

		beforeEach(() => {
			encodedBlock = codec.encode(blockSchemaV2, {
				header: codec.encode(blockHeaderSchemaV2, blockFixtures[0].header),
				payload: blockFixtures[0].payload,
			});
		});

		describe('decodeBlock', () => {
			it('should decode valid v2 block', () => {
				const decodedBlock = decodeBlock(encodedBlock);

				expect(decodedBlock.block).toEqual(blockFixtures[0]);
			});

			it('should fail to decode invalid block', () => {
				expect(() => decodeBlock(encodedBlock.subarray(2))).toThrow();
			});
		});

		describe('decodeBlockJSON', () => {
			it('should decode the blocks to the JSON format', () => {
				const decodedBlock = decodeBlockJSON(encodedBlock);

				expect(decodedBlock.block.header.previousBlockID).toEqual(
					blockFixtures[0].header.previousBlockID.toString('hex'),
				);
				expect(decodedBlock.block.header.height).toEqual(blockFixtures[0].header.height);
				expect(decodedBlock.block.header.transactionRoot).toEqual(
					blockFixtures[0].header.transactionRoot.toString('hex'),
				);
			});
		});

		describe('encodeBlock', () => {
			it('should encode block', () => {
				expect(encodeBlock(blockFixtures[0])).toEqual(encodedBlock);
			});
		});
	});
});
