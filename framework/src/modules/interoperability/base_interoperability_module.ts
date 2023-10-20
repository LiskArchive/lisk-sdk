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

import { objects as objectUtils } from '@liskhq/lisk-utils';

import { MAX_UINT64 } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { GenesisBlockExecuteContext } from '../../state_machine';
import { TokenMethod } from '../token';
import { BaseCCCommand } from './base_cc_command';
import { BaseCCMethod } from './base_cc_method';
import { BaseInteroperableModule } from './base_interoperable_module';
import {
	EMPTY_BYTES,
	MAX_NUM_VALIDATORS,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	MODULE_NAME_INTEROPERABILITY,
} from './constants';
import { ChainAccountStore, ChainStatus } from './stores/chain_account';
import { ChainValidatorsStore } from './stores/chain_validators';
import { ChannelDataStore } from './stores/channel_data';
import { OutboxRoot, OutboxRootStore } from './stores/outbox_root';
import { OwnChainAccountStore } from './stores/own_chain_account';
import { RegisteredNamesStore } from './stores/registered_names';
import { TerminatedOutboxStore } from './stores/terminated_outbox';
import { TerminatedStateStore } from './stores/terminated_state';
import { ChainInfo, GenesisInteroperability, OwnChainAccount } from './types';
import { computeValidatorsHash, getTokenIDLSK } from './utils';
import { genesisInteroperabilitySchema } from './schemas';
import { CcmProcessedEvent } from './events/ccm_processed';
import { CcmSentFailedEvent } from './events/ccm_send_fail';
import { CcmSendSuccessEvent } from './events/ccm_send_success';
import { ChainAccountUpdatedEvent } from './events/chain_account_updated';
import { InvalidCertificateSignatureEvent } from './events/invalid_certificate_signature';
import { InvalidRegistrationSignatureEvent } from './events/invalid_registration_signature';
import { TerminatedOutboxCreatedEvent } from './events/terminated_outbox_created';
import { TerminatedStateCreatedEvent } from './events/terminated_state_created';
import { InvalidSMTVerification } from './events/invalid_smt_verification';
import { InvalidRMTVerification } from './events/invalid_rmt_verification';

export abstract class BaseInteroperabilityModule extends BaseInteroperableModule {
	protected interoperableCCCommands = new Map<string, BaseCCCommand[]>();
	protected interoperableCCMethods = new Map<string, BaseCCMethod>();
	protected tokenMethod!: TokenMethod;

	public constructor() {
		super();
		// Register all the stores
		this.stores.register(OutboxRootStore, new OutboxRootStore(this.name, 0));
		this.stores.register(ChainAccountStore, new ChainAccountStore(this.name, 1));
		this.stores.register(OwnChainAccountStore, new OwnChainAccountStore(this.name, 13));
		this.stores.register(ChannelDataStore, new ChannelDataStore(this.name, 5));
		this.stores.register(ChainValidatorsStore, new ChainValidatorsStore(this.name, 9));
		this.stores.register(TerminatedStateStore, new TerminatedStateStore(this.name, 3));
		this.stores.register(TerminatedOutboxStore, new TerminatedOutboxStore(this.name, 11));
		this.stores.register(RegisteredNamesStore, new RegisteredNamesStore(this.name, 7));

		// Register all the events
		this.events.register(ChainAccountUpdatedEvent, new ChainAccountUpdatedEvent(this.name));
		this.events.register(CcmProcessedEvent, new CcmProcessedEvent(this.name));
		this.events.register(CcmSendSuccessEvent, new CcmSendSuccessEvent(this.name));
		this.events.register(CcmSentFailedEvent, new CcmSentFailedEvent(this.name));
		this.events.register(
			InvalidRegistrationSignatureEvent,
			new InvalidRegistrationSignatureEvent(this.name),
		);
		this.events.register(TerminatedStateCreatedEvent, new TerminatedStateCreatedEvent(this.name));
		this.events.register(TerminatedOutboxCreatedEvent, new TerminatedOutboxCreatedEvent(this.name));
		this.events.register(InvalidSMTVerification, new InvalidSMTVerification(this.name));
		this.events.register(InvalidRMTVerification, new InvalidRMTVerification(this.name));
		this.events.register(
			InvalidCertificateSignatureEvent,
			new InvalidCertificateSignatureEvent(this.name),
		);
	}

	// Common name for mainchain/sidechain interoperability module
	public get name(): string {
		return MODULE_NAME_INTEROPERABILITY;
	}

	public registerInteroperableModule(module: BaseInteroperableModule): void {
		this.interoperableCCCommands.set(this.name, this.crossChainCommand);
		this.interoperableCCMethods.set(module.name, module.crossChainMethod);
		this.interoperableCCCommands.set(module.name, module.crossChainCommand);
	}

