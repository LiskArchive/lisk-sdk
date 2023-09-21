/*
 * Copyright © 2023 Lisk Foundation
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
import { CCTransferMessageParams, crossChainNFTTransferMessageParamsSchema } from '../schemas';
import { NFTAttributes, NFTStore } from '../stores/nft';
import { NFTMethod } from '../method';
import {
	CCM_STATUS_CODE_OK,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	FEE_CREATE_NFT,
	NftEventResult,
} from '../constants';
import { InternalMethod } from '../internal_method';
import { BaseCCCommand } from '../../interoperability/base_cc_command';
import { CrossChainMessageContext } from '../../interoperability/types';
import { MAX_RESERVED_ERROR_STATUS } from '../../interoperability/constants';
import { FeeMethod } from '../types';
import { EscrowStore } from '../stores/escrow';
import { CcmTransferEvent } from '../events/ccm_transfer';

export class CrossChainTransferCommand extends BaseCCCommand {
	public schema = crossChainNFTTransferMessageParamsSchema;
	private _method!: NFTMethod;
	private _internalMethod!: InternalMethod;
	private _feeMethod!: FeeMethod;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_TRANSFER;
	}

	public init(args: { method: NFTMethod; internalMethod: InternalMethod; feeMethod: FeeMethod }) {
		this._method = args.method;
		this._internalMethod = args.internalMethod;
		this._feeMethod = args.feeMethod;
	}

	public async verify(context: CrossChainMessageContext): Promise<void> {
		const { ccm, getMethodContext } = context;
		const params = codec.decode<CCTransferMessageParams>(
			crossChainNFTTransferMessageParamsSchema,
			ccm.params,
		);

		if (ccm.status > MAX_RESERVED_ERROR_STATUS) {
			throw new Error('Invalid CCM error code');
		}

		const { nftID } = params;
		const { sendingChainID } = ccm;
		const nftChainID = this._method.getChainID(nftID);
		const ownChainID = context.chainID;

		if (![ownChainID, sendingChainID].some(allowedChainID => nftChainID.equals(allowedChainID))) {
			throw new Error('NFT is not native to either the sending chain or the receiving chain');
		}

		const nftStore = this.stores.get(NFTStore);
		const nftExists = await nftStore.has(getMethodContext(), nftID);

		if (nftChainID.equals(ownChainID)) {
			if (!nftExists) {
				throw new Error('Non-existent entry in the NFT substore');
			}

			const owner = await this._method.getNFTOwner(getMethodContext(), nftID);
			if (!owner.equals(sendingChainID)) {
				throw new Error('NFT has not been properly escrowed');
			}
		}

		if (!nftChainID.equals(ownChainID) && nftExists) {
			throw new Error('NFT substore entry already exists');
		}
	}

	public async execute(context: CrossChainMessageContext): Promise<void> {
		const { ccm, getMethodContext } = context;
		const params = codec.decode<CCTransferMessageParams>(
			crossChainNFTTransferMessageParamsSchema,
			ccm.params,
		);
		validator.validate(crossChainNFTTransferMessageParamsSchema, params);
		const { sendingChainID, status } = ccm;
		const { nftID, senderAddress, attributesArray: receivedAttributes } = params;
		const nftChainID = this._method.getChainID(nftID);
		const ownChainID = context.chainID;
		const nftStore = this.stores.get(NFTStore);
		const escrowStore = this.stores.get(EscrowStore);
		let recipientAddress: Buffer;
		recipientAddress = params.recipientAddress;

		if (nftChainID.equals(ownChainID)) {
			const storeData = await nftStore.get(getMethodContext(), nftID);
			if (status === CCM_STATUS_CODE_OK) {
				storeData.owner = recipientAddress;
				const storedAttributes = storeData.attributesArray;
				storeData.attributesArray = this._internalMethod.getNewAttributes(
					nftID,
					storedAttributes,
					receivedAttributes,
				);
				await nftStore.save(getMethodContext(), nftID, storeData);
				await this._internalMethod.createUserEntry(getMethodContext(), recipientAddress, nftID);
				await escrowStore.del(getMethodContext(), escrowStore.getKey(sendingChainID, nftID));
			} else {
				recipientAddress = senderAddress;
				storeData.owner = recipientAddress;
				await nftStore.save(getMethodContext(), nftID, storeData);
				await this._internalMethod.createUserEntry(getMethodContext(), recipientAddress, nftID);
				await escrowStore.del(getMethodContext(), escrowStore.getKey(sendingChainID, nftID));
			}
		} else {
			const isSupported = await this._method.isNFTSupported(getMethodContext(), nftID);
			if (!isSupported) {
				this.events.get(CcmTransferEvent).error(
					context,
					{
						senderAddress,
						recipientAddress,
						nftID,
						receivingChainID: ccm.receivingChainID,
						sendingChainID: ccm.sendingChainID,
					},
					NftEventResult.RESULT_NFT_NOT_SUPPORTED,
				);
				throw new Error('Non-supported NFT');
			}
			this._feeMethod.payFee(getMethodContext(), BigInt(FEE_CREATE_NFT));

			if (status === CCM_STATUS_CODE_OK) {
				await nftStore.save(getMethodContext(), nftID, {
					owner: recipientAddress,
					attributesArray: receivedAttributes as NFTAttributes[],
				});
				await this._internalMethod.createUserEntry(getMethodContext(), recipientAddress, nftID);
			} else {
				recipientAddress = senderAddress;
				await nftStore.save(getMethodContext(), nftID, {
					owner: recipientAddress,
					attributesArray: receivedAttributes as NFTAttributes[],
				});
				await this._internalMethod.createUserEntry(getMethodContext(), recipientAddress, nftID);
			}
		}

		this.events.get(CcmTransferEvent).log(context, {
			senderAddress,
			recipientAddress,
			nftID,
			receivingChainID: ccm.receivingChainID,
			sendingChainID: ccm.sendingChainID,
		});
	}
}
