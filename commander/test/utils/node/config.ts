import fs from 'fs';
import { expect } from 'chai';
import {
	defaultInstallationPath,
	isCacheEnabled,
	getCacheConfig,
	getDbConfig,
	getDefaultConfig,
	getNetworkConfig,
	getConfig,
} from '../../../src/utils/node/config';
import { NETWORK } from '../../../src/utils/constants';
import * as nodeConfig from '../../../src/utils/node/config';

describe('config node utils', () => {
	describe('#isCacheEnabled', () => {
		let getNetworkConfigStub: any = null;
		let getDefaultConfigStub: any = null;
		beforeEach(() => {
			getNetworkConfigStub = sandbox.stub(nodeConfig, 'getNetworkConfig');
			getDefaultConfigStub = sandbox.stub(nodeConfig, 'getDefaultConfig');
		});

		it('should return network cache config', () => {
			getNetworkConfigStub.returns({ cacheEnabled: true });
			getDefaultConfigStub.returns({ cacheEnabled: true });

			const isEnabled = isCacheEnabled(
				defaultInstallationPath,
				NETWORK.MAINNET,
			);
			return expect(isEnabled).to.be.true;
		});

		it('should return default cache config when network config is undefined', () => {
			getNetworkConfigStub.returns({ cacheEnabled: null });
			getDefaultConfigStub.returns({ cacheEnabled: true });

			const isEnabled = isCacheEnabled(
				defaultInstallationPath,
				NETWORK.MAINNET,
			);
			return expect(isEnabled).to.be.true;
		});
	});

	describe('#getCacheConfig', () => {
		let getNetworkConfigStub: any = null;
		let getDefaultConfigStub: any = null;
		beforeEach(() => {
			getNetworkConfigStub = sandbox.stub(nodeConfig, 'getNetworkConfig');
			getDefaultConfigStub = sandbox.stub(nodeConfig, 'getDefaultConfig');
		});

		it('should return cache config', () => {
			const networkConfig = { redis: { cacheEnabled: true } };
			const defaultConfig = {};
			getNetworkConfigStub.returns(networkConfig);
			getDefaultConfigStub.returns(defaultConfig);

			const cacheConfig = getCacheConfig(
				defaultInstallationPath,
				NETWORK.MAINNET,
			);
			return expect(cacheConfig).to.deep.equal(networkConfig.redis);
		});
	});

	describe('#getDbConfig', () => {
		let getNetworkConfigStub: any = null;
		let getDefaultConfigStub: any = null;
		beforeEach(() => {
			getNetworkConfigStub = sandbox.stub(nodeConfig, 'getNetworkConfig');
			getDefaultConfigStub = sandbox.stub(nodeConfig, 'getDefaultConfig');
		});

		it('should return database config', () => {
			const networkConfig = { db: { database: 'lisk' } };
			const defaultConfig = {};
			getNetworkConfigStub.returns(networkConfig);
			getDefaultConfigStub.returns(defaultConfig);

			const dbConfig = getDbConfig(defaultInstallationPath, NETWORK.MAINNET);
			return expect(dbConfig).to.deep.equal(networkConfig.db);
		});
	});

	describe('#getDefaultConfig', () => {
		const appConfig = { db: { database: 'lisk' } };
		beforeEach(() => {
			sandbox.stub(nodeConfig, 'getConfig').returns(appConfig);
		});

		it('should return default app config', () => {
			return expect(getDefaultConfig(defaultInstallationPath)).to.deep.equal(
				appConfig,
			);
		});
	});

	describe('#getNetworkConfig', () => {
		const appConfig = { db: { database: 'lisk' } };
		beforeEach(() => {
			sandbox.stub(nodeConfig, 'getConfig').returns(appConfig);
		});

		it('should return network app config', () => {
			return expect(
				getNetworkConfig(defaultInstallationPath, NETWORK.MAINNET),
			).to.deep.equal(appConfig);
		});
	});

	describe('#getConfig', () => {
		const appConfigObject = {
			database: 'lisk',
			version: 1,
		};
		const appConfigContents = '{\n\t"database": "lisk",\n\t"version": 1\n}';

		beforeEach(() => {
			sandbox.stub(fs, 'existsSync').returns(true);
			sandbox.stub(fs, 'readFileSync').returns(appConfigContents);
			sandbox.stub(JSON, 'parse').returns(appConfigObject);
		});

		it('should return network app config', () => {
			expect(getConfig(defaultInstallationPath)).to.deep.equal(appConfigObject);
			return expect(fs.readFileSync).to.be.calledWithExactly(
				defaultInstallationPath,
				'utf8',
			);
		});
	});
});
