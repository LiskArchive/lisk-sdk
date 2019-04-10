import { expect } from 'chai';
import {
	registerApplication,
	unRegisterApplication,
	restartApplication,
	stopApplication,
	listApplication,
	describeApplication,
} from '../../../src/utils/node/pm2';
import { NETWORK } from '../../../dist/utils/constants';
import pm2 from 'pm2';

describe('pm2 node utils', () => {
	describe('#registerApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'start').yields(null, 'started');
			sandbox.stub(pm2, 'stop').yields(null, 'stopped');
		});

		it('should register application', async () => {
			await registerApplication('dummy/path', NETWORK.MAINNET, 'test');
			expect(pm2.connect).to.be.calledOnce;
			expect(pm2.start).to.be.calledOnce;
			return expect(pm2.stop).to.be.calledOnce;
		})
	});

	describe('#unRegisterApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'delete').yields(null, 'process deleted');
		});

		it('should un register application', async () => {
			await unRegisterApplication('test');
			expect(pm2.delete).to.be.calledOnce;
			return expect(pm2.connect).to.be.calledOnce;
		})
	});

	describe('#restartApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'restart').yields(null, 'process restart');
		});

		it('should restart application', async () => {
			await restartApplication('test');
			expect(pm2.restart).to.be.calledOnce;
			return expect(pm2.connect).to.be.calledOnce;
		})
	});

	describe('#stopApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'stop').yields(null, 'process stopped');
		});

		it('should stop application', async () => {
			await stopApplication('test');
			expect(pm2.stop).to.be.calledOnce;
			return expect(pm2.connect).to.be.calledOnce;
		})
	});

	describe('#listApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'list').yields(null, 'list');
		});

		it('should list application', async () => {
			await listApplication();
			expect(pm2.connect).to.be.calledOnce;
			return expect(pm2.list).to.be.calledOnce;
		})
	});

	describe('#describeApplication', () => {
		beforeEach(() => {
			sandbox.stub(pm2, 'connect').yields(null, 'connected');
			sandbox.stub(pm2, 'describe').yields(null, [{ 'name': 'test' }]);
		});

		it('should describe application', async () => {
			await describeApplication('test');
			expect(pm2.connect).to.be.calledOnce;
			return expect(pm2.describe).to.be.calledOnce;
		})
	});
});
