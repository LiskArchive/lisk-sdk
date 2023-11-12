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
import { BaseCCCommand } from '../../interoperability/base_cc_command';
import { CrossChainMessageContext } from '../../interoperability/types';
import { TokenMethod } from '../method';
import { CCM_STATUS_OK, CROSS_CHAIN_COMMAND_NAME_TRANSFER, TokenEventResult } from '../constants';
import { CCTransferMessageParams, crossChainTransferMessageParams } from '../schemas';
import { splitTokenID } from '../utils';
import { SupportedTokensStore } from '../stores/supported_tokens';
import { CcmTransferEvent } from '../events/ccm_transfer';
import { UserStore } from '../stores/user';
import { EscrowStore } from '../stores/escrow';
import { InternalMethod } from '../internal_method';
import { MAX_RESERVED_ERROR_STATUS } from '../../interoperability/constants';

export class CrossChainTransferCommand extends BaseCCCommand {
	public schema = crossChainTransferMessageParams;

	private _tokenMethod!: TokenMethod;
	private _internalMethod!: InternalMethod;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_TRANSFER;
	}

	public init(args: { tokenMethod: TokenMethod; internalMethod: InternalMethod }): void {
		this._tokenMethod = args.tokenMethod;
		this._internalMethod = args.internalMethod;
	}

	public async verify(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;
		const methodContext = ctx.getMethodContext();
		const { sendingChainID } = ccm;
		const params = codec.decode<CCTransferMessageParams>(
			crossChainTransferMessageParams,
			ccm.params,
		);

		if (ccm.status > MAX_RESERVED_ERROR_STATUS) {
			throw new Error('Invalid CCM status code.');
		}

		const { tokenID, amount } = params;
		const [tokenChainID] = splitTokenID(tokenID);

		if (!tokenChainID.equals(ctx.chainID) && !tokenChainID.equals(sendingChainID)) {
			throw new Error('Token must be native to either the sending or the receiving chain.');
		}

		if (tokenChainID.equals(ctx.chainID)) {
			const escrowedAmount = await this._tokenMethod.getEscrowedAmount(
				methodContext,
				sendingChainID,
				tokenID,
			);

			if (escrowedAmount < amount) {
				throw new Error('Insufficient balance in escrow account.');
			}
		}
	}

	public async execute(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;
		const methodContext = ctx.getMethodContext();
		const { sendingChainID, status, receivingChainID } = ccm;
		let recipientAddress: Buffer;
		const params = codec.decode<CCTransferMessageParams>(
			crossChainTransferMessageParams,
			ccm.params,
		);
		const { tokenID, amount, senderAddress } = params;
		recipientAddress = params.recipientAddress;
		const [tokenChainID] = splitTokenID(tokenID);

		this.stores.get(SupportedTokensStore).registerOwnChainID(ctx.chainID);
		const supported = await this.stores.get(SupportedTokensStore).isSupported(ctx, tokenID);

		if (!supported) {
			this.events.get(CcmTransferEvent).error(
				ctx,
				{
					senderAddress,
					recipientAddress,
					tokenID,
					amount,
					receivingChainID,
				},
				TokenEventResult.TOKEN_NOT_SUPPORTED,
			);

			throw new Error(`tokenID ${tokenID.toString('hex')} is not supported`);
		}

		if (status !== CCM_STATUS_OK) {
			recipientAddress = senderAddress;
		}

		const userStore = this.stores.get(UserStore);
		const recipientExist = await userStore.has(
			methodContext,
			userStore.getKey(recipientAddress, tokenID),
		);

		if (!recipientExist) {
			await this._internalMethod.initializeUserAccount(
				ctx.getMethodContext(),
				recipientAddress,
				tokenID,
			);
		}

		if (tokenChainID.equals(ctx.chainID)) {
			const escrowStore = this.stores.get(EscrowStore);
			const escrowKey = escrowStore.getKey(sendingChainID, tokenID);
			const escrowData = await escrowStore.get(methodContext, escrowKey);

			if (escrowData.amount < amount) {
				throw new Error('Insufficient balance in escrow account.');
			}

			escrowData.amount -= amount;
			await escrowStore.set(methodContext, escrowKey, escrowData);
		}

		await userStore.addAvailableBalance(methodContext, recipientAddress, tokenID, amount);

		this.events.get(CcmTransferEvent).log(ctx, {
			senderAddress,
			recipientAddress,
			tokenID,
			amount,
			receivingChainID,
		});
	}
}
