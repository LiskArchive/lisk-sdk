import { expect } from 'chai';
import fs from 'fs';
import * as axios from 'axios';
import * as downloadUtil from '../../src/utils/download';
import * as workerProcess from '../../src/utils/worker-process';

describe('download utils', () => {
	let execStub: any = null;
	beforeEach(() => {
		execStub = sandbox.stub(workerProcess, 'exec');
	});

	describe('#download', () => {
		let existsSyncStub: any = null;

		beforeEach(() => {
			sandbox.stub(axios, 'default');
			existsSyncStub = sandbox.stub(fs, 'existsSync');
		});

		it('should return true if downloaded file already exists', () => {
			existsSyncStub.returns(true);

			return expect(downloadUtil.download('url', 'file/path')).returned;
		});
	});

	describe('#validateChecksum', () => {
		it('should throw an error when it fails to validate checksum', () => {
			execStub.resolves({ stdout: 'error', stderr: 'invalid checksum' });
			return expect(
				downloadUtil.validateChecksum('file/path', 'test.gz'),
			).to.rejectedWith(
				'Checksum validation failed with error: invalid checksum',
			);
		});

		it('should successfully validate checksum', () => {
			execStub.resolves({ stdout: 'OK' });
			return expect(downloadUtil.validateChecksum('file/path', 'test.gz')).to
				.not.throw;
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
			await downloadUtil.downloadLiskAndValidate(
				'output/dir',
				'release/url',
				'release/url/sha256',
				'2.0.0',
			);
			expect(downloadUtil.download).to.be.calledTwice;
			return expect(downloadUtil.validateChecksum).to.be.calledOnce;
		});
	});
});
