import * as liskCrypto from '@liskhq/lisk-cryptography';
import { expect } from 'chai';
import fs from 'fs-extra';
import * as axios from 'axios';
import * as commons from '../../src/utils/core/commons';
import * as downloadUtil from '../../src/utils/download';
import * as workerProcess from '../../src/utils/worker-process';
import { SinonStub } from 'sinon';

describe('download utils', () => {
	const url =
		'https://downloads.lisk.io/lisk/mainnet/1.6.0/lisk-1.6.0-Darwin-x86_64.tar.gz.SHA256';
	const outDir = '~/.cache/lisk-commander';

	let execStub: SinonStub;
	beforeEach(() => {
		execStub = sandbox.stub(workerProcess, 'exec');
	});

	describe('#download', () => {
		let existsSyncStub: SinonStub;
		let statSyncStub: SinonStub;

		beforeEach(() => {
			sandbox.stub(axios, 'default');
			existsSyncStub = sandbox.stub(fs, 'existsSync');
			statSyncStub = sandbox.stub(fs, 'statSync');
			sandbox.stub(fs, 'unlinkSync').returns();
		});

		it('should return true if downloaded file is less than equal to two days', () => {
			existsSyncStub.returns(true);
			statSyncStub.returns({ birthtime: new Date() });

			return expect(downloadUtil.download(url, outDir)).returned;
		});
	});

	describe('#extract', () => {
		it('should throw an error when it fails to extract', () => {
			execStub.resolves({ stderr: 'invalid filepath' });
			return expect(
				downloadUtil.extract('file/path', 'test.gz', 'output/dir'),
			).to.rejectedWith('Extraction failed with error: invalid filepath');
		});

		it('should successfully extract the file', async () => {
			execStub.resolves({ stdout: 'OK' });

			const result = await downloadUtil.extract(
				'file/path',
				'test.gz',
				'output/dir',
			);
			return expect(result).to.equal('OK');
		});
	});

	describe('#downloadLiskAndValidate', () => {
		let verifyChecksumStub: SinonStub;
		let readFileSyncStub: SinonStub;

		beforeEach(() => {
			sandbox.stub(downloadUtil, 'download');
			sandbox.stub(commons, 'getDownloadedFileInfo').returns({
				fileName: 'lisk-v2.2.0-darwin-x64.tar.gz',
				fileDir: '/home/lisk',
			});
			readFileSyncStub = sandbox.stub(fs, 'readFileSync');
			verifyChecksumStub = sandbox.stub(liskCrypto, 'verifyChecksum');
		});

		it('should download lisk and validate release', async () => {
			readFileSyncStub.onCall(0).returns(new Buffer.from('text123*'));
			readFileSyncStub
				.onCall(1)
				.returns(
					'7607d6792843d6003c12495b54e34517a508d2a8622526aff1884422c5478971 tar filename here',
				);
			verifyChecksumStub.returns(true);

			await downloadUtil.downloadAndValidate(url, outDir);
			expect(downloadUtil.download).to.be.calledTwice;
			expect(commons.getDownloadedFileInfo).to.be.calledOnce;
			return expect(verifyChecksumStub).to.be.calledOnce;
		});

		it('should throw error when validation fails', async () => {
			readFileSyncStub.onCall(0).returns(new Buffer.from('text123*'));
			readFileSyncStub
				.onCall(1)
				.returns(
					'9897d6792843d6003c12495b54e34517a508d2a8622526aff1884422c5478971 tar filename here',
				);
			verifyChecksumStub.returns(false);

			return expect(
				downloadUtil.downloadAndValidate(url, outDir),
			).to.rejectedWith('Checksum did not match');
		});
	});
});
