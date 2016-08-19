"use strict";

var node = require("./../variables.js"),
    crypto = require("crypto");

var genesisblock = require("../../genesisBlock.json");

describe("POST /peer/blocks", function () {

    it("Using invalid nethash in headers. Should fail", function (done) {
        node.peer.post("/blocks")
            .set("Accept", "application/json")
            .set("version",node.version)
            .set("nethash", "wrongnethash")
            .set("port",node.config.port)
            .send({
                dummy: "dummy"
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body.expected).to.equal(node.config.nethash);
                done();
            });
    });
});

describe("GET /peer/blocks", function () {

    it("Using correct nethash in headers. Should be ok", function (done) {
        node.peer.get("/blocks")
            .set("Accept", "application/json")
            .set("version",node.version)
            .set("port",node.config.port)
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body.blocks));
                node.expect(res.headers.nethash).to.equal(node.config.nethash);
                node.expect(res.body.blocks.length).to.be.greaterThan(1);
                done();
            });
    });
});
