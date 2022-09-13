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

import { utils } from '@liskhq/lisk-cryptography';
import { ModuleEndpointContext } from '../../../src';
import { RequestContext } from '../../../src/engine/rpc/rpc_server';
import { createImmutableMethodContext } from '../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../src/state_machine/prefixed_state_read_writer';
import { fakeLogger } from './logger';

export const createContext = (
	stateStore: PrefixedStateReadWriter,
	params: Record<string, unknown>,
): ModuleEndpointContext => ({
	getImmutableMethodContext: () => createImmutableMethodContext(stateStore),
	getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
	logger: fakeLogger,
	chainID: utils.getRandomBytes(32),
	params,
	getOffchainStore: (moduleID: Buffer, storePrefix: Buffer) =>
		stateStore.getStore(moduleID, storePrefix),
});

export const createRequestContext = (params: Record<string, unknown>): RequestContext => ({
	logger: fakeLogger,
	chainID: utils.getRandomBytes(32),
	params,
});
