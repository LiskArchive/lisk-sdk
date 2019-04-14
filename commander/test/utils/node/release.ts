import * as axios from 'axios';
import { expect } from 'chai';
import {
	getLatestVersion,
	getReleaseInfo,
} from '../../../src/utils/node/release';
import { NETWORK } from '../../../src/utils/constants';

describe('release node utils', () => {
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
		it('should get latest version', async () => {
			const releaseInfo = await getReleaseInfo(
				'latestUrl',
				'releaseUrl',
				NETWORK.MAINNET,
			);
			expect(releaseInfo).to.have.keys([
				'version',
				'liskTarUrl',
				'liskTarSHA256Url',
			]);
			return expect(releaseInfo.version).to.equal(data);
		});
	});
});
