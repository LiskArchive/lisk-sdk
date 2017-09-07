import utils from '../../src/transactions/utils';

describe('transactions utils module', () => {
	describe('exports', () => {
		it('should be an object', () => {
			(utils).should.be.type('object');
		});

		it('should export prepareTransaction function', () => {
			(utils).should.have.property('prepareTransaction').and.be.type('function');
		});
	});

	describe('#prepareTransaction', () => {
		const { prepareTransaction } = utils;
		const secret = 'secret';
		const keys = {
			privateKey: '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
			publicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		};
		const signature = 'a00835fe0ad89d8b8a26cc3ffa8238d89bd38999f39d712fe8745707c8e18ea70337a7dfde725fddaa858dd64843170de3e481f54438b8aad734b0e75bbad706';
		const secondSecret = 'second secret';
		const secondSignature = '08ce78b2382c396596cc38ea8b9dbc2df62f0d919ddc817070902eeaf1b93ca17ced0766bb4e10f565ae9e55f673691d966dea45e60922fd2685556b441ffb0e';
		const id = '8330167589806376997';
		const defaultTransaction = {
			type: 0,
			amount: 10e8,
			timestamp: 10,
			senderPublicKey: keys.publicKey,
			asset: {},
		};
		let inputTransaction;
		let preparedTransaction;

		beforeEach(() => {
			inputTransaction = Object.assign({}, defaultTransaction);
		});

		describe('without second signature', () => {
			beforeEach(() => {
				preparedTransaction = prepareTransaction(inputTransaction, secret);
			});

			it('should not mutate the original transaction', () => {
				(inputTransaction).should.eql(defaultTransaction);
			});

			it('should add a signature to a transaction', () => {
				(preparedTransaction).should.have.property('signature').and.be.hexString().and.equal(signature);
			});

			it('should add an id to a transaction', () => {
				(preparedTransaction).should.have.property('id').and.match(/^[0-9]+$/).and.equal(id);
			});
		});

		describe('with second signature', () => {
			beforeEach(() => {
				preparedTransaction = prepareTransaction(inputTransaction, secret, secondSecret);
			});

			it('should not mutate the original transaction', () => {
				(inputTransaction).should.eql(defaultTransaction);
			});

			it('should add a second signature to a transaction if a second secret is provided', () => {
				(preparedTransaction).should.have.property('signSignature').and.be.hexString().and.equal(secondSignature);
			});

			it('should not add a second signature to a type 1 transaction', () => {
				inputTransaction = Object.assign({}, defaultTransaction, {
					type: 1,
					asset: {
						signature: {
							publicKey: keys.publicKey,
						},
					},
				});
				preparedTransaction = prepareTransaction(inputTransaction, secret, secondSecret);
				(preparedTransaction).should.not.have.property('signSignature');
			});
		});
	});
});
