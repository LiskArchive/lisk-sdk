describe('ParseOfflineRequests', function () {

	var LSK = lisk.api();

	describe('#httpGETPUTorPOST', function () {

		it('should tell if GET request', function () {
			var requestMethod1 = LSK.parseOfflineRequests('blocks/getHeight');

			(requestMethod1.requestMethod).should.be.equal('GET');
		});

		it('should tell if POST request', function () {
			var requestMethod2 = LSK.parseOfflineRequests('accounts/open');

			(requestMethod2.requestMethod).should.be.equal('POST');
		});

		it('should tell if PUT request', function () {
			var requestMethod3 = LSK.parseOfflineRequests('delegates');

			(requestMethod3.requestMethod).should.be.equal('PUT');
		});

	});

	describe('#checkOfflineRequestBefore', function () {

		it('should route accounts/open requests correctly', function () {
			var checkRequestRouting = LSK.parseOfflineRequests('accounts/open', { secret: '123' });

			(checkRequestRouting.requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('GET');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('accounts?address=12475940823804898745L');
		});

		it('should route accounts/generatePublicKey requests correctly', function () {
			var checkRequestRouting = LSK.parseOfflineRequests('accounts/generatePublicKey', { secret: '123' });

			(checkRequestRouting.requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('GET');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('accounts?address=12475940823804898745L');
		});

		it('should route accounts/delegates requests correctly', function () {
			var checkRequestRouting = LSK.parseOfflineRequests('accounts/delegates', { secret: '123', delegates: ['+f6a1b12331281fa9b17be2b4887b8c626571dc3340c2643d9f70dfb2173cfb6c'] });

			(checkRequestRouting.requestMethod).should.be.equal('PUT');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('transactions');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});

		it('should route transactions requests correctly', function () {
			var checkRequestRouting = LSK.parseOfflineRequests('transactions', { secret: '123', recipientId: '13356260975429434553L', amount: 10000000 });

			(checkRequestRouting.requestMethod).should.be.equal('PUT');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('transactions');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});

		it('should route signatures requests correctly', function () {
			var checkRequestRouting = LSK.parseOfflineRequests('signatures', { secret: '123', secondSecret: '1234' });

			(checkRequestRouting.requestMethod).should.be.equal('PUT');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('transactions');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});

		it('should route delegates requests correctly', function () {
			var checkRequestRouting = LSK.parseOfflineRequests('delegates', { secret: '123', username: 'myname' });

			(checkRequestRouting.requestMethod).should.be.equal('PUT');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('transactions');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});

		/*
		it('should route dapps requests correctly', function () {
			var options = {
				category: 0,
				name: 'Lisk Guestbook',
				description: 'The official Lisk guestbook',
				tags: 'guestbook message sidechain',
				type: 0,
				link: 'https://github.com/MaxKK/guestbookDapp/archive/master.zip',
				icon: 'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png'
			};

			var checkRequestRouting = LSK.parseOfflineRequests('dapps', { secret: '123', secondSecret: '1234', options });

			(checkRequestRouting.requestMethod).should.be.equal('PUT');
			(checkRequestRouting.checkOfflineRequestBefore().requestMethod).should.be.equal('POST');
			(checkRequestRouting.checkOfflineRequestBefore().requestUrl).should.be.equal('transactions');
			(checkRequestRouting.checkOfflineRequestBefore().params).should.be.ok();
		});
		*/
	});

	describe('#transactionOutputAfter', function () {

		var LSK = new LiskAPI();

		it('should calculate crypto for accounts/open instead of using the API', function () {
			var transformAnswer = {
				success: 'true',
				'account': {
					'address': '1257758361663932343L',
					'unconfirmedBalance': '0',
					'balance': '0',
					'publicKey': 'aa73601080c9896502d999c931ff70346ca41957976cfce933f6d874a6f16137',
					'unconfirmedSignature': '0',
					'secondSignature': '0',
					'secondPublicKey': null,
					'multisignatures': null,
					'u_multisignatures': null
				}
			};

			var offlineRequest = LSK.parseOfflineRequests('accounts/open', { secret: 'unknown' });
			var requestAnswer = offlineRequest.transactionOutputAfter({ error: 'Account not found' });

			(requestAnswer).should.be.eql(transformAnswer);
		});

		it('should calculate crypto for accounts/generatePublicKey instead of using the API', function () {
			var transformAnswer = {
				'success': 'true',
				'publicKey': 'aa73601080c9896502d999c931ff70346ca41957976cfce933f6d874a6f16137'
			};

			var offlineRequest = LSK.parseOfflineRequests('accounts/generatePublicKey', { secret: 'unknown' });
			var requestAnswer = offlineRequest.transactionOutputAfter();

			(requestAnswer).should.be.eql(transformAnswer);
		});

		it('should route if everything is done already as for most API calls', function () {
			var reqAnswer = {
				'request': {
					'success': 'true',
					'account': 'account'
				}
			};

			var offlineRequest = LSK.parseOfflineRequests('delegates', { secret: 'unknown' });
			var requestAnswer = offlineRequest.transactionOutputAfter( { success: 'true', account: 'account' } );

			(requestAnswer).should.be.eql(reqAnswer);
		});

	});
});
