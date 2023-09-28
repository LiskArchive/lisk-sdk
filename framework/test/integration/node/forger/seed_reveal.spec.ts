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
import { forging } from '../../../fixtures/config/devnet/config.json';
import { Forger } from '../../../../src/node/forger/forger';
import { createDB, removeDB } from '../../../utils/kv_store';

describe('seed reveal', () => {
	const dbName = 'seed_reveal';
	const forgerDB = createDB(dbName);
	let forger: Forger;

	beforeEach(() => {
		forger = new Forger({
			db: forgerDB,
			chainModule: { constants: {} },
			bftModule: {
				finalizedHeight: 1,
			},
			forgingDelegates: forging.delegates.map((d: any) => ({
				address: Buffer.from(d.address, 'hex'),
				encryptedPassphrase: d.encryptedPassphrase,
				hashOnion: {
					count: d.hashOnion.count,
					distance: d.hashOnion.distance,
					hashes: d.hashOnion.hashes.map((h: any) => Buffer.from(h, 'hex')),
				},
			})),
		} as any);
	});

	afterEach(async () => {
		await forgerDB.forgerDB.clear();
		forgerDB.forgerDB.close();
		removeDB(dbName);
	});

	it('should pass for selecting the next seed reveal', () => {
		const address = '9cabee3d27426676b852ce6b804cb2fdff7cd0b5';
		// 2nd and 3rd Hash onion from config file for address 9cabee3d27426676b852ce6b804cb2fdff7cd0b5
		const secondCheckpointStart = Buffer.from('f7a3fb976e50d882c709edb63bde4d9c', 'hex');
		const thirdCheckpointStart = Buffer.from('1bd121882cb1dee1107699001c2676fb', 'hex');
		const height1 = 1000;
		const height2 = 2000;

		// End of 1st milestone
		const nextHashOnion1 = forger['_getNextHashOnion'](
			[{ count: 999, height: height1, address: Buffer.from(address, 'hex') }],
			Buffer.from(address, 'hex'),
			height1 + 1,
		);
		expect(nextHashOnion1.hash).toEqual(secondCheckpointStart);

		// End of 2nd milestone
		const nextHashOnion2 = forger['_getNextHashOnion'](
			[{ count: 1999, height: height2, address: Buffer.from(address, 'hex') }],
			Buffer.from(address, 'hex'),
			height2 + 1,
		);
		expect(nextHashOnion2.hash).toEqual(thirdCheckpointStart);
	});
});
