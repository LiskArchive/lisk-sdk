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
import { ABIClient } from '../../../src/abi_handler/abi_client';
import { ABIHandler } from '../../../src/abi_handler/abi_handler';
import { StateMachine } from '../../../src/state_machine';
import { TokenModule } from '../../../src/modules/token';
import { BaseModule } from '../../../src/modules';
import { fakeLogger } from '../../utils/mocks';
import { channelMock } from '../../../src/testing/mocks';
import { applicationConfigSchema } from '../../../src/schema';

jest.mock('zeromq', () => {
	return {
		Dealer: jest.fn().mockReturnValue({ connect: jest.fn(), close: jest.fn() }),
	};
});

describe('ABI client', () => {
	let client: ABIClient;
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

		client = new ABIClient(fakeLogger, '/path/to/ipc');
	});

	describe('constructor', () => {
		it('should have all abi handlers', () => {
			const allFuncs = Object.getOwnPropertyNames(Object.getPrototypeOf(abiHandler)).filter(
				name => name !== 'constructor' && name !== 'chainID' && name !== 'cacheGenesisState',
			);

			const clientFuncs = Object.getOwnPropertyNames(Object.getPrototypeOf(client));
			for (const expectedFunc of allFuncs) {
				expect(clientFuncs).toContain(expectedFunc);
			}
		});
	});
});
