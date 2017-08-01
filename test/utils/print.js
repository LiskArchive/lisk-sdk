import {
	getTableString,
	printResult,
} from '../../src/utils/print';

describe('print utils', () => {
	describe('#getTableString', () => {
		it('should return a string', () => {
			const obj = { lisk: 'JS' };
			const result = getTableString(obj);

			(result).should.be.ok();
			(result).should.be.type('string');
		});
	});

	describe('#printResult', () => {
		const vorpal = {
			log: () => {},
		};
		let stub;

		beforeEach(() => {
			stub = sinon.stub(vorpal, 'log');
		});

		afterEach(() => {
			stub.restore();
		});

		it('should log results', () => {
			const result = { lisk: 'JS' };
			const printFn = a => a + a;

			printResult(printFn, vorpal, 'lisk', result);

			(stub.calledWithExactly('JSJS')).should.be.true();
		});

		it('should log error messages', () => {
			const result = { error: 'oh no' };
			const printFn = a => `${a.error} 123`;

			printResult(printFn, vorpal, null, result);

			(stub.calledWithExactly('oh no 123')).should.be.true();
		});
	});
});