	// Commented checks are the ones which need to be checked/applied
	protected _verifyChannelData(ctx: GenesisBlockExecuteContext, chainInfo: ChainInfo) {
		const mainchainTokenID = getTokenIDLSK(ctx.chainID);

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

	// Commented checks are the ones which need to be checked/applied
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
		const blsKeys = activeValidators.map(v => v.blsKey);
		if (!objectUtils.isBufferArrayOrdered(blsKeys)) {
			throw new Error('activeValidators must be ordered lexicographically by blsKey property.');
		}

		// all blsKey properties must be pairwise distinct
		if (!objectUtils.bufferArrayUniqueItems(blsKeys)) {
			throw new Error(`All blsKey properties must be pairwise distinct.`);
		}

		// for each validator in activeValidators, validator.bftWeight > 0 must hold
		if (activeValidators.filter(v => v.bftWeight <= BigInt(0)).length > 0) {
			throw new Error(`validator.bftWeight must be > 0.`);
		}

		// let totalWeight be the sum of the bftWeight property of every element in activeValidators.
		// Then totalWeight has to be less than or equal to MAX_UINT64
		const totalWeight = activeValidators.reduce(
			(accumulator, v) => accumulator + v.bftWeight,
			BigInt(0),
		);
		if (totalWeight > MAX_UINT64) {
			throw new Error(`totalWeight has to be less than or equal to ${MAX_UINT64}.`);
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

	protected _verifyChainID(chainID: Buffer, mainchainID: Buffer, prefix: string) {
		// chainInfo.chainID != getMainchainID();
		if (chainID.equals(mainchainID)) {
			throw new Error(`${prefix}chainID must not be equal to ${mainchainID.toString('hex')}.`);
		}

		// chainInfo.chainId[0] == getMainchainID()[0].
		if (chainID[0] !== mainchainID[0]) {
			throw new Error(`${prefix}chainID[0] must be equal to ${mainchainID[0]}.`);
		}
	}

	protected _verifyTerminatedStateAccountsIDs(chainIDs: Buffer[]) {
		// Each entry stateAccount in terminatedStateAccounts has a unique stateAccount.chainID
		if (!objectUtils.bufferArrayUniqueItems(chainIDs)) {
			throw new Error(`terminatedStateAccounts don't hold unique chainID.`);
		}

		// terminatedStateAccounts is ordered lexicographically by stateAccount.chainID
		if (!objectUtils.isBufferArrayOrdered(chainIDs)) {
			throw new Error('terminatedStateAccounts must be ordered lexicographically by chainID.');
		}
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#genesis-state-processing
	public async processGenesisState(
		ctx: GenesisBlockExecuteContext,
		genesisInteroperability: GenesisInteroperability,
	) {
		const {
			ownChainName,
			ownChainNonce,
			chainInfos,
			terminatedStateAccounts,
			terminatedOutboxAccounts,
		} = genesisInteroperability;

		const ownChainAccountSubStore = this.stores.get(OwnChainAccountStore);
		const chainAccountStore = this.stores.get(ChainAccountStore);
		const channelDataSubStore = this.stores.get(ChannelDataStore);
		const chainValidatorsSubStore = this.stores.get(ChainValidatorsStore);
		const outboxRootSubStore = this.stores.get(OutboxRootStore);
		const terminatedStateSubStore = this.stores.get(TerminatedStateStore);
		const terminatedOutboxStore = this.stores.get(TerminatedOutboxStore);

		// If ownChainName is not the empty string, add an entry to the own chain substore with
		// key set to EMPTY_BYTES
		// and value set to {"name": ownChainName, "chainID": OWN_CHAIN_ID, "nonce": ownChainNonce}.
		if (ownChainName !== '') {
			const ownChainAccount: OwnChainAccount = {
				name: ownChainName,
				chainID: ctx.chainID,
				nonce: ownChainNonce,
			};
			await ownChainAccountSubStore.set(ctx, EMPTY_BYTES, ownChainAccount);
		}

		// For each entry chainInfo in chainInfos add the following substore entries with key set to chainInfo.chainID:
		// with the value chainInfo.chainData to the chain data substore;
		// with the value chainInfo.channelData to the channel data substore;
		// with the value chainInfo.chainValidators to the chain validators substore;
		// with the value chainInfo.channelData.outbox.root to the outbox root substore, only if chainInfo.chainData.status != CHAIN_STATUS_TERMINATED
		for (const chainInfo of chainInfos) {
			await chainAccountStore.set(ctx, chainInfo.chainID, chainInfo.chainData);
			await channelDataSubStore.set(ctx, chainInfo.chainID, chainInfo.channelData);
			await chainValidatorsSubStore.set(ctx, chainInfo.chainID, chainInfo.chainValidators);
			if (chainInfo.chainData.status !== ChainStatus.TERMINATED) {
				const outboxRoot: OutboxRoot = {
					root: chainInfo.channelData.outbox.root,
				};
				await outboxRootSubStore.set(ctx, chainInfo.chainID, outboxRoot);
			}
		}

		// For each entry stateAccount in terminatedStateAccounts
		// add an entry to the terminated state substore
		// with key set to stateAccount.chainID and value set to stateAccount.terminatedStateAccount
		for (const stateAccount of terminatedStateAccounts) {
			await terminatedStateSubStore.set(
				ctx,
				stateAccount.chainID,
				stateAccount.terminatedStateAccount,
			);
		}

		// For each entry outboxAccount in terminatedOutboxAccounts add an entry to the terminated outbox substore
		// with key set to outboxAccount.chainID and value set to outboxAccount.terminatedOutboxAccount.
		for (const outboxAccount of terminatedOutboxAccounts) {
			await terminatedOutboxStore.set(
				ctx,
				outboxAccount.chainID,
				outboxAccount.terminatedOutboxAccount,
			);
		}
	}

	public async finalizeGenesisState?(ctx: GenesisBlockExecuteContext): Promise<void> {
		const genesisBlockAssetBytes = ctx.assets.getAsset(MODULE_NAME_INTEROPERABILITY);

		const genesisInteroperability = codec.decode<GenesisInteroperability>(
			genesisInteroperabilitySchema,
			genesisBlockAssetBytes as Buffer,
		);

		const { chainInfos } = genesisInteroperability;
		for (const chainInfo of chainInfos) {
			const { messageFeeTokenID } = chainInfo.channelData;
			if (this.tokenMethod?.isNativeToken(messageFeeTokenID)) {
				if (
					!(await this.tokenMethod?.escrowSubstoreExists(
						ctx.getMethodContext(),
						chainInfo.chainID,
						messageFeeTokenID,
					))
				) {
					throw new Error("Corresponding escrow account doesn't exist.");
				}
			}
		}
	}
}
