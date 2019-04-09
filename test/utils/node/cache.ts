import { expect } from 'chai';
import {
	isCacheRunning,
	startCache,
	stopCache,
} from '../../../src/utils/node/cache';
import { NETWORK } from '../../../src/utils/constants';
import * as workerProcess from '../../../src/utils/worker-process';
import * as nodeConfig from '../../../src/utils/node/config';

describe('cache node utils', () => {
	describe('#isCacheRunning', () => {
		describe('when installation does not exists', () => {
			it('should return false', async () => {
				const status = await isCacheRunning('/tmp/dummypath', NETWORK.MAINNET);
				return expect(status).to.be.false;
			});
		});

		describe('when installation exists', () => {
			beforeEach(() => {
				sandbox
					.stub(workerProcess, 'exec')
					.resolves({ stdout: 'PONG', stderr: null });
			});

			it('should return true', async () => {
				const status = await isCacheRunning('/tmp/dummypath', NETWORK.MAINNET);
				return expect(status).to.be.true;
			});
		});
	});

	describe('#startCache', () => {
		describe('when installation does not exists', () => {
			it('should throw error', async () => {
				try {
					return await startCache('/tmp/dummypath', NETWORK.MAINNET);
				} catch (error) {
					return expect(error.message.search('No such file or directory') >= 0)
						.to.be.true;
				}
			});
		});

		describe('when installation exists', () => {
			let workerProcessStub: any = null;
			beforeEach(() => {
				workerProcessStub = sandbox.stub(workerProcess, 'exec');
			});

			it('should start successfully', async () => {
				workerProcessStub.resolves({ stdout: '', stderr: null });

				const status = await startCache('/tmp/dummypath', NETWORK.MAINNET);
				return expect(status).to.equal(
					'[+] Redis-Server started successfully.',
				);
			});

			it('should throw error when failed to stop', async () => {
				workerProcessStub.resolves({
					stdout: 'Failed to start redis',
					stderr: 'Failed to start redis',
				});

				try {
					return await startCache('/tmp/dummypath', NETWORK.MAINNET);
				} catch (error) {
					console.log(error);
					return expect(
						error.message.search('Failed to start Redis-Server.') >= 0,
					).to.be.true;
				}
			});
		});
	});

	describe('#stopCache', () => {
		describe('when installation does not exists', () => {
			it('should throw error', async () => {
				try {
					return await stopCache('/tmp/dummypath', NETWORK.MAINNET);
				} catch (error) {
					expect(error).to.be.not.null;
					return expect(
						error.message.search('Config file not exists in path') >= 0,
					).to.be.true;
				}
			});
		});

		describe('when installation exists', () => {
			let configStub: any = null;
			let workerProcessStub: any = null;
			beforeEach(() => {
				configStub = sandbox.stub(nodeConfig, 'getCacheConfig');
				workerProcessStub = sandbox.stub(workerProcess, 'exec');
			});

			it('should stop successfully when password is empty', async () => {
				configStub.returns({ password: null });
				workerProcessStub.resolves({ stdout: '', stderr: null });

				const status = await stopCache('/tmp/dummypath', NETWORK.MAINNET);
				return expect(status).to.equal(
					'[+] Redis-Server stopped successfully.',
				);
			});

			it('should stop successfully when password is present', async () => {
				configStub.returns({ password: 'lisk' });
				workerProcessStub.resolves({ stdout: '', stderr: null });

				const status = await stopCache('/tmp/dummypath', NETWORK.MAINNET);
				return expect(status).to.equal(
					'[+] Redis-Server stopped successfully.',
				);
			});

			it('should throw error when failed to stop', async () => {
				configStub.returns({ password: 'lisk' });
				workerProcessStub.resolves({
					stdout: 'Failed to stop redis',
					stderr: 'Failed to stop redis',
				});

				try {
					return await stopCache('/tmp/dummypath', NETWORK.MAINNET);
				} catch (error) {
					console.log(error);
					return expect(
						error.message.search('Failed to stop Redis-Server.') >= 0,
					).to.be.true;
				}
			});
		});
	});
});
