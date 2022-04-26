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

import { APIContext } from '../../node/state_machine/types';

export interface BaseFee {
	moduleID: number;
	commandID: number;
	baseFee: bigint;
}

export type FeeTokenID = Buffer;

export interface ModuleConfig {
	feeTokenID: string;
}

export interface TokenAPI {
	transfer: (
		apiContext: APIContext,
		senderAddress: Buffer,
		generatorAddress: Buffer,
		id: Buffer,
		amount: bigint,
	) => Promise<void>;
	isNative: (apiContext: APIContext, id: FeeTokenID) => Promise<boolean>;
	burn: (
		apiContext: APIContext,
		senderAddress: Buffer,
		id: FeeTokenID,
		amount: bigint,
	) => Promise<void>;
}
