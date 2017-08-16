import mnemonic from '../../src/utils/mnemonic';

describe('mnemonic module', () => {
	describe('exports', () => {
		it('should be an object', () => {
			(mnemonic).should.be.type('object');
		});

		it('should export generate function', () => {
			(mnemonic).should.have.property('generate').be.type('function');
		});

		it('should export isValid function', () => {
			(mnemonic).should.have.property('isValid').be.type('function');
		});
	});

	describe('#generate', () => {
		const { generate } = mnemonic;

		it('should generate a string', () => {
			const phrase = generate();

			(phrase).should.be.type('string');
		});

		it('should generate 12 words', () => {
			const words = generate().split(' ');

			(words).should.have.length(12);
			words.forEach(word => (word).should.be.ok());
		});

		it('should not be deterministic', () => {
			const phrase1 = generate();
			const phrase2 = generate();

			(phrase1).should.not.equal(phrase2);
		});
	});

	describe('#isValid', () => {
		const { isValid } = mnemonic;

		it('should return true for a valid mnemonic', () => {
			const phrase = 'puzzle theory install poverty acquire nothing omit appear lecture walk direct silent';
			const result = isValid(phrase);

			(result).should.be.true();
		});

		it('should return false for a mnemonic with capital letters', () => {
			const capsPhrase = 'PUZZLE THEORY INSTALL POVERTY ACQUIRE NOTHING OMIT APPEAR LECTURE WALK DIRECT SILENT';
			const valid = isValid(capsPhrase);

			(valid).should.be.false();
		});

		it('should return false for a mnemonic with too few words', () => {
			const shortPhrase = 'theory install poverty acquire nothing omit appear lecture walk direct silent';
			const valid = isValid(shortPhrase);

			(valid).should.be.false();
		});

		it('should return false for a mnemonic with too many words', () => {
			const longPhrase = 'puzzle theory install poverty acquire nothing omit appear lecture walk direct silent acid';
			const valid = isValid(longPhrase);

			(valid).should.be.false();
		});

		it('should return false for a mnemonic with an invalid word', () => {
			const invalidWord = 'puzzling';
			const invalidWordPhrase = `${invalidWord} puzzling theory install poverty acquire nothing omit appear lecture walk direct silent`;
			const valid = isValid(invalidWordPhrase);

			(valid).should.be.false();
		});

		it('should return false for a mnemonic with an invalid checksum', () => {
			const invalidWordPhrase = 'theory puzzle install poverty acquire nothing omit appear lecture walk direct silent';
			const valid = isValid(invalidWordPhrase);

			(valid).should.be.false();
		});
	});
});
