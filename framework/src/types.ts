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
import { p2pTypes } from '@liskhq/lisk-p2p';
import { BlockJSON } from '@liskhq/lisk-chain';
import { BlockInstance } from '@liskhq/lisk-chain';
import { TransactionJSON } from '@liskhq/lisk-transactions';

export interface Channel {
	readonly publish: (procedure: string, params?: object) => void;
	readonly subscribe: (procedure: string, callback: Function) => void;
	readonly invoke: <T = unknown>(
		eventName: string,
		params?: object,
	) => Promise<T>;
	readonly invokePublic: <T = unknown>(
		procedure: string,
		params?: object,
	) => Promise<T>;
	readonly invokeFromNetwork: <T = unknown>(
		procedure: string,
		params?: object,
	) => Promise<T>;
	readonly publishToNetwork: <T = unknown>(eventName: string, data?: object) => Promise<T>;
}

export interface Logger {
	readonly trace: (data?: object | unknown, message?: string) => void;
	readonly debug: (data?: object | unknown, message?: string) => void;
	readonly info: (data?: object | unknown, message?: string) => void;
	readonly warn: (data?: object | unknown, message?: string) => void;
	readonly error: (data?: object | unknown, message?: string) => void;
	readonly fatal: (data?: object | unknown, message?: string) => void;
}

/* Start Database  */
export interface Storage {
	readonly entities: {
		readonly NetworkInfo: NetworkInfoEntity;
	};
}

export interface NetworkInfoEntity {
	readonly getKey: (
		key: string,
		tx?: StorageTransaction,
	) => Promise<string | undefined>;
	readonly setKey: (
		key: string,
		value: string,
		tx?: StorageTransaction,
	) => Promise<void>;
}

export interface StorageTransaction {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly batch: <T = any>(input: any[]) => Promise<T>;
}
/* End Database */

/* Start P2P */
type Modify<T, R> = Omit<T, keyof R> & R;
export type P2PConfig = Modify<
	p2pTypes.P2PConfig,
	{
		readonly advertiseAddress: boolean;
		readonly seedPeers: ReadonlyArray<SeedPeerInfo>;
	}
>;

export interface SeedPeerInfo {
	readonly ip: string | unknown;
	readonly wsPort: number;
}

export interface RPCBlocksByIdData {
	readonly blockId: string;
}

export interface EventPostBlockData {
	readonly block: BlockJSON;
}

export interface EventPostTransactionData {
	readonly transaction: TransactionJSON;
}

export interface EventPostTransactionsAnnouncementData {
	readonly transactionIds: string[];
}

export interface RPCTransactionsByIdData {
	readonly transactionIds: string[];
}

export interface RPCHighestCommonBlockData {
	readonly ids: string[];
}
/* End P2P */

export interface AppStateProperties {
	readonly os: string;
	readonly version: string;
	readonly wsPort: number;
	readonly httpPort: number;
	readonly protocolVersion: string;
	readonly height: number;
	readonly blockVersion: number;
	readonly maxHeightPrevoted: number;
	readonly networkId: string;
}

export interface ApplicationState {
	readonly logger: Logger;
	readonly set: (logger: Logger) => void;
	readonly update: (appState: AppStateProperties) => boolean;
}

export interface Processor {
	readonly process: (
		block: BlockInstance,
		{ peerId: string }: p2pTypes.P2PPeerInfo,
	) => Promise<void>;
	readonly deserialize: (block: BlockJSON) => Promise<BlockInstance>;
}

export interface Synchronizer {
	readonly isActive: boolean;
	readonly init: () => Promise<void>;
	readonly run: (receivedBlock: BlockJSON, peerId: string) => Promise<void>;
	readonly loadUnconfirmedTransactions: () => Promise<void>;
}
