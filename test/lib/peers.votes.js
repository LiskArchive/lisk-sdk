"use strict";

var async = require("async");
var node = require("./../variables.js");

node.chai.config.includeStack = true;

function getDelegates (done) {
    node.api.get("/delegates")
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
            // console.log(JSON.stringify(res.body));
            node.expect(res.body).to.have.property("success").to.be.true;
            node.expect(res.body).to.have.property("delegates").that.is.an("array");
            return done(err, res);
        });
}

function getVotes (address, done) {
    node.api.get("/accounts/delegates/?address=" + address)
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
            // console.log(JSON.stringify(res.body));
            node.expect(res.body).to.have.property("success").to.be.true;
            node.expect(res.body).to.have.property("delegates").that.is.an("array");
            return done(err, res);
        });
}

function makeVotes (delegates, passphrase, action, done) {
    async.eachSeries(delegates, function (delegate, eachCb) {
        makeVote (delegate, passphrase, action, function (err, res) {
            node.expect(res.body).to.have.property("success").to.be.true;
            return eachCb();
        });
    }, function (err) {
        node.onNewBlock(function (err) {
            return done(err);
        });
    });
}

function makeVote (delegate, passphrase, action, done) {
    var transaction = node.lisk.vote.createVote(passphrase, [action + delegate]);

    node.peer.post("/transactions")
        .set("Accept", "application/json")
        .set("version", node.version)
        .set("port", node.config.port)
        .set("nethash", node.config.nethash)
        .send({
            transaction: transaction
        })
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
            // console.log("Sent: " + JSON.stringify(transaction) + " Got reply: " + JSON.stringify(res.body));
            return done(err, res);
        });
}

function openAccount (passphrase, done) {
    node.api.post("/accounts/open")
        .set("Accept", "application/json")
        .set("version",node.version)
        .set("nethash", node.config.nethash)
        .set("port", node.config.port)
        .send({
            secret: passphrase
        })
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
            // console.log(JSON.stringify(res.body));
            node.expect(res.body).to.have.property("success").to.be.true;
            node.onNewBlock(function (err) {
                return done(err, res);
            });
        });
}

function sendLISK (amount, recipientId, done) {
    node.api.put("/transactions")
        .set("Accept", "application/json")
        .set("version", node.version)
        .set("nethash", node.config.nethash)
        .set("port", node.config.port)
        .send({
            secret: node.Gaccount.password,
            amount: amount,
            recipientId: recipientId
        })
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
            // console.log(JSON.stringify(res.body));
            node.expect(res.body).to.have.property("success").to.be.true;
            node.onNewBlock(function (err) {
                return done(err, res);
            });
        });
}

function registerDelegate (account, done) {
    account.username = node.randomDelegateName().toLowerCase();
    var transaction = node.lisk.delegate.createDelegate(account.password, account.username);

    node.peer.post("/transactions")
        .set("Accept", "application/json")
        .set("version", node.version)
        .set("nethash", node.config.nethash)
        .set("port", node.config.port)
        .send({
            transaction: transaction
        })
        .expect("Content-Type", /json/)
        .expect(200)
        .end(function (err, res) {
            // console.log("Sent: " + JSON.stringify(transaction) + " Got reply: " + JSON.stringify(res.body));
            node.expect(res.body).to.have.property("success").to.be.true;
            node.onNewBlock(function (err) {
                return done(err, res);
            });
        });
}

describe("POST /peer/transactions", function () {
    var account = node.randomAccount();

    var delegates = [];

    var delegate1;
    var delegate2;

    before(function (done) {
        async.series([
            function (seriesCb) {
                openAccount(account.password, function (err, res) {
                    account.address = res.body.account.address;
                    account.publicKey = res.body.account.publicKey;
                    return seriesCb();
                });
            },
            function (seriesCb) {
                sendLISK(100000000000, account.address, seriesCb);
            },
            function (seriesCb) {
                getDelegates(function (err, res) {
                    delegate1 = res.body.delegates[0].publicKey;
                    delegate2 = res.body.delegates[1].publicKey;

                    return seriesCb();
                });
            },
            function (seriesCb) {
                getVotes(account.address, function (err, res) {
                    delegates = res.body.delegates.map(function (delegate) {
                        return delegate.publicKey;
                    });

                    return seriesCb();
                });
            },
            function (seriesCb) {
                return makeVotes(delegates, account.password, "-", seriesCb);
            },
            function (seriesCb) {
                return makeVotes([delegate1, delegate2], account.password, "+", seriesCb);
            }
        ], function (err) {
            return done(err);
        });
    });

    it("Voting twice for a delegate. Should fail", function (done) {
        makeVote(delegate1, account.password, "+", function (err, res) {
            node.expect(res.body).to.have.property("success").to.be.false;
            done();
        });
    });

    it("Removing votes from a delegate. Should be ok", function (done) {
        makeVote(delegate1, account.password, "-", function (err, res) {
            node.expect(res.body).to.have.property("success").to.be.true;
            done();
        });
    });

    it("Removing votes from a delegate and then voting again. Should fail", function (done) {
        makeVote(delegate2, account.password, "-", function (err, res) {
            node.expect(res.body).to.have.property("success").to.be.true;
            makeVote(delegate2, account.password, "+", function (err, res) {
                node.expect(res.body).to.have.property("success").to.be.false;
                done();
            });
        });
    });
});

describe("POST /peer/transactions (for a new delegate)", function () {
    var account = node.randomAccount();

    before(function (done) {
        async.series([
            function (seriesCb) {
                openAccount(account.password, function (err, res) {
                    account.address = res.body.account.address;
                    account.publicKey = res.body.account.publicKey;
                    return seriesCb();
                });
            },
            function (seriesCb) {
                sendLISK(100000000000, account.address, seriesCb);
            },
            function (seriesCb) {
                registerDelegate(account, seriesCb);
            }
        ], function (err) {
            return done(err);
        });
    });

    it("Voting for self. Should be ok", function (done) {
        makeVote(account.publicKey, account.password, "+", function (err, res) {
            node.expect(res.body).to.have.property("success").to.be.true;
            node.onNewBlock(function (err) {
                return done(err);
            });
        });
    });

    it("Removing vote from self. Should be ok", function (done) {
        makeVote(account.publicKey, account.password, "-", function (err, res) {
            node.expect(res.body).to.have.property("success").to.be.true;
            done();
        });
    });
});
