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
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { BaseInteroperabilityInternalMethod } from '../base_interoperability_internal_methods';
import {
	CCM_PROCESSED_CODE_CHANNEL_UNAVAILABLE,
	CCM_PROCESSED_RESULT_BOUNCED,
	CCM_PROCESSED_RESULT_DISCARDED,
	CCM_STATUS_CODE_CHANNEL_UNAVAILABLE,
	CCM_STATUS_CODE_FAILED_CCM,
	CCM_STATUS_OK,
	CHAIN_ACTIVE,
	CHAIN_REGISTERED,
	CHAIN_TERMINATED,
	CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
	EMPTY_BYTES,
	EMPTY_FEE_ADDRESS,
	LIVENESS_LIMIT,
	MAINCHAIN_ID_BUFFER,
	MIN_RETURN_FEE,
	MODULE_NAME_INTEROPERABILITY,
} from '../constants';
import { createCCMsgBeforeSendContext } from '../context';
import { CCMBounceContext, CCMForwardContext, CCMsg, SendInternalContext } from '../types';
import {
	getEncodedSidechainTerminatedCCMParam,
	handlePromiseErrorWithNull,
	validateFormat,
} from '../utils';
import { MODULE_NAME_TOKEN, TokenCCMethod } from '../cc_methods';
import { ForwardCCMsgResult } from './types';
import { ccmSchema } from '../schemas';
import { CcmProcessedEvent } from '../events/ccm_processed';
import { CcmSendSuccessEvent } from '../events/ccm_send_success';
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

	public async forward(ccmForwardContext: CCMForwardContext): Promise<ForwardCCMsgResult> {
		const { ccm, eventQueue, logger, chainID, getMethodContext, getStore } = ccmForwardContext;
		const methodContext = getMethodContext();
		const tokenCCMethod = this.interoperableModuleMethods.get(MODULE_NAME_TOKEN) as
			| TokenCCMethod
			| undefined;
		const beforeCCMSendContext = createCCMsgBeforeSendContext({
			ccm,
			eventQueue,
			getMethodContext,
			logger,
			chainID,
			getStore,
			feeAddress: EMPTY_FEE_ADDRESS,
		});

		if (!tokenCCMethod) {
			throw new Error('TokenCCMethod does not exist.');
		}

		const receivingChainAccount = await handlePromiseErrorWithNull(
			this.stores.get(ChainAccountStore).get(this.context, ccm.receivingChainID),
		);

		const isLive = await this.isLive(ccm.receivingChainID, Date.now());

		if (receivingChainAccount?.status === CHAIN_ACTIVE && isLive) {
			const isTokenTransferred = await handlePromiseErrorWithNull(
				tokenCCMethod.forwardMessageFee(methodContext, ccm),
			);

			if (!isTokenTransferred) {
				return ForwardCCMsgResult.COULD_NOT_TRANSFER_FORWARD_FEE;
			}

			await this.addToOutbox(ccm.receivingChainID, ccm);
			return ForwardCCMsgResult.SUCCESS;
		}

		if (ccm.status !== CCM_STATUS_OK) {
			return ForwardCCMsgResult.INVALID_CCM;
		}
		await this.bounce({
			ccm,
			newCCMStatus: CCM_STATUS_CODE_CHANNEL_UNAVAILABLE,
			ccmProcessedEventCode: CCM_PROCESSED_CODE_CHANNEL_UNAVAILABLE,
			eventQueue,
		});

		if (!receivingChainAccount || receivingChainAccount.status === CHAIN_REGISTERED) {
			return ForwardCCMsgResult.INACTIVE_RECEIVING_CHAIN;
		}

		if (receivingChainAccount.status === CHAIN_ACTIVE) {
			await this.terminateChainInternal(ccm.receivingChainID, beforeCCMSendContext);
		}

		await this.sendInternal({
			eventQueue: ccmForwardContext.eventQueue,
			feeAddress: ccmForwardContext.feeAddress,
			getMethodContext: ccmForwardContext.getMethodContext,
			getStore: ccmForwardContext.getStore,
			logger: ccmForwardContext.logger,
			chainID: ccmForwardContext.chainID,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
			module: MODULE_NAME_INTEROPERABILITY,
			fee: BigInt(0),
			params: getEncodedSidechainTerminatedCCMParam(ccm, receivingChainAccount),
			receivingChainID: ccm.sendingChainID,
			status: CCM_STATUS_OK,
			timestamp: Date.now(),
		});

		return ForwardCCMsgResult.INFORM_SIDECHAIN_TERMINATION;
	}

	public async bounce(context: CCMBounceContext): Promise<void> {
		const { ccm, eventQueue, newCCMStatus, ccmProcessedEventCode } = context;
		const ccmID = utils.hash(codec.encode(ccmSchema, ccm));
		const minimumFee = MIN_RETURN_FEE * BigInt(ccmID.length);
		if (ccm.status === CCM_STATUS_OK && ccm.fee >= minimumFee) {
			this.events
				.get(CcmProcessedEvent)
				.log({ eventQueue }, ccm.sendingChainID, ccm.receivingChainID, {
					ccmID,
					result: CCM_PROCESSED_RESULT_BOUNCED,
					code: ccmProcessedEventCode,
				});
			const newCCM = {
				...ccm,
				sendingChainID: ccm.receivingChainID,
				receivingChainID: ccm.sendingChainID,
				status: newCCMStatus,
			};

			// If the function is called during the cross-chain command execution, the fee is set to 0
			if (newCCMStatus === CCM_STATUS_CODE_FAILED_CCM) {
				newCCM.fee = BigInt(0);
			} else {
				newCCM.fee -= minimumFee;
			}
			await this.addToOutbox(newCCM.receivingChainID, newCCM);
			const newCCMID = utils.hash(codec.encode(ccmSchema, newCCM));
			this.events
				.get(CcmSendSuccessEvent)
				.log({ eventQueue }, newCCM.sendingChainID, newCCM.receivingChainID, newCCMID, { ccmID });

			return;
		}

		this.events
			.get(CcmProcessedEvent)
			.log({ eventQueue }, ccm.sendingChainID, ccm.receivingChainID, {
				ccmID,
				result: CCM_PROCESSED_RESULT_DISCARDED,
				code: ccmProcessedEventCode,
			});
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
