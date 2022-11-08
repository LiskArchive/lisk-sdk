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
import { BaseInteroperabilityInternalMethod } from '../base_interoperability_internal_methods';
import {
	CHAIN_ACTIVE,
	CHAIN_TERMINATED,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	MAINCHAIN_ID_BUFFER,
} from '../constants';
import { createCCMsgBeforeSendContext } from '../context';
import { CCMsg, SendInternalContext } from '../types';
import { validateFormat } from '../utils';
import { OwnChainAccountStore } from '../stores/own_chain_account';
import { ChainAccountStore } from '../stores/chain_account';

export class MainchainInteroperabilityInternalMethod extends BaseInteroperabilityInternalMethod {
	public async isLive(chainID: Buffer, timestamp: number): Promise<boolean> {
		const ownChainAccount = await this.stores
			.get(OwnChainAccountStore)
			.get(this.context, EMPTY_BYTES);
		if (chainID.equals(ownChainAccount.chainID)) {
			return true;
		}

		if (!ownChainAccount.chainID.equals(MAINCHAIN_ID_BUFFER)) {
			return false;
		}

		const chainAccountExists = await this.stores.get(ChainAccountStore).has(this.context, chainID);
		if (chainAccountExists) {
			const chainAccount = await this.stores.get(ChainAccountStore).get(this.context, chainID);
			if (chainAccount.status === CHAIN_TERMINATED) {
				return false;
			}
			if (
				chainAccount.status === CHAIN_ACTIVE &&
				timestamp - chainAccount.lastCertificate.timestamp > LIVENESS_LIMIT
			) {
				return false;
			}
		}

		return true;
	}

	public async sendInternal(sendContext: SendInternalContext): Promise<boolean> {
		let receivingChainAccount;
		try {
			// Chain has to exist on mainchain
			receivingChainAccount = await this.stores
				.get(ChainAccountStore)
				.get(this.context, sendContext.receivingChainID);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}

			return false;
		}

		if (!sendContext.timestamp) {
			throw new Error('Timestamp is missing from the function parameters');
		}
		// Chain must be live; This check is always on the receivingChainID
		const isReceivingChainLive = await this.isLive(
			sendContext.receivingChainID,
			sendContext.timestamp,
		);
		if (!isReceivingChainLive) {
			return false;
		}
		// Chain status must be active
		if (receivingChainAccount.status !== CHAIN_ACTIVE) {
			return false;
		}

		const ownChainAccount = await this.stores
			.get(OwnChainAccountStore)
			.get(this.context, EMPTY_BYTES);
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
		await this.addToOutbox(sendContext.receivingChainID, ccm);
		ownChainAccount.nonce += BigInt(1);
		await this.stores.get(OwnChainAccountStore).set(this.context, EMPTY_BYTES, ownChainAccount);

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
