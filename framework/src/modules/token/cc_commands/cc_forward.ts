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
import { CrossChainMessageContext } from '../../interoperability/types';
import { NamedRegistry } from '../../named_registry';
import { TokenMethod } from '../method';
import {
	CCM_STATUS_OK,
	CCM_STATUS_PROTOCOL_VIOLATION,
	CHAIN_ID_ALIAS_NATIVE,
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
import { InteroperabilityMethod } from '../types';
import { splitTokenID } from '../utils';

export class CCForwardCommand extends BaseCCCommand {
	public schema = crossChainForwardMessageParams;

	private readonly _tokenMethod: TokenMethod;
	private _interopMethod!: InteroperabilityMethod;

	public constructor(stores: NamedRegistry, events: NamedRegistry, tokenMethod: TokenMethod) {
		super(stores, events);
		this._tokenMethod = tokenMethod;
	}

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_FORWARD;
	}

	public addDependencies(interoperabilityMethod: InteroperabilityMethod) {
		this._interopMethod = interoperabilityMethod;
	}

	public async execute(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;
		const methodContext = ctx.getMethodContext();
		const { chainID: ownChainID } = await this._interopMethod.getOwnChainAccount(methodContext);
		let params: CCForwardMessageParams;
		try {
			params = codec.decode<CCForwardMessageParams>(crossChainForwardMessageParams, ccm.params);
			validator.validate(crossChainTransferMessageParams, params);
		} catch (error) {
			ctx.logger.debug({ err: error as Error }, 'Error verifying the params.');
			if (ccm.status === CCM_STATUS_OK) {
				await this._interopMethod.error(methodContext, ccm, CCM_STATUS_PROTOCOL_VIOLATION);
			}
			await this._interopMethod.terminateChain(ctx, ccm.sendingChainID);
			return;
		}

		const [chainID, localID] = splitTokenID(params.tokenID);
		const userStore = this.stores.get(UserStore);

		if (ccm.status !== CCM_STATUS_OK) {
			if (!ccm.sendingChainID.equals(chainID)) {
				await this._interopMethod.terminateChain(ctx, ccm.sendingChainID);
				return;
			}
			await userStore.updateAvailableBalance(
				methodContext,
				params.senderAddress,
				params.tokenID,
				params.amount + params.forwardedMessageFee,
			);
			return;
		}

		if (!chainID.equals(ownChainID)) {
			if (ccm.status === CCM_STATUS_OK) {
				await this._interopMethod.error(methodContext, ccm, CCM_STATUS_PROTOCOL_VIOLATION);
			}
			await this._interopMethod.terminateChain(ctx, ccm.sendingChainID);
			return;
		}

		const escrowedAmount = await this._tokenMethod.getEscrowedAmount(
			methodContext,
			ccm.sendingChainID,
			params.tokenID,
		);

		if (escrowedAmount < params.amount + params.forwardedMessageFee) {
			if (ccm.status === CCM_STATUS_OK) {
				await this._interopMethod.error(methodContext, ccm, CCM_STATUS_PROTOCOL_VIOLATION);
			}
			await this._interopMethod.terminateChain(ctx, ccm.sendingChainID);
			return;
		}

		const escrowStore = this.stores.get(EscrowStore);
		const escrowKey = Buffer.concat([ccm.sendingChainID, localID]);
		const escrowData = await escrowStore.get(methodContext, escrowKey);

		escrowData.amount -= params.amount + params.forwardedMessageFee;
		await escrowStore.set(methodContext, escrowKey, escrowData);
		const localTokenID = Buffer.concat([CHAIN_ID_ALIAS_NATIVE, localID]);

		await userStore.updateAvailableBalance(
			methodContext,
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

		const sendResult = await this._interopMethod.send(
			methodContext,
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
			methodContext,
			params.senderAddress,
			localTokenID,
			-params.amount,
		);
	}
}
