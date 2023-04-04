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
import { ModuleInitArgs, ModuleMetadata } from '../../base_module';
import { BaseInteroperabilityModule } from '../base_interoperability_module';
import { SidechainInteroperabilityMethod } from './method';
import { SidechainCCMethod } from './cc_method';
import { RegisterMainchainCommand } from './commands/register_mainchain';
import { SidechainInteroperabilityEndpoint } from './endpoint';
import {
	getChainAccountRequestSchema,
	getChannelRequestSchema,
	getTerminatedStateAccountRequestSchema,
	getTerminatedOutboxAccountRequestSchema,
	genesisInteroperabilitySchema,
	getChainValidatorsRequestSchema,
	getChainValidatorsResponseSchema,
} from '../schemas';
import { chainDataSchema, allChainAccountsSchema, ChainStatus } from '../stores/chain_account';
import { channelSchema } from '../stores/channel_data';
import { ownChainAccountSchema, OwnChainAccountStore } from '../stores/own_chain_account';
import { terminatedStateSchema } from '../stores/terminated_state';
import { terminatedOutboxSchema } from '../stores/terminated_outbox';
import { ChainAccountUpdatedEvent } from '../events/chain_account_updated';
import { CcmProcessedEvent } from '../events/ccm_processed';
import { InvalidRegistrationSignatureEvent } from '../events/invalid_registration_signature';
import { CcmSendSuccessEvent } from '../events/ccm_send_success';
import { BaseCCMethod } from '../base_cc_method';
import {
	ValidatorsMethod,
	GenesisInteroperability,
	TerminatedStateAccountWithChainID,
} from '../types';
import { SidechainInteroperabilityInternalMethod } from './internal_method';
import { SubmitSidechainCrossChainUpdateCommand } from './commands';
import { InitializeStateRecoveryCommand } from './commands/initialize_state_recovery';
import { RecoverStateCommand } from './commands/recover_state';
import { SidechainCCChannelTerminatedCommand, SidechainCCRegistrationCommand } from './cc_commands';
import { CcmSentFailedEvent } from '../events/ccm_send_fail';
import { GenesisBlockExecuteContext } from '../../../state_machine';
import {
	MODULE_NAME_INTEROPERABILITY,
	MIN_CHAIN_NAME_LENGTH,
	MAX_CHAIN_NAME_LENGTH,
	CHAIN_NAME_MAINCHAIN,
	EMPTY_BYTES,
	EMPTY_HASH,
} from '../constants';
import { isValidName, validNameCharset, getMainchainID } from '../utils';
import { TokenMethod } from '../../token';
import { InvalidCertificateSignatureEvent } from '../events/invalid_certificate_signature';

export class SidechainInteroperabilityModule extends BaseInteroperabilityModule {
	public crossChainMethod: BaseCCMethod = new SidechainCCMethod(this.stores, this.events);
	protected internalMethod = new SidechainInteroperabilityInternalMethod(
		this.stores,
		this.events,
		this.interoperableCCMethods,
	);
	// eslint-disable-next-line @typescript-eslint/member-ordering
	public method = new SidechainInteroperabilityMethod(
		this.stores,
		this.events,
		this.interoperableCCMethods,
		this.internalMethod,
	);
	// eslint-disable-next-line @typescript-eslint/member-ordering
	public endpoint = new SidechainInteroperabilityEndpoint(this.stores, this.offchainStores);

