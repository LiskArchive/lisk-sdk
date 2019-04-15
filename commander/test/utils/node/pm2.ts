import { expect } from 'chai';
import {
	registerApplication,
	unRegisterApplication,
	restartApplication,
	stopApplication,
	listApplication,
	describeApplication,
} from '../../../src/utils/node/pm2';
import { NETWORK } from '../../../src/utils/constants';
import pm2 from 'pm2';

const applicationList = [
	{ name: 'testnet', status: 'online' },
	{ name: 'mainnet', status: 'online' },
	{ name: 'betanet', status: 'online' },
];

describe('pm2 node utils', () => {
	describe('#registerApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'start').yields(null, 'started');
			sandbox.stub(pm2, 'stop').yields(null, 'stopped');
		});

		it('should register an application', async () => {
			await registerApplication('dummy/path', NETWORK.MAINNET, 'test');

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
			return expect(appList).to.deep.equal(applicationList);
		});
	});

	describe('#describeApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'describe').yields(null, applicationList);
		});

		it('should return application description', async () => {
			const appDesc = await describeApplication('testnet');

			expect(pm2.connect).to.be.calledOnce;
			expect(pm2.describe).to.be.calledOnce;
			return expect(appDesc).to.deep.equal({
				name: 'testnet',
				status: 'online',
			});
		});
	});
});
