import words from '../../src/utils/words';

describe('words module', () => {
	it('should export a list of 2048 words', () => {
		(words).should.have.length(2048);
	});

	it('should export a list of strings', () => {
		words.forEach(word => (word).should.be.type('string'));
	});
});
