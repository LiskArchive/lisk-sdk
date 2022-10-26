/*
 * Copyright © 2020 Lisk Foundation
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

import { MethodContext, ImmutableMethodContext } from '../../state_machine';
import { CCMsg } from '../interoperability/types';
import { JSONObject } from '../../types';

export type TokenID = Buffer;

export interface ModuleConfig {
	ownChainID: Buffer;
	userAccountInitializationFee: bigint;
	escrowAccountInitializationFee: bigint;
	feeTokenID: Buffer;
}

export type ModuleConfigJSON = JSONObject<ModuleConfig>;

export interface GenesisTokenStore {
	userSubstore: {
		address: Buffer;
		tokenID: Buffer;
		availableBalance: bigint;
		lockedBalances: {
			module: string;
			amount: bigint;
		}[];
	}[];
	supplySubstore: {
		tokenID: Buffer;
		totalSupply: bigint;
	}[];
	escrowSubstore: {
		escrowChainID: Buffer;
		tokenID: Buffer;
		amount: bigint;
	}[];
	supportedTokensSubstore: {
		chainID: Buffer;
		supportedTokenIDs: Buffer[];
	}[];
}

export interface InteroperabilityMethod {
	getOwnChainAccount(methodContext: ImmutableMethodContext): Promise<{ id: Buffer }>;
	send(
		methodContext: MethodContext,
		feeAddress: Buffer,
		module: string,
		crossChainCommand: string,
		receivingChainID: Buffer,
		fee: bigint,
		status: number,
		parameters: Buffer,
	): Promise<boolean>;
	error(methodContext: MethodContext, ccm: CCMsg, code: number): Promise<void>;
	terminateChain(methodContext: MethodContext, chainID: Buffer): Promise<void>;
	getChannel(
		methodContext: MethodContext,
		chainID: Buffer,
	): Promise<{ messageFeeTokenID: { chainID: Buffer; localID: Buffer } }>;
	getMessageFeeTokenID(methodContext: ImmutableMethodContext, chainID: Buffer): Promise<Buffer>;
}
