"use strict";

// Requires and node configuration
var node = require("./../variables.js");

var Account1 = node.randomTxAccount();
var Account2 = node.randomTxAccount();
var Account3 = node.randomTxAccount();

var transactionCount = 0;
var transactionList = [];
var offsetTimestamp = 0;

var expectedFee = 0;
var totalTxFee = 0;
var randomLISK = 0;

function openAccount (account, done) {
    node.api.post('/accounts/open')
        .set('Accept', 'application/json')
        .send({
            secret: account.password,
            secondSecret: account.secondPassword
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (err, res) {
            // console.log(JSON.stringify(res.body));
            // console.log('Opening account with password:', account.password);
            node.expect(res.body).to.have.property('success').to.be.true;
            if (res.body.success && res.body.account !== null) {
                account.address = res.body.account.address;
                account.publicKey = res.body.account.publicKey;
                account.balance = res.body.account.balance;
            } else {
                // console.log('Failed to open account');
                // console.log('Secret:', account.password, ', secondSecret:', account.secondPassword);
                node.expect(false).to.equal(true);
            }
            done();
        });
}

function sendLISK (account, done) {
    randomLISK = node.randomLISK();
    expectedFee = node.expectedFee(randomLISK);

    node.api.put('/transactions')
        .set('Accept', 'application/json')
        .send({
            secret: node.Gaccount.password,
            amount: randomLISK,
            recipientId: account.address
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (err, res) {
            // console.log(JSON.stringify(res.body));
            node.expect(res.body).to.have.property('success').to.be.true;
            if (res.body.success && res.body.transactionId !== null) {
                // console.log('Sent to:', account.address, (randomLISK / node.normalizer), 'LISK');
                // console.log('Expected fee (paid by sender):', expectedFee / node.normalizer, 'LISK');
                account.balance += randomLISK;
                account.transactions.push(transactionCount);
                totalTxFee += (expectedFee / node.normalizer);
                transactionList[transactionCount - 1] = {
                    'sender': node.Gaccount.address,
                    'recipient': account.address,
                    'grossSent': (randomLISK + expectedFee) / node.normalizer,
                    'fee': expectedFee / node.normalizer,
                    'netSent': randomLISK / node.normalizer,
                    'txId': res.body.transactionId,
                    'type': node.TxTypes.SEND
                };
                transactionCount += 1;
            } else {
                // console.log('Sending LISK to:', account.address, 'failed');
                // console.log('Secret:', node.Gaccount.password, ', amount:', randomLISK);
                node.expect(false).to.equal(true);
            }
            done();
        });
}

before(function (done) {
    openAccount(Account1, done);
});

before(function (done) {
    openAccount(Account2, done);
});

before(function (done) {
    openAccount(Account3, done);
});

before(function (done) {
    setTimeout(function () {
        sendLISK(Account1, done);
    }, 2000);
});

before(function (done) {
    setTimeout(function () {
        sendLISK(Account2, done);
    }, 2000);
});

before(function (done) {
    node.onNewBlock(function (err) {
        node.expect(err).to.be.not.ok;
        // console.log("ACCOUNT 1:" + Account1);
        // console.log("ACCOUNT 2:" + Account2);
        done();
    });
});

describe("GET /api/transactions", function () {

    it("Using valid parameters. Should be ok", function (done) {
        var senderId = node.Gaccount.address, blockId = "", recipientId = Account1.address, limit = 10, offset = 0, orderBy = "amount:asc";

        node.api.get("/transactions?blockId=" + blockId + "&senderId=" + senderId + "&recipientId=" + recipientId + "&limit=" + limit + "&offset=" + offset + "&orderBy=" + orderBy)
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("transactions").that.is.an("array");
                node.expect(res.body.transactions).to.have.length.within(transactionCount, limit);
                if (res.body.transactions.length > 0) {
                    for (var i = 0; i < res.body.transactions.length; i++) {
                        if (res.body.transactions[i + 1]) {
                            node.expect(res.body.transactions[i].amount).to.be.at.most(res.body.transactions[i+1].amount);
                        }
                    }
                } else {
                    // console.log("Request failed. Expected success");
                    node.expect(false).to.equal(true);
                }
                done();
            });
    });

    it("Using limit > 100. Should fail", function (done) {
        var senderId = node.Gaccount.address, blockId = "", recipientId = Account1.address, limit = 999999, offset = 0, orderBy = "amount:asc";

        node.api.get("/transactions?blockId=" + blockId + "&senderId=" + senderId + "&recipientId=" + recipientId + "&limit=" + limit + "&offset=" + offset + "&orderBy=" + orderBy)
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

    it("Ordered by ascending timestamp. Should be ok", function (done) {
        var senderId = "", blockId = "", recipientId = "", limit = 100, offset = 0, orderBy = "timestamp:asc";

        node.onNewBlock(function (err) {
            node.api.get("/transactions?blockId=" + blockId + "&recipientId=" + recipientId + "&limit=" + limit + "&offset=" + offset + "&orderBy=" + orderBy)
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    // console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("transactions").that.is.an("array");
                    node.expect(res.body.transactions).to.have.length.within(transactionCount, limit);
                    if (res.body.transactions.length > 0) {
                        var flag = 0;
                        for (var i = 0; i < res.body.transactions.length; i++) {
                            if (res.body.transactions[i + 1]) {
                                node.expect(res.body.transactions[i].timestamp).to.be.at.most(res.body.transactions[i + 1].timestamp);
                                if (flag == 0) {
                                    offsetTimestamp = res.body.transactions[i + 1].timestamp;
                                    flag = 1;
                                }
                            }
                        }
                    } else {
                        // console.log("Request failed. Expected success");
                        node.expect(false).to.equal(true);
                    }
                    done();
                });
        });
    });

    it("Using offset. Should be ok", function (done) {
        var senderId = "", blockId = "", recipientId = "", limit = 100, offset = 1, orderBy = "timestamp:asc";

        node.onNewBlock(function (err) {
            node.api.get("/transactions?blockId=" + blockId + "&recipientId=" + recipientId + "&limit=" + limit + "&offset=" + offset + "&orderBy=" + orderBy)
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    // console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("transactions").that.is.an("array");
                    node.expect(res.body.transactions).to.have.length.within(transactionCount, limit);
                    if (res.body.transactions.length > 0) {
                        node.expect(res.body.transactions[0].timestamp).to.be.equal(offsetTimestamp);
                    }
                    done();
                });
        });
    });

    it("Using string offset. Should fail", function (done) {
        var senderId = "", blockId = "", recipientId = "", limit = 100, offset = "ONE", orderBy = "timestamp:asc";

        node.api.get("/transactions?blockId=" + blockId + "&recipientId=" + recipientId + "&limit=" + limit + "&offset=" + offset + "&orderBy=" + orderBy)
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

    it("Using no limit. Should be ok", function (done) {
        var senderId = node.Gaccount.address, blockId = "", recipientId = Account1.address, offset = 0, orderBy = "amount:desc";

        node.api.get("/transactions?blockId=" + blockId + "&senderId=" + senderId + "&recipientId=" + recipientId + "&offset=" + offset + "&orderBy=" + orderBy)
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("transactions").that.is.an("array");
                if (res.body.transactions.length > 0) {
                    for (var i = 0; i < res.body.transactions.length; i++) {
                        if (res.body.transactions[i + 1]) {
                            node.expect(res.body.transactions[i].amount).to.be.at.least(res.body.transactions[i+1].amount);
                        }
                    }
                }
                done();
            });
    });

    it("Using completely invalid fields. Should fail", function (done) {
        var senderId = "notAReadAddress", blockId = "about5", recipientId = "LISKLIOnair3", limit = "aLOT", offset = "Boris", orderBy = "blockId:asc";

        node.api.get("/transactions?blockId=" + blockId + "&senderId=" + senderId + "&recipientId=" + recipientId + "&limit=" + limit + "&offset=" + offset + "&orderBy=" + orderBy)
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

    it("Using partially invalid fields. Should fail", function (done) {
        var senderId = "notAReadAddress", blockId = "about5", recipientId = Account1.address, limit = "aLOT", offset = "Boris", orderBy = "blockId:asc";

        node.api.get("/transactions?blockId=" + blockId + "&senderId=" + senderId + "&recipientId=" + recipientId + "&limit=" + limit + "&offset=" + offset + "&orderBy=" + orderBy)
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

describe("PUT /api/transactions", function () {

    it("Using valid parameters. Should be ok", function (done) {
        var amountToSend = 100000000;

        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                amount: amountToSend,
                recipientId: Account2.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("transactionId");
                if (res.body.success == true && res.body.transactionId != null) {
                    expectedFee = node.expectedFee(amountToSend);
                    Account1.balance -= (amountToSend + expectedFee);
                    Account2.balance += amountToSend;
                    Account1.transactions.push(transactionCount);
                    transactionList[transactionCount] = {
                        "sender": Account1.address,
                        "recipient": Account2.address,
                        "grossSent": (amountToSend + expectedFee) / node.normalizer,
                        "fee": expectedFee / node.normalizer,
                        "netSent": amountToSend / node.normalizer,
                        "txId": res.body.transactionId,
                        "type": node.TxTypes.SEND
                    }
                    transactionCount += 1;
                } else {
                    // console.log("Failed Tx or transactionId is null");
                    // console.log("Sent: secret: " + Account1.password + ", amount: " + amountToSend + ", recipientId: " + Account2.address);
                    node.expect(false).to.equal(true);
                }
                done();
            });
    });

    it("Using negative amount. Should fail", function (done) {
        var amountToSend = -100000000;

        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                amount: amountToSend,
                recipientId: Account2.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                done();
            });
    });

    it("Using float amount. Should fail", function (done) {
        var amountToSend = 1.2;

        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                amount: amountToSend,
                recipientId: Account2.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                done();
            });
    });

    it("Using entire balance. Should fail", function (done) {
        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                amount: Account1.balance,
                recipientId: Account2.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                done();
            });
    });

    it("Using zero amount. Should fail", function (done) {
        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                amount: 0,
                recipientId: Account2.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                done();
            });
    });

    it("Using positive overflown amount. Should fail", function (done) {
        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                amount: 1298231812939123812939123912939123912931823912931823912903182309123912830123981283012931283910231203,
                recipientId: Account2.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                done();
            });
    });

    it("Using negative overflown amount. Should fail", function (done) {
        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                amount: -1298231812939123812939123912939123912931823912931823912903182309123912830123981283012931283910231203,
                recipientId: Account2.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                done();
            });
    });

    it("Using small fractional amount. Should be ok", function (done) {
        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                amount: 1,
                recipientId: Account2.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("transactionId");
                done();
            });
    });

    it("Using no passphase. Should fail", function (done) {
        var amountToSend = 100000000;

        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                amount: amountToSend,
                recipientId: Account2.address
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                done();
            });
    });

    it("Using no recipient. Should fail", function (done) {
        var amountToSend = 100000000;

        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                amount: amountToSend
            })
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

