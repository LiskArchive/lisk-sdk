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
import { CHAIN_ACTIVE, MAINCHAIN_ID } from '../constants';
import { CCMsg, CCUpdateParams, SendInternalContext } from '../types';
import { getIDAsKeyForStore, validateFormat } from '../utils';

export class SidechainInteroperabilityStore extends BaseInteroperabilityStore {
	public async isLive(chainID: Buffer): Promise<boolean> {
		const isTerminated = await this.hasTerminatedStateAccount(chainID);
		return !isTerminated;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async apply(ccu: CCUpdateParams, ccm: CCMsg): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(ccu, ccm);
	}

	public async sendInternal(sendContext: SendInternalContext): Promise<boolean> {
		const receivingChainIDAsStoreKey = getIDAsKeyForStore(sendContext.receivingChainID);
		const isReceivingChainExist = await this.chainAccountExist(receivingChainIDAsStoreKey);

		let partnerChainID;
		if (isReceivingChainExist) {
			partnerChainID = sendContext.receivingChainID;
		} else {
			partnerChainID = MAINCHAIN_ID;
		}

		const partnerChainIDAsStoreKey = getIDAsKeyForStore(partnerChainID);

		const partnerChainAccount = await this.getChainAccount(partnerChainIDAsStoreKey);
		// Chain must be live; This checks is always on the receivingChainID
		const isReceivingChainLive = await this.isLive(receivingChainIDAsStoreKey);
		if (!isReceivingChainLive) {
			return false;
		}
		// Chain status must be active
		if (partnerChainAccount.status !== CHAIN_ACTIVE) {
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

		await this.addToOutbox(partnerChainIDAsStoreKey, ccm);
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
	public async createTerminatedStateAccount(chainID: number, stateRoot?: Buffer): Promise<boolean> {
		// eslint-disable-next-line no-console
		console.log(chainID, stateRoot);

		// TODO: Update after implementation
		return true;
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
