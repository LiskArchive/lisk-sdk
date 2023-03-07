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
import { bufferArrayUniqueItems } from '@liskhq/lisk-utils/dist-node/objects';
import { MAX_UINT64 } from '@liskhq/lisk-validator';
import { ModuleMetadata } from '../../base_module';
import { BaseInteroperabilityModule } from '../base_interoperability_module';
import { MainchainInteroperabilityMethod } from './method';
import { MainchainCCMethod } from './cc_method';
import { MainchainInteroperabilityEndpoint } from './endpoint';
import {
	getChainAccountRequestSchema,
	getChannelRequestSchema,
	getTerminatedStateAccountRequestSchema,
	getTerminatedOutboxAccountRequestSchema,
	genesisInteroperabilitySchema,
	getRegistrationFeeSchema,
	isChainIDAvailableResponseSchema,
	getChainValidatorsRequestSchema,
	getChainValidatorsResponseSchema,
	isChainIDAvailableRequestSchema,
	getMinimumMessageFeeResponseSchema,
} from '../schemas';
import { chainDataSchema, allChainAccountsSchema, ChainStatus } from '../stores/chain_account';
import { channelSchema } from '../stores/channel_data';
import { ownChainAccountSchema } from '../stores/own_chain_account';
import { terminatedStateSchema } from '../stores/terminated_state';
import { terminatedOutboxSchema } from '../stores/terminated_outbox';
import { TokenMethod } from '../../token';
import {
	SubmitMainchainCrossChainUpdateCommand,
	RecoverMessageCommand,
	RegisterSidechainCommand,
	TerminateSidechainForLivenessCommand,
} from './commands';
import { CcmProcessedEvent } from '../events/ccm_processed';
import { ChainAccountUpdatedEvent } from '../events/chain_account_updated';
import { CcmSendSuccessEvent } from '../events/ccm_send_success';
import { TerminatedStateCreatedEvent } from '../events/terminated_state_created';
import { TerminatedOutboxCreatedEvent } from '../events/terminated_outbox_created';
import { MainchainInteroperabilityInternalMethod } from './internal_method';
import { InitializeMessageRecoveryCommand } from './commands/initialize_message_recovery';
import {
	FeeMethod,
	GenesisInteroperability,
	ChainInfo,
	TerminatedStateAccountWithChainID,
	TerminatedOutboxAccountWithChainID,
} from '../types';
import { MainchainCCChannelTerminatedCommand, MainchainCCRegistrationCommand } from './cc_commands';
import { RecoverStateCommand } from './commands/recover_state';
import { CcmSentFailedEvent } from '../events/ccm_send_fail';
import { InvalidRegistrationSignatureEvent } from '../events/invalid_registration_signature';
import { GenesisBlockExecuteContext } from '../../../state_machine';
import {
	MODULE_NAME_INTEROPERABILITY,
	CHAIN_NAME_MAINCHAIN,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	MAX_NUM_VALIDATORS,
	EMPTY_HASH,
} from '../constants';
import {
	getMainchainID,
	isValidName,
	validNameCharset,
	getMainchainTokenID,
	computeValidatorsHash,
} from '../utils';

export class MainchainInteroperabilityModule extends BaseInteroperabilityModule {
	public crossChainMethod = new MainchainCCMethod(this.stores, this.events);
	protected internalMethod = new MainchainInteroperabilityInternalMethod(
		this.stores,
		this.events,
		this.interoperableCCMethods,
	);
	// eslint-disable-next-line @typescript-eslint/member-ordering
	public method = new MainchainInteroperabilityMethod(
		this.stores,
		this.events,
		this.interoperableCCMethods,
		this.internalMethod,
	);
	// eslint-disable-next-line @typescript-eslint/member-ordering
	public endpoint = new MainchainInteroperabilityEndpoint(this.stores, this.offchainStores);

	private readonly _sidechainRegistrationCommand = new RegisterSidechainCommand(
		this.stores,
		this.events,
		this.interoperableCCMethods,
		this.interoperableCCCommands,
		this.internalMethod,
	);

