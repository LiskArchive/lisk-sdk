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
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { chain, codec, db as liskDB } from 'lisk-sdk';

import { getContradictingBlockHeader, blockHeadersSchema } from '../../src/db';
import { ReportMisbehaviorPlugin } from '../../src';

describe('db', () => {
	const generatorPublicKey = Buffer.from(
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		'hex',
	);
	const blockHeader1Height = 900000;
	const blockHeader1 = Buffer.from(
		'08021080897a18a0f73622209696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b2a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8553220addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca93880c8afa025421a08d08e2a10e0dc2a1a10c8c557b5dba8527c0e760124128fd15c4a4056b412aa25c49e5c3cc97257972249fd0ad65f8e431264d9c04b639b46b0839b01ae8d239a354798bae1873c8318a25ef61a8dc9c7a0982da17afb24fbe15c05',
		'hex',
	);
	const blockHeader1Contradicting = Buffer.from(
		'080210c08db7011880ea3022209696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b2a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8553220addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca93880c8afa025421a08e0dc2a10e0dc2a1a10c8c557b5dba8527c0e760124128fd15c4a40d90764813046127a50acf4b449fccad057944e7665ab065d7057e56983e42abe55a3cbc1eb35a8c126f54597d0a0b426f2ad9a2d62769185ad8e3b4a5b3af909',
		'hex',
	);

	let db: liskDB.KVStore;
	let reportMisbehaviorPlugin: ReportMisbehaviorPlugin;

	beforeAll(async () => {
		const dbPath = path.join(os.homedir(), '~/.lisk/report-misbehavior-plugin/data/integration/db');
		await fs.ensureDir(dbPath);
		db = new liskDB.KVStore(dbPath);
		await db.set(
			Buffer.concat([
				generatorPublicKey,
				Buffer.from(':', 'utf8'),
				liskDB.formatInt(blockHeader1Height),
			]),
			codec.encode(blockHeadersSchema, { blockHeaders: [blockHeader1] }),
		);
		reportMisbehaviorPlugin = new ReportMisbehaviorPlugin();
	});

	afterAll(async () => {
		await db.clear();
		await db.close();
	});

	describe.skip('getContradictingBlockHeader', () => {
		it('should resolve undefine when there are no blocks by the same generator', async () => {
			const header = chain.BlockHeader.fromJSON({
				version: 2,
				timestamp: 1603379137,
				height: 169000,
				previousBlockID: Buffer.from(
					'8dd7be542ff0b4b30a1940b10b38b8ae64502be720824d43187f63917f7aadeb',
					'hex',
				),
				transactionRoot: Buffer.from(
					'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
					'hex',
				),
				generatorPublicKey: Buffer.from(
					'a703102d8587a3a48d347e911ae7cfb1f10a549758e57bd89f3eb3b744a8419d',
					'hex',
				),
				maxHeightPreviouslyForged: 168854,
				maxHeightPrevoted: 168932,
				signature: Buffer.from(
					'84b17114713c09cce4b524b858c479b9c722d0efe3e6920ef0bceea7fc42f1904348f31f1a79ff4b6b4dc135cda4a8792053b61e24b407b5ee38a367b5dc1c02',
					'hex',
				),
				id: Buffer.from('e734e77355e887660b5a8382eba26fa0b536b7deb1ddfdda394bdb6614b4cd55', 'hex'),
			});
			const result = await getContradictingBlockHeader(db, header);
			expect(result).toBeUndefined();
		});

		it('should resolve undefine when there are no conflicting block header by the same generator', async () => {
			const decodedBlockHeader1 = chain.BlockHeader.fromBytes(blockHeader1);
			const result = await getContradictingBlockHeader(db, decodedBlockHeader1);
			expect(result).toBeUndefined();
		});

		it('should resolve a contradicting blockheader when there is a conflicting block in the database', async () => {
			const decodedBlockHeader1 = chain.BlockHeader.fromBytes(blockHeader1Contradicting);
			const result = await getContradictingBlockHeader(db, decodedBlockHeader1);
			expect(result).toBeDefined();

			expect(result?.getBytes().toString('hex')).toEqual(blockHeader1.toString('hex'));
		});
	});
});
