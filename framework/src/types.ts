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
import * as liskP2p from '@liskhq/lisk-p2p';

export interface Channel<T = unknown> {
	readonly publish: (procedure: string, params?: object) => void;
	readonly subscribe: (procedure: string, callback: Function) => void;
	readonly invoke: (eventName: string) => Promise<T>;
	readonly invokePublic: (procedure: string, params?: object) => Promise<T>;
}

export interface Logger {
	readonly trace: (data?: object | unknown, message?: string) => void;
	readonly debug: (data?: object | unknown, message?: string) => void;
	readonly info: (data?: object | unknown, message?: string) => void;
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
	liskP2p.p2pTypes.P2PConfig,
	{
		readonly advertiseAddress: boolean;
		readonly seedPeers: ReadonlyArray<SeedPeerInfo>;
	}
>;

export interface ProtocolPeerInfo {
	readonly [key: string]: unknown;
	readonly ipAddress: string;
	readonly wsPort: number;
}

export interface SeedPeerInfo {
	readonly ip: string | unknown;
	readonly wsPort: number;
}
/* End P2P */
