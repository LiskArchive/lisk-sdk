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

import { NotFoundError } from '@liskhq/lisk-chain';
import { BaseInteroperabilityStore } from '../base_interoperability_store';
import { CCM_STATUS_CHANNEL_UNAVAILABLE, CHAIN_ACTIVE, LIVENESS_LIMIT } from '../constants';
import { CCMsg, SendInternalContext } from '../types';
import { getIDAsKeyForStore, validateFormat } from '../utils';

export class MainchainInteroperabilityStore extends BaseInteroperabilityStore {
	public async isLive(chainID: Buffer, timestamp: number): Promise<boolean> {
		const isTerminated = await this.hasTerminatedStateAccount(chainID);
		if (isTerminated) {
			return false;
		}

		const chainAccount = await this.getChainAccount(chainID);
		if (timestamp - chainAccount.lastCertificate.timestamp > LIVENESS_LIMIT) {
			return false;
		}

		return true;
	}

	public async bounce(ccm: CCMsg): Promise<void> {
		const terminatedStateAccountExists = await this.hasTerminatedStateAccount(
			getIDAsKeyForStore(ccm.sendingChainID),
		);

		// Messages from terminated chains are discarded, and never returned
		if (terminatedStateAccountExists) {
			return;
		}

		const newCCM = {
			...ccm,
			sendingChainID: ccm.receivingChainID,
			receivingChainID: ccm.sendingChainID,
			status: CCM_STATUS_CHANNEL_UNAVAILABLE,
		};

		await this.addToOutbox(getIDAsKeyForStore(newCCM.receivingChainID), newCCM);
	}

	public async sendInternal(sendContext: SendInternalContext): Promise<boolean> {
		const receivingChainIDAsStoreKey = getIDAsKeyForStore(sendContext.receivingChainID);
		let receivingChainAccount;
		try {
			// Chain has to exist on mainchain
			receivingChainAccount = await this.getChainAccount(receivingChainIDAsStoreKey);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}

			return false;
		}

		// Chain must be live; This check is always on the receivingChainID
		const isReceivingChainLive = await this.isLive(
			receivingChainIDAsStoreKey,
			sendContext.timestamp,
		);
		if (!isReceivingChainLive) {
			return false;
		}
		// Chain status must be active
		if (receivingChainAccount.status !== CHAIN_ACTIVE) {
			return false;
		}

		const ownChainAccount = await this.getOwnChainAccount();
		// Create cross-chain message
		const ccm: CCMsg = {
			crossChainCommandID: sendContext.crossChainCommandID,
			fee: sendContext.fee,
			moduleID: sendContext.moduleID,
			nonce: ownChainAccount.nonce,
			params: sendContext.params,
			receivingChainID: sendContext.receivingChainID,
			sendingChainID: ownChainAccount.id,
			status: sendContext.status,
		};

		try {
			validateFormat(ccm);
		} catch (error) {
			return false;
		}

		for (const mod of this._interoperableModules.values()) {
			if (mod?.crossChainAPI?.beforeSendCCM) {
				try {
					await mod.crossChainAPI.beforeSendCCM(sendContext.beforeSendContext);
				} catch (error) {
					return false;
				}
			}
		}
		await this.addToOutbox(receivingChainIDAsStoreKey, ccm);
		ownChainAccount.nonce += BigInt(1);
		await this.setOwnChainAccount(ownChainAccount);

		return true;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getChannel(chainID: number): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID);
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
