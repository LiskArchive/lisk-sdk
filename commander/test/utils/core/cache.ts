/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import { expect } from 'chai';
import fsExtra from 'fs-extra';
import {
	isCacheEnabled,
	isCacheRunning,
	startCache,
	stopCache,
} from '../../../src/utils/core/cache';
import { NETWORK } from '../../../src/utils/constants';
import * as workerProcess from '../../../src/utils/worker-process';
import * as coreConfig from '../../../src/utils/core/config';
import * as pm2 from '../../../src/utils/core/pm2';
import * as liskConfig from './fixtures';
import { SinonStub } from 'sinon';

describe('cache node utils', () => {
	let pm2Stub: SinonStub;
	let configStub: SinonStub;

	beforeEach(() => {
		sandbox.stub(fsExtra, 'writeJSONSync').returns();
		pm2Stub = sandbox.stub(pm2, 'describeApplication');
		pm2Stub.resolves({
			pm2_env: {
				LISK_REDIS_PORT: 6380,
			},
		});
		configStub = sandbox.stub(coreConfig, 'getLiskConfig');
		configStub.resolves(liskConfig.config);
	});

	describe('#isCacheEnabled', () => {
		let workerProcessStub: SinonStub;
		beforeEach(() => {
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should return true when cache is enabled', async () => {
			workerProcessStub.resolves({
				stdout: liskConfig.config,
			});

			const enabled = await isCacheEnabled('~/.lisk/instance', NETWORK.DEVNET);
			return expect(enabled).to.be.true;
		});

		it('should throw error when failed get cache config', () => {
			configStub.resolves({});

			return expect(
				isCacheEnabled('~/.lisk/instance', NETWORK.DEVNET),
			).to.rejectedWith('Cache config is not found.');
		});
	});

	describe('#isCacheRunning', () => {
		let workerProcessStub: SinonStub;
		beforeEach(() => {
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		describe('when redis server is not installed', () => {
			it('should return false', async () => {
				workerProcessStub.resolves({
					stdout: 'redis not installed',
					stderr: 'redis not installed',
				});

				const status = await isCacheRunning('/tmp/dummypath', 'test');
				return expect(status).to.be.false;
			});
		});

		describe('when redis server is installed', () => {
			it('should return true', async () => {
				workerProcessStub.resolves({ stdout: 'PONG', stderr: null });
				pm2Stub.resolves({
					pm2_env: {
						LISK_REDIS_PORT: 6380,
					},
				});

				const status = await isCacheRunning('/tmp/dummypath', 'test');
				return expect(status).to.be.true;
			});
		});
	});

	describe('#startCache', () => {
		let workerProcessStub: SinonStub;
		beforeEach(() => {
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		describe('when installation does not exists', () => {
			it('should throw error', () => {
				workerProcessStub.resolves({ stderr: 'Command failed' });

				return expect(startCache('/tmp/dummypath', 'test')).to.rejectedWith(
					'Command failed',
				);
			});
		});

		describe('when installation exists', () => {
			it('should start successfully', async () => {
				workerProcessStub.resolves({ stdout: '', stderr: null });

				const status = await startCache('/tmp/dummypath', 'test');
				return expect(status).to.equal(
					'[+] Redis-Server started successfully.',
				);
			});

			it('should throw error when failed to stop', () => {
				workerProcessStub.resolves({
					stdout: 'Failed to start redis',
					stderr: 'Failed to start redis',
				});

				return expect(startCache('/tmp/dummypath', 'test')).to.rejectedWith(
					'[-] Failed to start Redis-Server',
				);
			});
		});
	});

	describe('#stopCache', () => {
		describe('when installation does not exists', () => {
			it('should throw error', () => {
				return expect(
					stopCache('/tmp/dummypath', NETWORK.MAINNET, 'test'),
				).to.rejectedWith(
					'[-] Failed to stop Redis-Server.: \n\n Error: spawn /bin/sh ENOENT',
				);
			});
		});

		describe('when installation exists', () => {
			let workerProcessStub: SinonStub;
			beforeEach(() => {
				workerProcessStub = sandbox
					.stub(workerProcess, 'exec')
					.resolves({} as any);
			});

			it('should stop successfully when password is empty', async () => {
				workerProcessStub.resolves({
					stdout: {
						components: { cache: { password: null } },
					},
				});
				configStub.resolves({
					components: { cache: { password: null } },
				});

				const status = await stopCache(
					'/tmp/dummypath',
					NETWORK.MAINNET,
					'test',
				);
				return expect(status).to.equal(
					'[+] Redis-Server stopped successfully.',
				);
			});

			it('should stop successfully when password is present', async () => {
				workerProcessStub.resolves({ stdout: liskConfig.config, stderr: null });

				const status = await stopCache(
					'/tmp/dummypath',
					NETWORK.MAINNET,
					'test',
				);
				return expect(status).to.equal(
					'[+] Redis-Server stopped successfully.',
				);
			});

			it('should throw error when failed to stop', () => {
				workerProcessStub.resolves({
					stdout: 'Failed to stop redis',
					stderr: 'Failed to stop redis',
				});

				return expect(
					stopCache('/tmp/dummypath', NETWORK.MAINNET, 'test'),
				).to.rejectedWith('[-] Failed to stop Redis-Server');
			});

			it('should throw error when failed get cache config', () => {
				configStub.rejects(new Error('Fail to get config.'));

				return expect(
					stopCache('/tmp/dummypath', NETWORK.MAINNET, 'test'),
				).to.rejectedWith('Fail to get config.');
			});
		});
	});
});
