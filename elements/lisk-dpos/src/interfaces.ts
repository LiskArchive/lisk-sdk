import { EventEmitter } from "events";

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
 */

export interface SlotsConstructor {
	readonly epochTime: string;
	readonly interval: number;
	readonly blocksPerRound: number;
}

export interface DposConstructor {
	readonly storage: Storage;
	readonly slots: SlotsConstructor;
	readonly activeDelegates: number;
	readonly delegateListRoundOffset: number;
	readonly logger: Logger;
	// tslint:disable-next-line:no-any
	readonly exceptions: any;
}

export interface DelegatesConstructor {
	readonly storage: Storage;
	readonly slots: SlotsConstructor;
	readonly activeDelegates: number;
	// tslint:disable-next-line:no-any
	readonly exceptions: any;
}

export interface DelegatesInfoConstructor {
	readonly storage: Storage;
	readonly slots: SlotsConstructor;
	readonly activeDelegates: number;
	readonly logger: Logger;
	readonly events: EventEmitter;
	readonly delegatesList: DelegatesList;
	// tslint:disable-next-line:no-any
	readonly exceptions: any;
}

export interface DelegatesList {
	readonly getForgerPublicKeysForRound: (round: number, delegateListRoundOffset: number, tx: StorageTransaction) => Promise<readonly string[]>
	readonly getDelegatePublicKeysSortedByVoteWeight: () =>
	readonly createRoundDelegateList: () =>
	readonly deleteDelegateListUntilRound: () =>
	readonly deleteDelegateListAfterRound: () =>
	readonly verifyBlockForger: () =>
}

export interface StorageTransaction {
	// tslint:disable-next-line no-any
	readonly batch: <T = any>(input: any[]) => Promise<T>;
}

export interface RoundDelegates {
	readonly round: number;
	readonly delegatePublicKeys: string[];
}

export interface RoundDelegatesEntity {
	readonly getActiveDelegatesForRound: (roundWithOffset: number, tx: StorageTransaction) => Promise<RoundDelegates[]>;
}

export interface Storage {
	readonly entities: {
		readonly RoundDelegates: RoundDelegatesEntity;
	};
}

export interface Logger {
	// tslint:disable-next-line no-any
	readonly debug: (...input: any[]) => void;
	// tslint:disable-next-line no-any
	readonly error: (...input: any[]) => void;
}
