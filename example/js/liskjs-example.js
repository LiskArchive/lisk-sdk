"use strict";

var options = {
	ssl: false,
	node: '',
	autoFindNode: false,
	testnet: true,
	port: '7000'

};

//Initiate new Lisk Constructor
var LSK = new LiskAPI(options);

$(function() {


	$("#showSecret").on("change", function() {
		if($(this).prop('checked')) {
			$("#secretInput").attr('type', 'password');
		} else {
			$("#secretInput").attr('type', 'text');
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

	})
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





/*
 LSK.sendRequest('multisignatures', { secret: 'inject napkin ranch advance danger mandate vote bread assault tuna keep develop', lifetime: 24, min: 2, keysgroup: ['+647aac1e2df8a5c870499d7ddc82236b1e10936977537a3844a6b05ea33f9ef6', '+f6a1b12331281fa9b17be2b4887b8c626571dc3340c2643d9f70dfb2173cfb6c'] }, function(data) {


 LSK.lastQuery = data;
 //console.log(LSK.lastQuery);

 console.log(data);


 var str = JSON.stringify(data);
 document.getElementById("multisig_setup").innerHTML = str;

 });
 */
/*
 LSK.sendRequest('accounts', { address: '13356260975429434553L' }, function(data) {


 LSK.lastQuery = data;
 //console.log(LSK.lastQuery);

 console.log(data);


 var str = JSON.stringify(data);
 document.getElementById("account1").innerHTML = str;

 });

 LSK.sendRequest('accounts', { address: '2281620997357761843L' }, function(data) {


 LSK.lastQuery = data;
 //console.log(LSK.lastQuery);

 console.log(data);


 var str = JSON.stringify(data);
 document.getElementById("account2").innerHTML = str;

 });


 LSK.sendRequest('accounts/open', { secret: '123' }, function(data) {


 LSK.lastQuery = data;
 //console.log(LSK.lastQuery);

 console.log(data);


 var str = JSON.stringify(data);
 document.getElementById("demo").innerHTML = str;

 });



 LSK.sendRequest('accounts/open', { secret: '123' }, function(data) {


 LSK.lastQuery = data;
 //console.log(LSK.lastQuery);

 console.log(data);


 var str = JSON.stringify(data);
 document.getElementById("demo").innerHTML = str;

 });
 */
/*
 LSK.sendRequest('blocks/getHeight', function(data) {


 LSK.lastQuery = data;
 //console.log(LSK.lastQuery);

 console.log(data);

 var str = JSON.stringify(data);
 document.getElementById("demo").innerHTML = str;

 });


 LSK.sendRequest('transactions', { secret: 'inject napkin ranch advance danger mandate vote bread assault tuna keep develop', amount: 100000000, recipientId: '13356260975429434553L' } , function(data) {

 LSK.lastQuery = data;
 //console.log(LSK.lastQuery);

 console.log(data);

 var str = JSON.stringify(data);
 document.getElementById("sending").innerHTML = str;

 });
 */


/*
 LSK.sendRequest('accounts/delegates', { secret: 'inject napkin ranch advance danger mandate vote bread assault tuna keep develop', delegates: ['+f6a1b12331281fa9b17be2b4887b8c626571dc3340c2643d9f70dfb2173cfb6c'] } , function(data) {

 LSK.lastQuery = data;
 //console.log(LSK.lastQuery);

 console.log(data);

 var str = JSON.stringify(data);
 document.getElementById("sending").innerHTML = str;

 });
 */