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
import { createCCMsgBeforeSendContext } from '../context';
import { CCMsg, SendInternalContext } from '../types';
import { getIDAsKeyForStore, validateFormat } from '../utils';

export class SidechainInteroperabilityStore extends BaseInteroperabilityStore {
	public async isLive(chainID: Buffer): Promise<boolean> {
		const isTerminated = await this.hasTerminatedStateAccount(chainID);
		return !isTerminated;
	}

	public async sendInternal(sendContext: SendInternalContext): Promise<boolean> {
		const isReceivingChainExist = await this.chainAccountExist(sendContext.receivingChainID);

		let partnerChainID;
		if (isReceivingChainExist) {
			partnerChainID = sendContext.receivingChainID;
		} else {
			partnerChainID = getIDAsKeyForStore(MAINCHAIN_ID);
		}

		const partnerChainAccount = await this.getChainAccount(partnerChainID);
		// Chain must be live; This checks is always on the receivingChainID
		const isReceivingChainLive = await this.isLive(sendContext.receivingChainID);
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
			crossChainCommand: sendContext.crossChainCommand,
			fee: sendContext.fee,
			module: sendContext.module,
			nonce: ownChainAccount.nonce,
			params: sendContext.params,
			receivingChainID: sendContext.receivingChainID,
			sendingChainID: ownChainAccount.chainID,
			status: sendContext.status,
		};

		try {
			validateFormat(ccm);
		} catch (error) {
			return false;
		}

		const beforeSendContext = createCCMsgBeforeSendContext({
			ccm,
			eventQueue: sendContext.eventQueue,
			feeAddress: sendContext.feeAddress,
			getMethodContext: sendContext.getMethodContext,
			getStore: sendContext.getStore,
			logger: sendContext.logger,
			chainID: sendContext.chainID,
		});

		for (const mod of this.interoperableModuleMethods.values()) {
			if (mod?.beforeSendCCM) {
				try {
					await mod.beforeSendCCM(beforeSendContext);
				} catch (error) {
					return false;
				}
			}
		}

		await this.addToOutbox(partnerChainID, ccm);
		ownChainAccount.nonce += BigInt(1);
		await this.setOwnChainAccount(ownChainAccount);

		return true;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getInboxRoot(chainID: Buffer): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getOutboxRoot(chainID: Buffer): Promise<void> {
		// eslint-disable-next-line no-console
		console.log(chainID);
	}
}
