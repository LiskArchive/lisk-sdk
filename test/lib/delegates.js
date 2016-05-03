"use strict";

// Requires and node configuration
var node = require("./../variables.js");

// Account info for a RANDOM account (which we create later) - 0 LISK amount | Will act as delegate
var Raccount = node.randomAccount();

var test = 0;

// Print data to console
console.log("Starting delegates test-suite");
console.log("Password for random account is: " + Raccount.password);
console.log("Random LISK is: " + (node.LISK / node.normalizer));
console.log("Random delegate username is: " + Raccount.username);

// Starting tests //

describe("Delegates", function() {

    describe("Voting and delegate registrations from an account with 0 LISK", function() {

        test += 1;
        it(test + ". We attempt to upVote a delegate from a new random account. We expect error (account should have 0 LISK)",function(done){
            node.api.post("/accounts/open")
                .set("Accept", "application/json")
                .send({
                    secret: Raccount.password
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("account").that.is.an("object");
                    Raccount.address = res.body.account.address;
                    Raccount.publicKey = res.body.account.publicKey;
                    Raccount.balance = res.body.account.balance;

                    node.onNewBlock(function(err) {
                        node.expect(err).to.be.not.ok;
                        node.api.put("/accounts/delegates")
                            .set("Accept", "application/json")
                            .send({
                                secret: Raccount.password,
                                delegates: ["+" + node.Eaccount.publicKey]
                            })
                            .expect("Content-Type", /json/)
                            .expect(200)
                            .end(function (err, res) {
                                console.log(JSON.stringify(res.body));
                                node.expect(res.body).to.have.property("success").to.be.false;
                                node.expect(res.body).to.have.property("error");
                                node.expect(res.body.error).to.match(/Account has no LISK: [0-9]+/);
                                done();
                            });
                    });
                });
        });

        test += 1;
        it(test + ". We attempt to downVote a delegate from a new random account. We expect error (account should have 0 LISK)",function(done){
            node.onNewBlock(function(err) {
                node.api.put("/accounts/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        delegates: ["-" + node.Eaccount.publicKey]
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        node.expect(res.body.error).to.contain("Failed to remove vote");
                        done();
                    });
            });
        });

        test += 1;
        it(test + ". We attempt to register a delegate from a new random account. We expect error (account should have 0 LISK)",function(done){
            node.api.put("/delegates")
                .set("Accept", "application/json")
                .send({
                    secret: Raccount.password,
                    username: Raccount.username
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    if (res.body.success == false && res.body.error != null){
                        node.expect(res.body.error).to.match(/Account has no LISK: [0-9]+/);
                    }
                    else{
                        console.log("Expected error and got success");
                        console.log("Sent: secret: " + Raccount.password + ", username: " + Raccount.username);
                        node.expect("TEST").to.equal("FAILED");
                    }
                    done();
                });
        });

    });

    describe("Upvoting and downvoting",function() {

        before(function(done){
            // Send random LISK amount from genesis account to Random account

            node.api.put("/transactions")
                .set("Accept", "application/json")
                .send({
                    secret: node.Gaccount.password,
                    amount: node.LISK,
                    recipientId: Raccount.address
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("transactionId");
                    if (res.body.success == true && res.body.transactionId != null){
                        node.expect(res.body.transactionId).to.be.above(1);
                        Raccount.amount += node.LISK;
                    }
                    else{
                        console.log("Transaction failed or transactionId is null");
                        console.log("Sent: secret: " + node.Gaccount.password + ", amount: " + node.LISK + ", recipientId: " + Raccount.address);
                        node.expect("TEST").to.equal("FAILED");
                    }
                    done();
                });
        });

        before(function (done) {
            // Check that Raccount has the LISK we sent

            node.onNewBlock(function(err){
            node.expect(err).to.be.not.ok;

                node.api.post("/accounts/open")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        if (res.body.success == true && res.body.account != null){
                            node.expect(res.body.account.balance).to.be.equal(String(node.LISK));
                        }
                        else{
                            console.log("Failed to open account or account object is null");
                            console.log("Sent: secret: " + Raccount.password);
                            node.expect("TEST").to.equal("FAILED");
                        }
                        done();
                    });
            });
        });

        test += 1;
        it(test + ". We attempt to upVote the same delegate multiple times from an account. We expect error",function(done){
            var votedDelegate = "'+" + node.Eaccount.publicKey + "','+" + node.Eaccount.publicKey + "'";
            node.onNewBlock(function(err){
                node.api.put("/accounts/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        delegates: [votedDelegate]
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        if (res.body.success == true){
                            console.log("Sent: secret:" + Raccount.password + ", delegates: [" + votedDelegate + "]");
                        }
                        done();
                    });
            });
        });

        test += 1;
        it(test + ". We attempt to downVote the same delegate multiple times from an account. We expect error",function(done){
            var votedDelegate = "'-" + node.Eaccount.publicKey + "','-" + node.Eaccount.publicKey + "'";
            node.onNewBlock(function(err){
                node.api.put("/accounts/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        delegates: [votedDelegate]
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        if (res.body.success == true){
                            console.log("Sent: secret:" + Raccount.password + ", delegates: [" + votedDelegate + "]");
                        }
                        done();
                    });
            });
        });

        test += 1;
        it(test + ". We attempt to upVote & downVote the same delegate within the same request. We expect error",function(done){
            var votedDelegate = "'+" + node.Eaccount.publicKey + "','-" + node.Eaccount.publicKey + "'";
            node.onNewBlock(function(err){
                node.api.put("/accounts/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        delegates: [votedDelegate]
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        if (res.body.success == true){
                            console.log("Sent: secret:" + Raccount.password + ", delegates: [" + votedDelegate) + "]";
                        }
                        done();
                    });
            });
        });

        test += 1;
        it(test + ". We attempt to upVote a delegate from a new random account. We expect success",function(done){
            node.api.put("/accounts/delegates")
                .set("Accept", "application/json")
                .send({
                    secret: Raccount.password,
                    delegates: ["+" + node.Eaccount.publicKey]
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("transaction").that.is.an("object");
                    if (res.body.success == true && res.body.transaction != null){
                        node.expect(res.body.transaction.type).to.equal(node.TxTypes.VOTE);
                        node.expect(res.body.transaction.amount).to.equal(0);
                        node.expect(res.body.transaction.senderPublicKey).to.equal(Raccount.publicKey);
                        node.expect(res.body.transaction.fee).to.equal(node.Fees.voteFee);
                    }
                    else {
                        console.log("Transaction failed or transaction object is null");
                        console.log("Sent: secret: " + Raccount.password + ", delegates: [+" + node.Eaccount.publicKey + "]");
                        node.expect("TEST").to.equal("FAILED");
                    }
                    done();
                });
        });

        test += 1;
        it(test + ". We attempt to upVote a delegate from the same random account. We expect error",function(done){
            node.onNewBlock(function(err){
                node.api.put("/accounts/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        delegates: ["+" + node.Eaccount.publicKey]
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        if (res.body.success == false && res.body.error != null){
                            node.expect(res.body.error.toLowerCase()).to.contain("already voted");
                        }
                        else{
                            console.log("Expected error but got success");
                            console.log("Sent: secret: " + Raccount.password + ", delegates: [+" + node.Eaccount.publicKey + "]");
                            node.expect("TEST").to.equal("FAILED");
                        }
                        done();
                    });
            });
        });

        test += 1;
        it(test + ". We attempt to downVote a delegate from a new random account. We expect success",function(done){
            // We wait for a new block
            node.onNewBlock(function(err){
            node.expect(err).to.be.not.ok;
                node.api.put("/accounts/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        delegates: ["-" + node.Eaccount.publicKey]
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        node.expect(res.body).to.have.property("transaction").that.is.an("object");
                        if (res.body.success == true && res.body.transaction != null){
                            node.expect(res.body.transaction.type).to.equal(node.TxTypes.VOTE);
                            node.expect(res.body.transaction.amount).to.equal(0);
                            node.expect(res.body.transaction.senderPublicKey).to.equal(Raccount.publicKey);
                            node.expect(res.body.transaction.fee).to.equal(node.Fees.voteFee);
                        }
                        else{
                            console.log("Expected success but got error");
                            console.log("Sent: secret: " + Raccount.password + ", delegates: [-" + node.Eaccount.publicKey + "]");
                            node.expect("TEST").to.equal("FAILED");
                        }
                        done();
                    });
            });
        });

        test += 1;
        it(test + ". We attempt to downVote a delegate again from the same random account. We expect error",function(done){
            node.onNewBlock(function(err){
                node.api.put("/accounts/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        delegates: ["-" + node.Eaccount.publicKey]
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        if (res.body.success == false && res.body.error != null) {
                            node.expect(res.body.error.toLowerCase()).to.contain("not voted");
                        }
                        else{
                            console.log("Expected error but got success");
                            console.log("Sent: secret: " + Raccount.password + ", delegates: [-" + node.Eaccount.publicKey + "]");
                            node.expect("TEST").to.equal("FAILED");
                        }
                        done();
                    });
            });
        });

        test += 1;
        it(test + ". We attempt to upVote a delegate with a blank secret. We expect error",function(done){
            node.api.put("/accounts/delegates")
                .set("Accept", "application/json")
                .send({
                    secret: "",
                    delegates: ["+" + node.Eaccount.publicKey]
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". We attempt to downVote a delegate with a blank secret. We expect error",function(done){
            node.api.put("/accounts/delegates")
                .set("Accept", "application/json")
                .send({
                    secret: "",
                    delegates: ["-" + node.Eaccount.publicKey]
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". We attempt to upVote a delegate without specifying any delegates. We expect error",function(done){
            node.onNewBlock(function(){
            node.api.put("/accounts/delegates")
                .set("Accept", "application/json")
                .send({
                    secret: Raccount.password,
                    delegates: ["+"]
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
            });
        });

        test += 1;
        it(test + ". We attempt to downVote a delegate without specifying any delegates. We expect error",function(done){
            node.onNewBlock(function(){
                node.api.put("/accounts/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        delegates: ["-"]
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            });
        });

        test += 1;
        it(test + ". We attempt to vote without specifying any delegates. We expect error",function(done){
            this.timeout(5000);
            setTimeout(function(){
            node.api.put("/accounts/delegates")
                .set("Accept", "application/json")
                .send({
                    secret: Raccount.password,
                    delegates: ""
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
            }, 3000);
        });
    });

    describe("Delegate registrations",function() {

        test += 1;
        it(test + ". We attempt to register a delegate with a blank secret. We expect error",function(done){
            node.api.put("/delegates")
                .set("Accept", "application/json")
                .send({
                    secret: "",
                    username: Raccount.username
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". We attempt to register a delegate with an invalid secret. We expect error",function(done){
            this.timeout(5000);
            setTimeout(function(){
                node.api.put("/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: [],
                        username: Raccount.username
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            }, 3000);
        });

        test += 1;
        it(test + ". We attempt to register a delegate with an invalid username. We expect error",function(done){
            this.timeout(5000);
            setTimeout(function(){
                node.api.put("/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        username: "~!@#$%^&*()_+.,?/"
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            }, 1000);
        });

        test += 1;
        it(test + ". We attempt to register a delegate with a username longer than 20 characters. We expect error",function(done){
            this.timeout(5000);
            setTimeout(function(){
                node.api.put("/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        username: "ABCDEFGHIJKLMNOPQRSTU"
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            }, 1000);
        });

        test += 1;
        it(test + ". We attempt to register a delegate with a blank username. We expect error",function(done){
            this.timeout(5000);
            setTimeout(function(){
                node.api.put("/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        username: ""
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            }, 1000);
        });

        test += 1;
        it(test + ". We attempt to register a delegate using valid parameters. We expect success",function(done){
            node.api.put("/delegates")
                .set("Accept", "application/json")
                .send({
                    secret: Raccount.password,
                    username: Raccount.username
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("transaction").that.is.an("object");
                    if (res.body.success == true && res.body.transaction != null){
                        node.expect(res.body.transaction.fee).to.equal(node.Fees.delegateRegistrationFee);
                        node.expect(res.body.transaction.asset.delegate.username).to.equal(Raccount.username);
                        node.expect(res.body.transaction.asset.delegate.publicKey).to.equal(Raccount.publicKey);
                        node.expect(res.body.transaction.type).to.equal(node.TxTypes.DELEGATE);
                        node.expect(res.body.transaction.amount).to.equal(0);
                    }
                    else {
                        console.log("Transaction failed or transaction object is null");
                        console.log("Sent: secret: " + Raccount.password + ", username: " + Raccount.username);
                        node.expect("TEST").to.equal("FAILED");
                    }
                    done();
                });
        });

        test += 1;
        it(test + ". We attempt to re-register a delegate using the same account. We expect error",function(done){
            node.onNewBlock(function(err){
        node.expect(err).to.be.not.ok;
                node.api.put("/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        username: Raccount.username
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            });
        });
    });

    describe("Get Delegates list",function() {

        test += 1;
        it(test + ". We attempt to get a list of all delegates. We expect success",function(done){
            var limit = 10;
            var offset = 0;
            node.api.get("/delegates?limit="+limit+"&offset="+offset+"&orderBy=vote:asc")
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("delegates").that.is.an("array");
                    node.expect(res.body).to.have.property("totalCount").that.is.at.least(0);
                    node.expect(res.body.delegates).to.have.length.of.at.most(limit);
                    var num_of_delegates = res.body.delegates.length;
                    console.log("Limit is " + limit + ". Number of delegates returned is: " + num_of_delegates);
                    console.log("Total Number of delegates returned is: " + res.body.totalCount);
                    if (num_of_delegates >= 1) {
                        for (var i = 0; i < num_of_delegates; i++) {
                            if (res.body.delegates[i + 1] != null) {
                                node.expect(res.body.delegates[i].vote).to.be.at.most(res.body.delegates[i + 1].vote);
                                node.expect(res.body.delegates[i]).to.have.property("username");
                                node.expect(res.body.delegates[i]).to.have.property("address");
                                node.expect(res.body.delegates[i]).to.have.property("publicKey");
                                node.expect(res.body.delegates[i]).to.have.property("vote");
                                node.expect(res.body.delegates[i]).to.have.property("rate");
                                node.expect(res.body.delegates[i]).to.have.property("productivity");
                            }
                        }
                    }
                    else {
                        console.log("Got 0 delegates");
                        node.expect("TEST").to.equal("FAILED");
                    }
                    done();
                });
        });

        test += 1;
        it(test + ". We attempt to get a list of all delegates using valid parameters. We expect success",function(done){
            var limit = 20;
            var offset = 10;
            node.api.get("/delegates?limit="+limit+"&offset="+offset+"&orderBy=rate:desc")
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("delegates").that.is.an("array");
                    node.expect(res.body).to.have.property("totalCount").that.is.at.least(0);
                    node.expect(res.body.delegates).to.have.length.of.at.most(limit);
                    var num_of_delegates = res.body.delegates.length;
                    console.log("Limit is: " + limit + ". Number of delegates returned is: " + num_of_delegates);
                    console.log("Total Number of delegates returned is: " + res.body.totalCount);
                    if (num_of_delegates >= 1) {
                        for (var i = 0; i < num_of_delegates; i++) {
                            if (res.body.delegates[i + 1] != null) {
                                node.expect(res.body.delegates[i].rate).to.be.at.least(res.body.delegates[i + 1].rate);
                            }
                        }
                    }
                    else {
                        console.log("Got 0 delegates");
                        node.expect("TEST").to.equal("FAILED");
                    }
                    done();
                });
        });

        test += 1;
        it(test + ". We attempt to get a list of all delegates using invalid parameters. We still expect success",function(done){
            // We expect success because invalid parameters that we send are optional parameters

            var limit = "invalid";
            var offset = "invalid";
            node.api.get("/delegates?limit="+limit+"&offset="+offset+"&orderBy=invalid")
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". We attempt to get a list of delegates voted by an address. We expect success",function(done) {
                node.api.get("/accounts/delegates?address=" + node.Gaccount.address)
                    .set("Accept", "application/json")
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        node.expect(res.body).to.have.property("delegates").that.is.an("array");
                        node.expect(res.body.delegates).to.have.length.of.at.least(1);
                        node.expect(res.body.delegates[0]).to.have.property("username");
                        node.expect(res.body.delegates[0]).to.have.property("address");
                        node.expect(res.body.delegates[0]).to.have.property("publicKey");
                        node.expect(res.body.delegates[0]).to.have.property("vote");
                        node.expect(res.body.delegates[0]).to.have.property("rate");
                        node.expect(res.body.delegates[0]).to.have.property("productivity");
                        done();
                    });
            });

        test += 1;
        it(test + ". We attempt to get a delegate with an invalid address. We expect error",function(done){
            node.api.get("/accounts/delegates?address=NOTaLiskAddress")
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

    });

    describe("Get voters",function() {

        before(function (done) {
            node.onNewBlock(function(err){
                node.expect(err).to.be.not.ok;
                node.api.put("/accounts/delegates")
                    .set("Accept", "application/json")
                    .send({
                        secret: Raccount.password,
                        delegates: ["+" + node.Eaccount.publicKey]
                    })
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        done();
                    });
            });

        });

        test += 1;
        it(test + ". We attempt to get delegate voters without a publicKey. We expect error",function(done){
            node.api.get("/delegates/voters?publicKey=")
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success");
                    if(res.body.success == false){
                        node.expect(res.body).to.have.property("error");
                    }
                    else{
                        node.expect(res.body).to.have.property("accounts").that.is.an("array");
                        node.expect(res.body.accounts.length).to.equal(0);
                    }

                    done();
                });
        });

        test += 1;
        it(test + ". We attempt to get delegate voters using an invalid publicKey. We expect error",function(done){
            node.api.get("/delegates/voters?publicKey=NotAPublicKey")
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". We attempt to get delegate voters using a valid publicKey. We expect success",function(done) {
            node.onNewBlock(function (err) {
                node.api.get("/delegates/voters?publicKey=" + node.Eaccount.publicKey)
                    .set("Accept", "application/json")
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        node.expect(res.body).to.have.property("accounts").that.is.an("array");
                        var flag = 0;
                        if (res.body.success == true && res.body.accounts != null) {
                            for (var i = 0; i < res.body.accounts.length; i++) {
                                if (res.body.accounts[i].address == Raccount.address) {
                                    flag = 1;
                                }
                            }
                        }
                        node.expect(flag).to.equal(1);
                        done();
                    });
            });
        });
    });

    console.log("Finished delegates-test suite");
});
