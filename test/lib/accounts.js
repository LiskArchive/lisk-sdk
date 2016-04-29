"use strict";

var path = require("path");
var spawn = require("child_process").spawn;

// Requires and node configuration
var node = require("./../variables.js");
var test = 0;

// Account info for password "sebastian"  - 0 LISK amount
var Saccount = {
    "address" : "12099044743111170367L",
    "publicKey" : "fbd20d4975e53916488791477dd38274c1b4ec23ad322a65adb171ec2ab6a0dc",
    "password" : "sebastian",
    "name" : "sebastian",
    "balance": 0
};

console.log("Starting account-test suite");

describe("Account", function() {

    test = test + 1;
    it(test + ". Opening account with password: "+Saccount.password+". Expecting success",function(done){
        node.api.post("/accounts/open")
            .set("Accept", "application/json")
            .send({
                secret: Saccount.password
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("account").that.is.an("object");
                node.expect(res.body.account.address).to.equal(Saccount.address);
                node.expect(res.body.account.publicKey).to.equal(Saccount.publicKey);
                Saccount.balance = res.body.account.balance;
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/open but sending EMPTY JSON. Expecting error",function(done){
        node.api.post("/accounts/open")
            .set("Accept", "application/json")
            .send({
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // node.expect(res.body.error).to.contain("Provide secret key of account");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/open but sending EMPTY STRING as secret in json content. Expecting error",function(done){
        node.api.post("/accounts/open")
            .set("Accept", "application/json")
            .send({
                secret:""
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // node.expect(res.body.error).to.contain("Provide secret key of account");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/open but sending INVALID JSON content. Expecting error",function(done){
        node.api.post("/accounts/open")
            .set("Accept", "application/json")
            .send("{\"invalid\"}")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // node.expect(res.body.error).to.contain("Provide secret key of account");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/getBalance and verifying reply. Expecting success",function(done){
        node.api.get("/accounts/getBalance?address=" + Saccount.address)
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("balance");
                node.expect(res.body.balance).to.equal(Saccount.balance);
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/getBalance but sending INVALID ADDRESS. Expecting error",function(done){
        node.api.get("/accounts/getBalance?address=thisIsNOTALiskAddress")
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // expect(res.body.error).to.contain("Provide valid Lisk address");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/getBalance but NOT SENDING ADDRESS. Expecting error",function(done){
        node.api.get("/accounts/getBalance")
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // node.expect(res.body.error).to.contain("Provide address in url");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/getPublicKey and verifying reply. Expecting success",function(done){
        node.api.get("/accounts/getPublicKey?address=" + Saccount.address)
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("publicKey");
                node.expect(res.body.publicKey).to.equal(Saccount.publicKey);
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/getPublicKey but SENDING INVALID ADDRESS. Expecting error",function(done){
        node.api.get("/accounts/getPublicKey?address=thisIsNOTALiskAddress")
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // expect(res.body.error).to.contain("Provide valid Lisk address");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/getPublicKey but SENDING INVALID ADDRESS. Expecting error",function(done){
        node.api.get("/accounts/getPublicKey?address=")
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // expect(res.body.error).to.contain("Provide valid Lisk address");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/generatePublicKey and verifying reply. Expecting success",function(done){
        node.api.post("/accounts/generatePublicKey")
            .set("Accept", "application/json")
            .send({
                secret:Saccount.password
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("publicKey");
                node.expect(res.body.publicKey).to.equal(Saccount.publicKey);
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/generatePublicKey but SENDING EMPTY STRING as secret. Expecting error",function(done){
        node.api.post("/accounts/generatePublicKey")
            .set("Accept", "application/json")
            .send({
                secret:""
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // node.expect(res.body.error).to.contain("Provide secret key");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/generatePublicKey but NOT SENDING ANYTHING. Expecting error",function(done){
        node.api.post("/accounts/generatePublicKey")
            .set("Accept", "application/json")
            .send({
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // node.expect(res.body.error).to.contain("Provide secret key");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/generatePublicKey but SENDING INVALID CONTENT. Expecting error",function(done){
        node.api.post("/accounts/generatePublicKey")
            .set("Accept", "application/json")
            .send("{\"invalid\"}")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // node.expect(res.body.error).to.contain("Provide secret key");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts/generatePublicKey but SENDING INVALID CONTENT. Expecting error",function(done){
        node.api.post("/accounts/generatePublicKey")
            .set("Accept", "application/json")
            .send("{\"invalid\"}")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // node.expect(res.body.error).to.contain("Provide secret key");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts and verifying reply. Expecting success",function(done){
        node.api.get("/accounts?address=" + Saccount.address)
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("account").that.is.an("object");
                node.expect(res.body.account.address).to.equal(Saccount.address);
                node.expect(res.body.account.publicKey).to.equal(Saccount.publicKey);
                node.expect(res.body.account.balance).to.equal(Saccount.balance);
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts but SENDING INVALID ADDRESS. Expecting error",function(done){
        node.api.get("/accounts?address=thisIsNOTAValidLiskAddress")
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // expect(res.body.error).to.contain("Provide valid Lisk address");
                done();
            });
    });

    test = test + 1;
    it(test + ". Testing /accounts but SENDING EMPTY ADDRESS. Expecting error",function(done){
        node.api.get("/accounts?address=")
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res){
                console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                // node.expect(res.body.error).to.contain("Provide address in url");
                done();
            });
    });

    console.log("Finished Account-test suite");
});
