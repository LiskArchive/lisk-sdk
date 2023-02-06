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

import { generateGenesisBlock } from '../../src/genesis_block';
import { StateMachine } from '../../src/state_machine';
import { fakeLogger } from '../utils/mocks';

describe('generateGenesisBlock', () => {
	const stateMachine = new StateMachine();

	beforeEach(() => {
		jest.spyOn(stateMachine, 'executeGenesisBlock');
	});

	it('should return generated genesis block', async () => {
		const result = await generateGenesisBlock(stateMachine, fakeLogger, {
			chainID: Buffer.from([4, 0, 0, 0]),
			assets: [],
			height: 30,
		});

		expect(result.header.validatorsHash).toHaveLength(32);
		expect(result.header.eventRoot).toHaveLength(32);
		expect(result.header.version).toBe(0);

		expect(stateMachine.executeGenesisBlock).toHaveBeenCalledTimes(1);
	});
});
