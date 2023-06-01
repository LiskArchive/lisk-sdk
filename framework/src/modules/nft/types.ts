/*
 * Copyright © 2023 Lisk Foundation
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

import { MethodContext } from '../../state_machine';
import { CCMsg } from '../interoperability';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleConfig {
	ownChainID: Buffer;
}

export interface InteroperabilityMethod {
	send(
		methodContext: MethodContext,
		feeAddress: Buffer,
		module: string,
		crossChainCommand: string,
		receivingChainID: Buffer,
		fee: bigint,
		status: number,
		parameters: Buffer,
		timestamp?: number,
	): Promise<void>;
	error(methodContext: MethodContext, ccm: CCMsg, code: number): Promise<void>;
	terminateChain(methodContext: MethodContext, chainID: Buffer): Promise<void>;
}

export interface FeeMethod {
	payFee(methodContext: MethodContext, amount: bigint): void;
}
