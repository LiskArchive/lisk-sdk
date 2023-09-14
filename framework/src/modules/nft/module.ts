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

import { dataStructures } from '@liskhq/lisk-utils';
import { codec } from '@liskhq/lisk-codec';
import { validator } from '@liskhq/lisk-validator';
import { GenesisBlockExecuteContext } from '../../state_machine';
import { ModuleInitArgs, ModuleMetadata } from '../base_module';
import { BaseInteroperableModule } from '../interoperability';
import { InteroperabilityMethod, FeeMethod, GenesisNFTStore, TokenMethod } from './types';
import { NFTInteroperableMethod } from './cc_method';
import { NFTEndpoint } from './endpoint';
import { AllNFTsFromChainSupportedEvent } from './events/all_nfts_from_chain_suported';
import { AllNFTsFromChainSupportRemovedEvent } from './events/all_nfts_from_chain_support_removed';
import { AllNFTsFromCollectionSupportRemovedEvent } from './events/all_nfts_from_collection_support_removed';
import { AllNFTsFromCollectionSupportedEvent } from './events/all_nfts_from_collection_suppported';
import { AllNFTsSupportRemovedEvent } from './events/all_nfts_support_removed';
import { AllNFTsSupportedEvent } from './events/all_nfts_supported';
import { CcmTransferEvent } from './events/ccm_transfer';
import { CreateEvent } from './events/create';
import { DestroyEvent } from './events/destroy';
import { LockEvent } from './events/lock';
import { RecoverEvent } from './events/recover';
import { SetAttributesEvent } from './events/set_attributes';
import { TransferEvent } from './events/transfer';
import { TransferCrossChainEvent } from './events/transfer_cross_chain';
import { UnlockEvent } from './events/unlock';
import { InternalMethod } from './internal_method';
import { NFTMethod } from './method';
import {
	collectionExistsRequestSchema,
	collectionExistsResponseSchema,
	getCollectionIDsRequestSchema,
	getCollectionIDsResponseSchema,
	getEscrowedNFTIDsRequestSchema,
	getEscrowedNFTIDsResponseSchema,
	getNFTRequestSchema,
	getNFTResponseSchema,
	getNFTsRequestSchema,
	getNFTsResponseSchema,
	hasNFTRequestSchema,
	hasNFTResponseSchema,
	isNFTSupportedRequestSchema,
	isNFTSupportedResponseSchema,
	genesisNFTStoreSchema,
} from './schemas';
import { EscrowStore } from './stores/escrow';
import { NFTStore } from './stores/nft';
import { SupportedNFTsStore } from './stores/supported_nfts';
import { UserStore } from './stores/user';
import { CrossChainTransferCommand as CrossChainTransferMessageCommand } from './cc_commands/cc_transfer';
import { TransferCrossChainCommand } from './commands/transfer_cross_chain';
import { TransferCommand } from './commands/transfer';
import {
	ALL_SUPPORTED_NFTS_KEY,
	LENGTH_ADDRESS,
	LENGTH_CHAIN_ID,
	MODULE_NAME_NFT,
	NFT_NOT_LOCKED,
} from './constants';

export class NFTModule extends BaseInteroperableModule {
	public method = new NFTMethod(this.stores, this.events);
	public endpoint = new NFTEndpoint(this.stores, this.offchainStores);
	public crossChainMethod = new NFTInteroperableMethod(this.stores, this.events);
	public crossChainTransferCommand = new CrossChainTransferMessageCommand(this.stores, this.events);
	public crossChainCommand = [this.crossChainTransferCommand];

	private readonly _transferCommand = new TransferCommand(this.stores, this.events);
	private readonly _ccTransferCommand = new TransferCrossChainCommand(this.stores, this.events);
	private readonly _internalMethod = new InternalMethod(this.stores, this.events);
	private _interoperabilityMethod!: InteroperabilityMethod;
	private _feeMethod!: FeeMethod;
	private _tokenMethod!: TokenMethod;

