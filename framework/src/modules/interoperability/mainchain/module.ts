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
	isChainNameAvailableRequestSchema,
	isChainNameAvailableResponseSchema,
} from '../schemas';
import { chainDataSchema, allChainAccountsSchema } from '../stores/chain_account';
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
import { FeeMethod } from '../types';
import { MainchainCCChannelTerminatedCommand, MainchainCCRegistrationCommand } from './cc_commands';
import { RecoverStateCommand } from './commands/recover_state';
import { CcmSentFailedEvent } from '../events/ccm_send_fail';
import { InvalidRegistrationSignatureEvent } from '../events/invalid_registration_signature';

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
				{
					name: this.endpoint.isChainNameAvailable.name,
					request: isChainNameAvailableRequestSchema,
					response: isChainNameAvailableResponseSchema,
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
}
