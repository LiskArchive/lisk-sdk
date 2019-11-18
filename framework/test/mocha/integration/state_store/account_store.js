const localCommon = require('../common');
const AccountStore = require('../../../../src/modules/chain/blocks/state_store/account_store.js');

describe('system test - account store', () => {
	let library;
	let accountStore;
	const persistedAddresses = ['1085993630748340485L', '11237980039345381032L'];
	const secondPublicKey =
		'edf5786bef965f1836b8009e2c566463d62b6edd94e9cced49c1f098c972b92b';
	const secondSignature = true;

	const accountQuery = [
		{
			address: persistedAddresses[0],
		},
		{
			address: persistedAddresses[1],
		},
	];

	localCommon.beforeBlock('account_state_store', lib => {
		library = lib;
	});

	beforeEach(async () => {
		accountStore = new AccountStore(
			library.components.storage.entities.Account,
			{},
		);
	});

	describe('cache', () => {
		it('should fetch account from the database', async () => {
			const results = await accountStore.cache(accountQuery);
			expect(results).to.have.length(2);
			expect(results.map(account => account.address)).to.eql(
				persistedAddresses,
			);
		});

		it('should set the cache property for account store', async () => {
			await accountStore.cache(accountQuery);
			expect(accountStore.data.map(account => account.address)).to.eql(
				persistedAddresses,
			);
		});
	});

	describe('get', () => {
		beforeEach(async () => {
			await accountStore.cache(accountQuery);
		});

		it('should cache the account from after prepare is called', async () => {
			const account = accountStore.get(persistedAddresses[1]);
			expect(account.address).to.equal(persistedAddresses[1]);
		});

		it('should throw if account does not exist', async () => {
			expect(
				accountStore.get.bind(
					accountStore,
					persistedAddresses[1].replace('0', '1'),
				),
			).to.throw();
		});
	});

	describe('getOrDefault', () => {
		beforeEach(async () => {
			await accountStore.cache(accountQuery);
		});

		it('should cache the account from after prepare is called', async () => {
			const account = accountStore.getOrDefault(persistedAddresses[1]);
			expect(account.address).to.equal(persistedAddresses[1]);
		});

		it('should return default account if it does not exist', async () => {
			const account = accountStore.getOrDefault(
				persistedAddresses[1].replace('0', '1'),
			);
			expect(account).to.exist;
		});
	});

	describe('set', () => {
		beforeEach(async () => {
			await accountStore.cache(accountQuery);
		});

		it('should set the updated values for the account', async () => {
			const updatedAccount = accountStore.get(accountQuery[0].address);

			updatedAccount.secondPublicKey = secondPublicKey;
			updatedAccount.secondSignature = secondSignature;

			accountStore.set(accountQuery[0].address, updatedAccount);
			expect(accountStore.get(accountQuery[0].address)).to.deep.equal(
				updatedAccount,
			);
		});

		it('should update the updateKeys property', async () => {
			const updatedKeys = ['secondPublicKey', 'secondSignature'];
			const updatedAccount = accountStore.get(accountQuery[0].address);

			updatedAccount.secondPublicKey = secondPublicKey;
			updatedAccount.secondSignature = secondSignature;

			accountStore.set(accountQuery[0].address, updatedAccount);

			expect(accountStore.updatedKeys[0]).to.deep.equal(updatedKeys);
		});
	});

	describe('finalize', () => {
		let updatedAccount;

		beforeEach(async () => {
			await accountStore.cache(accountQuery);

			updatedAccount = accountStore.get(accountQuery[0].address);

			updatedAccount.secondPublicKey = secondPublicKey;
			updatedAccount.secondSignature = secondSignature;

			accountStore.set(updatedAccount.address, updatedAccount);
		});

		it('should save the account state in the database', async () => {
			await accountStore.finalize();

			const newAccountStore = new AccountStore(
				library.components.storage.entities.Account,
			);

			await newAccountStore.cache(accountQuery);

			const newResult = newAccountStore.get(updatedAccount.address);

			expect(newResult).to.deep.equal(updatedAccount);
		});
	});
});
