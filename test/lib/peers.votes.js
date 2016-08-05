"use strict";

var async = require("async");
var node = require("./../variables.js");

var account = node.randomAccount();

var delegate;
var delegates = [];
var votedDelegates = [];

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

function makeVotes (options, done) {
    var count = 0;
    var limit = Math.ceil(options.delegates.length / 25);

    async.whilst(
        function () {
            return count <= limit;
        }, function (untilCb) {
            node.onNewBlock(function (err) {
                count++;
                return untilCb();
            });
        }, function (err) {
            async.eachSeries(options.delegates, function (delegate, eachCb) {
                makeVote(delegate, options.passphrase, options.action, function (err, res) {
                    options.voteCb(err, res);
                    return eachCb();
                });
            }, function (err) {
                node.onNewBlock(function (err) {
                    return done(err);
                });
            });
        }
    );
}

function makeVote (delegates, passphrase, action, done) {
    if (!Array.isArray(delegates)) {
        delegates = [delegates];
    }

    var transaction = node.lisk.vote.createVote(passphrase, delegates.map(function (delegate) {
        return action + delegate;
    }));

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
                    delegates = res.body.delegates.map(function (delegate) {
                        return delegate.publicKey;
                    }).slice(0, 101);

                    delegate = res.body.delegates[0].publicKey;

                    return seriesCb();
                });
            },
            function (seriesCb) {
                getVotes(account.address, function (err, res) {
                    votedDelegates = res.body.delegates.map(function (delegate) {
                        return delegate.publicKey;
                    });

                    return seriesCb();
                });
            },
            function (seriesCb) {
                return makeVotes({
                    delegates: votedDelegates,
                    passphrase: account.password,
                    action: "-",
                    voteCb: function (err, res) {
                        node.expect(res.body).to.have.property("success").to.be.true;
                    }
                }, seriesCb);
            }
        ], function (err) {
            return done(err);
        });
    });

    it("Voting for a delegate and then removing again within same block. Should be fail", function (done) {
        node.onNewBlock(function (err) {
            makeVote(delegate, account.password, "+", function (err, res) {
                node.expect(res.body).to.have.property("success").to.be.true;
                makeVote(delegate, account.password, "-", function (err, res) {
                    node.expect(res.body).to.have.property("success").to.be.false;
                    done();
                });
            });
        });
    });

    it("Removing votes from a delegate and then voting again within same block. Should be fail", function (done) {
        node.onNewBlock(function (err) {
            makeVote(delegate, account.password, "-", function (err, res) {
                node.expect(res.body).to.have.property("success").to.be.true;
                makeVote(delegate, account.password, "+", function (err, res) {
                    node.expect(res.body).to.have.property("success").to.be.false;
                    done();
                });
            });
        });
    });

    it("Voting twice for a delegate. Should fail", function (done) {
        async.series([
            function (seriesCb) {
                node.onNewBlock(function (err) {
                    makeVote(delegate, account.password, "+", function (err, res) {
                        node.expect(res.body).to.have.property("success").to.be.true;
                        done();
                    });
                });
            },
            function (seriesCb) {
                node.onNewBlock(function (err) {
                    makeVote(delegate, account.password, "+", function (err, res) {
                        node.expect(res.body).to.have.property("success").to.be.false;
                        done();
                    });
                });
            },
        ], function (err) {
            return done(err);
        });
    });

    it("Removing votes from a delegate. Should be ok", function (done) {
        node.onNewBlock(function (err) {
            makeVote(delegate, account.password, "-", function (err, res) {
                node.expect(res.body).to.have.property("success").to.be.true;
                done();
            });
        });
    });

    it("Voting for 33 delegates at once. Should be ok", function (done) {
        node.onNewBlock(function (err) {
            makeVote(delegates.slice(0, 33), account.password, "+", function (err, res) {
                node.expect(res.body).to.have.property("success").to.be.true;
                done();
            });
        });
    });

    it("Removing votes from 33 delegates at once. Should be ok", function (done) {
        node.onNewBlock(function (err) {
            makeVote(delegates.slice(0, 33), account.password, "-", function (err, res) {
                node.expect(res.body).to.have.property("success").to.be.true;
                done();
            });
        });
    });

    it("Voting for 34 delegates at once. Should fail", function (done) {
        node.onNewBlock(function (err) {
            makeVote(delegates.slice(0, 34), account.password, "+", function (err, res) {
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("message").to.eql("Voting limit exceeded. Maximum is 33 votes per transaction");
                done();
            });
        });
    });

    it("Voting for 101 delegates separately. Should be ok", function (done) {
        node.onNewBlock(function () {
            makeVotes({
                delegates: delegates,
                passphrase: account.password,
                action: "+",
                voteCb: function (err, res) {
                    node.expect(res.body).to.have.property("success").to.be.true;
                }
            }, done);
        });
    });

    it("Removing votes from 34 delegates at once. Should fail", function (done) {
        node.onNewBlock(function (err) {
            makeVote(delegates.slice(0, 34), account.password, "-", function (err, res) {
                node.expect(res.body).to.have.property("success").to.be.false;
                node.expect(res.body).to.have.property("message").to.eql("Voting limit exceeded. Maximum is 33 votes per transaction");
                done();
            });
        });
    });

    it("Removing votes from 101 delegates separately. Should be ok", function (done) {
        makeVotes({
            delegates: delegates,
            passphrase: account.password,
            action: "-",
            voteCb: function (err, res) {
                node.expect(res.body).to.have.property("success").to.be.true;
            }
        }, done);
    });
});

describe("POST /peer/transactions (after registering a new delegate)", function () {

    before(function (done) {
        async.series([
            function (seriesCb) {
                getDelegates(function (err, res) {
                    delegates = res.body.delegates.map(function (delegate) {
                        return delegate.publicKey;
                    }).slice(0, 101);

                    return seriesCb();
                });
            },
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

    it("Exceeding maximum of 101 votes within same block. Should fail", function (done) {
        async.series([
            function (seriesCb) {
                var slicedDelegates = delegates.slice(0, 76);
                node.expect(slicedDelegates).to.have.lengthOf(76);

                makeVotes({
                    delegates: slicedDelegates,
                    passphrase: account.password,
                    action: "+",
                    voteCb: function (err, res) {
                        node.expect(res.body).to.have.property("success").to.be.true;
                    }
                }, seriesCb);
            },
            function (seriesCb) {
                var slicedDelegates = delegates.slice(-25);
                node.expect(slicedDelegates).to.have.lengthOf(25);

                makeVote(slicedDelegates, account.password, "+", function (err, res) {
                    node.expect(res.body).to.have.property("success").to.be.false;
                    node.expect(res.body).to.have.property("message").to.eql("Maximum number of 101 votes exceeded (1 too many).");
                    seriesCb();
                });
            }
        ], function (err) {
            return done(err);
        });
    });

    it("Removing vote from self. Should be ok", function (done) {
        makeVote(account.publicKey, account.password, "-", function (err, res) {
            node.expect(res.body).to.have.property("success").to.be.true;
            done();
        });
    });
});
