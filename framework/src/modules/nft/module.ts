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

import { GenesisBlockExecuteContext } from '../../state_machine';
import { ModuleInitArgs, ModuleMetadata } from '../base_module';
import { BaseInteroperableModule } from '../interoperability';
import { InteroperabilityMethod } from '../token/types';
import { NFTInteroperableMethod } from './cc_method';
import { NFTEndpoint } from './endpoint';
import { AllNFTsFromChainSupportedEvent } from './events/all_nfts_from_chain_suported';
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
import { FeeMethod } from './types';

export class NFTModule extends BaseInteroperableModule {
	public method = new NFTMethod(this.stores, this.events);
	public endpoint = new NFTEndpoint(this.stores, this.offchainStores);
	public crossChainMethod = new NFTInteroperableMethod(this.stores, this.events);

	private readonly _internalMethod = new InternalMethod(this.stores, this.events);
	// @ts-expect-error TODO: unused error. Remove when implementing.
	private _interoperabilityMethod!: InteroperabilityMethod;

	public commands = [];

	// eslint-disable-next-line no-useless-constructor
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
			AllNFTsFromCollectionSupportedEvent,
			new AllNFTsFromCollectionSupportedEvent(this.name),
		);
		this.events.register(
			AllNFTsFromCollectionSupportRemovedEvent,
			new AllNFTsFromCollectionSupportRemovedEvent(this.name),
		);
	}

	public addDependencies(interoperabilityMethod: InteroperabilityMethod, _feeMethod: FeeMethod) {
		this._interoperabilityMethod = interoperabilityMethod;
		this.method.addDependencies(interoperabilityMethod, this._internalMethod);
		this.crossChainMethod.addDependencies(interoperabilityMethod);
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [],
			assets: [],
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async init(_args: ModuleInitArgs) {}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async initGenesisState(_context: GenesisBlockExecuteContext): Promise<void> {}
}
