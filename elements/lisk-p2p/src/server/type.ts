/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */

export type ProcessCallback = (err: Error | undefined, data: object) => void;

export interface SocketInfo {
	readonly id: string;
	readonly ipAddress: string;
	readonly wsPort: number;
	readonly protocolVersion: string;
	readonly advertiseAddress: boolean;
	readonly nonce: string;
	readonly nethash: string;
}

export interface ProcessMessage<T> {
	readonly type: string;
	readonly data?: T;
}

export interface WorkerMessage {
	readonly type: string;
	readonly id: string;
	readonly data?: unknown;
}

export interface NodeConfig {
	readonly protocolVersion: string;
	readonly nonce: string;
	readonly nethash: string;
	readonly wsPort: number;
	readonly advertiseAddress: boolean;
	readonly maxPeerInfoSize?: number;
	readonly bannedPeers: ReadonlyArray<string>;
	readonly blacklistedPeers: ReadonlyArray<string>;
}
