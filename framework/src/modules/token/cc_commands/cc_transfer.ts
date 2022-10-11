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
// import { NotFoundError } from '@liskhq/lisk-db';
import { BaseCCCommand } from '../../interoperability/base_cc_command';
import { CCCommandExecuteContext } from '../../interoperability/types';
import { NamedRegistry } from '../../named_registry';
import { TokenMethod } from '../method';
import {
	CCM_STATUS_OK,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	FEE_CCM_INIT_USER_STORE,
	TokenEventResult,
} from '../constants';
import { CCTransferMessageParams, crossChainTransferMessageParams } from '../schemas';
import { splitTokenID } from '../utils';
import { SupportedTokensStore } from '../stores/supported_tokens';
import { CcmTransferEvent } from '../events/ccm_transfer';
import { UserStore } from '../stores/user';
import { EscrowStore } from '../stores/escrow';

export class CrossChainTransferCommand extends BaseCCCommand {
	public schema = crossChainTransferMessageParams;

	private readonly _tokenMethod: TokenMethod;
	private _ownChainID!: Buffer;

	public constructor(stores: NamedRegistry, events: NamedRegistry, tokenMethod: TokenMethod) {
		super(stores, events);
		this._tokenMethod = tokenMethod;
	}

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_TRANSFER;
	}

	public init(args: { ownChainID: Buffer }): void {
		this._ownChainID = args.ownChainID;
	}

	public async verify(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm } = ctx;
		const methodContext = ctx.getMethodContext();
		const ownChainID = this._ownChainID;
		const mainChainID = this._tokenMethod.getMainchainTokenID();
		const { sendingChainID } = ccm;
		const params = codec.decode<CCTransferMessageParams>(
			crossChainTransferMessageParams,
			ccm.params,
		);
		validator.validate(crossChainTransferMessageParams, params);
		const { tokenID, amount } = params;
		const [tokenChainID] = splitTokenID(tokenID);

		if (
			!tokenChainID.equals(ownChainID) &&
			!tokenChainID.equals(sendingChainID) &&
			!tokenChainID.equals(mainChainID)
		) {
			throw new Error(
				'Token must be native to either the sending or the receiving chain or the mainchain.',
			);
		}

		if (tokenChainID.equals(ownChainID)) {
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

	public async execute(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm, feeAddress } = ctx;
		const ownChainID = this._ownChainID;
		const methodContext = ctx.getMethodContext();
		const { sendingChainID, status, fee, receivingChainID } = ccm;
		let recipientAddress: Buffer;
		const params = codec.decode<CCTransferMessageParams>(
			crossChainTransferMessageParams,
			ccm.params,
		);
		validator.validate(crossChainTransferMessageParams, params);
		const { tokenID, amount, senderAddress } = params;
		recipientAddress = params.recipientAddress;
		const [tokenChainID] = splitTokenID(tokenID);

		this.stores.get(SupportedTokensStore).registerOwnChainID(this._ownChainID);
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
			if (fee < FEE_CCM_INIT_USER_STORE) {
				throw new Error('Insufficient fee to initialize user account.');
			}

			// should replace feeAddress with trsSender address
			await this._tokenMethod.burn(methodContext, feeAddress, tokenID, amount);

			await userStore.createDefaultAccount(methodContext, recipientAddress, tokenID);
		}

		if (tokenChainID.equals(ownChainID)) {
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
