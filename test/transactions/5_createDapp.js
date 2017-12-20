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
import createDapp from '../../src/transactions/5_createDapp';

const time = require('../../src/transactions/utils/time');

describe('#createDapp transaction', () => {
	const fixedPoint = 10 ** 8;
	const transactionType = 5;
	const amount = '0';
	const passphrase = 'secret';
	const secondPassphrase = 'second secret';
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultOptions = {
		category: 0,
		name: 'Lisk Guestbook',
		description: 'The official Lisk guestbook',
		tags: 'guestbook message sidechain',
		type: 0,
		link: 'https://github.com/MaxKK/guestbookDapp/archive/master.zip',
		icon:
			'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png',
	};
	const fee = (25 * fixedPoint).toString();
	const timeWithOffset = 38350076;
	const noOptionsError = 'Options must be an object.';
	const categoryIntegerError = 'Dapp category must be an integer.';
	const nameStringError = 'Dapp name must be a string.';
	const typeIntegerError = 'Dapp type must be an integer.';
	const linkStringError = 'Dapp link must be a string.';
	const unsigned = true;

	let getTimeWithOffsetStub;
	let options;
	let createDappTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
		options = Object.assign({}, defaultOptions);
	});

	describe('with first passphrase', () => {
		beforeEach(() => {
			createDappTransaction = createDapp({ passphrase, options });
		});

		it('should create a create dapp transaction', () => {
			return createDappTransaction.should.be.ok();
		});

		it('should throw an error if no options are provided', () => {
			return createDapp.bind(null, { passphrase }).should.throw(noOptionsError);
		});

		it('should throw an error if no category is provided', () => {
			delete options.category;
			return createDapp
				.bind(null, { passphrase, options })
				.should.throw(categoryIntegerError);
		});

		it('should throw an error if provided category is not an integer', () => {
			options.category = 'not an integer';
			return createDapp
				.bind(null, { passphrase, options })
				.should.throw(categoryIntegerError);
		});

		it('should throw an error if no name is provided', () => {
			delete options.name;
			return createDapp
				.bind(null, { passphrase, options })
				.should.throw(nameStringError);
		});

		it('should throw an error if provided name is not a string', () => {
			options.name = 123;
			return createDapp
				.bind(null, { passphrase, options })
				.should.throw(nameStringError);
		});

		it('should throw an error if no type is provided', () => {
			delete options.type;
			return createDapp
				.bind(null, { passphrase, options })
				.should.throw(typeIntegerError);
		});

		it('should throw an error if provided type is not an integer', () => {
			options.type = 'not an integer';
			return createDapp
				.bind(null, { passphrase, options })
				.should.throw(typeIntegerError);
		});

		it('should throw an error if no link is provided', () => {
			delete options.link;
			return createDapp
				.bind(null, { passphrase, options })
				.should.throw(linkStringError);
		});

		it('should throw an error if provided link is not a string', () => {
			options.link = 123;
			return createDapp
				.bind(null, { passphrase, options })
				.should.throw(linkStringError);
		});

		it('should not require description, tags, or icon', () => {
			['description', 'tags', 'icon'].forEach(key => delete options[key]);
			return createDapp.bind(null, { passphrase, options }).should.not.throw();
		});

		it('should use time.getTimeWithOffset to calculate the timestamp', () => {
			return getTimeWithOffsetStub.should.be.calledWithExactly(undefined);
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			createDapp({ passphrase, options, timeOffset: offset });

			return getTimeWithOffsetStub.should.be.calledWithExactly(offset);
		});

		describe('returned create dapp transaction', () => {
			it('should be an object', () => {
				return createDappTransaction.should.be.type('object');
			});

			it('should have an id string', () => {
				return createDappTransaction.should.have
					.property('id')
					.and.be.type('string');
			});

			it('should have type number equal to 5', () => {
				return createDappTransaction.should.have
					.property('type')
					.and.be.type('number')
					.and.equal(5);
			});

			it('should have amount string equal to 0', () => {
				return createDappTransaction.should.have
					.property('amount')
					.and.be.type('string')
					.and.equal('0');
			});

			it('should have fee string equal to 25 LSK', () => {
				return createDappTransaction.should.have
					.property('fee')
					.and.be.type('string')
					.and.equal(fee);
			});

			it('should have recipientId equal to null', () => {
				return createDappTransaction.should.have
					.property('recipientId')
					.and.be.null();
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				return createDappTransaction.should.have
					.property('senderPublicKey')
					.and.be.hexString()
					.and.equal(publicKey);
			});

			it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
				return createDappTransaction.should.have
					.property('timestamp')
					.and.be.type('number')
					.and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				return createDappTransaction.should.have
					.property('signature')
					.and.be.hexString();
			});

			it('should not have the second signature property', () => {
				return createDappTransaction.should.not.have.property('signSignature');
			});

			it('should have asset', () => {
				return createDappTransaction.should.have
					.property('asset')
					.and.not.be.empty();
			});

			describe('dapps asset', () => {
				it('should be object', () => {
					return createDappTransaction.asset.should.have
						.property('dapp')
						.and.be.type('object');
				});

				it('should have a category number equal to provided category', () => {
					return createDappTransaction.asset.dapp.should.have
						.property('category')
						.and.be.type('number')
						.and.equal(options.category);
				});

				it('should have a name string equal to provided name', () => {
					return createDappTransaction.asset.dapp.should.have
						.property('name')
						.and.be.type('string')
						.and.equal(options.name);
				});

				it('should have a description string equal to provided description', () => {
					return createDappTransaction.asset.dapp.should.have
						.property('description')
						.and.be.type('string')
						.and.equal(options.description);
				});

				it('should have a tags string equal to provided tags', () => {
					return createDappTransaction.asset.dapp.should.have
						.property('tags')
						.and.be.type('string')
						.and.equal(options.tags);
				});

				it('should have a type number equal to provided type', () => {
					return createDappTransaction.asset.dapp.should.have
						.property('type')
						.and.be.type('number')
						.and.equal(options.type);
				});

				it('should have a link string equal to provided link', () => {
					return createDappTransaction.asset.dapp.should.have
						.property('link')
						.and.be.type('string')
						.and.equal(options.link);
				});

				it('should have an icon string equal to provided icon', () => {
					return createDappTransaction.asset.dapp.should.have
						.property('icon')
						.and.be.type('string')
						.and.equal(options.icon);
				});
			});
		});
	});

	describe('with first and second passphrase', () => {
		beforeEach(() => {
			createDappTransaction = createDapp({
				passphrase,
				secondPassphrase,
				options,
			});
		});

		it('should have the second signature property as hex string', () => {
			return createDappTransaction.should.have
				.property('signSignature')
				.and.be.hexString();
		});
	});

	describe('unsigned create dapp transaction', () => {
		beforeEach(() => {
			createDappTransaction = createDapp({
				options,
				unsigned,
			});
		});

		it('should create a create dapp transaction without signature', () => {
			createDappTransaction.should.have.property('type').equal(transactionType);
			createDappTransaction.should.have.property('amount').equal(amount);
			createDappTransaction.should.have.property('fee').equal(fee);
			createDappTransaction.should.have.property('recipientId').equal(null);
			createDappTransaction.should.have.property('senderPublicKey').equal(null);
			createDappTransaction.should.have.property('timestamp');
			createDappTransaction.asset.should.have
				.property('dapp')
				.and.be.type('object');
			createDappTransaction.asset.dapp.should.have.properties(
				'category',
				'name',
				'tags',
				'type',
				'link',
				'icon',
			);
			createDappTransaction.should.not.have.property('signature');
			createDappTransaction.should.not.have.property('id');
		});
	});
});
