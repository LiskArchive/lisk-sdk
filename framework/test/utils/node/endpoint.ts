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
 *
 */

import { StateStore } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { ModuleEndpointContext } from '../../../src';
import { createImmutableAPIContext } from '../../../src/node/state_machine';
import { fakeLogger } from './node';

export const createContext = (
	stateStore: StateStore,
	params: Record<string, unknown>,
): ModuleEndpointContext => ({
	getImmutableAPIContext: () => createImmutableAPIContext(stateStore),
	getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
	logger: fakeLogger,
	networkIdentifier: getRandomBytes(32),
	params,
});