	private readonly _messageRecoveryInitializationCommand = new InitializeMessageRecoveryCommand(
		this.stores,
		this.events,
		this.interoperableCCMethods,
		this.interoperableCCCommands,
		this.internalMethod,
	);
	private readonly _crossChainUpdateCommand = new SubmitMainchainCrossChainUpdateCommand(
		this.stores,
		this.events,
		this.interoperableCCMethods,
		this.interoperableCCCommands,
		this.internalMethod,
	);
	private readonly _messageRecoveryCommand = new RecoverMessageCommand(
		this.stores,
		this.events,
		this.interoperableCCMethods,
		this.interoperableCCCommands,
		this.internalMethod,
	);
	private readonly _stateRecoveryCommand = new RecoverStateCommand(
		this.stores,
		this.events,
		this.interoperableCCMethods,
		this.interoperableCCCommands,
		this.internalMethod,
	);
	private readonly _terminateSidechainForLivenessCommand = new TerminateSidechainForLivenessCommand(
		this.stores,
		this.events,
		this.interoperableCCMethods,
		this.interoperableCCCommands,
		this.internalMethod,
	);

	// eslint-disable-next-line @typescript-eslint/member-ordering
	public commands = [
		this._crossChainUpdateCommand,
		this._messageRecoveryInitializationCommand,
		this._messageRecoveryCommand,
		this._sidechainRegistrationCommand,
		this._stateRecoveryCommand,
		this._terminateSidechainForLivenessCommand,
	];
	// eslint-disable-next-line @typescript-eslint/member-ordering
	public crossChainCommand = [
		new MainchainCCRegistrationCommand(
			this.stores,
			this.events,
			this.interoperableCCMethods,
			this.internalMethod,
		),
		new MainchainCCChannelTerminatedCommand(
			this.stores,
			this.events,
			this.interoperableCCMethods,
			this.internalMethod,
		),
	];

	public constructor() {
		super();
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
	}

