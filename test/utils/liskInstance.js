import lisk from 'lisk-js';
import liskInstance from '../../src/utils/liskInstance';

describe('liskInstance', () => {
	it('should be ok', () => {
		(liskInstance).should.be.ok();
	});

	it('should be an instance of lisk api', () => {
		(liskInstance).should.be.instanceOf(lisk.api);
	});
});
