"use strict";

// Requires and node configuration
var node = require("./../variables.js");

var totalMembers = node.randomNumber(2,16);
var requiredSignatures = node.randomNumber(2,totalMembers+1);

var NoLISKAccount = node.randomAccount();
NoLISKAccount.name = "nolisk";

var MultisigAccount = node.randomAccount();
MultisigAccount.name = "multi";

var Accounts = [];
for (var i=0; i < totalMembers; i++) {
    Accounts[i] = node.randomAccount();
}

var MultiSigTX = {
    lifetime : 0,
    min : 0,
    members : [],
    txId : ""
}

// Used for opening accounts
var accountOpenTurn = 0;

function openAccount (account, i) {
    node.api.post("/accounts/open")
        .set("Accept", "application/json")
        .send({
            secret: account.password,
            secondSecret: account.secondPassword
        })
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
            if (i != null) {
                console.log("Opening Account " + i + " with password: " + account.password);
            }
            node.expect(res.body).to.have.property("success").to.be.true;
            if (res.body.account != null && i != null) {
                  Accounts[i].address = res.body.account.address;
                  Accounts[i].publicKey = res.body.account.publicKey;
            } else if (account.name == "nolisk") {
                NoLISKAccount.address = res.body.account.address;
                NoLISKAccount.publicKey = res.body.account.publicKey;
            } else if (account.name == "multi") {
                MultisigAccount.address = res.body.account.address;
                MultisigAccount.publicKey = res.body.account.publicKey;
            }
          });
}

// Used for sending LISK to accounts
var accountSendTurn = 0;

function sendLISK (account, i) {
    node.onNewBlock(function (err) {
        var randomLISK = node.randomLISK();
        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secret: node.Gaccount.password,
                amount: randomLISK,
                recipientId: account.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                //console.log(JSON.stringify(res.body));
                //console.log("Sending " + randomLISK + " LISK to " + account.address);
                node.expect(res.body).to.have.property("success").to.be.true;
                if (res.body.success == true && i != null) {
                    Accounts[i].balance = randomLISK / node.normalizer;
                }
            });
    });
}

function sendLISKfromMultisigAccount (amount, recipient) {
    node.api.put("/transactions")
        .set("Accept", "application/json")
        .send({
            secret: MultisigAccount.password,
            amount: amount,
            recipientId: recipient
        })
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
            //console.log(JSON.stringify(res.body));
            //console.log("Sending " + amount + " LISK to " + recipient);
            node.expect(res.body).to.have.property("success").to.be.true;
            if (res.body.success == true) {
                node.expect(res.body).to.have.property("transactionId");
            }
        });
}

function confirmTransaction (account, id) {
    node.api.put("/multisignatures/sign")
        .set("Accept", "application/json")
        .send({
            secret: account.password,
            transactionId: id
        })
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
            //console.log("Signing Tx ID = " + id + " from account with password = " + account.password + " Got reply: " + JSON.stringify(res.body));
            node.expect(res.body).to.have.property("success").to.be.true;
        });
}

// Used for KeysGroup
var Keys;

function makeKeysGroup () {
    var keysgroup = [];
    for (var i = 0; i < totalMembers; i++) {
        var member = "+" + Accounts[i].publicKey;
        keysgroup.push(member);
    }
    return keysgroup;
}

// Used for test labeling
var test = 0;

// Starting tests //

