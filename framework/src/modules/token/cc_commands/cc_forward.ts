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
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { TokenAPI } from '../api';
import {
	CCM_STATUS_OK,
	CCM_STATUS_PROTOCOL_VIOLATION,
	CHAIN_ID_ALIAS_NATIVE,
	CROSS_CHAIN_COMMAND_ID_TRANSFER,
	CROSS_CHAIN_COMMAND_ID_FORWARD,
	MODULE_ID_TOKEN,
	STORE_PREFIX_ESCROW,
} from '../constants';
import { BaseCCCommand, CCCommandExecuteContext } from '../interop_types';
import {
	CCForwardMessageParams,
	crossChainForwardMessageParams,
	crossChainTransferMessageParams,
	EscrowStoreData,
	escrowStoreSchema,
} from '../schemas';
import { InteroperabilityAPI } from '../types';
import { splitTokenID, updateAvailableBalance } from '../utils';

export class CCForwardCommand extends BaseCCCommand {
	public ID = CROSS_CHAIN_COMMAND_ID_FORWARD;
	public name = 'crossChainForward';
	public schema = crossChainForwardMessageParams;
	protected moduleID = MODULE_ID_TOKEN;

	private readonly _tokenAPI: TokenAPI;
	private _interopAPI!: InteroperabilityAPI;

	public constructor(moduleID: number, tokenAPI: TokenAPI) {
		super(moduleID);
		this._tokenAPI = tokenAPI;
	}

	public addDependencies(interoperabilityAPI: InteroperabilityAPI) {
		this._interopAPI = interoperabilityAPI;
	}

	public async execute(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm } = ctx;
		const apiContext = ctx.getAPIContext();
		const { id: ownChainID } = await this._interopAPI.getOwnChainAccount(apiContext);
		let params: CCForwardMessageParams;
		try {
			params = codec.decode<CCForwardMessageParams>(crossChainForwardMessageParams, ccm.params);
			const errors = validator.validate(crossChainTransferMessageParams, params);
			if (errors.length) {
				throw new LiskValidationError(errors);
			}
		} catch (error) {
			ctx.logger.debug({ err: error as Error }, 'Error verifying the params.');
			if (ccm.status === CCM_STATUS_OK) {
				await this._interopAPI.error(apiContext, ccm, CCM_STATUS_PROTOCOL_VIOLATION);
			}
			await this._interopAPI.terminateChain(apiContext, ccm.sendingChainID);
			return;
		}

		const [chainID, localID] = splitTokenID(params.tokenID);

		if (ccm.status !== CCM_STATUS_OK) {
			if (!ccm.sendingChainID.equals(chainID)) {
				await this._interopAPI.terminateChain(apiContext, ccm.sendingChainID);
				return;
			}
			await updateAvailableBalance(
				apiContext,
				this.moduleID,
				params.senderAddress,
				params.tokenID,
				params.amount + params.forwardedMessageFee,
			);
			return;
		}

		if (!chainID.equals(ownChainID)) {
			if (ccm.status === CCM_STATUS_OK) {
				await this._interopAPI.error(apiContext, ccm, CCM_STATUS_PROTOCOL_VIOLATION);
			}
			await this._interopAPI.terminateChain(apiContext, ccm.sendingChainID);
			return;
		}

		const escrowedAmount = await this._tokenAPI.getEscrowedAmount(
			apiContext,
			ccm.sendingChainID,
			params.tokenID,
		);

		if (escrowedAmount < params.amount + params.forwardedMessageFee) {
			if (ccm.status === CCM_STATUS_OK) {
				await this._interopAPI.error(apiContext, ccm, CCM_STATUS_PROTOCOL_VIOLATION);
			}
			await this._interopAPI.terminateChain(apiContext, ccm.sendingChainID);
			return;
		}

		const escrowStore = apiContext.getStore(this.moduleID, STORE_PREFIX_ESCROW);
		const escrowKey = Buffer.concat([ccm.sendingChainID, localID]);
		const escrowData = await escrowStore.getWithSchema<EscrowStoreData>(
			escrowKey,
			escrowStoreSchema,
		);

		escrowData.amount -= params.amount + params.forwardedMessageFee;
		await escrowStore.setWithSchema(escrowKey, escrowData, escrowStoreSchema);
		const localTokenID = Buffer.concat([CHAIN_ID_ALIAS_NATIVE, localID]);

		await updateAvailableBalance(
			apiContext,
			this.moduleID,
			params.senderAddress,
			localTokenID,
			params.amount + params.forwardedMessageFee,
		);

		const message = codec.encode(crossChainTransferMessageParams, {
			tokenID: params.tokenID,
			amount: params.amount,
			senderAddress: params.senderAddress,
			recipientAddress: params.recipientAddress,
			data: params.data,
		});

		const sendResult = await this._interopAPI.send(
			apiContext,
			params.senderAddress,
			this.moduleID,
			CROSS_CHAIN_COMMAND_ID_TRANSFER,
			params.forwardToChainID,
			params.forwardedMessageFee,
			CCM_STATUS_OK,
			message,
		);
		if (!sendResult) {
			return;
		}

		await updateAvailableBalance(
			apiContext,
			this.moduleID,
			params.senderAddress,
			localTokenID,
			-params.amount,
		);
	}
}
