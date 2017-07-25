import liskApi from '../../src/api/liskApi';

describe('ParseOfflineRequests', () => {
	const LSK = liskApi();

	describe('#httpGETPUTorPOST', () => {
		it('should tell if GET request', () => {
			const requestMethod1 = LSK.parseOfflineRequests('blocks/getHeight');

			(requestMethod1.requestMethod).should.be.equal('GET');
		});

		it('should tell if POST request', () => {
			const requestMethod2 = LSK.parseOfflineRequests('accounts/open');

			(requestMethod2.requestMethod).should.be.equal('POST');
		});

		it('should tell if PUT request', () => {
			const requestMethod3 = LSK.parseOfflineRequests('delegates');

			(requestMethod3.requestMethod).should.be.equal('PUT');
		});
	});

	describe('#checkDoubleNamedAPI', () => {
		it('should route to getTransactions when /transactions API is called and no secret is added', () => {
			const requestMethodGetTx = LSK.parseOfflineRequests('transactions', { senderId: '123' });

			(requestMethodGetTx.requestMethod).should.be.equal('GET');
		});
	});

	describe('#checkDoubleNamedAPI', () => {
		it('should route to getTransactions when /transactions API is called and no secret is added', () => {
			const requestMethodGetTx = LSK.parseOfflineRequests('transactions', { senderId: '123' });

			(requestMethodGetTx.requestMethod).should.be.equal('GET');
		});
	});

	describe('#checkOfflineRequestBefore', () => {
		it('should route accounts/open requests correctly', () => {
			const checkRequestRouting = LSK.parseOfflineRequests('accounts/open', { secret: '123' });

			(checkRequestRouting.requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('GET');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('accounts?address=12475940823804898745L');
		});

		it('should route accounts/generatePublicKey requests correctly', () => {
			const checkRequestRouting = LSK.parseOfflineRequests('accounts/generatePublicKey', { secret: '123' });

			(checkRequestRouting.requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('GET');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('accounts?address=12475940823804898745L');
		});

		it('should route accounts/delegates requests correctly', () => {
			const checkRequestRouting = LSK.parseOfflineRequests('accounts/delegates', { secret: '123', delegates: ['+f6a1b12331281fa9b17be2b4887b8c626571dc3340c2643d9f70dfb2173cfb6c'] });

			(checkRequestRouting.requestMethod).should.be.equal('PUT');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('transactions');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});

		it('should route transactions requests correctly', () => {
			const checkRequestRouting = LSK.parseOfflineRequests('transactions', { secret: '123', recipientId: '13356260975429434553L', amount: 10000000 });

			(checkRequestRouting.requestMethod).should.be.equal('PUT');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('transactions');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});

		it('should route signatures requests correctly', () => {
			const checkRequestRouting = LSK.parseOfflineRequests('signatures', { secret: '123', secondSecret: '1234' });

			(checkRequestRouting.requestMethod).should.be.equal('PUT');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('transactions');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});

		it('should route delegates requests correctly', () => {
			const checkRequestRouting = LSK.parseOfflineRequests('delegates', { secret: '123', username: 'myname' });

			(checkRequestRouting.requestMethod).should.be.equal('PUT');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('transactions');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});

		it.skip('should route dapps requests correctly', () => {
			const options = {
				category: '0',
				name: 'Lisk Guestbook',
				description: 'The official Lisk guestbook',
				tags: 'blockchain guestbook',
				type: '0',
				link: 'https://github.com/MaxKK/guestbookDapp/archive/master.zip',
				icon: 'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png',
				secret: '123',
			};

			const checkRequestRouting = liskApi().parseOfflineRequests('dapps', options);

			(checkRequestRouting.requestMethod).should.be.equal('PUT');
			// (checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			// (checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('transactions');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});

		it('should route multisignature requests correctly', () => {
			const checkRequestRouting = LSK.parseOfflineRequests('multisignatures', { secret: '123', secondSeret: '123', min: 2, lifetime: 5, keysgroup: ['+123', '+234'] });

			(checkRequestRouting.requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('transactions');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});

		it('should route multisignatures/sign requests correctly', () => {
			const transaction = { type: 4, amount: 0, fee: 2000000000, senderPublicKey: 'a056010eed1ad3233d7872a5e158d90a777a6d894a3c0ec7ff1a2ddfd393f530', timestamp: 27805422, asset: { multisignature: { min: 2, lifetime: 24, keysgroup: ['+9cc69eb423abc2531394ce133a0e9111f6a1a65f68b805615db22f2f1273fe84', '+9ff43f4be47c55c671b64bf39cb182066da5ac08bdf0cab1aaa5f1edd34d096a', '+c18718d3bcec893e88ed15b05a046a9f490d228e886f97c6f1f52c18f6bbf501'] } }, signature: '70fd23a1f1ab87b21f62a2ffce87d34d7d141c18ab7177bdc8a4cb72314cad19354e38800aebc954bcf50d5afaec5e758994956c2fb6dd274c2a1e4340d8fc05', id: '1213555903609601305', senderId: '8437095464619135969L', relays: 1, receivedAt: '2017-04-11T12:43:42.207Z' };

			const checkRequestRouting = LSK.parseOfflineRequests('multisignatures/sign', { transaction, secret: '1234' });

			(checkRequestRouting.requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('signatures');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});
	});

	describe('#transactionOutputAfter', () => {
		const LSK = liskApi();

		it('should calculate crypto for accounts/open instead of using the API', () => {
			const transformAnswer = {
				success: 'true',
				account: {
					address: '1257758361663932343L',
					unconfirmedBalance: '0',
					balance: '0',
					publicKey: 'aa73601080c9896502d999c931ff70346ca41957976cfce933f6d874a6f16137',
					unconfirmedSignature: '0',
					secondSignature: '0',
					secondPublicKey: null,
					multisignatures: null,
					u_multisignatures: null,
				},
			};

			const offlineRequest = LSK.parseOfflineRequests('accounts/open', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter({ error: 'Account not found' });

			(requestAnswer).should.be.eql(transformAnswer);
		});

		it('should calculate crypto for accounts/generatePublicKey instead of using the API', () => {
			const transformAnswer = {
				success: 'true',
				publicKey: 'aa73601080c9896502d999c931ff70346ca41957976cfce933f6d874a6f16137',
			};

			const offlineRequest = LSK.parseOfflineRequests('accounts/generatePublicKey', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter();

			(requestAnswer).should.be.eql(transformAnswer);
		});

		it('should route if everything is done already as for most API calls', () => {
			const reqAnswer = {
				success: 'true',
				account: 'account',
			};

			const offlineRequest = LSK.parseOfflineRequests('delegates', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter({ success: 'true', account: 'account' });

			(requestAnswer).should.be.eql(reqAnswer);
		});

		it('should not allow blocked API calls - enable forging', () => {
			const reqAnswer = {
				success: 'false',
				error: 'Forging not available via offlineRequest',
			};

			const offlineRequest = LSK.parseOfflineRequests('delegates/forging/enable', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter();

			(requestAnswer).should.be.eql(reqAnswer);
		});

		it('should not allow blocked API calls - disable forging', () => {
			const reqAnswer = {
				success: 'false',
				error: 'Forging not available via offlineRequest',
			};

			const offlineRequest = LSK.parseOfflineRequests('delegates/forging/disable', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter();

			(requestAnswer).should.be.eql(reqAnswer);
		});

		it('should not allow blocked API calls - install dapp', () => {
			const reqAnswer = {
				success: 'false',
				error: 'Install dapp not available via offlineRequest',
			};

			const offlineRequest = LSK.parseOfflineRequests('dapps/install', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter();

			(requestAnswer).should.be.eql(reqAnswer);
		});

		it('should not allow blocked API calls - uninstall dapp', () => {
			const reqAnswer = {
				success: 'false',
				error: 'Uninstall dapp not available via offlineRequest',
			};

			const offlineRequest = LSK.parseOfflineRequests('dapps/uninstall', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter();

			(requestAnswer).should.be.eql(reqAnswer);
		});

		it('should not allow blocked API calls - dapps launch', () => {
			const reqAnswer = {
				success: 'false',
				error: 'Launch dapp not available via offlineRequest',
			};

			const offlineRequest = LSK.parseOfflineRequests('dapps/launch', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter();

			(requestAnswer).should.be.eql(reqAnswer);
		});

		it('should not allow blocked API calls - dapps stop', () => {
			const reqAnswer = {
				success: 'false',
				error: 'Stop dapp not available via offlineRequest',
			};

			const offlineRequest = LSK.parseOfflineRequests('dapps/stop', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter();

			(requestAnswer).should.be.eql(reqAnswer);
		});

		it('should not influence already finished calls - delegates', () => {
			const request = {
				success: 'true',
				call: 'etc',
			};

			const offlineRequest = LSK.parseOfflineRequests('accounts/delegates', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter(request);

			(request).should.be.eql(requestAnswer);
		});

		it('should not influence already finished calls - accounts/delegates', () => {
			const request = {
				success: 'true',
				call: 'etc',
			};

			const offlineRequest = LSK.parseOfflineRequests('accounts/delegates', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter(request);

			(request).should.be.eql(requestAnswer);
		});

		it('should not influence already finished calls - transactions', () => {
			const request = {
				success: 'true',
				call: 'etc',
			};

			const offlineRequest = LSK.parseOfflineRequests('transactions', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter(request);

			(request).should.be.eql(requestAnswer);
		});

		it('should not influence already finished calls - signatures', () => {
			const request = {
				success: 'true',
				call: 'etc',
			};

			const offlineRequest = LSK.parseOfflineRequests('signatures', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter(request);

			(request).should.be.eql(requestAnswer);
		});

		it('should not influence already finished calls - dapps', () => {
			const request = {
				success: 'true',
				call: 'etc',
			};

			const offlineRequest = LSK.parseOfflineRequests('dapps', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter(request);

			(request).should.be.eql(requestAnswer);
		});

		it('should not influence already finished calls - multisignatures', () => {
			const request = {
				success: 'true',
				call: 'etc',
			};

			const offlineRequest = LSK.parseOfflineRequests('multisignatures', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter(request);

			(request).should.be.eql(requestAnswer);
		});

		it('should not influence already finished calls - multisignatures/sign', () => {
			const request = {
				success: 'true',
				call: 'etc',
			};

			const offlineRequest = LSK.parseOfflineRequests('multisignatures/sign', { secret: 'unknown' });
			const requestAnswer = offlineRequest.transactionOutputAfter(request);

			(request).should.be.eql(requestAnswer);
		});
	});
});
