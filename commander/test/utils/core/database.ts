import { expect } from 'chai';
import fs from 'fs';
import fsExtra from 'fs-extra';
import {
	initDB,
	startDatabase,
	stopDatabase,
	createUser,
	createDatabase,
	restoreSnapshot,
} from '../../../src/utils/core/database';
import * as workerProcess from '../../../src/utils/worker-process';
import { NETWORK } from '../../../src/utils/constants';
import * as coreConfig from '../../../src/utils/core/config';
import * as pm2 from '../../../src/utils/core/pm2';
import * as liskConfig from './fixtures';
import { SinonStub } from 'sinon';

describe('database core utils', () => {
	let pm2Stub: SinonStub;

	beforeEach(() => {
		sandbox.stub(fsExtra, 'writeJSONSync').returns();
		pm2Stub = sandbox.stub(pm2, 'describeApplication');
		pm2Stub.resolves({
			pm2_env: {
				LISK_REDIS_PORT: 6380,
			},
		});
		const configStub = sandbox.stub(coreConfig, 'getLiskConfig');
		configStub.resolves(liskConfig.config);
	});

	describe('#initDB', () => {
		let workerProcessStub: SinonStub;
		let existsSyncStub: SinonStub;

		beforeEach(() => {
			existsSyncStub = sandbox.stub(fs, 'existsSync');
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should return database initialized', async () => {
			existsSyncStub.returns(true);

			const status = await initDB('dummy/path');
			return expect(status).to.equal('Postgres database initialized');
		});

		it('should throw error when failed to initialized  database ', () => {
			existsSyncStub.returns(false);
			workerProcessStub.resolves({
				stdout: 'failed to initialized database',
				stderr: 'failed to initialized database',
			});

			return expect(initDB('dummy/path')).to.rejectedWith(
				'[-] Failed to start Postgresql.: \n\n failed to initialized database',
			);
		});

		it('should throw error when failed to initialized  database ', async () => {
			existsSyncStub.returns(false);
			workerProcessStub.resolves({ stdout: '' });

			const result = await initDB('dummy/path');
			return expect(result).to.deep.equal(
				'[+] Postgresql started successfully.',
			);
		});
	});

	describe('#startDatabase', () => {
		let workerProcessStub: SinonStub;

		beforeEach(() => {
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should return database server is running', async () => {
			workerProcessStub.resolves({ stdout: 'server is running' });

			const status = await startDatabase('dummy/path', 'test');
			return expect(status).to.equal('[+] Postgresql started successfully.');
		});

		it('should throw error when failed to start database ', () => {
			workerProcessStub.resolves({
				stderr: 'failed to start',
			});

			return expect(
				startDatabase('dummy/path', NETWORK.MAINNET),
			).to.rejectedWith(
				'[-] Failed to start Postgresql.: \n\n failed to start',
			);
		});

		it('should start database successfully ', async () => {
			workerProcessStub.onCall(0).resolves({ stderr: 'not running' });
			workerProcessStub.onCall(1).resolves({ stderr: null });

			const result = await startDatabase('dummy/path', 'test');
			return expect(result).to.equal('[+] Postgresql started successfully.');
		});
	});

	describe('#stopDatabase', () => {
		let workerProcessStub: SinonStub;

		beforeEach(() => {
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should return database server is not running', async () => {
			workerProcessStub.resolves({ stderr: 'server is not running' });

			const status = await stopDatabase('dummy/path', 'test');
			return expect(status).to.equal('[+] Postgresql is not running.');
		});

		it('should stop database successfully ', async () => {
			workerProcessStub.resolves({ stdout: 'server is running' });

			const result = await stopDatabase('dummy/path', NETWORK.MAINNET);
			return expect(result).to.equal('[+] Postgresql stopped successfully.');
		});

		it('should return failed to stop database', () => {
			workerProcessStub.onCall(0).resolves({ stderr: null });
			workerProcessStub.onCall(1).resolves({ stderr: 'pg_ctl failed to stop' });

			return expect(
				stopDatabase('dummy/path', NETWORK.MAINNET),
			).to.rejectedWith('[-] Postgresql failed to stop.');
		});
	});

	describe('#createUser', () => {
		let workerProcessStub: SinonStub;

		beforeEach(() => {
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should throw error when failed to create user', () => {
			workerProcessStub.resolves({
				stdout: 'failed to create user',
				stderr: 'failed to create user',
			});

			return expect(
				createUser('dummy/path', NETWORK.MAINNET, 'test'),
			).to.rejectedWith(
				'[-] Failed to create Postgresql user.: \n\n failed to create user',
			);
		});

		it('should create user successfully ', async () => {
			workerProcessStub.resolves({ stdout: '' });

			const result = await createUser('dummy/path', NETWORK.MAINNET, 'test');
			return expect(result).to.equal(
				'[+] Postgresql user created successfully.',
			);
		});
	});

	describe('#createDatabase', () => {
		let workerProcessStub: SinonStub;

		beforeEach(() => {
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should throw error when failed to create database', () => {
			workerProcessStub.resolves({
				stdout: 'failed to create database',
				stderr: 'failed to create database',
			});

			return expect(
				createDatabase('dummy/path', NETWORK.MAINNET, 'test'),
			).to.rejectedWith(
				'[-] Failed to create Postgresql database.: \n\n failed to create database',
			);
		});

		it('should create user successfully ', async () => {
			workerProcessStub.resolves({ stdout: '' });

			const result = await createDatabase(
				'dummy/path',
				NETWORK.MAINNET,
				'test',
			);
			return expect(result).to.equal(
				'[+] Postgresql database created successfully.',
			);
		});
	});

	describe('#restoreSnapshot', () => {
		let workerProcessStub: SinonStub;

		beforeEach(() => {
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should create user successfully ', async () => {
			workerProcessStub.resolves({ stderr: 'failed to restore' });

			return expect(
				restoreSnapshot(
					'/install/dir',
					NETWORK.MAINNET,
					'snapshot/path',
					'test',
				),
			).to.be.rejectedWith(
				'[-] Failed to restore blockchain.: \n\n failed to restore',
			);
		});

		it('should create user successfully ', async () => {
			workerProcessStub.resolves({ stdout: '' });

			const result = await restoreSnapshot(
				'/install/dir',
				NETWORK.MAINNET,
				'snapshot/path',
				'test',
			);
			return expect(result).to.equal('[+] Blockchain restored successfully.');
		});
	});
});
