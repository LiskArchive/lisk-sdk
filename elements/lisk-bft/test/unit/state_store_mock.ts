/*
 * Copyright © 2020 Lisk Foundation
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

interface ConsensusStateStoreMock {
	get: (address: string) => Promise<string | undefined>;
	set: (key: string, v: string) => void;
}

interface ConsensusState {
	[key: string]: string;
}

export class StateStoreMock {
	public consensus: ConsensusStateStoreMock;

	public consensusData: ConsensusState;

	// eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
	constructor(initialState?: ConsensusState) {
		// Make sure to be deep copy
		this.consensusData = initialState ? { ...initialState } : {};

		this.consensus = {
			// eslint-disable-next-line @typescript-eslint/require-await
			get: async (key: string): Promise<string | undefined> => {
				return this.consensusData[key];
			},
			set: (key: string, val: string): void => {
				this.consensusData[key] = val;
			},
		};
	}
}
