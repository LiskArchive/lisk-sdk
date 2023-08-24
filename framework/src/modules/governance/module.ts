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

import { BaseModule, ModuleMetadata } from '../base_module';
// import { FeeMethod, PoSMethod, TokenMethod } from './types';
import { GovernanceEndpoint } from './endpoint';
import { ProposalCreatedEvent } from './events/proposal_created';
import { ProposalOutcomeEvent } from './events/proposal_outcome';
import { ProposalQuorumCheckedEvent } from './events/proposal_quorum_checked';
import { ProposalVotedEvent } from './events/proposal_voted';
import { GovernanceMethod } from './method';
import { ProposalIndexStore } from './stores/proposal_index';
import { ConfigStore } from './stores/config';
import { ProposalsStore } from './stores/proposals';
import { VotesStore } from './stores/votes';

export class GovernanceModule extends BaseModule {
	public method = new GovernanceMethod(this.stores, this.events);
	public endpoint = new GovernanceEndpoint(this.stores, this.offchainStores);

	// private _tokenMethod!: TokenMethod;
	// private _posMethod!: PoSMethod;
	// private _feeMethod!: FeeMethod;

	public constructor() {
		super();

		this.stores.register(ProposalsStore, new ProposalsStore(this.name, 0));
		this.stores.register(VotesStore, new VotesStore(this.name, 1));
		this.stores.register(ProposalIndexStore, new ProposalIndexStore(this.name, 2));
		this.stores.register(ConfigStore, new ConfigStore(this.name, 3));

		this.events.register(ProposalCreatedEvent, new ProposalCreatedEvent(this.name));
		this.events.register(ProposalQuorumCheckedEvent, new ProposalQuorumCheckedEvent(this.name));
		this.events.register(ProposalOutcomeEvent, new ProposalOutcomeEvent(this.name));
		this.events.register(ProposalVotedEvent, new ProposalVotedEvent(this.name));
	}

	public metadata(): ModuleMetadata {
		return {
			endpoints: [],
			commands: [],
			events: [],
			assets: [],
			stores: [],
		};
	}

	// public addDependencies(tokenMethod: TokenMethod, posMethod: PoSMethod, feeMethod: FeeMethod) {
	// 	this._tokenMethod = tokenMethod;
	// 	this._posMethod = posMethod;
	// 	this._feeMethod = feeMethod;
	// }
}
