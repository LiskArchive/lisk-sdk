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
import { CCCommandExecuteContext } from '../../interoperability/types';
import { NamedRegistry } from '../../named_registry';
import { TokenMethod } from '../method';
import {
	CCM_STATUS_OK,
	CCM_STATUS_PROTOCOL_VIOLATION,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	FEE_CCM_INIT_USER_STORE,
	MIN_RETURN_FEE,
} from '../constants';
import { CCTransferMessageParams, crossChainTransferMessageParams } from '../schemas';
import { EscrowStore } from '../stores/escrow';
import { UserStore } from '../stores/user';
import { InteroperabilityMethod, MinBalance } from '../types';
import { splitTokenID, tokenSupported } from '../utils';

export class CrossChainTransferCommand extends BaseCCCommand {
	public schema = crossChainTransferMessageParams;

	private readonly _tokenMethod: TokenMethod;
	private _interopMethod!: InteroperabilityMethod;
	private _supportedTokenIDs!: Buffer[];
	// private _minBalances!: MinBalance[];

	public constructor(stores: NamedRegistry, events: NamedRegistry, tokenMethod: TokenMethod) {
		super(stores, events);
		this._tokenMethod = tokenMethod;
	}

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_TRANSFER;
	}

	public addDependencies(interoperabilityMethod: InteroperabilityMethod) {
		this._interopMethod = interoperabilityMethod;
	}

	public init(args: { minBalances: MinBalance[]; supportedTokenIDs: Buffer[] }): void {
		this._supportedTokenIDs = args.supportedTokenIDs;
		// this._minBalances = args.minBalances;
	}

	public async verify(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm, ccmSize } = ctx;
		const methodContext = ctx.getMethodContext();
		const { id: ownChainID } = await this._interopMethod.getOwnChainAccount(methodContext);
		let params: CCTransferMessageParams;
		let tokenChainID: Buffer;
		const { sendingChainID, status, fee } = ccm;

		try {
			params = codec.decode<CCTransferMessageParams>(crossChainTransferMessageParams, ccm.params);
			validator.validate(crossChainTransferMessageParams, params);
			const { tokenID, amount } = params;
			[tokenChainID] = splitTokenID(tokenID);

			if (
				!tokenChainID.equals(ownChainID) &&
				!tokenChainID.equals(sendingChainID) &&
				!tokenChainID.equals(tokenChainID)
			) {
				throw new Error(
					'Token must be native to either the sending or the receiving chain or the mainchain.',
				);
			}

			if (tokenChainID.equals(ownChainID)) {
				const escrowedAmount = await this._tokenMethod.getEscrowedAmount(
					methodContext,
					ccm.sendingChainID,
					tokenID,
				);

				if (escrowedAmount < amount) {
					throw new Error('Insufficient balance in escrow account.');
				}
			}
		} catch (error) {
			ctx.logger.debug({ err: error as Error }, 'Error verifying the params.');

			if (status === CCM_STATUS_OK && fee >= MIN_RETURN_FEE * ccmSize) {
				await this._interopMethod.error(methodContext, ccm, CCM_STATUS_PROTOCOL_VIOLATION);
			}

			await this._interopMethod.terminateChain(methodContext, sendingChainID);
		}
	}

	public async execute(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm, ccmSize } = ctx;
		const methodContext = ctx.getMethodContext();
		const { id: ownChainID } = await this._interopMethod.getOwnChainAccount(methodContext);
		let params: CCTransferMessageParams;
		const { sendingChainID, status, fee } = ccm;
		let recipientAddress: Buffer;

		try {
			params = codec.decode<CCTransferMessageParams>(crossChainTransferMessageParams, ccm.params);
			validator.validate(crossChainTransferMessageParams, params);
		} catch (error) {
			ctx.logger.debug({ err: error as Error }, 'Error verifying the params.');

			if (status === CCM_STATUS_OK && fee >= MIN_RETURN_FEE * ccmSize) {
				await this._interopMethod.error(methodContext, ccm, CCM_STATUS_PROTOCOL_VIOLATION);
			}

			await this._interopMethod.terminateChain(methodContext, sendingChainID);
			return;
		}
		const { tokenID, amount, senderAddress } = params;
		recipientAddress = params.recipientAddress;
		const [tokenChainID, tokenLocalID] = splitTokenID(tokenID);

		if (!tokenSupported(this._supportedTokenIDs, tokenID)) {
			// TODO: emit event else throw error
		}

		if (status !== CCM_STATUS_OK) {
			recipientAddress = senderAddress;
		}

		const userStore = this.stores.get(UserStore);
		const user = await userStore.get(methodContext, userStore.getKey(recipientAddress, tokenID));
		if (!user) {
			if (fee < FEE_CCM_INIT_USER_STORE) {
				throw new Error('Insufficient fee to initialize user account.');
			} else {
				// TODO: if the relayer does not have enough balance, burn will raise exception
			}
		}

		if (tokenChainID.equals(ownChainID)) {
			const escrowStore = this.stores.get(EscrowStore);
			const escrowKey = Buffer.concat([sendingChainID, tokenLocalID]);
			const escrowData = await escrowStore.get(methodContext, escrowKey);

			escrowData.amount -= amount;
			await escrowStore.set(methodContext, escrowKey, escrowData);
		}

		await userStore.addAvailableBalanceWithCreate(methodContext, recipientAddress, tokenID, amount);

		// TODO: emit event
	}
}