	private readonly _mainchainRegistrationCommand = new RegisterMainchainCommand(
		this.stores,
		this.events,
		this.interoperableCCMethods,
		this.interoperableCCCommands,
		this.internalMethod,
	);
	private readonly _crossChainUpdateCommand = new SubmitSidechainCrossChainUpdateCommand(
		this.stores,
		this.events,
		this.interoperableCCMethods,
		this.interoperableCCCommands,
		this.internalMethod,
	);
	private readonly _stateRecoveryInitCommand = new InitializeStateRecoveryCommand(
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

	// eslint-disable-next-line @typescript-eslint/member-ordering
	public commands = [
		this._mainchainRegistrationCommand,
		this._crossChainUpdateCommand,
		this._stateRecoveryInitCommand,
		this._stateRecoveryCommand,
	];
	// eslint-disable-next-line @typescript-eslint/member-ordering
	public crossChainCommand = [
		new SidechainCCRegistrationCommand(
			this.stores,
			this.events,
			this.interoperableCCMethods,
			this.internalMethod,
		),
		new SidechainCCChannelTerminatedCommand(
			this.stores,
			this.events,
			this.interoperableCCMethods,
			this.internalMethod,
		),
	];

	private _validatorsMethod!: ValidatorsMethod;

	public constructor() {
		super();
		this.events.register(ChainAccountUpdatedEvent, new ChainAccountUpdatedEvent(this.name));
		this.events.register(CcmProcessedEvent, new CcmProcessedEvent(this.name));
		this.events.register(CcmSendSuccessEvent, new CcmSendSuccessEvent(this.name));
		this.events.register(
			InvalidRegistrationSignatureEvent,
			new InvalidRegistrationSignatureEvent(this.name),
		);
		this.events.register(CcmSentFailedEvent, new CcmSentFailedEvent(this.name));
		this.events.register(
			InvalidCertificateSignatureEvent,
			new InvalidCertificateSignatureEvent(this.name),
		);
	}

	public addDependencies(validatorsMethod: ValidatorsMethod, tokenMethod: TokenMethod) {
		this._validatorsMethod = validatorsMethod;
		this._crossChainUpdateCommand.init(this.method, tokenMethod);
		this.internalMethod.addDependencies(tokenMethod);
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
					name: this.endpoint.getChainValidators.name,
					request: getChainValidatorsRequestSchema,
					response: getChainValidatorsResponseSchema,
				},
			],
			assets: [
				{
					version: 0,
					data: genesisInteroperabilitySchema,
				},
			],
			stores: this.stores.values().map(v => ({
				key: v.key.toString('hex'),
				data: v.schema,
			})),
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(_args: ModuleInitArgs) {
		this._mainchainRegistrationCommand.addDependencies(this._validatorsMethod);
	}

	// @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#mainchain
	// eslint-disable-next-line @typescript-eslint/require-await
	public async initGenesisState(ctx: GenesisBlockExecuteContext): Promise<void> {
		const genesisBlockAssetBytes = ctx.assets.getAsset(MODULE_NAME_INTEROPERABILITY);
		if (!genesisBlockAssetBytes) {
			return;
		}

		const genesisInteroperability = codec.decode<GenesisInteroperability>(
			genesisInteroperabilitySchema,
			genesisBlockAssetBytes,
		);

		validator.validate<GenesisInteroperability>(
			genesisInteroperabilitySchema,
			genesisInteroperability,
		);

		await this._verifyChainInfos(ctx, genesisInteroperability);
		await super.processGenesisState(ctx);
	}

	private async _verifyChainInfos(
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

		// If chainInfos is empty, then check that:
		//
		// ownChainName is the empty string;
		// ownChainNonce == 0;
		// terminatedStateAccounts is empty;
		// terminatedOutboxAccounts is empty.
		if (chainInfos.length === 0) {
			const ifChainInfosIsEmpty = 'if chainInfos is empty.';
			if (ownChainName !== '') {
				throw new Error(`ownChainName must be empty string, ${ifChainInfosIsEmpty}.`);
			}
			if (ownChainNonce !== BigInt(0)) {
				throw new Error(`ownChainNonce must be 0, ${ifChainInfosIsEmpty}.`);
			}
			if (terminatedStateAccounts.length !== 0) {
				throw new Error(`terminatedStateAccounts must be empty, ${ifChainInfosIsEmpty}.`);
			}
			if (terminatedOutboxAccounts.length !== 0) {
				throw new Error(`terminatedOutboxAccounts must be empty, ${ifChainInfosIsEmpty}.`);
			}
		} else {
			// ownChainName
			// has length between MIN_CHAIN_NAME_LENGTH and MAX_CHAIN_NAME_LENGTH,
			// is from the character set a-z0-9!@$&_.,
			// and ownChainName != CHAIN_NAME_MAINCHAIN;
			if (
				ownChainName.length < MIN_CHAIN_NAME_LENGTH ||
				ownChainName.length > MAX_CHAIN_NAME_LENGTH // will only run if not already applied in schema
			) {
				throw new Error(
					`ownChainName.length must be between ${MIN_CHAIN_NAME_LENGTH} and ${MAX_CHAIN_NAME_LENGTH}`,
				);
			}
			// CAUTION!
			// this check is intentionally applied after MIN_CHAIN_NAME_LENGTH, as it will fail for empty string
			if (!isValidName(ownChainName)) {
				throw new Error(`ownChainName must have only ${validNameCharset} character set.`);
			}
			if (ownChainName === CHAIN_NAME_MAINCHAIN) {
				throw new Error(`ownChainName must be not equal to ${CHAIN_NAME_MAINCHAIN}.`);
			}

			// ownChainNonce > 0
			if (ownChainNonce < 1) {
				throw new Error('ownChainNonce must be > 0.');
			}

			// chainInfos contains exactly one entry mainchainInfo with:
			if (chainInfos.length !== 1) {
				throw new Error('chainInfos must contain exactly one entry.');
			}
			// mainchainInfo.chainID == getMainchainID();
			const mainchainInfo = chainInfos[0];
			const mainchainID = getMainchainID(mainchainInfo.chainID);
			if (!mainchainInfo.chainID.equals(mainchainID)) {
				throw new Error(`mainchainInfo.chainID must be equal to ${mainchainID.toString('hex')}.`);
			}
			// mainchainInfo.chainData.name == CHAIN_NAME_MAINCHAIN,
			// mainchainInfo.chainData.status is either equal to CHAIN_STATUS_REGISTERED or to CHAIN_STATUS_ACTIVE,
			// mainchainInfo.chainData.lastCertificate.timestamp < g.header.timestamp;
			if (mainchainInfo.chainData.name !== CHAIN_NAME_MAINCHAIN) {
				throw new Error(`chainData.name must be equal to ${CHAIN_NAME_MAINCHAIN}.`);
			}
			const validStatuses = [ChainStatus.REGISTERED, ChainStatus.ACTIVE];
			if (!validStatuses.includes(mainchainInfo.chainData.status)) {
				throw new Error(`chainData.status must be one of ${validStatuses.join(', ')}.`);
			}
			if (mainchainInfo.chainData.lastCertificate.timestamp > ctx.header.timestamp) {
				throw new Error('chainData.lastCertificate.timestamp must be < header.timestamp.');
			}
			// channelData
			this._verifyChannelData(ctx, mainchainInfo);

			// activeValidators
			this._verifyChainValidators(mainchainInfo);
		}

		// terminatedStateAccounts
		await this._verifyTerminatedStateAccounts(ctx, terminatedStateAccounts);

		// terminatedOutboxAccounts
		if (terminatedOutboxAccounts.length !== 0) {
			throw new Error('terminatedOutboxAccounts must be empty.');
		}
	}

