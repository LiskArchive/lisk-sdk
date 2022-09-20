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

import { codec, Schema } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { blockHeaderSchemaV2, blockSchemaV2 } from './schemas';
import { LegacyBlock, LegacyBlockJSON, RawLegacyBlock } from './types';

export interface LegacyBlockSchema {
	header: Schema;
	block: Schema;
}

export const blockSchemaMap: Record<number, LegacyBlockSchema> = {
	2: {
		block: blockSchemaV2,
		header: blockHeaderSchemaV2,
	},
};

// Implement read version logic when adding more versions
const readVersion = (): number => 2;

export const decodeBlock = (data: Buffer): { block: LegacyBlock; schema: LegacyBlockSchema } => {
	const version = readVersion();
	const blockSchema = blockSchemaMap[version];
	if (!blockSchema) {
		throw new Error(`Legacy block version ${version} is not registered.`);
	}
	const rawBlock = codec.decode<RawLegacyBlock>(blockSchema.block, data);
	const id = utils.hash(rawBlock.header);
	return {
		block: {
			...rawBlock,
			header: {
				...codec.decode(blockSchema.header, rawBlock.header),
				id,
			},
		},
		schema: blockSchema,
	};
};

export const decodeBlockJSON = (
	data: Buffer,
): { block: LegacyBlockJSON; schema: LegacyBlockSchema } => {
	const { block, schema } = decodeBlock(data);
	return {
		block: {
			header: {
				...codec.toJSON(schema.header, block.header),
				id: block.header.id.toString('hex'),
			},
			transactions: block.transactions.map(tx => tx.toString('hex')),
		},
		schema,
	};
};

export const encodeBlock = (data: LegacyBlock): Buffer => {
	const blockSchema = blockSchemaMap[data.header.version];
	if (!blockSchema) {
		throw new Error(`Legacy block version ${data.header.version} is not registered.`);
	}
	const { id, ...blockHeader } = data.header;
	const headerBytes = codec.encode(blockSchema.header, blockHeader);

	return codec.encode(blockSchema.block, {
		header: headerBytes,
		transactions: data.transactions,
	});
};
