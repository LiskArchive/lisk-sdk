import { expect } from 'chai';
import pm2 from 'pm2';
import fsExtra from 'fs-extra';
import {
	registerApplication,
	unRegisterApplication,
	restartApplication,
	stopApplication,
	listApplication,
	describeApplication,
	PM2ProcessInstance,
} from '../../../src/utils/core/pm2';
import { NETWORK } from '../../../src/utils/constants';
import { SinonStub } from 'sinon';

describe('pm2 node utils', () => {
	const monit = {
		cpu: 10,
		memory: 10,
	};

	const pm2_env = {
		LISK_DB_PORT: '5432',
		LISK_REDIS_PORT: '6380',
		LISK_WS_PORT: '5000',
		LISK_HTTP_PORT: '4000',
		pm_cwd: '.lisk/instances',
		pm_uptime: new Date(),
		status: 'online',
		version: '2.0.0',
		LISK_NETWORK: 'testnet',
	};

	const applicationList = [
		{
			name: 'testnet',
			pid: 123,
			monit,
			pm2_env,
		},
	];

	describe('#registerApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'start').yields(null, 'started');
			sandbox.stub(pm2, 'stop').yields(null, 'stopped');
			sandbox
				.stub(fsExtra, 'readJson')
				.resolves({ apps: [{ script: 'src/index.js' }] });
		});

		it('should register an application', async () => {
			await registerApplication('dummy/path', NETWORK.MAINNET, 'test', {});

			expect(pm2.connect).to.be.calledOnce;
			expect(pm2.start).to.be.calledOnce;
			return expect(pm2.stop).to.be.calledOnce;
		});
	});

	describe('#unRegisterApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'delete').yields(null, 'process deleted');
		});

		it('should unregister an application', async () => {
			await unRegisterApplication('test');

			expect(pm2.delete).to.be.calledOnce;
			return expect(pm2.connect).to.be.calledOnce;
		});
	});

	describe('#restartApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'restart').yields(null, 'process restart');
		});

		it('should restart an application', async () => {
			await restartApplication('test');

			expect(pm2.restart).to.be.calledOnce;
			return expect(pm2.connect).to.be.calledOnce;
		});
	});

	describe('#stopApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'stop').yields(null, 'process stopped');
		});

		it('should stop the running application', async () => {
			await stopApplication('test');

			expect(pm2.stop).to.be.calledOnce;
			return expect(pm2.connect).to.be.calledOnce;
		});
	});

	describe('#listApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'list').yields(null, applicationList);
		});

		it('should return list of all the applications', async () => {
			const appList = await listApplication();

			expect(pm2.connect).to.be.calledOnce;
			expect(pm2.list).to.be.calledOnce;
			return appList.map(app => expect(app.name).to.equal('testnet'));
		});
	});

	describe('#describeApplication', () => {
		let describeStub: SinonStub;

		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			describeStub = sandbox.stub(pm2, 'describe');
		});

		it('should return application description', async () => {
			describeStub.yields(null, applicationList);
			const appDesc = (await describeApplication(
				'testnet',
			)) as PM2ProcessInstance;

			expect(pm2.connect).to.be.calledOnce;
			expect(pm2.describe).to.be.calledOnce;
			return expect(appDesc.name).to.deep.equal('testnet');
		});

		it('should return undefined when the application does not exists', async () => {
			describeStub.yields('process does not exists', null);
			const instance = await describeApplication('testnet');

			return expect(instance).to.equal(undefined);
		});
	});
});