	private async _verifyTerminatedStateAccounts(
		ctx: GenesisBlockExecuteContext,
		terminatedStateAccounts: TerminatedStateAccountWithChainID[],
	) {
		this._verifyTerminatedStateAccountsCommon(terminatedStateAccounts);

		const mainchainID = getMainchainID(ctx.chainID);
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(ctx, EMPTY_BYTES);

		for (const stateAccount of terminatedStateAccounts) {
			// stateAccount.chainID != getMainchainID()
			if (stateAccount.chainID.equals(mainchainID)) {
				throw new Error(
					`stateAccount.chainID must not be equal to ${mainchainID.toString('hex')}.`,
				);
			}

			// and stateAccount.chainID != ownChainAccount.chainID.
			if (stateAccount.chainID.equals(ownChainAccount.chainID)) {
				throw new Error(`stateAccount.chainID must not be equal to ownChainAccount.chainID.`);
			}

			// For each entry stateAccount in terminatedStateAccounts either:
			// stateAccount.stateRoot != EMPTY_HASH, stateAccount.mainchainStateRoot == EMPTY_HASH, and stateAccount.initialized == True;
			// or stateAccount.stateRoot == EMPTY_HASH, stateAccount.mainchainStateRoot != EMPTY_HASH, and stateAccount.initialized == False.
			const { terminatedStateAccount } = stateAccount;
			if (terminatedStateAccount.initialized) {
				if (terminatedStateAccount.stateRoot.equals(EMPTY_HASH)) {
					throw new Error(
						`stateAccount.stateRoot mst be not equal to "${EMPTY_HASH.toString(
							'hex',
						)}", if initialized is true.`,
					);
				}
				if (!terminatedStateAccount.mainchainStateRoot.equals(EMPTY_HASH)) {
					throw new Error(
						`terminatedStateAccount.mainchainStateRoot must be equal to "${EMPTY_HASH.toString(
							'hex',
						)}", if initialized is true`,
					);
				}
			} else {
				// initialized is false
				if (!terminatedStateAccount.stateRoot.equals(EMPTY_HASH)) {
					throw new Error(
						`stateAccount.stateRoot mst be equal to "${EMPTY_HASH.toString(
							'hex',
						)}", if initialized is false.`,
					);
				}
				if (terminatedStateAccount.mainchainStateRoot.equals(EMPTY_HASH)) {
					throw new Error(
						`terminatedStateAccount.mainchainStateRoot must be not equal to "${EMPTY_HASH.toString(
							'hex',
						)}", if initialized is false.`,
					);
				}
			}
		}
	}
}
