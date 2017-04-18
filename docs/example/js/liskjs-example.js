'use strict';

var options = {
	ssl: true,
	node: '',
	autoFindNode: false,
	testnet: false,
	port: ''
};

// Initiate new Lisk Constructor
var LSK = lisk.api({ testnet: true, port: 7000 });

$(function () {
	$('#send_show_secret,#info_show_secret').on('change', function () {
		var secret = $(this).prop('id') == 'send_show_secret' ? '#send_secret_input' : '#info_secret_input';
		if ($(this).prop('checked')) {
			$(secret).attr('type', 'text');
		} else {
			$(secret).attr('type', 'password');
		}
	});

	$('#usePassphrase').on('click', function (e) {
		e.preventDefault();
		var passphrase = $('#info_secret_input').val();
		init(passphrase);
	});

	$('#sendLsk').on('click', function (e) {
		e.preventDefault();
		var passphrase = $('#send_secret_input').val();
		var amount = $('#send_lsk_input').val();
		var recipient = $('#send_lsk_recipient').val();

		amount = Math.floor(amount * 100000000);

		LSK.sendRequest('transactions', { secret: passphrase, amount: amount, recipientId: recipient } , function (data) {
			LSK.lastQuery = data;
			// console.log(LSK.lastQuery);
			console.log(data);

			var str = JSON.stringify(data);
			document.getElementById('output_send').innerHTML = str;
		});
	});

	$('#submitSignMessage').on('click', function (e) {
		e.preventDefault();

		var pass = $('#signPassphrase').val();
		var message = $('#signMessage').val();

		var signature = lisk.crypto.signAndPrintMessage(message, pass);

		$('#signResult').val(signature);
	});

	$('#verifySignedMessage').on('click', function (e) {
		e.preventDefault();

		var pubKey = $('#verifyPublicKey').val();
		var signature = $('#verifySignature').val();

		try {
			var message = lisk.crypto.verifyMessageWithPublicKey(signature, pubKey);
		} catch (e) {
			$('#validSignature').html('Failed to decrypt message.');

			if (e.message === "Cannot read property 'length' of null") {
				$('#validSignature').append('<br>Invalid Signature');
			} else if (e.message.substring(0,4) === 'nacl') {
				$('#validSignature').append('<br>Invalid publicKey');
			}

			$('#validSignature').css('color', 'red');
		}

		if (message) {
			$('#verifyResult').val(message);
			$('#validSignature').html('Valid Signature').css('color', 'green');
		}
	});

	$("#submitMessageToEncrypt").on("click", function (e) {
		e.preventDefault();

		var secret = $("#encryptMessageSecret").val();
		var recipientPublicKey = $("#encryptMessageRecipientPublicKey").val();
		var message = $("#encryptMessage").val();

		var encryptedObject = lisk.crypto.encryptMessageWithSecret(message, secret, recipientPublicKey);
		var nonce = encryptedObject.nonce;
		var encryptedMessage = encryptedObject.encryptedMessage;

		$("#encryptedMessage").html(encryptedMessage);
		$("#encryptedMessageNonce").html(nonce);
	});

	$("#decryptMessage").on("click", function (e) {
		e.preventDefault();

		var secret = $("#decryptMessageSecret").val();
		var encryptedMessage = $("#encryptedMessageToDecrypt").val();
		var senderPublicKey = $("#senderPublicKey").val();
		var nonce = $("#nonceToDecrypt").val();

		try {
			var message = lisk.crypto.decryptMessageWithSecret(encryptedMessage, nonce, secret, senderPublicKey);
		} catch (e) {
			$("#decryptedMessageValidity").html(convertNaclError(e)).css('color', 'red');
		}

		if (message) {
			$("#decryptedMessageValidity").html('Success').css('color', 'green');
			$("#decryptedMessage").html(message);
		}
	});
});

function convertNaclError (e) {
	var errorMessage = e.message;

	var displayError = '';
	switch (errorMessage) {
		case 'nacl.crypto_box_open expected 24-byte nonce but got length 0':
			displayError = 'Expected 24-byte nonce but got length 0';
			break;

		case 'nacl_raw._crypto_box_open signalled an error':
			displayError = 'Your secret, the encrypted message or the senderPublicKey are invalid';
			break;
		default:
			displayError = 'Could not decrypt message';
			break;
	}

	return displayError;
}

function init (passphrase) {
	(function () {
		getAccount(function (accountData) {
			var accAddress = LSK.getAddressFromSecret(passphrase).address;

			if (accountData.address) {
				document.getElementById('balance_details').innerHTML = JSON.stringify(accountData, null, 2);
			} else {
				document.getElementById('balance_details').innerHTML = JSON.stringify(accountData.account, null, 2);
			}

			LSK.sendRequest('transactions', { senderId: accAddress, recipientId: accAddress }, function (data_tx) {
				// var str = JSON.stringify(data);
				document.getElementById('transaction_details').innerHTML = JSON.stringify(data_tx, null, 2);

				LSK.sendRequest('accounts/delegates', { address: accAddress }, function (data_del) {
					// var str = JSON.stringify(data);
					console.log(data_del);
					document.getElementById('delegate_details').innerHTML = JSON.stringify(data_del, null, 2);
				});
			});
		});
	})();

	function getAccount (callback) {
		LSK.sendRequest('accounts/open', { secret: passphrase }, function (data) {
			var accAddress = LSK.getAddressFromSecret(passphrase);
			if (data === undefined) {
				LSK.sendRequest('accounts', { address : accAddress.address }, function (data_acc) {
					var returnObj = {
						open: data,
						account: data_acc
					};

					callback(returnObj);
				});
			} else {
				callback(data);
			}
		});
	}
}
