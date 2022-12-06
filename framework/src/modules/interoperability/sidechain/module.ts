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
} from '../schemas';
import {
	chainAccountSchema,
	allChainAccountsSchema,
	ChainAccountStore,
} from '../stores/chain_account';
import { ChannelDataStore, channelSchema } from '../stores/channel_data';
import { ownChainAccountSchema, OwnChainAccountStore } from '../stores/own_chain_account';
import { terminatedStateSchema } from '../stores/terminated_state';
import { terminatedOutboxSchema } from '../stores/terminated_outbox';
import { OutboxRootStore } from '../stores/outbox_root';
import { ChainValidatorsStore } from '../stores/chain_validators';
import { ChainAccountUpdatedEvent } from '../events/chain_account_updated';
import { CcmProcessedEvent } from '../events/ccm_processed';
import { InvalidRegistrationSignatureEvent } from '../events/invalid_registration_signature';
import { CcmSendSuccessEvent } from '../events/ccm_send_success';
import { BaseCCMethod } from '../base_cc_method';
import { TokenMethod, ValidatorsMethod } from '../types';
import { SidechainInteroperabilityInternalMethod } from './internal_method';
import { SubmitSidechainCrossChainUpdateCommand } from './commands';
import { InitializeStateRecoveryCommand } from './commands/initialize_state_recovery';
import { RecoverStateCommand } from './commands/recover_state';
import { SidechainCCChannelTerminatedCommand, SidechainCCRegistrationCommand } from './cc_commands';

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
		this.stores.register(ChainAccountStore, new ChainAccountStore(this.name));
		this.stores.register(OwnChainAccountStore, new OwnChainAccountStore(this.name));
		this.stores.register(ChannelDataStore, new ChannelDataStore(this.name));
		this.stores.register(OutboxRootStore, new OutboxRootStore(this.name));
		this.stores.register(ChainValidatorsStore, new ChainValidatorsStore(this.name));
		this.events.register(ChainAccountUpdatedEvent, new ChainAccountUpdatedEvent(this.name));
		this.events.register(CcmProcessedEvent, new CcmProcessedEvent(this.name));
		this.events.register(CcmSendSuccessEvent, new CcmSendSuccessEvent(this.name));
		this.events.register(
			InvalidRegistrationSignatureEvent,
			new InvalidRegistrationSignatureEvent(this.name),
		);
	}

	public addDependencies(validatorsMethod: ValidatorsMethod, tokenMethod: TokenMethod) {
		this._validatorsMethod = validatorsMethod;
		this._crossChainUpdateCommand.init(this.method, tokenMethod);
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [
				{
					name: this.endpoint.getChainAccount.name,
					request: getChainAccountRequestSchema,
					response: chainAccountSchema,
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
}
