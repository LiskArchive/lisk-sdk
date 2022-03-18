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

import { BaseInteroperabilityStore } from '../base_interoperability_store';
import { LIVENESS_LIMIT } from '../constants';
import { CCMsg, CCUpdateParams, SendInternalContext } from '../types';

export class MainchainInteroperabilityStore extends BaseInteroperabilityStore {
	public async isLive(chainID: Buffer, timestamp: number): Promise<boolean> {
		try {
			const terminatedStateAccount = await this.getTerminatedStateAccount(chainID);
			if (terminatedStateAccount) {
				return false;
			}
		} catch (error) {
			if (
				timestamp - (await this.getChainAccount(chainID)).lastCertificate.timestamp >
				LIVENESS_LIMIT
			) {
				return false;
			}
		}
		return true;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async appendToOutboxTree(chainID: number, appendData: Buffer): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID, appendData);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async addToOutbox(chainID: Buffer, ccm: CCMsg): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID, ccm);
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
	public async sendInternal(sendContext: SendInternalContext): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(sendContext);
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
