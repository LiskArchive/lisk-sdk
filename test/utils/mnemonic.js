import mnemonic from '../../src/utils/mnemonic';

describe('utils/mnemonic.js', () => {
	it('should be ok', () => {
		(mnemonic).should.be.ok();
	});

	it('should be object', () => {
		(mnemonic).should.be.type('object');
	});

	describe('#generate mnemonic.js', () => {
		it('should generate string of 12 random words', () => {
			const phrase = mnemonic.generate();
			(phrase.split(' ').length).should.be.equal(12);
		});

		it('should be random', () => {
			const phrase1 = mnemonic.generate();
			const phrase2 = mnemonic.generate();
			(phrase1 === phrase2).should.be.false();
		});
	});

	describe('#isValid mnemonic.js', () => {
		it('should return true for valid mnemonic', () => {
			const phrase = 'puzzle theory install poverty acquire nothing omit appear lecture walk direct silent';
			const result = mnemonic.isValid(phrase);
			(result).should.be.true();
		});

		it('should return false for invalid mnemonic', () => {
			const shortPhrase = 'theory install poverty acquire nothing omit appear lecture walk direct silent';
			const phraseWithTypo = 'puSSle theory install poverty acquire nothing omit appear lecture walk direct silent';
			const test1 = mnemonic.isValid(shortPhrase);
			const test2 = mnemonic.isValid(phraseWithTypo);
			(test1).should.be.false();
			(test2).should.be.false();
		});
	});
});
