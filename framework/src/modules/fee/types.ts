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

import { MethodContext, ImmutableMethodContext } from '../../state_machine/types';

export type FeeTokenID = Buffer;

export interface ModuleConfig {
	feeTokenID: string;
	minFeePerByte: number;
}
export interface TokenMethod {
	transfer: (
		methodContext: MethodContext,
		senderAddress: Buffer,
		generatorAddress: Buffer,
		id: Buffer,
		amount: bigint,
	) => Promise<void>;
	isNative: (methodContext: MethodContext, id: FeeTokenID) => Promise<boolean>;
	burn: (
		methodContext: MethodContext,
		senderAddress: Buffer,
		id: FeeTokenID,
		amount: bigint,
	) => Promise<void>;
	getAvailableBalance(
		methodContext: ImmutableMethodContext,
		address: Buffer,
		tokenID: Buffer,
	): Promise<bigint>;
}
