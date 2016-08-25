'use strict'; /*jslint mocha:true */

var node = require("./../node.js");
var path = require("path");
var spawn = require("child_process").spawn;

var account = {
	"address": "12099044743111170367L",
	"publicKey": "fbd20d4975e53916488791477dd38274c1b4ec23ad322a65adb171ec2ab6a0dc",
	"password": "sebastian",
	"name": "sebastian",
	"balance": 0
};

describe("POST /accounts/open", function () {

	it("Using valid passphrase: "+account.password+". Should be ok", function (done) {
		node.api.post("/accounts/open")
			.set("Accept", "application/json")
			.send({
				secret: account.password
			})
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.true;
				node.expect(res.body).to.have.property("account").that.is.an("object");
				node.expect(res.body.account.address).to.equal(account.address);
				node.expect(res.body.account.publicKey).to.equal(account.publicKey);
				account.balance = res.body.account.balance;
				done();
			});
	});

	it("Using empty json. Should fail", function (done) {
		node.api.post("/accounts/open")
			.set("Accept", "application/json")
			.send({
			})
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// node.expect(res.body.error).to.contain("Provide secret key of account");
				done();
			});
	});

	it("Using empty passphrase. Should fail", function (done) {
		node.api.post("/accounts/open")
			.set("Accept", "application/json")
			.send({
				secret:""
			})
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// node.expect(res.body.error).to.contain("Provide secret key of account");
				done();
			});
	});

	it("Using invalid json. Should fail", function (done) {
		node.api.post("/accounts/open")
			.set("Accept", "application/json")
			.send("{\"invalid\"}")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// node.expect(res.body.error).to.contain("Provide secret key of account");
				done();
			});
	});

	it("When payload is over 2Mb. Should fail", function (done) {
		var data = "qs";
		for (var i = 0; i < 20; i++) {
			data += data;
		}
		node.api.post("/accounts/open")
			.set("Accept", "application/json")
			.send({
				payload: data
			})
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error").that.is.an("object");
				node.expect(res.body.error).to.have.property("limit").to.equal(2097152);
				done();
			});
	});
});

describe("GET /accounts/getBalance", function () {

	it("Using valid params. Should be ok", function (done) {
		node.api.get("/accounts/getBalance?address=" + account.address)
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.true;
				node.expect(res.body).to.have.property("balance");
				node.expect(res.body.balance).to.equal(account.balance);
				done();
			});
	});

	it("Using invalid address. Should fail", function (done) {
		node.api.get("/accounts/getBalance?address=thisIsNOTALiskAddress")
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// expect(res.body.error).to.contain("Provide valid Lisk address");
				done();
			});
	});

	it("Using no address. Should fail", function (done) {
		node.api.get("/accounts/getBalance")
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// node.expect(res.body.error).to.contain("Provide address in url");
				done();
			});
	});
});

describe("GET /accounts/getPublicKey", function () {

	it("Using valid address. Should be ok", function (done) {
		node.api.get("/accounts/getPublicKey?address=" + account.address)
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.true;
				node.expect(res.body).to.have.property("publicKey");
				node.expect(res.body.publicKey).to.equal(account.publicKey);
				done();
			});
	});

	it("Using invalid address. Should fail", function (done) {
		node.api.get("/accounts/getPublicKey?address=thisIsNOTALiskAddress")
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// expect(res.body.error).to.contain("Provide valid Lisk address");
				done();
			});
	});

	it("Using no address. Should fail", function (done) {
		node.api.get("/accounts/getPublicKey?address=")
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// expect(res.body.error).to.contain("Provide valid Lisk address");
				done();
			});
	});

	it("Using valid params. Should be ok", function (done) {
		node.api.post("/accounts/generatePublicKey")
			.set("Accept", "application/json")
			.send({
				secret: account.password
			})
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.true;
				node.expect(res.body).to.have.property("publicKey");
				node.expect(res.body.publicKey).to.equal(account.publicKey);
				done();
			});
	});
});

describe("POST /accounts/generatePublicKey", function () {

	it("Using empty passphrase. Should fail", function (done) {
		node.api.post("/accounts/generatePublicKey")
			.set("Accept", "application/json")
			.send({
				secret: ""
			})
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// node.expect(res.body.error).to.contain("Provide secret key");
				done();
			});
	});

	it("Using no params. Should fail", function (done) {
		node.api.post("/accounts/generatePublicKey")
			.set("Accept", "application/json")
			.send({})
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// node.expect(res.body.error).to.contain("Provide secret key");
				done();
			});
	});

	it("Using invalid json. Should fail", function (done) {
		node.api.post("/accounts/generatePublicKey")
			.set("Accept", "application/json")
			.send("{\"invalid\"}")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// node.expect(res.body.error).to.contain("Provide secret key");
				done();
			});
	});
});

describe("GET /accounts?address=", function () {

	it("Using valid address. Should be ok", function (done) {
		node.api.get("/accounts?address=" + account.address)
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.true;
				node.expect(res.body).to.have.property("account").that.is.an("object");
				node.expect(res.body.account.address).to.equal(account.address);
				node.expect(res.body.account.publicKey).to.equal(account.publicKey);
				node.expect(res.body.account.balance).to.equal(account.balance);
				done();
			});
	});

	it("Using lowercase address. Should be ok", function (done) {
		node.api.get("/accounts?address=" + account.address.toLowerCase())
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.true;
				node.expect(res.body).to.have.property("account").that.is.an("object");
				node.expect(res.body.account.address).to.equal(account.address);
				node.expect(res.body.account.publicKey).to.equal(account.publicKey);
				node.expect(res.body.account.balance).to.equal(account.balance);
				done();
			});
	});

	it("Using invalid address. Should fail", function (done) {
		node.api.get("/accounts?address=thisIsNOTAValidLiskAddress")
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// expect(res.body.error).to.contain("Provide valid Lisk address");
				done();
			});
	});

	it("Using empty address. Should fail", function (done) {
		node.api.get("/accounts?address=")
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				// node.expect(res.body.error).to.contain("Provide address in url");
				done();
			});
	});
});
