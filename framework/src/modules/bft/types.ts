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

import { ImmutableAPIContext } from '../../node/state_machine';

export interface BFTHeader {
	height: number;
	generatorAddress: Buffer;
	maxHeightGenerated: number;
	maxHeightPrevoted: number;
}

export interface BFTHeights {
	maxHeightPrevoted: number;
	maxHeightPrecommited: number;
	maxHeightCertified: number;
}

export interface Validator {
	address: Buffer;
	bftWeight: bigint;
}

export interface ValidatorsAPI {
	getValidatorAccount(
		context: ImmutableAPIContext,
		address: Buffer,
	): Promise<{ blsKey: Buffer; generatorKey: Buffer }>;
}
