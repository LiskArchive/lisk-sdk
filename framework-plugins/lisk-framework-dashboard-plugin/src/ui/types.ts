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

export interface Account {
	base32Address: string;
	binaryAddress: string;
	publicKey: string;
	passphrase?: string;
}

export interface NodeInfo {
	version: string;
	networkVersion: string;
	networkIdentifier: string;
	lastBlockId: string;
	syncing: boolean;
	unconfirmedTransactions: number;
	blockTime: number;
	communityIdentifier: string;
	maxPayloadLength: number;
	bftThreshold: number;
	minFeePerByte: number;
	fees: Fee[];
}

export interface Fee {
	moduleId: number;
	assetId: number;
	baseFee: number;
}

export interface RegisteredModule {
	id: number;
	name: string;
	// TODO: To use later
	// actions: string[];
	// events: string[];
	// reducers: string[];
	transactionAssets: {
		id: number;
		name: string;
	}[];
}
