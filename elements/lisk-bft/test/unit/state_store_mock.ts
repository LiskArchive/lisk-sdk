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

interface ChainStateStoreMock {
	get: (address: string) => Promise<string | undefined>;
	set: (key: string, v: string) => void;
}

interface ChainState {
	[key: string]: string;
}

export class StateStoreMock {
	public chainState: ChainStateStoreMock;

	public chainStateData: ChainState;

	constructor(initialState?: ChainState) {
		// Make sure to be deep copy
		this.chainStateData = initialState ? { ...initialState } : {};

		this.chainState = {
			get: async (key: string): Promise<string | undefined> => {
				return this.chainStateData[key];
			},
			set: (key: string, val: string): void => {
				this.chainStateData[key] = val;
			},
		};
	}
}
