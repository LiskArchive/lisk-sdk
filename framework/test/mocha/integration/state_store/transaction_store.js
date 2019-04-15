const localCommon = require('../common');
const TransactionStore = require('../../../../src/modules/chain/logic/state_store/transaction_store.js');

describe('system test - transaction store', () => {
	let library;
	let transactionStore;
	const persistedIds = ['1465651642158264047', '3634383815892709956'];

	const transactionQuery = [
		{
			id: persistedIds[0],
		},
		{
			id: persistedIds[1],
		},
	];

	localCommon.beforeBlock('transaction_state_store', lib => {
		library = lib;
	});

	beforeEach(async () => {
		transactionStore = new TransactionStore(
			library.components.storage.entities.Transaction,
			{}
		);
	});

	describe('cache', () => {
		it('should fetch transaction from the database', async () => {
			const results = await transactionStore.cache(transactionQuery);
			expect(results).to.have.length(2);
			expect(results.map(transaction => transaction.id)).to.eql(persistedIds);
		});

		it('should set the cache property for transaction store', async () => {
			await transactionStore.cache(transactionQuery);
			expect(transactionStore.data.map(transaction => transaction.id)).to.eql(
				persistedIds
			);
		});
	});

	describe('get', () => {
		beforeEach(async () => {
			await transactionStore.cache(transactionQuery);
		});

		it('should cache the transaction after prepare is called', async () => {
			const transaction = transactionStore.get(persistedIds[1]);
			expect(transaction.id).to.equal(persistedIds[1]);
		});

		it('should throw if the transaction does not exist', async () => {
			expect(
				transactionStore.get.bind(persistedIds[0].replace('0', '1'))
			).to.throw();
		});
	});

	describe('getOrDefault', () => {
		it('should throw an error', async () => {
			expect(transactionStore.getOrDefault).to.throw();
		});
	});

	describe('set', () => {
		it('should throw an error', async () => {
			expect(transactionStore.set.bind(transactionStore)).to.throw();
		});
	});

	describe('finalize', () => {
		it('should throw an error', async () => {
			expect(transactionStore.finalize).to.throw();
		});
	});
});
