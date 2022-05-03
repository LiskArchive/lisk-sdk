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
	CCM_STATUS_MIN_BALANCE_NOT_REACHED,
	CCM_STATUS_OK,
	CCM_STATUS_PROTOCOL_VIOLATION,
	CCM_STATUS_TOKEN_NOT_SUPPORTED,
	CHAIN_ID_ALIAS_NATIVE,
	CROSS_CHAIN_COMMAND_ID_TRANSFER,
	MIN_RETURN_FEE,
	MODULE_ID_TOKEN,
	STORE_PREFIX_ESCROW,
	STORE_PREFIX_SUPPLY,
} from '../constants';
import { BaseCCCommand, CCCommandExecuteContext } from '../interop_types';
import {
	CCTransferMessageParams,
	crossChainTransferMessageParams,
	EscrowStoreData,
	escrowStoreSchema,
	SupplyStoreData,
	supplyStoreSchema,
} from '../schemas';
import { InteroperabilityAPI, MinBalance } from '../types';
import { splitTokenID, tokenSupported, updateAvailableBalanceWithCreate } from '../utils';

export class CCTransferCommand extends BaseCCCommand {
	public ID = CROSS_CHAIN_COMMAND_ID_TRANSFER;
	public name = 'crossChainTransfer';
	public schema = crossChainTransferMessageParams;
	protected moduleID = MODULE_ID_TOKEN;

	private readonly _tokenAPI: TokenAPI;
	private _interopAPI!: InteroperabilityAPI;
	private _supportedTokenIDs!: Buffer[];
	private _minBalances!: MinBalance[];

	public constructor(moduleID: number, tokenAPI: TokenAPI) {
		super(moduleID);
		this._tokenAPI = tokenAPI;
	}

	public addDependencies(interoperabilityAPI: InteroperabilityAPI) {
		this._interopAPI = interoperabilityAPI;
	}

	public init(args: { minBalances: MinBalance[]; supportedTokenIDs: Buffer[] }): void {
		this._supportedTokenIDs = args.supportedTokenIDs;
		this._minBalances = args.minBalances;
	}

	public async execute(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm } = ctx;
		const apiContext = ctx.getAPIContext();
		const { id: ownChainID } = await this._interopAPI.getOwnChainAccount(apiContext);
		let params: CCTransferMessageParams;
		let tokenChainID;
		let tokenLocalID;
		try {
			params = codec.decode<CCTransferMessageParams>(crossChainTransferMessageParams, ccm.params);
			const errors = validator.validate(crossChainTransferMessageParams, params);
			if (errors.length) {
				throw new LiskValidationError(errors);
			}
			[tokenChainID, tokenLocalID] = splitTokenID(params.tokenID);
			if (tokenChainID.equals(ownChainID)) {
				const escrowedAmount = await this._tokenAPI.getEscrowedAmount(
					apiContext,
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
			if (ccm.status === CCM_STATUS_OK && ccm.fee >= MIN_RETURN_FEE * BigInt(ctx.ccmLength)) {
				await this._interopAPI.error(apiContext, ccm, CCM_STATUS_PROTOCOL_VIOLATION);
			}
			await this._interopAPI.terminateChain(apiContext, ccm.sendingChainID);

			return;
		}

		if (
			!tokenSupported(this._supportedTokenIDs, params.tokenID) &&
			ccm.fee >= BigInt(ctx.ccmLength) * MIN_RETURN_FEE &&
			ccm.status === CCM_STATUS_OK
		) {
			await this._interopAPI.error(apiContext, ccm, CCM_STATUS_TOKEN_NOT_SUPPORTED);
			return;
		}

		let { recipientAddress } = params;
		if (ccm.status !== CCM_STATUS_OK) {
			recipientAddress = params.senderAddress;
		}

		const canonicalTokenID = await this._tokenAPI.getCanonicalTokenID(apiContext, params.tokenID);
		const recipientExist = await this._tokenAPI.accountExists(apiContext, params.recipientAddress);
		let receivedAmount = params.amount;
		if (!recipientExist) {
			const minBalance = this._minBalances.find(mb => mb.tokenID.equals(canonicalTokenID))?.amount;
			if (!minBalance || minBalance > params.amount) {
				if (ccm.fee >= MIN_RETURN_FEE * BigInt(ctx.ccmLength) && ccm.status === CCM_STATUS_OK) {
					await this._interopAPI.error(apiContext, ccm, CCM_STATUS_MIN_BALANCE_NOT_REACHED);
				}
				return;
			}
			receivedAmount -= minBalance;
			const [canonicalChainID, canonicalLocalID] = splitTokenID(canonicalTokenID);
			if (canonicalChainID.equals(CHAIN_ID_ALIAS_NATIVE)) {
				const supplyStore = apiContext.getStore(this.moduleID, STORE_PREFIX_SUPPLY);
				const supply = await supplyStore.getWithSchema<SupplyStoreData>(
					canonicalLocalID,
					supplyStoreSchema,
				);
				supply.totalSupply -= minBalance;
				await supplyStore.setWithSchema(canonicalLocalID, supply, supplyStoreSchema);
			}
		}

		if (tokenChainID.equals(ownChainID)) {
			const escrowStore = apiContext.getStore(this.moduleID, STORE_PREFIX_ESCROW);
			const escrowKey = Buffer.concat([ccm.sendingChainID, tokenLocalID]);
			const escrowData = await escrowStore.getWithSchema<EscrowStoreData>(
				escrowKey,
				escrowStoreSchema,
			);

			escrowData.amount -= params.amount;
			await escrowStore.setWithSchema(escrowKey, escrowData, escrowStoreSchema);
		}

		await updateAvailableBalanceWithCreate(
			apiContext,
			this.moduleID,
			recipientAddress,
			canonicalTokenID,
			receivedAmount,
		);
	}
}
