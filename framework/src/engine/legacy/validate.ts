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

import { utils } from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { validator } from '@liskhq/lisk-validator';
import { decodeBlock } from './codec';
import { LegacyBlockWithID } from './types';

export const validateLegacyBlock = (
	receivedBlock: Buffer,
	decodedNextBlock: LegacyBlockWithID,
): void => {
	const { block: decodedBlock, schema: blockSchema } = decodeBlock(receivedBlock);
	validator.validate(blockSchema.header, decodedBlock.header);

	if (decodedBlock.header.height + 1 !== decodedNextBlock.header.height) {
		throw new Error(
			`Received block at height ${decodedBlock.header.height} is not consecutive to next block ${decodedNextBlock.header.height}`,
		);
	}

	if (!decodedBlock.header.id.equals(decodedNextBlock.header.previousBlockID)) {
		throw new Error(
			`Received block ${decodedBlock.header.id.toString(
				'hex',
			)} is not previous block of ${decodedNextBlock.header.id.toString('hex')}`,
		);
	}

	const transactionRoot = regularMerkleTree.calculateMerkleRootWithLeaves(
		decodedBlock.payload.map(tx => utils.hash(tx)),
	);

	if (!decodedBlock.header.transactionRoot.equals(transactionRoot)) {
		throw new Error(
			`Received block has invalid transaction root ${transactionRoot.toString(
				'hex',
			)}. Expected: ${decodedBlock.header.transactionRoot.toString('hex')}`,
		);
	}
};
