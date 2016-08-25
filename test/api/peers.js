'use strict'; /*jslint mocha:true */

var node = require("./../node.js");

describe("GET /peers/version", function () {

	it("Should be ok", function (done) {
		node.api.get("/peers/version")
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.true;
				node.expect(res.body).to.have.property("build").to.be.a("string");
				node.expect(res.body).to.have.property("version").to.be.a("string");
				done();
			});
	});
});

describe("GET /peers", function () {

	it("Using empty parameters. Should fail", function (done) {
		var state = "", os = "", shared = "", version = "", limit = "", offset = 0, orderBy = "";

		node.api.get("/peers?state="+state+"&os="+os+"&shared="+true+"&version="+version+"&limit="+limit+"&offset="+offset+"orderBy="+orderBy)
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				done();
			});
	});

	it("Using state. Should be ok", function (done) {
		var state = 1;

		node.api.get("/peers?state="+state)
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.true;
				node.expect(res.body).to.have.property("peers").that.is.an("array");
				if (res.body.peers.length > 0) {
					for (var i = 0; i < res.body.peers.length; i++) {
						 node.expect(res.body.peers[i].state).to.equal(parseInt(state));
					}
				}
				done();
			});
	});

	it("Using limit. Should be ok", function (done) {
		var limit = 3, offset = 0;

		node.api.get("/peers?&limit="+limit+"&offset="+offset)
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.true;
				node.expect(res.body).to.have.property("peers").that.is.an("array");

				// To check it need to have peers
				node.expect(res.body.peers.length).to.be.at.most(limit);
				done();
			});
	});

	it("Using orderBy. Should be ok", function (done) {
		var orderBy = "state:desc";

		node.api.get("/peers?orderBy="+orderBy)
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.true;
				node.expect(res.body).to.have.property("peers").that.is.an("array");

				if (res.body.peers.length > 0) {
					for (var i = 0; i < res.body.peers.length; i++) {
						if (res.body.peers[i+1] != null) {
							node.expect(res.body.peers[i+1].state).to.at.most(res.body.peers[i].state);
						}
					}
				}

				done();
			});

	});

	it("Using limit > 100. Should fail", function (done) {
		var limit = 101;

		node.api.get("/peers?&limit="+limit)
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				done();
			});
	});

	it("Using invalid parameters. Should fail", function (done) {
		var state = "invalid", os = "invalid", shared = "invalid", version = "invalid", limit = "invalid", offset = "invalid", orderBy = "invalid";

		node.api.get("/peers?state="+state+"&os="+os+"&shared="+shared+"&version="+version+"&limit="+limit+"&offset="+offset+"orderBy="+orderBy)
			.set("Accept", "application/json")
			.expect("Content-Type", /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property("success").to.be.false;
				node.expect(res.body).to.have.property("error");
				done();
			});
	});
});
