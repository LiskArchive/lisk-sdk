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

import { BFTParameters } from '../../modules/bft/schemas';
import { BFTHeights } from '../../modules/bft/types';
import { ValidatorKeys } from '../../modules/validators/types';
import { BlockHeader, ImmutableAPIContext } from '../state_machine';

export interface BFTHeader {
	id: Buffer;
	previousBlockID: Buffer;
	generatorAddress: Buffer;
	timestamp: number;
	height: number;
	maxHeightPrevoted: number;
	maxHeightGenerated: number;
	receivedAt?: number;
}

export interface Validator {
	address: Buffer;
	bftWeight: bigint;
}

export interface ValidatorAPI {
	getGeneratorAtTimestamp: (apiContext: ImmutableAPIContext, timestamp: number) => Promise<Buffer>;
	getSlotNumber: (apiContext: ImmutableAPIContext, timestamp: number) => Promise<number>;
	getSlotTime: (apiContext: ImmutableAPIContext, slot: number) => Promise<number>;
	getValidatorAccount: (apiContext: ImmutableAPIContext, address: Buffer) => Promise<ValidatorKeys>;
}

export interface BFTAPI {
	getCurrentValidators: (apiContext: ImmutableAPIContext) => Promise<Validator[]>;
	getBFTHeights: (apiClient: ImmutableAPIContext) => Promise<BFTHeights>;
	getBFTParameters: (apiContext: ImmutableAPIContext, height: number) => Promise<BFTParameters>;
	isHeaderContradictingChain: (
		apiClient: ImmutableAPIContext,
		header: BlockHeader,
	) => Promise<boolean>;
	getNextHeightBFTParameters: (apiContext: ImmutableAPIContext, height: number) => Promise<number>;
}
