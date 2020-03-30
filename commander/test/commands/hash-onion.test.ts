/*
 * LiskHQ/lisk-commander
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
 *
 */
import * as sandbox from 'sinon';
import fs from 'fs-extra';
import { expect, test } from '@oclif/test';
import * as config from '../../src/utils/config';
import * as printUtils from '../../src/utils/print';
import { hash } from '@liskhq/lisk-cryptography';

describe('hash-onion command', () => {
	const printMethodStub = sandbox.stub();

	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(fs, 'ensureDirSync', sandbox.stub().returns({}))
			.stub(fs, 'writeJSONSync', sandbox.stub().returns({}))
			.stdout();

	describe('hash-onion --count=1000 --distance=200', () => {
		setupTest()
			.command(['hash-onion', '--count=1000', '--distance=200'])
			.it('should generate valid hash onion', async () => {
				const { lastArg: result } = printMethodStub.getCall(0);
				for (let i = 0; i < result.hashes.length - 1; i += 1) {
					let nextHash = Buffer.from(result.hashes[i + 1], 'hex');
					for (let j = 0; j < result.distance; j += 1) {
						nextHash = hash(nextHash).slice(0, 16);
					}
					expect(result.hashes[i]).to.equal(nextHash.toString('hex'));
				}
			});
	});

	describe('hash-onion --count=1000 --distance=200 --output=./test/sample.json', () => {
		setupTest()
			.command([
				'hash-onion',
				'--count=1000',
				'--distance=200',
				'--output=./test/sample.json',
			])
			.it('should write to file', async () => {
				expect(fs.ensureDirSync).to.be.calledWith('./test');
				expect(fs.writeJSONSync).to.be.calledWith('./test/sample.json');
			});
	});

	describe('hash-onion --count=777 --distance=200', () => {
		setupTest()
			.command(['hash-onion', '--count=777', '--distance=200'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Invalid count. Count must be multiple of distance',
				);
			})
			.it('should throw an error');
	});

	describe('hash-onion --count=100 --distance=200', () => {
		setupTest()
			.command(['hash-onion', '--count=100', '--distance=200'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Invalid count or distance. Count must be greater than distance',
				);
			})
			.it('should throw an error');
	});

	describe('hash-onion --count=-1 --distance=200', () => {
		setupTest()
			.command(['hash-onion', '--count=-1', '--distance=200'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Invalid count. Count has to be positive integer',
				);
			})
			.it('should throw an error');
	});

	describe('hash-onion --count=1000 --distance=-1', () => {
		setupTest()
			.command(['hash-onion', '--count=1000', '--distance=-1'])
			.catch(error => {
				return expect(error.message).to.contain(
					'Invalid distance. Distance has to be positive integer',
				);
			})
			.it('should throw an error');
	});
});