describe("GET /transactions/get?id=", function () {

    it("Using valid id. Should be ok", function (done) {
        var transactionInCheck = transactionList[0];
        node.api.get("/transactions/get?id="+transactionInCheck.txId)
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("transaction").that.is.an("object");
                if (res.body.success == true && res.body.transaction.id != null) {
                    node.expect(res.body.transaction.id).to.equal(transactionInCheck.txId);
                    node.expect(res.body.transaction.amount / node.normalizer).to.equal(transactionInCheck.netSent);
                    node.expect(res.body.transaction.fee / node.normalizer).to.equal(transactionInCheck.fee);
                    node.expect(res.body.transaction.recipientId).to.equal(transactionInCheck.recipient);
                    node.expect(res.body.transaction.senderId).to.equal(transactionInCheck.sender);
                    node.expect(res.body.transaction.type).to.equal(transactionInCheck.type);
                } else {
                    // console.log("Transaction failed or transaction list is null");
                    node.expect(false).to.equal(true);
                }
                done();
            });
    });

    it("Using invalid id. Should fail", function (done) {
        node.api.get("/transactions/get?id=NotTxId")
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

describe("GET /transactions", function () {

    it("Using type. Should be ok", function (done) {
        node.api.get("/transactions?type=" + node.TxTypes.SEND)
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                if (res.body.success == true && res.body.transactions != null) {
                    for (var i = 0; i < res.body.transactions.length; i++) {
                        if (res.body.transactions[i]) {
                            node.expect(res.body.transactions[i].type).to.equal(node.TxTypes.SEND);
                        }
                    }
                } else {
                    // console.log("Request failed or transaction list is null");
                    node.expect(false).to.equal(true);
                }
                done();
            });
    });
});

