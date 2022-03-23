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

import { codec } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { BaseInteroperableModule } from './base_interoperable_module';
import { CCMsg, CCUpdateParams, ChannelData, SendInternalContext } from './types';
import { SubStore } from '../../node/state_machine/types';
import {
	MODULE_ID_INTEROPERABILITY,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
} from './constants';
import { ccmSchema, channelSchema, outboxRootSchema } from './schema';

export abstract class BaseInteroperabilityStore {
	public readonly getStore: (moduleID: number, storePrefix: number) => SubStore;
	private readonly _moduleID: number;
	private readonly _interoperableModules = new Map<number, BaseInteroperableModule>();

	public constructor(
		moduleID: number,
		getStore: (moduleID: number, storePrefix: number) => SubStore,
		interoperableModules: Map<number, BaseInteroperableModule>,
	) {
		this._moduleID = moduleID;
		this._interoperableModules = interoperableModules;
		this.getStore = getStore;
		// eslint-disable-next-line no-console
		console.log(!this._moduleID, !this._interoperableModules, !this.getStore);
	}

	public async appendToOutboxTree(chainID: Buffer, appendData: Buffer) {
		const channelSubstore = this.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA);
		const channel = await channelSubstore.getWithSchema<ChannelData>(chainID, channelSchema);
		const updatedOutbox = regularMerkleTree.calculateMerkleRoot({
			value: hash(appendData),
			appendPath: channel.outbox.appendPath,
			size: channel.outbox.size,
		});
		await channelSubstore.setWithSchema(
			chainID,
			{ ...channel, outbox: updatedOutbox },
			channelSchema,
		);

		return true;
	}

	public async addToOutbox(chainID: Buffer, ccm: CCMsg) {
		const serializedMessage = codec.encode(ccmSchema, ccm);
		await this.appendToOutboxTree(chainID, serializedMessage);

		const channelSubstore = this.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA);
		const channel = await channelSubstore.getWithSchema<ChannelData>(chainID, channelSchema);

		const outboxRootSubstore = this.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_OUTBOX_ROOT);
		await outboxRootSubstore.setWithSchema(chainID, channel.outbox.root, outboxRootSchema);

		return true;
	}

	// Different in mainchain and sidechain so to be implemented in each module store separately
	public abstract isLive(chainID: number): Promise<void>;
	public abstract sendInternal(sendContext: SendInternalContext): Promise<void>;

	// To be implemented in base class
	public abstract apply(ccu: CCUpdateParams, ccm: CCMsg): Promise<void>;
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
	public abstract getChainAccount(chainID: number): Promise<void>; // TODO: Update to Promise<ChainAccount> after implementation
	public abstract getChannel(chainID: number): Promise<void>; // TODO: Update to Promise<ChannelData> after implementation
}
