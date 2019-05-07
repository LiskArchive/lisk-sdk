import { expect } from 'chai';
import fs from 'fs-extra';
import * as axios from 'axios';
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

	describe('#validateChecksum', () => {
		it('should throw an error when it fails to validate checksum', () => {
			execStub.resolves({ stdout: 'error', stderr: 'invalid checksum' });
			return expect(downloadUtil.validateChecksum(url, outDir)).to.rejectedWith(
				'Checksum validation failed with error: invalid checksum',
			);
		});

		it('should successfully validate checksum', () => {
			execStub.resolves({ stdout: 'OK' });
			return expect(downloadUtil.validateChecksum(url, outDir)).to.not.throw;
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
		beforeEach(() => {
			sandbox.stub(downloadUtil, 'download');
			sandbox.stub(downloadUtil, 'validateChecksum');
		});

		it('should download lisk and validate release', async () => {
			await downloadUtil.downloadAndValidate(url, outDir);
			expect(downloadUtil.download).to.be.calledTwice;
			return expect(downloadUtil.validateChecksum).to.be.calledOnce;
		});
	});
});
