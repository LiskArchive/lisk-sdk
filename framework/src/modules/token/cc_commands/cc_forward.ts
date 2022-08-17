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
import { validator } from '@liskhq/lisk-validator';
import { BaseCCCommand } from '../../interoperability/base_cc_command';
import { MODULE_NAME_INTEROPERABILITY } from '../../interoperability/constants';
import { CCCommandExecuteContext } from '../../interoperability/types';
import { NamedRegistry } from '../../named_registry';
import { TokenAPI } from '../api';
import {
	CCM_STATUS_OK,
	CCM_STATUS_PROTOCOL_VIOLATION,
	CHAIN_ID_ALIAS_NATIVE,
	CROSS_CHAIN_COMMAND_ID_FORWARD_BUFFER,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	CROSS_CHAIN_COMMAND_NAME_FORWARD,
} from '../constants';
import {
	CCForwardMessageParams,
	crossChainForwardMessageParams,
	crossChainTransferMessageParams,
} from '../schemas';
import { EscrowStore } from '../stores/escrow';
import { UserStore } from '../stores/user';
import { InteroperabilityAPI } from '../types';
import { splitTokenID } from '../utils';

export class CCForwardCommand extends BaseCCCommand {
	public ID = CROSS_CHAIN_COMMAND_ID_FORWARD_BUFFER;
	public name = CROSS_CHAIN_COMMAND_NAME_FORWARD;
	public schema = crossChainForwardMessageParams;

	private readonly _tokenAPI: TokenAPI;
	private _interopAPI!: InteroperabilityAPI;

	public constructor(stores: NamedRegistry, events: NamedRegistry, tokenAPI: TokenAPI) {
		super(stores, events);
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
			validator.validate(crossChainTransferMessageParams, params);
		} catch (error) {
			ctx.logger.debug({ err: error as Error }, 'Error verifying the params.');
			if (ccm.status === CCM_STATUS_OK) {
				await this._interopAPI.error(apiContext, ccm, CCM_STATUS_PROTOCOL_VIOLATION);
			}
			await this._interopAPI.terminateChain(apiContext, ccm.sendingChainID);
			return;
		}

		const [chainID, localID] = splitTokenID(params.tokenID);
		const userStore = this.stores.get(UserStore);

		if (ccm.status !== CCM_STATUS_OK) {
			if (!ccm.sendingChainID.equals(chainID)) {
				await this._interopAPI.terminateChain(apiContext, ccm.sendingChainID);
				return;
			}
			await userStore.updateAvailableBalance(
				apiContext,
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

		const escrowStore = this.stores.get(EscrowStore);
		const escrowKey = Buffer.concat([ccm.sendingChainID, localID]);
		const escrowData = await escrowStore.get(apiContext, escrowKey);

		escrowData.amount -= params.amount + params.forwardedMessageFee;
		await escrowStore.set(apiContext, escrowKey, escrowData);
		const localTokenID = Buffer.concat([CHAIN_ID_ALIAS_NATIVE, localID]);

		await userStore.updateAvailableBalance(
			apiContext,
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
			MODULE_NAME_INTEROPERABILITY,
			CROSS_CHAIN_COMMAND_NAME_TRANSFER,
			params.forwardToChainID,
			params.forwardedMessageFee,
			CCM_STATUS_OK,
			message,
		);
		if (!sendResult) {
			return;
		}

		await userStore.updateAvailableBalance(
			apiContext,
			params.senderAddress,
			localTokenID,
			-params.amount,
		);
	}
}
