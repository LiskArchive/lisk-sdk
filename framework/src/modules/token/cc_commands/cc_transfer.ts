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
	CCM_STATUS_MIN_BALANCE_NOT_REACHED,
	CCM_STATUS_OK,
	CCM_STATUS_PROTOCOL_VIOLATION,
	CCM_STATUS_TOKEN_NOT_SUPPORTED,
	CHAIN_ID_ALIAS_NATIVE,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	MIN_RETURN_FEE,
} from '../constants';
import { CCTransferMessageParams, crossChainTransferMessageParams } from '../schemas';
import { EscrowStore } from '../stores/escrow';
import { SupplyStore } from '../stores/supply';
import { UserStore } from '../stores/user';
import { InteroperabilityMethod, MinBalance } from '../types';
import { splitTokenID, tokenSupported } from '../utils';

export class CCTransferCommand extends BaseCCCommand {
	public schema = crossChainTransferMessageParams;

	private readonly _tokenMethod: TokenMethod;
	private _interopMethod!: InteroperabilityMethod;
	private _supportedTokenIDs!: Buffer[];
	private _minBalances!: MinBalance[];

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
		this._minBalances = args.minBalances;
	}

	public async execute(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm } = ctx;
		const methodContext = ctx.getMethodContext();
		const { id: ownChainID } = await this._interopMethod.getOwnChainAccount(methodContext);
		let params: CCTransferMessageParams;
		let tokenChainID;
		let tokenLocalID;
		try {
			params = codec.decode<CCTransferMessageParams>(crossChainTransferMessageParams, ccm.params);
			validator.validate(crossChainTransferMessageParams, params);

			[tokenChainID, tokenLocalID] = splitTokenID(params.tokenID);
			if (tokenChainID.equals(ownChainID)) {
				const escrowedAmount = await this._tokenMethod.getEscrowedAmount(
					methodContext,
					ccm.sendingChainID,
					params.tokenID,
				);
				if (params.amount > escrowedAmount) {
					throw new Error(
						`Amount ${params.amount.toString()} is not sufficient for ${escrowedAmount.toString()}`,
					);
				}
			}
		} catch (error) {
			ctx.logger.debug({ err: error as Error }, 'Error verifying the params.');
			if (ccm.status === CCM_STATUS_OK && ccm.fee >= MIN_RETURN_FEE * ctx.ccmSize) {
				await this._interopMethod.error(methodContext, ccm, CCM_STATUS_PROTOCOL_VIOLATION);
			}
			await this._interopMethod.terminateChain(methodContext, ccm.sendingChainID);

			return;
		}

		if (
			!tokenSupported(this._supportedTokenIDs, params.tokenID) &&
			ccm.fee >= ctx.ccmSize * MIN_RETURN_FEE &&
			ccm.status === CCM_STATUS_OK
		) {
			await this._interopMethod.error(methodContext, ccm, CCM_STATUS_TOKEN_NOT_SUPPORTED);
			return;
		}

		let { recipientAddress } = params;
		if (ccm.status !== CCM_STATUS_OK) {
			recipientAddress = params.senderAddress;
		}

		const canonicalTokenID = await this._tokenMethod.getCanonicalTokenID(
			methodContext,
			params.tokenID,
		);
		const recipientExist = await this._tokenMethod.accountExists(
			methodContext,
			params.recipientAddress,
		);
		let receivedAmount = params.amount;
		if (!recipientExist) {
			const minBalance = this._minBalances.find(mb => mb.tokenID.equals(canonicalTokenID))?.amount;
			if (!minBalance || minBalance > params.amount) {
				if (ccm.fee >= MIN_RETURN_FEE * ctx.ccmSize && ccm.status === CCM_STATUS_OK) {
					await this._interopMethod.error(methodContext, ccm, CCM_STATUS_MIN_BALANCE_NOT_REACHED);
				}
				return;
			}
			receivedAmount -= minBalance;
			const [canonicalChainID, canonicalLocalID] = splitTokenID(canonicalTokenID);
			if (canonicalChainID.equals(CHAIN_ID_ALIAS_NATIVE)) {
				const supplyStore = this.stores.get(SupplyStore);
				const supply = await supplyStore.get(methodContext, canonicalLocalID);
				supply.totalSupply -= minBalance;
				await supplyStore.set(methodContext, canonicalLocalID, supply);
			}
		}

		if (tokenChainID.equals(ownChainID)) {
			const escrowStore = this.stores.get(EscrowStore);
			const escrowKey = Buffer.concat([ccm.sendingChainID, tokenLocalID]);
			const escrowData = await escrowStore.get(methodContext, escrowKey);

			escrowData.amount -= params.amount;
			await escrowStore.set(methodContext, escrowKey, escrowData);
		}

		const userStore = this.stores.get(UserStore);
		await userStore.addAvailableBalanceWithCreate(
			methodContext,
			recipientAddress,
			canonicalTokenID,
			receivedAmount,
		);
	}
}
