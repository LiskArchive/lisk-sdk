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
	address: string;
	publicKey: string;
	passphrase?: string;
}

export interface GenesisConfig {
	[key: string]: unknown;
	readonly bftBatchSize: number;
	readonly chainID: string;
	readonly blockTime: number;
	readonly maxTransactionsSize: number;
}

export interface NodeInfo {
	readonly version: string;
	readonly networkVersion: string;
	readonly chainID: string;
	readonly lastBlockID: string;
	readonly height: number;
	readonly finalizedHeight: number;
	readonly syncing: boolean;
	readonly unconfirmedTransactions: number;
	readonly genesis: GenesisConfig;
}
export interface BlockHeader {
	id: string;
	generatorAddress: string;
	height: number;
}

export interface Block {
	header: BlockHeader;
	transactions: Transaction[];
}

export interface Transaction {
	id: string;
	senderPublicKey: string;
	module: string;
	command: string;
	fee: number;
}

export interface EventData {
	module: string;
	name: string;
	topics: string[];
	index: number;
	height: number;
	data: string;
}

export type ParsedEvent = Omit<EventData, 'data'> & { data: Record<string, unknown> };

export interface SendTransactionOptions {
	module: string;
	command: string;
	params: Record<string, unknown>;
	passphrase: string;
}

export interface CallEndpointOptions {
	name: string;
	params: Record<string, unknown>;
}
