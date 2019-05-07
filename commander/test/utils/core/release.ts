import * as axios from 'axios';
import { expect } from 'chai';
import {
	getLatestVersion,
	getReleaseInfo,
} from '../../../src/utils/core/release';
import { NETWORK } from '../../../src/utils/constants';

describe('release core utils', () => {
	const data = '2.0.0';
	beforeEach(() => {
		sandbox.stub(axios.default, 'get').resolves({ data });
	});

	describe('#getLatestVersion', () => {
		it('should get latest version', async () => {
			const version = await getLatestVersion('dummyurl');
			return expect(version).to.equal(data);
		});
	});

	describe('#getReleaseInfo', () => {
		it('should get release information for default url', async () => {
			const releaseInfo = await getReleaseInfo(
				'https://downloads.lisk.io/lisk',
				NETWORK.MAINNET,
				'2.0.0',
			);
			expect(releaseInfo).to.have.keys([
				'version',
				'liskTarUrl',
				'liskTarSHA256Url',
			]);
			return expect(releaseInfo.version).to.equal(data);
		});

		it('should get release information from custom url', async () => {
			const releaseInfo = await getReleaseInfo(
				'https://downloads.lisk.io/lisk/testnet/1.6.0-rc.4/lisk-1.6.0-rc.4-Darwin-x86_64.tar.gz',
			);
			expect(releaseInfo).to.have.keys([
				'version',
				'liskTarUrl',
				'liskTarSHA256Url',
			]);
			return expect(releaseInfo.version).to.equal('1.6.0-rc.4');
		});
	});
});
