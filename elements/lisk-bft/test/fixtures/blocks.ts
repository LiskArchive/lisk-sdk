/*
 * Copyright © 2019 Lisk Foundation
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

import { hash, getRandomBytes } from '@liskhq/lisk-cryptography';
import { BlockHeader } from '../../src';

type DeepPartial<T> = T extends Buffer
	? T
	: T extends Function
	? T
	: T extends object
	? { [P in keyof T]?: DeepPartial<T[P]> }
	: T;

export const createFakeBlockHeader = (
	header?: DeepPartial<BlockHeader>,
): BlockHeader => ({
	id: header?.id ?? hash(getRandomBytes(8)),
	version: 2,
	timestamp: header?.timestamp ?? 32578370,
	height: header?.height ?? 489,
	previousBlockID: header?.previousBlockID ?? hash(getRandomBytes(4)),
	generatorPublicKey: header?.generatorPublicKey ?? getRandomBytes(32),
	asset: {
		maxHeightPreviouslyForged: header?.asset?.maxHeightPreviouslyForged ?? 0,
		maxHeightPrevoted: header?.asset?.maxHeightPrevoted ?? 0,
	},
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const convertHeader = (blockHeader: any) => ({
	...blockHeader,
	id: Buffer.from(blockHeader.id),
	previousBlockID: blockHeader.previousBlockId
		? Buffer.from(blockHeader.previousBlockId)
		: Buffer.from(''),
	generatorPublicKey: Buffer.from(blockHeader.generatorPublicKey, 'hex'),
	asset: {
		maxHeightPrevoted: blockHeader.maxHeightPrevoted,
		maxHeightPreviouslyForged: blockHeader.maxHeightPreviouslyForged,
	},
});
