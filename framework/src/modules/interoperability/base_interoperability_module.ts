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

import { bufferArrayUniqueItems } from '@liskhq/lisk-utils/dist-node/objects';
import { MAX_UINT64 } from '@liskhq/lisk-validator';
import { GenesisBlockExecuteContext } from '../../state_machine';
import { BaseCCCommand } from './base_cc_command';
import { BaseCCMethod } from './base_cc_method';
import { BaseInteroperableModule } from './base_interoperable_module';
import {
	MODULE_NAME_INTEROPERABILITY,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	MAX_NUM_VALIDATORS,
} from './constants';
import { ChainAccountStore } from './stores/chain_account';
import { ChainValidatorsStore } from './stores/chain_validators';
import { ChannelDataStore } from './stores/channel_data';
import { OutboxRootStore } from './stores/outbox_root';
import { OwnChainAccountStore } from './stores/own_chain_account';
import { RegisteredNamesStore } from './stores/registered_names';
import { TerminatedOutboxStore } from './stores/terminated_outbox';
import { TerminatedStateStore } from './stores/terminated_state';
import { ChainInfo, TerminatedStateAccountWithChainID } from './types';
import { getMainchainTokenID, computeValidatorsHash } from './utils';

export abstract class BaseInteroperabilityModule extends BaseInteroperableModule {
	protected interoperableCCCommands = new Map<string, BaseCCCommand[]>();
	protected interoperableCCMethods = new Map<string, BaseCCMethod>();

	protected constructor() {
		super();
		this.stores.register(OutboxRootStore, new OutboxRootStore(this.name, 0));
		this.stores.register(ChainAccountStore, new ChainAccountStore(this.name, 1));
		this.stores.register(OwnChainAccountStore, new OwnChainAccountStore(this.name, 13));
		this.stores.register(ChannelDataStore, new ChannelDataStore(this.name, 5));
		this.stores.register(ChainValidatorsStore, new ChainValidatorsStore(this.name, 9));
		this.stores.register(TerminatedStateStore, new TerminatedStateStore(this.name, 3));
		this.stores.register(TerminatedOutboxStore, new TerminatedOutboxStore(this.name, 11));
		this.stores.register(RegisteredNamesStore, new RegisteredNamesStore(this.name, 7));
	}

	// Common name for mainchain/sidechain interoperability module
	public get name(): string {
		return MODULE_NAME_INTEROPERABILITY;
	}

	public registerInteroperableModule(module: BaseInteroperableModule): void {
		this.interoperableCCMethods.set(module.name, module.crossChainMethod);
		this.interoperableCCCommands.set(module.name, module.crossChainCommand);
	}

	// @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#mainchain
	// eslint-disable-next-line @typescript-eslint/require-await,@typescript-eslint/no-empty-function
	public async initGenesisState(_ctx: GenesisBlockExecuteContext): Promise<void> {}

	protected _verifyChannelData(ctx: GenesisBlockExecuteContext, chainInfo: ChainInfo) {
		const mainchainTokenID = getMainchainTokenID(ctx.chainID);

		const { channelData } = chainInfo;

		// channelData.messageFeeTokenID == Token.getTokenIDLSK();
		if (!channelData.messageFeeTokenID.equals(mainchainTokenID)) {
			throw new Error('channelData.messageFeeTokenID is not equal to Token.getTokenIDLSK().');
		}

		// channelData.minReturnFeePerByte == MIN_RETURN_FEE_PER_BYTE_LSK.
		if (channelData.minReturnFeePerByte !== MIN_RETURN_FEE_PER_BYTE_BEDDOWS) {
			throw new Error(
				`channelData.minReturnFeePerByte is not equal to ${MIN_RETURN_FEE_PER_BYTE_BEDDOWS}.`,
			);
		}
	}

	protected _verifyChainValidators(chainInfo: ChainInfo) {
		const { chainValidators, chainData } = chainInfo;
		const { activeValidators, certificateThreshold } = chainValidators;

		// activeValidators must have at least 1 element and at most MAX_NUM_VALIDATORS elements
		if (activeValidators.length === 0 || activeValidators.length > MAX_NUM_VALIDATORS) {
			throw new Error(
				`activeValidators must have at least 1 element and at most ${MAX_NUM_VALIDATORS} elements.`,
			);
		}

		// activeValidators must be ordered lexicographically by blsKey property
		const sortedByBlsKeys = [...activeValidators].sort((a, b) => a.blsKey.compare(b.blsKey));
		for (let i = 0; i < activeValidators.length; i += 1) {
			if (!activeValidators[i].blsKey.equals(sortedByBlsKeys[i].blsKey)) {
				throw new Error('activeValidators must be ordered lexicographically by blsKey property.');
			}
		}

		// all blsKey properties must be pairwise distinct
		const blsKeys = activeValidators.map(v => v.blsKey);
		if (!bufferArrayUniqueItems(blsKeys)) {
			throw new Error(`All blsKey properties must be pairwise distinct.`);
		}

		// for each validator in activeValidators, validator.bftWeight > 0 must hold
		if (activeValidators.filter(v => v.bftWeight <= 0).length > 0) {
			throw new Error(`validator.bftWeight must be > 0.`);
		}

		// let totalWeight be the sum of the bftWeight property of every element in activeValidators.
		// Then totalWeight has to be less than or equal to MAX_UINT64
		const totalWeight = activeValidators.reduce(
			(accumulator, v) => accumulator + v.bftWeight,
			BigInt(0),
		);
		if (totalWeight > MAX_UINT64) {
			throw new Error(`totalWeight has to be less than or equal to MAX_UINT64.`);
		}

		// check that totalWeight//3 + 1 <= certificateThreshold <= totalWeight, where // indicates integer division
		if (
			totalWeight / BigInt(3) + BigInt(1) > certificateThreshold || // e.g. (300/3) + 1 = 101 > 20
			certificateThreshold > totalWeight
		) {
			throw new Error('Invalid certificateThreshold input.');
		}

		// check that the corresponding validatorsHash stored in chainInfo.chainData.lastCertificate.validatorsHash
		// matches with the value computed from activeValidators and certificateThreshold
		const { validatorsHash } = chainData.lastCertificate;
		if (!validatorsHash.equals(computeValidatorsHash(activeValidators, certificateThreshold))) {
			throw new Error('Invalid validatorsHash from chainData.lastCertificate.');
		}
	}

	protected _verifyTerminatedStateAccountsCommon(
		terminatedStateAccounts: TerminatedStateAccountWithChainID[],
	) {
		// Each entry stateAccount in terminatedStateAccounts has a unique stateAccount.chainID
		const chainIDs = terminatedStateAccounts.map(a => a.chainID);
		if (!bufferArrayUniqueItems(chainIDs)) {
			throw new Error(`terminatedStateAccounts don't hold unique chainID.`);
		}

		// terminatedStateAccounts is ordered lexicographically by stateAccount.chainID
		const sortedByChainID = [...terminatedStateAccounts].sort((a, b) =>
			a.chainID.compare(b.chainID),
		);
		for (let i = 0; i < terminatedStateAccounts.length; i += 1) {
			if (!terminatedStateAccounts[i].chainID.equals(sortedByChainID[i].chainID)) {
				throw new Error('terminatedStateAccounts must be ordered lexicographically by chainID.');
			}
		}
	}
}
