/*
 * Copyright © 2022 Lisk Foundation
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

import { KVStore } from '@liskhq/lisk-db';
import { BaseInteroperableModule } from './base_interoperable_module';
import { CCMsg, CCUpdateParams, ChainAccount, ChannelData, SendInternalContext } from './types';

export abstract class BaseInteroperabilityStore {
	private readonly _moduleID: number;
	private readonly _interoperableModules = new Map<number, BaseInteroperableModule>();
	private readonly _getStore: (moduleID: number, storePrefix: number) => KVStore;

	public constructor(
		moduleID: number,
		getStore: (moduleID: number, storePrefix: number) => KVStore,
		interoperableModules: Map<number, BaseInteroperableModule>,
	) {
		this._moduleID = moduleID;
		this._interoperableModules = interoperableModules;
		this._getStore = getStore;
		// eslint-disable-next-line no-console
		console.log(!this._moduleID, !this._interoperableModules, !this._getStore);
	}

	// Different in mainchain and sidechain so to be implemented in each module store separately
	public abstract isLive(chainID: number): Promise<void>;
	public abstract sendInternal(sendContext: SendInternalContext): Promise<void>;

	// To be implemented in base class
	public abstract apply(ccu: CCUpdateParams, ccm: CCMsg): Promise<void>;
	public abstract appendToInboxTree(chainID: number, appendData: Buffer): Promise<void>;
	public abstract appendToOutboxTree(chainID: number, appendData: Buffer): Promise<void>;
	public abstract addToOutbox(chainID: Buffer, ccm: CCMsg): Promise<void>;
	public abstract addToInbox(chainID: Buffer, ccm: CCMsg): Promise<void>;
	public abstract terminateChainInternal(chainID: number): Promise<void>;
	public abstract createTerminatedOutboxAccount(
		chainID: number,
		outboxRoot: Buffer,
		outboxSize: bigint,
		partnerChainInboxSize: bigint,
	): Promise<void>;
	public abstract createTerminatedStateAccount(chainID: Buffer, stateRoot?: Buffer): Promise<void>;
	public abstract getTerminatedStateAccount(chainID: number): Promise<void>;
	public abstract getInboxRoot(chainID: number): Promise<void>;
	public abstract getOutboxRoot(chainID: number): Promise<void>;
	public abstract getChainAccount(chainID: number): Promise<ChainAccount>;
	public abstract getChannel(chainID: number): Promise<ChannelData>;
}
