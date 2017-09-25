import fs from 'fs';
import {
	readJsonSync,
	writeJsonSync,
} from '../../src/utils/fs';

describe('fs module', () => {
	const path = '/some/path/to/file.json';
	const stringContents = '{\n\t"foo": "bar",\n\t"n": 5\n}';
	const json = {
		foo: 'bar',
		n: 5,
	};
	const tab = '\t';
	const BOM = '\uFEFF';

	let readFileSyncStub;
	let writeFileSyncStub;
	let JSONParseStub;
	let JSONStringifyStub;
	let result;

	describe('readJsonSync', () => {
		beforeEach(() => {
			readFileSyncStub = sandbox.stub(fs, 'readFileSync').returns(stringContents);
			JSONParseStub = sandbox.stub(JSON, 'parse').returns(json);
			result = readJsonSync(path);
		});

		it('should use fs.readFileSync', () => {
			(readFileSyncStub.calledWithExactly(path, 'utf8')).should.be.true();
		});

		it('should use JSON.parse', () => {
			(JSONParseStub.calledWithExactly(stringContents)).should.be.true();
		});

		it('should strip BOM', () => {
			readFileSyncStub.returns(`${BOM}${stringContents}`);
			result = readJsonSync(path);
			(JSONParseStub.secondCall.calledWithExactly(stringContents)).should.be.true();
		});

		it('should return JSON', () => {
			(result).should.equal(json);
		});
	});

	describe('writeJsonSync', () => {
		beforeEach(() => {
			writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
			JSONStringifyStub = sandbox.stub(JSON, 'stringify').returns(stringContents);
			result = writeJsonSync(path, json);
		});

		it('should use JSON.stringify', () => {
			(JSONStringifyStub.calledWithExactly(json, null, tab)).should.be.true();
		});

		it('should use fs.writeFileSync', () => {
			(writeFileSyncStub.calledWithExactly(path, stringContents)).should.be.true();
		});
	});
});
