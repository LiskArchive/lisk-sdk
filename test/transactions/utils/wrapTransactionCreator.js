import wrapTransactionCreator from '../../../src/transactions/utils/wrapTransactionCreator';

const prepareTransaction = require('../../../src/transactions/utils/prepareTransaction');

describe('#wrapTransactionCreator', () => {
	const defaultPassphrase = 'secret';
	const defaultSenderPublicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultSecondPassphrase = 'second secret';

	let defaultTransaction;
	let transactionCreator;
	let prepareTransactionStub;
	let wrappedTransactionCreator;
	let result;

	beforeEach(() => {
		defaultTransaction = {};
		transactionCreator = () => defaultTransaction;
		prepareTransactionStub = sandbox
			.stub(prepareTransaction, 'default')
			.returnsArg(0);
		wrappedTransactionCreator = wrapTransactionCreator(transactionCreator);
	});

	it('should return a function', () => {
		return wrappedTransactionCreator.should.have.type('function');
	});

	describe('when an unsigned transaction is created with no passphrase', () => {
		beforeEach(() => {
			result = wrappedTransactionCreator({ unsigned: true });
		});

		it('should set a default amount of 0', () => {
			return result.should.have.property('amount').equal('0');
		});
		it('should set a default recipientId of null', () => {
			return result.should.have.property('recipientId').be.null();
		});
		it('should set a default senderPublicKey of null', () => {
			return result.should.have.property('senderPublicKey').be.null();
		});
		it('should set a timestamp', () => {
			return result.should.have.property('timestamp').have.type('number');
		});
		it('should not prepare the transaction', () => {
			return prepareTransactionStub.should.not.have.been.called();
		});
	});

	describe('when the transaction creator sets an amount and recipientId', () => {
		const defaultAmount = '100000000';
		const defaultRecipientId = 'abcd1234';

		beforeEach(() => {
			transactionCreator = () => ({
				amount: defaultAmount,
				recipientId: defaultRecipientId,
			});
			wrappedTransactionCreator = wrapTransactionCreator(transactionCreator);
			result = wrappedTransactionCreator({ unsigned: true });
		});

		it('should have the amount', () => {
			return result.should.have.property('amount').equal(defaultAmount);
		});

		it('should have the recipientId', () => {
			return result.should.have
				.property('recipientId')
				.equal(defaultRecipientId);
		});
	});

	describe('when a passphrase is provided', () => {
		beforeEach(() => {
			result = wrappedTransactionCreator({ passphrase: defaultPassphrase });
		});

		it('should set a default amount of 0', () => {
			return result.should.have.property('amount').equal('0');
		});
		it('should set a default recipientId of null', () => {
			return result.should.have.property('recipientId').be.null();
		});
		it('should set a default senderPublicKey using the passphrase', () => {
			return result.should.have
				.property('senderPublicKey')
				.equal(defaultSenderPublicKey);
		});
		it('should set a timestamp', () => {
			return result.should.have.property('timestamp').have.type('number');
		});
		it('should prepare the transaction with the passphrase', () => {
			return prepareTransactionStub.args[0][1].should.equal(defaultPassphrase);
		});
	});

	describe('when a passphrase and second passphrase are provided', () => {
		beforeEach(() => {
			result = wrappedTransactionCreator({
				passphrase: defaultPassphrase,
				secondPassphrase: defaultSecondPassphrase,
			});
		});

		it('should set a default amount of 0', () => {
			return result.should.have.property('amount').equal('0');
		});
		it('should set a default recipientId of null', () => {
			return result.should.have.property('recipientId').be.null();
		});
		it('should set a default senderPublicKey using the passphrase', () => {
			return result.should.have
				.property('senderPublicKey')
				.equal(defaultSenderPublicKey);
		});
		it('should set a timestamp', () => {
			return result.should.have.property('timestamp').have.type('number');
		});
		it('should prepare the transaction with the passphrase and the second passphrase', () => {
			return prepareTransactionStub.args[0]
				.slice(1)
				.should.eql([defaultPassphrase, defaultSecondPassphrase]);
		});
	});
});