describe("GET /transactions/unconfirmed/get?id=", function () {

    it("Using valid id. Should be ok ", function (done) {
        node.api.get("/transactions/unconfirmed/get?id=" + transactionList[transactionCount-1].txId)
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success");
                if (res.body.success == true) {
                    if (res.body.transaction != null) {
                        node.expect(res.body.transaction.id).to.equal(transactionList[transactionCount-1].txId);
                    }
                } else {
                    // console.log("Transaction already processed");
                    node.expect(res.body).to.have.property("error");
                }
                done();
            });
    });
});

describe("GET /transactions/unconfirmed", function () {

    it("Should be ok", function (done) {
        node.api.get("/transactions/unconfirmed")
            .set("Accept", "application/json")
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("transactions").that.is.an("array");
                done();
            });
    });
});

describe("PUT /signatures", function () {

    it("When account has no funds. Should fail", function (done) {
        node.api.put("/signatures")
            .set("Accept", "application/json")
            .send({
                secret: Account3.password,
                secondSecret: Account3.password
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                done();
            });
    });

    it("Using invalid passphrase. Should fail", function (done) {
        node.api.put("/signatures")
            .set("Accept", "application/json")
            .send({
                secret: "Account1.password",
                secondSecret: Account1.password
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                done();
            });
    });

    it("Using no second passphrase. Should fail", function (done) {
        node.api.put("/signatures")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                done();
            });
    });

    it("Using valid parameters. Should be ok ", function (done) {
        node.api.put("/signatures")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                secondSecret: Account1.secondPassword
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.true;
                node.expect(res.body).to.have.property("transaction").that.is.an("object");
                if (res.body.success == true && res.body.transaction != null) {
                    node.expect(res.body.transaction).to.have.property("type").to.equal(node.TxTypes.SIGNATURE);
                    node.expect(res.body.transaction).to.have.property("senderPublicKey").to.equal(Account1.publicKey);
                    node.expect(res.body.transaction).to.have.property("senderId").to.equal(Account1.address);
                    node.expect(res.body.transaction).to.have.property("fee").to.equal(node.Fees.secondPasswordFee);
                    Account1.transactions.push(transactionCount);
                    transactionCount += 1;
                    Account1.balance -= node.Fees.secondPasswordFee;
                    transactionList[transactionCount - 1] = {
                        "sender": Account1.address,
                        "recipient": "SYSTEM",
                        "grossSent": 0,
                        "fee": node.Fees.secondPasswordFee,
                        "netSent": 0,
                        "txId": res.body.transaction.id,
                        "type":node.TxTypes.SIGNATURE
                    }
                } else {
                    // console.log("Transaction failed or transaction object is null");
                    // console.log("Sent: secret: " + Account1.password + ", secondSecret: " + Account1.secondPassword);
                    node.expect(false).to.equal(true);
                }
                done();
            });
    });
});

describe("PUT /transactions (with second passphase now enabled)", function () {

    before(function (done) {
        node.onNewBlock(done);
    });

    it("Without specifying second passphase on account. Should fail", function (done) {
        var amountToSend = 100000000;

        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                recipientId: Account2.address,
                amount: amountToSend
            })
            .expect("Content-Type", /json/)
            .expect(200)
            .end(function (err, res) {
                // console.log(JSON.stringify(res.body));
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("error");
                done();
            });
    });

    it("Using second passphase but without primary passphase. Should fail", function (done) {
        var amountToSend = 100000000;

        node.api.put("/transactions")
            .set("Accept", "application/json")
            .send({
                secondSecret: Account1.secondPassword,
                recipientId: Account2.address,
                amount: amountToSend
            })
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

describe("PUT /delegates (with second passphase now enabled)", function () {

    it("Without specifying second passphase on account. Should fail", function (done) {
        node.api.put("/delegates")
            .set("Accept", "application/json")
            .send({
                secret: Account1.password,
                username: Account1.delegateName
            })
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
