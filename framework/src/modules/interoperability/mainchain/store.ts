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
import { MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA, STORE_PREFIX_OUTBOX_ROOT } from '../constants';
import { ccmSchema, channelSchema, outboxRootSchema } from '../schema';
import { CCMsg, CCUpdateParams, ChannelData, SendInternalContext } from '../types';

export class MainchainInteroperabilityStore extends BaseInteroperabilityStore {
	public async apply(ccu: CCUpdateParams, ccm: CCMsg): Promise<void> {
		console.log(ccu, ccm);
	}

	public async isLive(chainID: number): Promise<void> {
		console.log(chainID);
	};

	public async sendInternal(sendContext: SendInternalContext): Promise<void> {
		console.log(sendContext);
	}


	public async getChainAccount(chainID: number): Promise<void> {
		console.log(chainID);
	}

	public async getChannel(chainID: number): Promise<void> {
		console.log(chainID);
	}


	public async createTerminatedStateAccount(chainID: Buffer, stateRoot?: Buffer): Promise<void> {
		console.log(chainID, stateRoot);
	}

	public async getTerminatedStateAccount(chainID: number): Promise<void> {
		console.log(chainID);
	}

	public async terminateChainInternal(chainID: number): Promise<void> {
		console.log(chainID);
	}

	public async createTerminatedOutboxAccount(
		chainID: number,
		outboxRoot: Buffer,
		outboxSize: bigint,
		partnerChainInboxSize: bigint,
	): Promise<void> {
		console.log(chainID, outboxRoot, outboxSize, partnerChainInboxSize);
	}

	public async getInboxRoot(chainID: number): Promise<void> {
		console.log(chainID);
	}

	public async getOutboxRoot(chainID: number): Promise<void> {
		console.log(chainID);
	}


	public async appendToInboxTree(chainID: number, appendData: Buffer): Promise<void> {
		console.log(chainID, appendData)
	}
}
