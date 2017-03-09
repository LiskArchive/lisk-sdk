"use strict";

var options = {
	ssl: true,
	node: '',
	autoFindNode: false,
	testnet: false,
	port: ''

};

//Initiate new Lisk Constructor
var LSK = lisk.api( { testnet: true, port: 7000 } );

$(function() {


	$("#showSecret").on("change", function() {
		if($(this).prop('checked')) {
			$("#secretInput").attr('type', 'text');
		} else {
			$("#secretInput").attr('type', 'password');
		}
	});

	$("#usePassphrase").on("click", function(e) {
		e.preventDefault();
		var passphrase = $("#secretInput").val();
		init(passphrase);
	});

	$("#sendLsk").on("click", function(e) {
		e.preventDefault();
		var passphrase = $("#secretInput").val();
		var amount = $("#send_lsk_input").val();
		var recipient = $("#send_lsk_recipient").val();

		amount = Math.floor(amount * 100000000);

		LSK.sendRequest('transactions', { secret: 'inject napkin ranch advance danger mandate vote bread assault tuna keep develop', amount: amount, recipientId: recipient } , function(data) {

			LSK.lastQuery = data;
			//console.log(LSK.lastQuery);

			console.log(data);

			var str = JSON.stringify(data);
			document.getElementById("output_send").innerHTML = str;

		});

	});

	$("#submitSignMessage").on("click", function(e) {
		e.preventDefault();

		var pass = $("#signPassphrase").val();
		var message = $("#signMessage").val();

		var signature = lisk.crypto.signAndPrintMessage(message, pass);

		$("#signResult").val(signature);

	});

	$("#verifySignedMessage").on("click", function(e) {
		e.preventDefault();

		var pubKey = $("#verifyPublicKey").val();
		var signature = $("#verifySignature").val();

		try {
			var message = lisk.crypto.verifyMessageWithPublicKey(signature, pubKey);
		} catch(e) {

			$("#validSignature").html('Failed to decrypt message.');

			if(e.message === "Cannot read property 'length' of null") {
				$("#validSignature").append('<br>Invalid Signature');
			} else if(e.message.substring(0,4) === 'nacl') {
				$("#validSignature").append('<br>Invalid publicKey');
			}

			$("#validSignature").css('color', 'red');
		}

		if(message) {
			$("#verifyResult").val(message);
			$("#validSignature").html('Valid Signature').css('color', 'green');
		}




	});
});


function init(passphrase) {


	(function() {

		getAccount(function(accountData){

			var accAddress = LSK.getAddressFromSecret(passphrase).address;

			if(accountData.address) {
				document.getElementById("balance_details").innerHTML = JSON.stringify(accountData, null, 2);
			} else {
				document.getElementById("balance_details").innerHTML = JSON.stringify(accountData.account, null, 2);
			}

			LSK.sendRequest('transactions', { senderId: accAddress, recipientId: accAddress }, function(data_tx) {

				//var str = JSON.stringify(data);
				document.getElementById("transaction_details").innerHTML = JSON.stringify(data_tx, null, 2);

				LSK.sendRequest('accounts/delegates', { address: accAddress }, function(data_del) {

					//var str = JSON.stringify(data);
					console.log(data_del);
					document.getElementById("delegate_details").innerHTML = JSON.stringify(data_del, null, 2);

				});

			});




		});

	})();


	function getAccount (callback) {


		LSK.sendRequest('accounts/open', { secret: passphrase }, function(data) {

			var accAddress = LSK.getAddressFromSecret(passphrase);
			if(data === undefined) {
				LSK.sendRequest('accounts', { address : accAddress.address }, function(data_acc) {

					var returnObj = {
						open: data,
						account: data_acc
					}

					callback(returnObj);

				});
			} else {
				callback(data);
			}

		});

	}

}
