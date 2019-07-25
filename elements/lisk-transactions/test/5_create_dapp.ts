/*
 * Copyright © 2019 Lisk Foundation
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
import { expect } from 'chai';
import { createDapp, DappOptions } from '../src/5_create_dapp';
import { TransactionJSON } from '../src/transaction_types';
import { DappAsset } from '../src/5_dapp_transaction';
import * as time from '../src/utils/time';

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
	const descriptionStringError =
		'Dapp description must be a string if provided.';
	const tagsStringError = 'Dapp tags must be a string if provided.';
	const iconStringError = 'Dapp icon must be a string if provided.';

	let getTimeWithOffsetStub: sinon.SinonStub;
	let options: DappOptions;
	let createDappTransaction: Partial<TransactionJSON>;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
		options = {
			...defaultOptions,
		};
		return Promise.resolve();
	});

	describe('with first passphrase', () => {
		beforeEach(() => {
			createDappTransaction = createDapp({ passphrase, options });
			return Promise.resolve();
		});

		it('should create a create dapp transaction', () => {
			return expect(createDappTransaction).to.be.ok;
		});

		it('should throw an error if no options are provided', () => {
			return expect(createDapp.bind(null, { passphrase } as any)).to.throw(
				noOptionsError,
			);
		});

		it('should throw an error if no category is provided', () => {
			const { category, ...invalidOptions } = options;
			return expect(
				createDapp.bind(null, { passphrase, options: invalidOptions as any }),
			).to.throw(categoryIntegerError);
		});

		it('should throw an error if provided category is not an integer', () => {
			const invalidOptions = {
				...options,
				category: 'not an integer',
			};
			return expect(
				createDapp.bind(null, { passphrase, options: invalidOptions as any }),
			).to.throw(categoryIntegerError);
		});

		it('should throw an error if no name is provided', () => {
			const { name, ...invalidOptions } = options;
			return expect(
				createDapp.bind(null, { passphrase, options: invalidOptions as any }),
			).to.throw(nameStringError);
		});

		it('should throw an error if provided name is not a string', () => {
			const invalidOptions = {
				...options,
				name: 123,
			};
			return expect(
				createDapp.bind(null, { passphrase, options: invalidOptions as any }),
			).to.throw(nameStringError);
		});

		it('should throw an error if no type is provided', () => {
			const { type, ...invalidOptions } = options;
			return expect(
				createDapp.bind(null, { passphrase, options: invalidOptions as any }),
			).to.throw(typeIntegerError);
		});

		it('should throw an error if provided type is not an integer', () => {
			const invalidOptions = {
				...options,
				type: 'not an integer',
			};
			return expect(
				createDapp.bind(null, { passphrase, options: invalidOptions as any }),
			).to.throw(typeIntegerError);
		});

		it('should throw an error if no link is provided', () => {
			const { link, ...invalidOptions } = options;
			return expect(
				createDapp.bind(null, { passphrase, options: invalidOptions as any }),
			).to.throw(linkStringError);
		});

		it('should throw an error if provided link is not a string', () => {
			const invalidOptions = {
				...options,
				link: 123,
			};
			return expect(
				createDapp.bind(null, { passphrase, options: invalidOptions as any }),
			).to.throw(linkStringError);
		});

		it('should throw an error if provided description is not a string', () => {
			const invalidOptions = {
				...options,
				description: 123,
			};
			return expect(
				createDapp.bind(null, { passphrase, options: invalidOptions as any }),
			).to.throw(descriptionStringError);
		});

		it('should throw an error if provided tags is not a string', () => {
			const invalidOptions = {
				...options,
				tags: 123,
			};
			return expect(
				createDapp.bind(null, { passphrase, options: invalidOptions as any }),
			).to.throw(tagsStringError);
		});

		it('should throw an error if provided icon is not a string', () => {
			const invalidOptions = {
				...options,
				icon: 123,
			};
			return expect(
				createDapp.bind(null, { passphrase, options: invalidOptions as any }),
			).to.throw(iconStringError);
		});

		it('should not require description, tags, or icon', () => {
			const { description, tags, icon, ...validOptions } = options;
			return expect(
				createDapp.bind(null, { passphrase, options: validOptions as any }),
			).not.to.throw();
		});

		it('should use time.getTimeWithOffset to calculate the timestamp', () => {
			return expect(getTimeWithOffsetStub).to.be.calledWithExactly(undefined);
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			createDapp({ passphrase, options, timeOffset: offset });

			return expect(getTimeWithOffsetStub).to.be.calledWithExactly(offset);
		});

		describe('returned create dapp transaction', () => {
			it('should be an object', () => {
				return expect(createDappTransaction).to.be.an('object');
			});

			it('should have an id string', () => {
				return expect(createDappTransaction)
					.to.have.property('id')
					.and.be.a('string');
			});

			it('should have type number equal to 5', () => {
				return expect(createDappTransaction)
					.to.have.property('type')
					.and.be.a('number')
					.and.equal(5);
			});

			it('should have amount string equal to 0', () => {
				return expect(createDappTransaction)
					.to.have.property('amount')
					.and.be.a('string')
					.and.equal('0');
			});

			it('should have fee string equal to 25 LSK', () => {
				return expect(createDappTransaction)
					.to.have.property('fee')
					.and.be.a('string')
					.and.equal(fee);
			});

			it('should have recipientId equal to empty string', () => {
				return expect(createDappTransaction)
					.to.have.property('recipientId')
					.and.equal('');
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				return expect(createDappTransaction)
					.to.have.property('senderPublicKey')
					.and.be.hexString.and.equal(publicKey);
			});

			it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
				return expect(createDappTransaction)
					.to.have.property('timestamp')
					.and.be.a('number')
					.and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				return expect(createDappTransaction).to.have.property('signature').and
					.be.hexString;
			});

			it('second signature property should be undefined', () => {
				return expect(createDappTransaction.signSignature).to.be.undefined;
			});

			it('should have asset', () => {
				return expect(createDappTransaction).to.have.property('asset').and.not
					.be.empty;
			});

			describe('dapps asset', () => {
				let asset: DappAsset | any;

				beforeEach(() => {
					asset = createDappTransaction.asset;
				});

				it('should be object', () => {
					return expect(createDappTransaction.asset)
						.to.have.property('dapp')
						.and.be.an('object');
				});

				it('should have a category number equal to provided category', () => {
					return expect(asset.dapp)
						.to.have.property('category')
						.and.be.a('number')
						.and.equal(options.category);
				});

				it('should have a name string equal to provided name', () => {
					return expect(asset.dapp)
						.to.have.property('name')
						.and.be.a('string')
						.and.equal(options.name);
				});

				it('should have a description string equal to provided description', () => {
					return expect(asset.dapp)
						.to.have.property('description')
						.and.be.a('string')
						.and.equal(options.description);
				});

				it('should have a tags string equal to provided tags', () => {
					return expect(asset.dapp)
						.to.have.property('tags')
						.and.be.a('string')
						.and.equal(options.tags);
				});

				it('should have a type number equal to provided type', () => {
					return expect(asset.dapp)
						.to.have.property('type')
						.and.be.a('number')
						.and.equal(options.type);
				});

				it('should have a link string equal to provided link', () => {
					return expect(asset.dapp)
						.to.have.property('link')
						.and.be.a('string')
						.and.equal(options.link);
				});

				it('should have an icon string equal to provided icon', () => {
					return expect(asset.dapp)
						.to.have.property('icon')
						.and.be.a('string')
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
			return Promise.resolve();
		});

		it('should have the second signature property as hex string', () => {
			return expect(createDappTransaction).to.have.property('signSignature').and
				.be.hexString;
		});
	});

	describe('unsigned create dapp transaction', () => {
		describe('when the create dapp transaction is created without a passphrase', () => {
			beforeEach(() => {
				createDappTransaction = createDapp({
					options,
				});
				return Promise.resolve();
			});

			it('should have the type', () => {
				return expect(createDappTransaction)
					.to.have.property('type')
					.equal(transactionType);
			});

			it('should have the amount', () => {
				return expect(createDappTransaction)
					.to.have.property('amount')
					.equal(amount);
			});

			it('should have the fee', () => {
				return expect(createDappTransaction)
					.to.have.property('fee')
					.equal(fee);
			});

			it('should have the recipient id', () => {
				return expect(createDappTransaction)
					.to.have.property('recipientId')
					.equal('');
			});

			it('should have the sender public key', () => {
				return expect(createDappTransaction)
					.to.have.property('senderPublicKey')
					.equal(undefined);
			});

			it('should have the timestamp', () => {
				return expect(createDappTransaction).to.have.property('timestamp');
			});

			it('should have the asset with dapp with properties category, description, name, tags, type, link, icon', () => {
				return expect(createDappTransaction)
					.to.have.nested.property('asset.dapp')
					.with.all.keys(
						'category',
						'description',
						'name',
						'tags',
						'type',
						'link',
						'icon',
					);
			});

			it('should not have the signature', () => {
				return expect(createDappTransaction).not.to.have.property('signature');
			});

			it('should not have the id', () => {
				return expect(createDappTransaction).not.to.have.property('id');
			});
		});
	});
});
