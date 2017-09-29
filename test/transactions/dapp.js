/*
 * Copyright © 2017 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import createDapp from '../../src/transactions/dapp';
import cryptoModule from '../../src/crypto';
import slots from '../../src/time/slots';

afterEach(() => sandbox.restore());

describe('#createDapp', () => {
	const secret = 'secret';
	const secondSecret = 'second secret';
	const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const secondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const defaultOptions = {
		category: 0,
		name: 'Lisk Guestbook',
		description: 'The official Lisk guestbook',
		tags: 'guestbook message sidechain',
		type: 0,
		link: 'https://github.com/MaxKK/guestbookDapp/archive/master.zip',
		icon: 'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png',
	};
	const fee = 25e8;
	const timeWithOffset = 38350076;
	const noOptionsError = 'Options must be an object.';
	const categoryIntegerError = 'Dapp category must be an integer.';
	const nameStringError = 'Dapp name must be a string.';
	const typeIntegerError = 'Dapp type must be an integer.';
	const linkStringError = 'Dapp link must be a string.';

	let getTimeWithOffsetStub;
	let options;
	let dappTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
		options = Object.assign({}, defaultOptions);
	});

	describe('without second secret', () => {
		beforeEach(() => {
			dappTransaction = createDapp(secret, null, options);
		});

		it('should create a dapp transaction', () => {
			(dappTransaction).should.be.ok();
		});

		it('should throw an error if no options are provided', () => {
			(createDapp.bind(null, secret)).should.throw(noOptionsError);
		});

		it('should throw an error if no category is provided', () => {
			delete options.category;
			(createDapp.bind(null, secret, null, options)).should.throw(categoryIntegerError);
		});

		it('should throw an error if provided category is not an integer', () => {
			options.category = 'not an integer';
			(createDapp.bind(null, secret, null, options)).should.throw(categoryIntegerError);
		});

		it('should throw an error if no name is provided', () => {
			delete options.name;
			(createDapp.bind(null, secret, null, options)).should.throw(nameStringError);
		});

		it('should throw an error if provided name is not a string', () => {
			options.name = 123;
			(createDapp.bind(null, secret, null, options)).should.throw(nameStringError);
		});

		it('should throw an error if no type is provided', () => {
			delete options.type;
			(createDapp.bind(null, secret, null, options)).should.throw(typeIntegerError);
		});

		it('should throw an error if provided type is not an integer', () => {
			options.type = 'not an integer';
			(createDapp.bind(null, secret, null, options)).should.throw(typeIntegerError);
		});

		it('should throw an error if no link is provided', () => {
			delete options.link;
			(createDapp.bind(null, secret, null, options)).should.throw(linkStringError);
		});

		it('should throw an error if provided link is not a string', () => {
			options.link = 123;
			(createDapp.bind(null, secret, null, options)).should.throw(linkStringError);
		});

		it('should not require description, tags, or icon', () => {
			['description', 'tags', 'icon'].forEach(key => delete options[key]);
			(createDapp.bind(null, secret, null, options)).should.not.throw();
		});

		it('should use slots.getTimeWithOffset to calculate the timestamp', () => {
			(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
		});

		it('should use slots.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			createDapp(secret, null, options, offset);

			(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
		});

		describe('returned dapp transaction', () => {
			it('should be an object', () => {
				(dappTransaction).should.be.type('object');
			});

			it('should have an id string', () => {
				(dappTransaction).should.have.property('id').and.be.type('string');
			});

			it('should have type number equal to 5', () => {
				(dappTransaction).should.have.property('type').and.be.type('number').and.equal(5);
			});

			it('should have amount number equal to 0', () => {
				(dappTransaction).should.have.property('amount').and.be.type('number').and.equal(0);
			});

			it('should have fee number equal to 25 LSK', () => {
				(dappTransaction).should.have.property('fee').and.be.type('number').and.equal(fee);
			});

			it('should have recipientId equal to null', () => {
				(dappTransaction).should.have.property('recipientId').and.be.null();
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				(dappTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(publicKey);
			});

			it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
				(dappTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				(dappTransaction).should.have.property('signature').and.be.hexString();
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verifyTransaction(dappTransaction);
				(result).should.be.ok();
			});

			it('should not be signed correctly if modified', () => {
				dappTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(dappTransaction);
				(result).should.be.not.ok();
			});

			it('should have asset', () => {
				(dappTransaction).should.have.property('asset').and.not.be.empty();
			});

			describe('dapps asset', () => {
				it('should be object', () => {
					(dappTransaction.asset).should.have.property('dapp').and.be.type('object');
				});

				it('should have a category number equal to provided category', () => {
					(dappTransaction.asset.dapp).should.have.property('category').and.be.type('number').and.equal(options.category);
				});

				it('should have a name string equal to provided name', () => {
					(dappTransaction.asset.dapp).should.have.property('name').and.be.type('string').and.equal(options.name);
				});

				it('should have a description string equal to provided description', () => {
					(dappTransaction.asset.dapp).should.have.property('description').and.be.type('string').and.equal(options.description);
				});

				it('should have a tags string equal to provided tags', () => {
					(dappTransaction.asset.dapp).should.have.property('tags').and.be.type('string').and.equal(options.tags);
				});

				it('should have a type number equal to provided type', () => {
					(dappTransaction.asset.dapp).should.have.property('type').and.be.type('number').and.equal(options.type);
				});

				it('should have a link string equal to provided link', () => {
					(dappTransaction.asset.dapp).should.have.property('link').and.be.type('string').and.equal(options.link);
				});

				it('should have an icon string equal to provided icon', () => {
					(dappTransaction.asset.dapp).should.have.property('icon').and.be.type('string').and.equal(options.icon);
				});
			});
		});
	});

	describe('with second secret', () => {
		beforeEach(() => {
			dappTransaction = createDapp(secret, secondSecret, options);
		});

		it('should create a dapp transaction with a second secret', () => {
			const dappTransactionWithoutSecondSecret = createDapp(secret, null, options);
			(dappTransaction).should.be.ok();
			(dappTransaction).should.not.be.equal(dappTransactionWithoutSecondSecret);
		});

		describe('returned dapp transaction', () => {
			it('should have second signature hex string', () => {
				(dappTransaction).should.have.property('signSignature').and.be.hexString();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule.verifyTransaction(dappTransaction, secondPublicKey);
				(result).should.be.ok();
			});

			it('should not be second signed correctly if modified', () => {
				dappTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(dappTransaction, secondPublicKey);
				(result).should.not.be.ok();
			});
		});
	});
});
