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
import Benchmark from 'benchmark';
import * as fast from '../src/nacl/fast';
import * as slow from '../src/nacl/slow';

Benchmark.options.minSamples = 100;

const defaultPublicKey =
	'7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
const defaultPrivateKey =
	'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588';
const defaultMessage = 'Some default text.';
const defaultSignature =
	'68937004b6720d7e1902ef05a577e6d9f9ab2756286b1f2ae918f8a0e5153c15e4f410916076f750b708f8979be2430e4cfc7ebb523ae1905d2ea1f5d24ce700';
const defaultEncryptedMessage =
	'a232e5ea10e18249efc5a0aa8ed68271fc494d02245c52277ee2e14cddd960144a65';
const defaultNonce = 'df4c8b09e270d2cb3f7b3d53dfa8a6f3441ad3b14a13fb66';
const defaultHash =
	'314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d97';
const defaultDigest =
	'aba8462bb7a1460f1e36c36a71f0b7f67d1606562001907c1b2dad08a8ce74ae';
const defaultConvertedPublicKeyEd2Curve =
	'b8c0eecfd16c1cc4f057a6fc6d8dd3d46e4aa9625408d4bd0ba00e991326fe00';
const defaultConvertedPrivateKeyEd2Curve =
	'b0e3276b64b086b381e11928e56f966d062dc677b7801cc594aeb2d4193e8d57';

const boxBenchmark = new Benchmark.Suite('box')
	.add('fast.box', () => {
		fast.box(
			Buffer.from(defaultMessage, 'utf8'),
			Buffer.from(defaultNonce, 'hex'),
			Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
			Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
		);
	})
	.add('slow.box', () => {
		slow.box(
			Buffer.from(defaultMessage, 'utf8'),
			Buffer.from(defaultNonce, 'hex'),
			Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
			Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
		);
	});

const openBoxBenchmark = new Benchmark.Suite('openBox')
	.add('fast.openBox', () => {
		fast.openBox(
			Buffer.from(defaultEncryptedMessage, 'hex'),
			Buffer.from(defaultNonce, 'hex'),
			Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
			Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
		);
	})
	.add('slow.openBox', () => {
		slow.openBox(
			Buffer.from(defaultEncryptedMessage, 'hex'),
			Buffer.from(defaultNonce, 'hex'),
			Buffer.from(defaultConvertedPublicKeyEd2Curve, 'hex'),
			Buffer.from(defaultConvertedPrivateKeyEd2Curve, 'hex'),
		);
	});

const signDetachedBenchmark = new Benchmark.Suite('signDetached')
	.add('fast.signDetached', () => {
		fast.signDetached(
			Buffer.from(defaultDigest, 'hex'),
			Buffer.from(defaultPrivateKey, 'hex'),
		);
	})
	.add('slow.signDetached', () => {
		slow.signDetached(
			Buffer.from(defaultDigest, 'hex'),
			Buffer.from(defaultPrivateKey, 'hex'),
		);
	});

const verifyDetachedBenchmark = new Benchmark.Suite('verifyDetached')
	.add('fast.verifyDetached', () => {
		fast.verifyDetached(
			Buffer.from(defaultDigest, 'hex'),
			Buffer.from(defaultSignature, 'hex'),
			Buffer.from(defaultPublicKey, 'hex'),
		);
	})
	.add('slow.verifyDetached', () => {
		slow.verifyDetached(
			Buffer.from(defaultDigest, 'hex'),
			Buffer.from(defaultSignature, 'hex'),
			Buffer.from(defaultPublicKey, 'hex'),
		);
	});

const getRandomBytesBenchmark = new Benchmark.Suite('getRandomBytes')
	.add('fast.getRandomBytes', () => {
		fast.getRandomBytes(24);
	})
	.add('slow.getRandomBytes', () => {
		slow.getRandomBytes(24);
	});

const getKeyPairBenchmark = new Benchmark.Suite('getKeyPair')
	.add('fast.getKeyPair', () => {
		fast.getKeyPair(Buffer.from(defaultHash, 'hex'));
	})
	.add('slow.getKeyPair', () => {
		slow.getKeyPair(Buffer.from(defaultHash, 'hex'));
	});

[
	boxBenchmark,
	openBoxBenchmark,
	signDetachedBenchmark,
	verifyDetachedBenchmark,
	getRandomBytesBenchmark,
	getKeyPairBenchmark,
].forEach(benchmark => {
	benchmark
		.on('start', () => {
			console.info(`Evaluating ${benchmark.name}..`);
		})
		.on('cycle', event => {
			console.info(String(event.target));
		})
		.on('complete', function callback() {
			console.info(`Winner is ${this.filter('fastest').map('name')}!`);
		})
		.run();
});
