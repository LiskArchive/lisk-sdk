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
			sandbox.stub(axios);
			existsSyncStub = sandbox.stub(fs, 'existsSync');
			sandbox.stub(fs, 'createWriteStream').returns(Buffer.alloc(1));
		});

		it('should return true if downloaded file already exists', () => {
			existsSyncStub.returns(true);

			return expect(downloadUtil.download('url', 'file/path')).returned;
		});

		it.skip('should get latest version', async () => {
			existsSyncStub.returns(false);

			await downloadUtil.download(
				'http://download/lisk/version.txt',
				'file/path',
			);
			return expect(axios.default).to.be.calledOnce;
		});
	});

	describe('#validateChecksum', () => {
		it('should throw an error when it fails to validate checksum', () => {
			execStub.resolves({ stdout: 'error', stderr: 'invalid checksum' });
			return expect(
				downloadUtil.validateChecksum('file/path', 'test.gz'),
			).to.rejectedWith(
				'Checksum validation failed error with error: invalid checksum',
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
				'2.0.0',
			);
			expect(downloadUtil.download).to.be.calledTwice;
			return expect(downloadUtil.validateChecksum).to.be.calledOnce;
		});
	});
});
