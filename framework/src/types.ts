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
import { TransactionJSON } from '@liskhq/lisk-transactions';

export interface StringKeyVal {
	[key: string]: string;
}

export interface Logger {
	readonly trace: (data?: object | unknown, message?: string) => void;
	readonly debug: (data?: object | unknown, message?: string) => void;
	readonly info: (data?: object | unknown, message?: string) => void;
	readonly warn: (data?: object | unknown, message?: string) => void;
	readonly error: (data?: object | unknown, message?: string) => void;
	readonly fatal: (data?: object | unknown, message?: string) => void;
	readonly level: () => number;
}

/* Start Database  */
export interface Storage {
	readonly entities: {
		readonly NetworkInfo: KeyValEntity;
		readonly ForgerInfo: KeyValEntity;
		readonly Migration: MigrationEntity;
	};
}

export interface KeyValEntity {
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

export interface MigrationEntity {
	readonly applyAll: (migrations: {
		readonly [key: string]: ReadonlyArray<string>;
	}) => Promise<void>;
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
	readonly ip: string;
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
