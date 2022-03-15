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
import { BaseInteroperabilityStore } from '../base_interoperability_store';
import {
	MODULE_ID_INTEROPERABILITY,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
} from '../constants';
import { ccmSchema, channelSchema, outboxRootSchema } from '../schema';
import { CCMsg, CCUpdateParams, ChannelData, SendInternalContext } from '../types';

export class MainchainInteroperabilityStore extends BaseInteroperabilityStore {
	public async appendToOutboxTree(chainID: Buffer, appendData: Buffer) {
		const channelSubstore = this.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA);
		const channel = await channelSubstore.getWithSchema<ChannelData>(chainID, channelSchema);
		const outboxTreeInfo = regularMerkleTree.calculateMerkleRoot({
			value: hash(appendData),
			appendPath: channel.outbox.appendPath,
			size: channel.outbox.size,
		});
		await channelSubstore.setWithSchema(
			chainID,
			{ ...channel, outbox: outboxTreeInfo },
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

	// eslint-disable-next-line @typescript-eslint/require-await
	public async appendToInboxTree(chainID: number, appendData: Buffer): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID, appendData);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async apply(ccu: CCUpdateParams, ccm: CCMsg): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(ccu, ccm);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async isLive(chainID: number): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async sendInternal(sendContext: SendInternalContext): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(sendContext);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getChainAccount(chainID: number): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getChannel(chainID: number): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async createTerminatedStateAccount(chainID: Buffer, stateRoot?: Buffer): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID, stateRoot);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getTerminatedStateAccount(chainID: number): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async terminateChainInternal(chainID: number): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async createTerminatedOutboxAccount(
		chainID: number,
		outboxRoot: Buffer,
		outboxSize: bigint,
		partnerChainInboxSize: bigint,
	): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID, outboxRoot, outboxSize, partnerChainInboxSize);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getInboxRoot(chainID: number): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getOutboxRoot(chainID: number): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID);
	}
}