	public addDependencies(tokenMethod: TokenMethod, feeMethod: FeeMethod) {
		this._sidechainRegistrationCommand.addDependencies(feeMethod);
		this._crossChainUpdateCommand.init(this.method, tokenMethod);
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [
				{
					name: this.endpoint.getChainAccount.name,
					request: getChainAccountRequestSchema,
					response: chainDataSchema,
				},
				{
					name: this.endpoint.getAllChainAccounts.name,
					request: getChainAccountRequestSchema,
					response: allChainAccountsSchema,
				},
				{
					name: this.endpoint.getChannel.name,
					request: getChannelRequestSchema,
					response: channelSchema,
				},
				{
					name: this.endpoint.getOwnChainAccount.name,
					response: ownChainAccountSchema,
				},
				{
					name: this.endpoint.getTerminatedStateAccount.name,
					request: getTerminatedStateAccountRequestSchema,
					response: terminatedStateSchema,
				},
				{
					name: this.endpoint.getTerminatedOutboxAccount.name,
					request: getTerminatedOutboxAccountRequestSchema,
					response: terminatedOutboxSchema,
				},
				{
					name: this.endpoint.getRegistrationFee.name,
					response: getRegistrationFeeSchema,
				},
				{
					name: this.endpoint.getMinimumMessageFee.name,
					response: getMinimumMessageFeeResponseSchema,
				},
				{
					name: this.endpoint.getChainValidators.name,
					request: getChainValidatorsRequestSchema,
					response: getChainValidatorsResponseSchema,
				},
				{
					name: this.endpoint.isChainIDAvailable.name,
					request: isChainIDAvailableRequestSchema,
					response: isChainIDAvailableResponseSchema,
				},
			],
			assets: [
				{
					version: 0,
					data: genesisInteroperabilitySchema,
				},
			],
		};
	}

	// @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#mainchain
	// eslint-disable-next-line @typescript-eslint/require-await
	public async initGenesisState(ctx: GenesisBlockExecuteContext): Promise<void> {
		const genesisBlockAssetBytes = ctx.assets.getAsset(MODULE_NAME_INTEROPERABILITY);
		if (!genesisBlockAssetBytes) {
			return;
		}

		await super.initGenesisState(ctx);

		const genesisInteroperability = codec.decode<GenesisInteroperability>(
			genesisInteroperabilitySchema,
			genesisBlockAssetBytes,
		);

		const {
			ownChainName,
			ownChainNonce,
			chainInfos,
			terminatedStateAccounts,
			terminatedOutboxAccounts,
		} = genesisInteroperability;

		// On the mainchain, the following checks are performed:
		if (ctx.chainID.equals(getMainchainID(ctx.chainID))) {
			// ownChainName == CHAIN_NAME_MAINCHAIN.
			if (ownChainName !== CHAIN_NAME_MAINCHAIN) {
				throw new Error(`ownChainName must be equal to CHAIN_NAME_MAINCHAIN'`);
			}

			// if chainInfos is empty, then ownChainNonce == 0
			if (chainInfos.length === 0) {
				if (ownChainNonce !== BigInt(0)) {
					throw new Error(`ownChainNonce must be 0 if chainInfos is empty.`);
				}
			} else {
				// If chainInfos is non-empty
				// ownChainNonce > 0
				if (ownChainNonce <= 0) {
					throw new Error(`ownChainNonce must be positive if chainInfos is not empty.`);
				}

				// Each entry chainInfo in chainInfos has a unique chainInfo.chainID
				const chainIDs = chainInfos.map(info => info.chainID);
				if (!bufferArrayUniqueItems(chainIDs)) {
					throw new Error(`chainInfos doesn't hold unique chainID.`);
				}

				// chainInfos is ordered lexicographically by chainInfo.chainID
				const sortedByChainID = [...chainInfos].sort((a, b) => a.chainID.compare(b.chainID));
				for (let i = 0; i < chainInfos.length; i += 1) {
					if (!chainInfos[i].chainID.equals(sortedByChainID[i].chainID)) {
						throw new Error('chainInfos is not ordered lexicographically by chainID.');
					}
				}

				this._verifyChainInfos(ctx, chainInfos);
				this._verifyTerminatedStateAccounts(chainInfos, terminatedStateAccounts);
				this._verifyTerminatedOutboxAccounts(
					chainInfos,
					terminatedStateAccounts,
					terminatedOutboxAccounts,
				);
			}
		}
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#mainchain
	private _verifyChainInfos(ctx: GenesisBlockExecuteContext, chainInfos: ChainInfo[]) {
		const mainchainID = getMainchainID(ctx.chainID);
		const chainDataNames = chainInfos.map(info => info.chainData.name);

		// verify root level properties
		for (const chainInfo of chainInfos) {
			const { chainID } = chainInfo;

			// chainInfo.chainID != getMainchainID();
			if (chainID.equals(mainchainID)) {
				throw new Error(`chainID must be not equal to getMainchainID()[0].`);
			}

			// - chainInfo.chainId[0] == getMainchainID()[0].
			if (chainID[0] !== mainchainID[0]) {
				throw new Error(`chainID[0] doesn't match getMainchainID()[0].`);
			}

			this._verifyChainData(ctx, chainInfo, chainDataNames);
			this._verifyChannelData(ctx, chainInfo);
			this._verifyChainValidators(chainInfo);
		}
	}

	private _verifyChainData(
		ctx: GenesisBlockExecuteContext,
		chainInfo: ChainInfo,
		chainDataNames: string[],
	) {
		const validStatuses = [ChainStatus.REGISTERED, ChainStatus.ACTIVE, ChainStatus.TERMINATED];

		// The entries chainData.name must be pairwise distinct
		if (new Set(chainDataNames).size !== chainDataNames.length) {
			throw new Error(`chainData.name must be pairwise distinct.`);
		}

		const { chainData } = chainInfo;

		// chainData.lastCertificate.timestamp < g.header.timestamp;
		if (chainData.lastCertificate.timestamp > ctx.header.timestamp) {
			throw new Error(`chainData.lastCertificate.timestamp must be less than header.timestamp.`);
		}

		// chainData.name only uses the character set a-z0-9!@$&_.;
		if (!isValidName(chainData.name)) {
			throw new Error(`chainData.name only uses the character set ${validNameCharset}.`);
		}

		// chainData.status is in set {CHAIN_STATUS_REGISTERED, CHAIN_STATUS_ACTIVE, CHAIN_STATUS_TERMINATED}.
		if (!validStatuses.includes(chainData.status)) {
			throw new Error(`chainData.status must be one of ${validStatuses.join(', ')}`);
		}
	}

	private _verifyChannelData(ctx: GenesisBlockExecuteContext, chainInfo: ChainInfo) {
		const mainchainTokenID = getMainchainTokenID(ctx.chainID);

		const { channelData } = chainInfo;

		// channelData.messageFeeTokenID == Token.getTokenIDLSK();
		if (!channelData.messageFeeTokenID.equals(mainchainTokenID)) {
			throw new Error(`channelData.messageFeeTokenID is not equal to Token.getTokenIDLSK().`);
		}

		// channelData.minReturnFeePerByte == MIN_RETURN_FEE_PER_BYTE_LSK.
		if (channelData.minReturnFeePerByte !== MIN_RETURN_FEE_PER_BYTE_BEDDOWS) {
			throw new Error(
				`channelData.minReturnFeePerByte is not equal to MIN_RETURN_FEE_PER_BYTE_BEDDOWS.`,
			);
		}
	}

	private _verifyChainValidators(chainInfo: ChainInfo) {
		const { chainValidators, chainData } = chainInfo;
		const { activeValidators, certificateThreshold } = chainValidators;

		// activeValidators must have at least 1 element and at most MAX_NUM_VALIDATORS elements
		if (activeValidators.length === 0 || activeValidators.length > MAX_NUM_VALIDATORS) {
			throw new Error(
				`activeValidators must have at least 1 element and at most MAX_NUM_VALIDATORS elements.`,
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
			totalWeight / BigInt(3) + BigInt(1) > certificateThreshold ||
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

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#mainchain
	private _verifyTerminatedStateAccounts(
		chainInfos: ChainInfo[],
		terminatedStateAccounts: TerminatedStateAccountWithChainID[],
	) {
		for (const chainInfo of chainInfos) {
			const { chainID } = chainInfo;

			if (terminatedStateAccounts.filter(a => a.chainID.equals(chainID)).length > 0) {
				// For each entry chainInfo in chainInfos, chainInfo.chainData.status == CHAIN_STATUS_TERMINATED
				// if and only if a corresponding entry (i.e., with chainID == chainInfo.chainID) exists in terminatedStateAccounts.
				if (chainInfo.chainData.status !== ChainStatus.TERMINATED) {
					throw new Error(
						`chainInfo.chainData.status must be ${ChainStatus.TERMINATED} if chainInfo.chainID exists in terminatedStateAccounts.`,
					);
				}
			}
		}

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

		// For each entry stateAccount in terminatedStateAccounts holds
		// stateAccount.stateRoot == chainData.lastCertificate.stateRoot,
		// stateAccount.mainchainStateRoot == EMPTY_HASH, and
		// stateAccount.initialized == True.
		// Here chainData is the corresponding entry (i.e., with chainID == stateAccount.chainID) in chainInfos.

		const stateAccountByChainID = (chainID: Buffer) =>
			terminatedStateAccounts.find(a => a.chainID.equals(chainID))?.terminatedStateAccount;

		for (const chainInfo of chainInfos) {
			const stateAccount = stateAccountByChainID(chainInfo.chainID);
			if (stateAccount) {
				if (!stateAccount.stateRoot.equals(chainInfo.chainData.lastCertificate.stateRoot)) {
					throw new Error(
						"stateAccount.stateRoot doesn't match chainInfo.chainData.lastCertificate.stateRoot.",
					);
				}

				if (!stateAccount.mainchainStateRoot.equals(EMPTY_HASH)) {
					throw new Error('stateAccount.mainchainStateRoot is not equal to EMPTY_HASH.');
				}

				if (!stateAccount.initialized) {
					throw new Error('stateAccount is not initialized.');
				}
			}
		}
	}

	// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#mainchain
	private _verifyTerminatedOutboxAccounts(
		_chainInfos: ChainInfo[],
		terminatedStateAccounts: TerminatedStateAccountWithChainID[],
		terminatedOutboxAccounts: TerminatedOutboxAccountWithChainID[],
	) {
		// Each entry outboxAccount in terminatedOutboxAccounts has a unique outboxAccount.chainID
		const chainIDs = terminatedOutboxAccounts.map(a => a.chainID);
		if (!bufferArrayUniqueItems(chainIDs)) {
			throw new Error(`terminatedOutboxAccounts don't hold unique chainID.`);
		}

		// terminatedOutboxAccounts is ordered lexicographically by outboxAccount.chainID
		const sortedByChainID = [...terminatedOutboxAccounts].sort((a, b) =>
			a.chainID.compare(b.chainID),
		);
		for (let i = 0; i < terminatedOutboxAccounts.length; i += 1) {
			if (!terminatedOutboxAccounts[i].chainID.equals(sortedByChainID[i].chainID)) {
				throw new Error('terminatedOutboxAccounts must be ordered lexicographically by chainID.');
			}
		}

		// Furthermore, an entry outboxAccount in terminatedOutboxAccounts must have a corresponding entry
		// (i.e., with chainID == outboxAccount.chainID) in terminatedStateAccounts
		for (const outboxAccount of terminatedOutboxAccounts) {
			if (
				terminatedStateAccounts.find(a => a.chainID.equals(outboxAccount.chainID)) === undefined
			) {
				let msg =
					'Each entry outboxAccount in terminatedOutboxAccounts must have a corresponding entry ';
				msg += '(with chainID == outboxAccount.chainID) in terminatedStateAccounts.';
				throw new Error(msg);
			}
		}
	}
}