describe("Multisignatures", function () {

    before(function (done) {
        for ( var i = 0; i < Accounts.length; i++) {
            if (Accounts[i] != null) {
                openAccount(Accounts[i],i);
                setTimeout(function () {
                    if (accountOpenTurn < totalMembers) {
                        accountOpenTurn += 1;
                    }
                }, 2000);
            }
        }
        openAccount(NoLISKAccount, null);
        openAccount(MultisigAccount, null);
        done();
    });

    before(function (done) {
       for (var i = 0; i < (Accounts.length); i++) {
           if(Accounts[i] != null) {
               sendLISK(Accounts[i], i);
           }
       }
       sendLISK(MultisigAccount, null);
       done();
    });

    before(function (done) {
        // Wait for two new blocks to ensure all data has been recieved
        node.onNewBlock(function (err) {
            node.onNewBlock(function (err) {
                node.expect(err).to.be.not.ok;
                //console.log(Accounts);
                done();
            });
        });
    });

    describe("Create Multisignature Account", function () {

        before(function (done) {
            Keys = makeKeysGroup();
            done();
        });

        test += 1;
        it(test + ". Owner PublicKey in keysgroup. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: Accounts[Accounts.length-1].password,
                    lifetime: 1,
                    min: requiredSignatures,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Account with 0 LISK. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: NoLISKAccount.password,
                    lifetime: 1,
                    min: requiredSignatures,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Empty Keysgroup. We expect error", function (done) {
            var emptyKeys = [];
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: 1,
                    min: requiredSignatures,
                    keysgroup: emptyKeys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". No Keysgroup. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: 1,
                    min: requiredSignatures
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Invalid Keysgroup. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: 1,
                    min: requiredSignatures,
                    keysgroup: "invalid"
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". No Secret. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    lifetime: 1,
                    min: requiredSignatures,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Invalid Secret. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password + "inv4lid",
                    lifetime: 1,
                    min: requiredSignatures,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". No lifetime. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    min: requiredSignatures,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Invalid type lifetime. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: "invalid",
                    min: requiredSignatures,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Lifetime greater than allowed. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: 99999999,
                    min: requiredSignatures,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". 0 Lifetime. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: 0,
                    min: requiredSignatures,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Negative Lifetime. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: -1,
                    min: requiredSignatures,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Lifetime as string. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: "2",
                    min: requiredSignatures,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". No Min. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: 1,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Invalid Min. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: 1,
                    min: "invalid",
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Min Greater than members. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: 1,
                    min: totalMembers + 5,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Min 0. We expect error", function (done) {
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: 1,
                    min: 0,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Min negative value. We expect error", function (done) {
            var minimum = -1 * requiredSignatures;
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: 1,
                    min: minimum,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Min as string. We expect error", function (done) {
            var minimum =  toString(requiredSignatures);
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: 1,
                    min: minimum,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Valid data. We expect success", function (done) {
            var life = parseInt(node.randomNumber(1,25));
            node.api.put("/multisignatures")
                .set("Accept", "application/json")
                .send({
                    secret: MultisigAccount.password,
                    lifetime: life,
                    min: requiredSignatures,
                    keysgroup: Keys
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    // console.log("Sent valid information to create multisignature. " + JSON.stringify({
                    //         secret: MultisigAccount.password,
                    //         lifetime: life,
                    //         min: requiredSignatures,
                    //         keysgroup: Keys
                    //     }));
                    if (res.body.error != null) {
                        console.log(res.body.error);
                    }
                    //console.log(res.body);
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("transactionId");
                    if (res.body.success == true && res.body.transactionId != null) {
                        MultiSigTX.txId = res.body.transactionId;
                        MultiSigTX.lifetime = life;
                        MultiSigTX.members = Keys;
                        MultiSigTX.min = requiredSignatures;
                    } else {
                        console.log("Transaction failed or transactionId null");
                        node.expect("test").to.equal("failed");
                    }
                    done();
                });
        });

    });

    describe("Get pending multisignatures", function () {

        test += 1;
        it(test + ". Get multisignature transactions. invalid publicKey. We expect error", function (done) {
            var publicKey = 1234;
            node.api.get("/multisignatures/pending?publicKey=" + publicKey)
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("error");
                    done();
                });
        });

        test += 1;
        it(test + ". Get multisignature transactions. no publicKey. We expect success but no transactions return", function (done) {
            node.api.get("/multisignatures/pending?publicKey=")
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success");
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("transactions").that.is.an("array");
                    node.expect(res.body.transactions.length).to.equal(0);
                    done();
                });
        });

        test += 1;
        it(test + ". Get multisignature transactions. valid publicKey. We expect success", function (done) {
            node.onNewBlock(function (err) {
                //console.log(JSON.stringify(MultisigAccount));
                node.api.get("/multisignatures/pending?publicKey=" + MultisigAccount.publicKey)
                    .set("Accept", "application/json")
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        //console.log("Asked for pending multisig Transactions. Got reply: " + JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        node.expect(res.body).to.have.property("transactions").that.is.an("array");
                        node.expect(res.body.transactions.length).to.be.at.least(1);
                        var flag = 0;
                        for (var i = 0; i < res.body.transactions.length; i++) {
                            //console.log(MultisigAccount.publicKey);
                            if (res.body.transactions[i].transaction.senderPublicKey == MultisigAccount.publicKey) {
                                flag += 1;
                                node.expect(res.body.transactions[i].transaction).to.have.property("type").to.equal(node.TxTypes.MULTI);
                                node.expect(res.body.transactions[i].transaction).to.have.property("amount").to.equal(0);
                                node.expect(res.body.transactions[i].transaction).to.have.property("asset").that.is.an("object");
                                node.expect(res.body.transactions[i].transaction).to.have.property("fee").to.equal(node.Fees.multisignatureRegistrationFee * (Keys.length + 1));
                                node.expect(res.body.transactions[i].transaction).to.have.property("id").to.equal(MultiSigTX.txId);
                                node.expect(res.body.transactions[i].transaction).to.have.property("senderPublicKey").to.equal(MultisigAccount.publicKey);
                                node.expect(res.body.transactions[i]).to.have.property("lifetime").to.equal(''+MultiSigTX.lifetime);
                                node.expect(res.body.transactions[i]).to.have.property("min").to.equal(''+MultiSigTX.min);
                            }
                        }
                        node.expect(flag).to.equal(1);
                        done();
                    });
            });
        });
    });

    describe("Sign Pending Multisignature", function () {

        test += 1;
        it(test + ". Confirm Tx, sending invalid password. We expect error", function (done) {
            node.api.put("/multisignatures/sign")
                .set("Accept", "application/json")
                .send({
                    secret: 1234,
                    transactionId: MultiSigTX.txId
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    done();
                });
        });

        test += 1;
        it(test + ". Confirm Tx, send null password. We expect error", function (done) {
            node.api.put("/multisignatures/sign")
                .set("Accept", "application/json")
                .send({
                    secret: null,
                    transactionId: MultiSigTX.txId
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    done();
                });
        });

        test += 1;
        it(test + ". Confirm Tx, send undefined password. We expect error", function (done) {
            var undefined;
            node.api.put("/multisignatures/sign")
                .set("Accept", "application/json")
                .send({
                    secret: undefined,
                    transactionId: MultiSigTX.txId
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    done();
                });
        });

        test += 1;
        it(test + ". Confirm Tx, send a random password. We expect error (account not associated)", function (done) {
            node.api.put("/multisignatures/sign")
                .set("Accept", "application/json")
                .send({
                    secret: "Just 4 R4nd0m P455W0RD",
                    transactionId: MultiSigTX.txId
                })
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    //console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.false;
                    done();
                });
        });

        test += 1;
        it(test + ". Try to send LISK FROM multisignature account (confirmations still pending). We expect success", function (done) {
            node.onNewBlock(function (err) {
                sendLISKfromMultisigAccount(100000000, node.Gaccount.address);
                done();
            });
        });
    });
});
