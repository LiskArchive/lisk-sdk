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

import { InMemoryDatabase, Database, StateDB } from '@liskhq/lisk-db';
import { ABIServer } from '../../../src/abi_handler/abi_server';
import { ABIHandler } from '../../../src/abi_handler/abi_handler';
import { StateMachine } from '../../../src/state_machine';
import { TokenModule } from '../../../src/modules/token';
import { BaseModule } from '../../../src/modules';
import { fakeLogger } from '../../utils/mocks';
import { channelMock } from '../../../src/testing/mocks';
import { applicationConfigSchema } from '../../../src/schema';

jest.mock('zeromq', () => {
	return {
		Router: jest.fn().mockReturnValue({ bind: jest.fn(), close: jest.fn() }),
	};
});

describe('ABI server', () => {
	let server: ABIServer;
	let abiHandler: ABIHandler;

	beforeEach(() => {
		const stateMachine = new StateMachine();
		const mod = new TokenModule();
		stateMachine.registerModule(mod as BaseModule);
		abiHandler = new ABIHandler({
			logger: fakeLogger,
			channel: channelMock,
			stateDB: (new InMemoryDatabase() as unknown) as StateDB,
			moduleDB: (new InMemoryDatabase() as unknown) as Database,
			stateMachine,
			modules: [mod],
			config: {
				...applicationConfigSchema.default,
				genesis: { ...applicationConfigSchema.default.genesis, chainID: '00000000' },
			},
			chainID: Buffer.from('10000000', 'hex'),
		});

		server = new ABIServer(fakeLogger, '/path/to/ipc', abiHandler);
	});

	describe('constructor', () => {
		it('should register abi handlers', () => {
			const allFuncs = Object.getOwnPropertyNames(Object.getPrototypeOf(abiHandler)).filter(
				name => name !== 'constructor' && name !== 'chainID' && name !== 'cacheGenesisState',
			);
			expect(Object.keys(server['_abiHandlers'])).toEqual(allFuncs);
		});
	});
});