	public commands = [this._transferCommand, this._ccTransferCommand];

	public constructor() {
		super();
		this.events.register(TransferEvent, new TransferEvent(this.name));
		this.events.register(TransferCrossChainEvent, new TransferCrossChainEvent(this.name));
		this.events.register(CcmTransferEvent, new CcmTransferEvent(this.name));
		this.events.register(CreateEvent, new CreateEvent(this.name));
		this.events.register(DestroyEvent, new DestroyEvent(this.name));
		this.events.register(DestroyEvent, new DestroyEvent(this.name));
		this.events.register(LockEvent, new LockEvent(this.name));
		this.events.register(UnlockEvent, new UnlockEvent(this.name));
		this.events.register(SetAttributesEvent, new SetAttributesEvent(this.name));
		this.events.register(RecoverEvent, new RecoverEvent(this.name));
		this.events.register(AllNFTsSupportedEvent, new AllNFTsSupportedEvent(this.name));
		this.events.register(AllNFTsSupportRemovedEvent, new AllNFTsSupportRemovedEvent(this.name));
		this.events.register(
			AllNFTsFromChainSupportedEvent,
			new AllNFTsFromChainSupportedEvent(this.name),
		);
		this.events.register(
			AllNFTsFromChainSupportRemovedEvent,
			new AllNFTsFromChainSupportRemovedEvent(this.name),
		);
		this.events.register(
			AllNFTsFromCollectionSupportedEvent,
			new AllNFTsFromCollectionSupportedEvent(this.name),
		);
		this.events.register(
			AllNFTsFromCollectionSupportRemovedEvent,
			new AllNFTsFromCollectionSupportRemovedEvent(this.name),
		);
		this.stores.register(NFTStore, new NFTStore(this.name, 0));
		this.stores.register(UserStore, new UserStore(this.name, 1));
		this.stores.register(EscrowStore, new EscrowStore(this.name, 2));
		this.stores.register(SupportedNFTsStore, new SupportedNFTsStore(this.name, 3));
	}

	public get name(): string {
		return MODULE_NAME_NFT;
	}

	public addDependencies(
		interoperabilityMethod: InteroperabilityMethod,
		feeMethod: FeeMethod,
		tokenMethod: TokenMethod,
	) {
		this._interoperabilityMethod = interoperabilityMethod;
		this._feeMethod = feeMethod;
		this._tokenMethod = tokenMethod;
		this.method.addDependencies(
			interoperabilityMethod,
			this._internalMethod,
			feeMethod,
			tokenMethod,
		);
		this._internalMethod.addDependencies(this.method, this._interoperabilityMethod);
		this.crossChainMethod.addDependencies(interoperabilityMethod);
		this.endpoint.addDependencies(this.method);
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [
				{
					name: this.endpoint.collectionExists.name,
					request: collectionExistsRequestSchema,
					response: collectionExistsResponseSchema,
				},
				{
					name: this.endpoint.getCollectionIDs.name,
					request: getCollectionIDsRequestSchema,
					response: getCollectionIDsResponseSchema,
				},
				{
					name: this.endpoint.getEscrowedNFTIDs.name,
					request: getEscrowedNFTIDsRequestSchema,
					response: getEscrowedNFTIDsResponseSchema,
				},
				{
					name: this.endpoint.getNFT.name,
					request: getNFTRequestSchema,
					response: getNFTResponseSchema,
				},
				{
					name: this.endpoint.getNFTs.name,
					request: getNFTsRequestSchema,
					response: getNFTsResponseSchema,
				},
				{
					name: this.endpoint.hasNFT.name,
					request: hasNFTRequestSchema,
					response: hasNFTResponseSchema,
				},
				{
					name: this.endpoint.isNFTSupported.name,
					request: isNFTSupportedRequestSchema,
					response: isNFTSupportedResponseSchema,
				},
			],
			assets: [],
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs) {
		const ownChainID = Buffer.from(args.genesisConfig.chainID, 'hex');
		this._internalMethod.init({ ownChainID });
		this.method.init({ ownChainID });
		this.crossChainTransferCommand.init({
			method: this.method,
			internalMethod: this._internalMethod,
			feeMethod: this._feeMethod,
		});

		this._ccTransferCommand.init({
			internalMethod: this._internalMethod,
			interoperabilityMethod: this._interoperabilityMethod,
			nftMethod: this.method,
			tokenMethod: this._tokenMethod,
		});
		this._transferCommand.init({ method: this.method, internalMethod: this._internalMethod });
	}

