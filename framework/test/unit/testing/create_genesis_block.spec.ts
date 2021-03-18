/*
 * Copyright © 2021 Lisk Foundation
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

import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { objects } from '@liskhq/lisk-utils';
import { createGenesisBlock } from '../../../src/testing';
import { TokenModule } from '../../../src';

describe('Create Genesis Block', () => {
	it('should return a valid genesis block', () => {
		expect(
			createGenesisBlock({ modules: [], accounts: [], timestamp: 123456789 }),
		).toMatchSnapshot();
	});

	it('should return valid accounts for empty modules', () => {
		const accounts = [{ address: getRandomBytes(20) }];

		const { genesisBlock } = createGenesisBlock({ modules: [], accounts });

		expect(genesisBlock.header.asset.accounts).toHaveLength(1);
		expect(genesisBlock.header.asset.accounts).toEqual(accounts);
	});

	it('should return valid accounts with custom module schema', () => {
		const accounts = [{ address: getRandomBytes(20) }];
		const tokenModule = new TokenModule({} as never);

		const { genesisBlock } = createGenesisBlock({ modules: [TokenModule], accounts });

		expect(genesisBlock.header.asset.accounts).toHaveLength(1);
		expect(genesisBlock.header.asset.accounts[0]).toEqual(
			objects.mergeDeep({}, accounts[0], {
				[tokenModule.name]: tokenModule.accountSchema.default,
			}),
		);
	});

	it('should return valid initDelegates', () => {
		const accounts = [{ address: getRandomBytes(20) }];
		const initDelegates = [getRandomBytes(20)];

		const { genesisBlock } = createGenesisBlock({
			modules: [TokenModule],
			accounts,
			initDelegates,
		});

		expect(genesisBlock.header.asset.accounts).toHaveLength(1);
		expect(genesisBlock.header.asset.initDelegates).toEqual(initDelegates);
	});
});
