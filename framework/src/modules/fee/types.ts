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
import { JSONObject } from '../../types';
import { CCMsg } from '../interoperability';

export type FeeTokenID = Buffer;

export interface ModuleConfig {
	feeTokenID: Buffer;
	minFeePerByte: number;
	maxBlockHeightZeroFeePerByte: number;
	feePoolAddress?: Buffer;
}

export type ModuleConfigJSON = JSONObject<ModuleConfig>;

export interface TokenMethod {
	transfer(
		methodContext: MethodContext,
		senderAddress: Buffer,
		generatorAddress: Buffer,
		id: Buffer,
		amount: bigint,
	): Promise<void>;
	burn(
		methodContext: MethodContext,
		senderAddress: Buffer,
		id: FeeTokenID,
		amount: bigint,
	): Promise<void>;
	getAvailableBalance(
		methodContext: ImmutableMethodContext,
		address: Buffer,
		tokenID: Buffer,
	): Promise<bigint>;
	lock(
		methodContext: MethodContext,
		address: Buffer,
		module: string,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void>;
	unlock(
		methodContext: MethodContext,
		address: Buffer,
		module: string,
		tokenID: Buffer,
		amount: bigint,
	): Promise<void>;
	userAccountExists(
		methodContext: ImmutableMethodContext,
		address: Buffer,
		tokenID: Buffer,
	): Promise<boolean>;
}

export interface GetFeeTokenIDResponse {
	tokenID: string;
}

export interface GetMinFeePerByteResponse {
	minFeePerByte: number;
}

export interface InteroperabilityMethod {
	getMessageFeeTokenID(methodContext: ImmutableMethodContext, chainID: Buffer): Promise<Buffer>;
	getMessageFeeTokenIDFromCCM(methodContext: ImmutableMethodContext, ccm: CCMsg): Promise<Buffer>;
}
