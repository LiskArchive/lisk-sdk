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