	public async initGenesisState(context: GenesisBlockExecuteContext): Promise<void> {
		const assetBytes = context.assets.getAsset(this.name);

		if (!assetBytes) {
			return;
		}

		const genesisStore = codec.decode<GenesisNFTStore>(genesisNFTStoreSchema, assetBytes);
		validator.validate(genesisNFTStoreSchema, genesisStore);

		const nftIDKeySet = new dataStructures.BufferSet();

		for (const nft of genesisStore.nftSubstore) {
			if (![LENGTH_CHAIN_ID, LENGTH_ADDRESS].includes(nft.owner.length)) {
				throw new Error(`nftID ${nft.nftID.toString('hex')} has invalid owner`);
			}

			if (nftIDKeySet.has(nft.nftID)) {
				throw new Error(`nftID ${nft.nftID.toString('hex')} duplicated`);
			}

			const attributeSet: Record<string, number> = {};

			for (const attribute of nft.attributesArray) {
				attributeSet[attribute.module] = (attributeSet[attribute.module] ?? 0) + 1;

				if (attributeSet[attribute.module] > 1) {
					throw new Error(
						`nftID ${nft.nftID.toString('hex')} has a duplicate attribute for ${
							attribute.module
						} module`,
					);
				}
			}

			nftIDKeySet.add(nft.nftID);
		}

		const allNFTsSupported = genesisStore.supportedNFTsSubstore.some(supportedNFTs =>
			supportedNFTs.chainID.equals(ALL_SUPPORTED_NFTS_KEY),
		);

		if (genesisStore.supportedNFTsSubstore.length > 1 && allNFTsSupported) {
			throw new Error(
				'SupportedNFTsSubstore should contain only one entry if all NFTs are supported',
			);
		}

		if (
			allNFTsSupported &&
			genesisStore.supportedNFTsSubstore[0].supportedCollectionIDArray.length !== 0
		) {
			throw new Error('supportedCollectionIDArray must be empty if all NFTs are supported');
		}

		const supportedChainsKeySet = new dataStructures.BufferSet();
		for (const supportedNFT of genesisStore.supportedNFTsSubstore) {
			if (supportedChainsKeySet.has(supportedNFT.chainID)) {
				throw new Error(`chainID ${supportedNFT.chainID.toString('hex')} duplicated`);
			}

			supportedChainsKeySet.add(supportedNFT.chainID);
		}

		const nftStore = this.stores.get(NFTStore);
		const escrowStore = this.stores.get(EscrowStore);
		const userStore = this.stores.get(UserStore);

		for (const nft of genesisStore.nftSubstore) {
			const { owner, nftID, attributesArray } = nft;

			await nftStore.save(context, nftID, {
				owner,
				attributesArray,
			});

			if (owner.length === LENGTH_CHAIN_ID) {
				await escrowStore.set(context, escrowStore.getKey(owner, nftID), {});
			} else {
				await userStore.set(context, userStore.getKey(owner, nftID), {
					lockingModule: NFT_NOT_LOCKED,
				});
			}
		}

		for (const supportedNFT of genesisStore.supportedNFTsSubstore) {
			const { chainID, supportedCollectionIDArray } = supportedNFT;
			const supportedNFTsSubstore = this.stores.get(SupportedNFTsStore);

			await supportedNFTsSubstore.save(context, chainID, {
				supportedCollectionIDArray,
			});
		}
	}
}
