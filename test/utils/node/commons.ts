import { expect } from 'chai';
import * as fsExtra from 'fs-extra';
import * as os from 'os';
import {
	liskInstall,
	installDirectory,
	liskVersion,
	liskTar,
	liskTarSHA256,
	liskLatestUrl,
	liskSnapshotUrl,
	liskDbSnapshot,
	logsDir,
	validateNotARootUser,
	isSupportedOS,
	validateNetwork,
	createDirectory,
	validURL,
	getVersionToUpgrade,
	backupLisk,
	upgradeLisk,
	validateVersion,
} from '../../../src/utils/node/commons';
import { NETWORK } from '../../../dist/utils/constants';
import { defaultInstallationPath } from '../../../dist/utils/node/config';
import * as release from '../../../src/utils/node/release';
import * as workerProcess from '../../../src/utils/worker-process';

describe('commons node utils', () => {
	describe('#liskInstall', () => {
		it('should return resolved home directory', () => {
			return expect(liskInstall('~/.lisk')).to.equal(`${os.homedir}/.lisk`);
		});
	});

	describe('#installDirectory', () => {
		it('should return resolved installation directory', () => {
			return expect(installDirectory('~/.lisk', 'test')).to.equal(
				`${os.homedir}/.lisk/test`,
			);
		});
	});

	describe('#liskVersion', () => {
		it('should return lisk version', () => {
			const version = '1.0.0';
			return expect(liskVersion(version)).to.equal(
				`lisk-${version}-${os.type()}-x86_64`,
			);
		});
	});

	describe('#liskTar', () => {
		it('should return lisk tar', () => {
			const version = '1.0.0';
			return expect(liskTar(version)).to.equal(
				`lisk-${version}-${os.type()}-x86_64.tar.gz`,
			);
		});
	});

	describe('#liskTarSHA256', () => {
		it('should return lisk tar gz', () => {
			const version = '1.0.0';
			return expect(liskTarSHA256(version)).to.equal(
				`lisk-${version}-${os.type()}-x86_64.tar.gz.SHA256`,
			);
		});
	});

	describe('#liskLatestUrl', () => {
		it('should return lisk latest url', () => {
			const url: string = 'https://downloads.lisk.io/lisk/';
			return expect(liskLatestUrl(url, NETWORK.MAINNET)).to.equal(
				`${url}/${NETWORK.MAINNET}/latest.txt`,
			);
		});
	});

	describe('#liskSnapshotUrl', () => {
		it('should return lisk latest url', () => {
			const url: string = 'https://downloads.lisk.io/lisk/';
			return expect(liskSnapshotUrl(url, NETWORK.MAINNET)).to.equal(
				`${url}/${NETWORK.MAINNET}/blockchain.db.gz`,
			);
		});
	});

	describe('#liskDbSnapshot', () => {
		it('should return lisk latest url', () => {
			const name: string = 'dummy';
			return expect(liskDbSnapshot(name, NETWORK.MAINNET)).to.equal(
				`${name}-${NETWORK.MAINNET}-blockchain.db.gz`,
			);
		});
	});

	describe('#logsDir', () => {
		it('should return lisk latest url', () => {
			return expect(logsDir(defaultInstallationPath)).to.equal(
				`${liskInstall(defaultInstallationPath)}/logs`,
			);
		});
	});

	describe('#validateNotARootUser', () => {
		it('should not throw error', () => {
			return expect(validateNotARootUser()).to.not.throw;
		});
	});

	describe('#isSupportedOS', () => {
		it('should return true', () => {
			return expect(isSupportedOS()).to.be.true;
		});
	});

	describe('#validateNetwork', () => {
		it('should not throw error for valid network', () => {
			expect(validateNetwork(NETWORK.MAINNET)).to.not.throw;
			expect(validateNetwork(NETWORK.TESTNET)).to.not.throw;
			return expect(validateNetwork(NETWORK.BETANET)).to.not.throw;
		});
	});

	describe('#createDirectory', () => {
		let pathExistsSyncStub: any = null;
		let ensureDirSync: any = null;
		beforeEach(() => {
			pathExistsSyncStub = sandbox.stub(fsExtra, 'pathExistsSync');
			ensureDirSync = sandbox.stub(fsExtra, 'ensureDirSync');
		});

		it('should return if the directory exists', () => {
			pathExistsSyncStub.returns(true);
			return expect(createDirectory(defaultInstallationPath)).to.not.throw;
		});

		it('should create directory if it does not exists', () => {
			pathExistsSyncStub.returns(false);
			ensureDirSync.returns();
			return expect(createDirectory(defaultInstallationPath)).to.not.throw;
		});
	});

	describe('#validURL', () => {
		it('should throw error if url is invalid', () => {
			try {
				return validURL('dummy://download.lisk.io');
			} catch (error) {
				return expect(error.message).to.equal(
					'Invalid URL: dummy://download.lisk.io',
				);
			}
		});

		it('should not throw error if url is valid', () => {
			return expect(validURL(`https://downloads.lisk.io/lisk/`)).to.not.throw;
		});
	});

	describe('#getVersionToUpgrade', () => {
		beforeEach(() => {
			sandbox.stub(release, 'getLatestVersion').resolves('2.0.0');
		});

		it('should return version if specified', async () => {
			const version = '2.0.0';
			const result = await getVersionToUpgrade(NETWORK.MAINNET, version);
			return expect(result).to.equal(version);
		});

		it('should return latest version if version is not specified', async () => {
			const result = await getVersionToUpgrade(NETWORK.MAINNET);
			return expect(result).to.equal('2.0.0');
		});
	});

	describe('#backupLisk', () => {
		let execStub: any = null;
		beforeEach(() => {
			sandbox.stub(fsExtra, 'emptyDirSync').returns(null);
			execStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should backup the lisk installation', async () => {
			execStub.resolves({ stdout: '', stderr: null });
			return expect(backupLisk(defaultInstallationPath)).to.not.throw;
		});

		it('should throw error of failed to backup', async () => {
			execStub.resolves({ stdout: null, stderr: 'failed to move' });
			return expect(backupLisk(defaultInstallationPath)).rejectedWith(
				'failed to move',
			);
		});
	});

	describe.skip('#upgradeLisk', () => {
		let execStub: any = null;
		beforeEach(() => {
			sandbox.stub(fsExtra, 'mkdirSync').returns(null);
			sandbox.stub(fsExtra, 'emptyDirSync').returns(null);
			execStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should throw error if failed to upgrade', async () => {
			execStub.resolves({ stdout: '', stderr: 'failed to copy' });
			try {
				return await upgradeLisk(
					defaultInstallationPath,
					'test',
					NETWORK.MAINNET,
					'1.0.0',
				);
			} catch (error) {
				return expect(error.message).to.equal('failed to copy');
			}
		});

		it('should throw error of failed to backup', async () => {
			execStub.resolves({ stdout: '', stderr: null });
			return expect(
				upgradeLisk(defaultInstallationPath, 'test', NETWORK.MAINNET, '1.0.0'),
			).to.not.throw;
		});
	});

	describe('#validateVersion', () => {
		let releaseStub: any = null;
		beforeEach(() => {
			releaseStub = sandbox.stub(release, 'getLatestVersion');
		});

		it('should throw if version is invalid', async () => {
			const invalidVersion = 'rc.1.0.0';
			return expect(
				validateVersion(NETWORK.MAINNET, invalidVersion),
			).to.rejectedWith(
				`Upgrade version: ${invalidVersion} has invalid format, Please refer version from release url: https://downloads.lisk.io/lisk/mainnet`,
			);
		});

		it('should throw if the requested version does not exists', async () => {
			releaseStub.rejects();
			const invalidVersion = '9.9.9';
			return expect(
				validateVersion(NETWORK.MAINNET, invalidVersion),
			).to.rejectedWith();
		});

		it('should successed for valid version', async () => {
			releaseStub.resolves('1.0.0');
			return expect(validateVersion(NETWORK.MAINNET, '1.0.0')).to.not.throw;
		});
	});
});
