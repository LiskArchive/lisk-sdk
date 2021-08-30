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

import { APIContext } from '../../node/state_machine';

export interface BaseFee {
	moduleID: number;
	commandID: number;
	baseFee: bigint;
}

export interface ModuleConfig {
	feeTokenID: {
		chainID: number;
		localID: number;
	};
}

export interface TokenAPI {
	transfer: (
		apiContext: APIContext,
		senderAddress: Buffer,
		generatorAddress: Buffer,
		id: { chainID: number; localID: number },
		amount: bigint,
	) => Promise<void>;
	burn: (
		apiContext: APIContext,
		senderAddress: Buffer,
		id: { chainID: number; localID: number },
		amount: bigint,
	) => Promise<void>;
}
