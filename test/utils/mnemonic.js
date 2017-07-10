if (typeof module !== 'undefined' && module.exports) {
	var common = require('../common');
	var lisk = common.lisk;
}

describe('utils/mnemonic.js', function () {

	var mnemonic = lisk.mnemonic;

	it('should be ok', function () {
		(mnemonic).should.be.ok();
	});

	it('should be object', function () {
		(mnemonic).should.be.type('object');
	});

	describe('#generate mnemonic.js', function () {

		it('should generate string of 12 random words', function () {
			var phrase = mnemonic.generate();
			(phrase.split(' ').length).should.be.equal(12);
		});

		it('should be random', function() {
			var phrase1 = mnemonic.generate();
			var phrase2 = mnemonic.generate();
			(phrase1 === phrase2).should.be.false();
		});
	});

	describe('#isValid mnemonic.js', function () {

		it('should return true for valid mnemonic', function () {
			var phrase = 'puzzle theory install poverty acquire nothing omit appear lecture walk direct silent';
			var result = mnemonic.isValid(phrase);
			(result).should.be.true();
		});

		it('should return false for invalid mnemonic', function () {
			var shortPhrase = 'theory install poverty acquire nothing omit appear lecture walk direct silent';
			var phraseWithTypo = 'puSSle theory install poverty acquire nothing omit appear lecture walk direct silent';
			var test1 = mnemonic.isValid(shortPhrase);
			var test2 = mnemonic.isValid(phraseWithTypo);
			(test1).should.be.false();
			(test2).should.be.false();
		});
	});
});
