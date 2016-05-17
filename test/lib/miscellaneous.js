"use strict";

// Requires and node configuration
var node = require("./../variables.js");
var test = 0;

var block = {
    blockHeight : 0,
    id : 0,
    generatorPublicKey : "",
    totalAmount : 0,
    totalFee : 0
};

var testBlocksUnder101 = 0;

describe("Load Testing", function () {

    describe("POST /accounts/open", function () {
        test = test + 1;
        it(test + ". When payload is over 2Mb. Should fail", function (done) {
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

});

describe("Peers", function () {

    describe("GET /peers/version", function () {

        test = test + 1;
        it(test + ". Should be ok", function (done) {
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

        test = test + 1;
        it(test + ". Using empty parameters. Should fail", function (done) {
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

        test = test + 1;
        it(test + ". Using state. Should be ok", function (done) {
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

        test = test + 1;
        it(test + ". Using limit. Should be ok", function (done) {
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

        test = test + 1;
        it(test + ". Using orderBy. Should be ok", function (done) {
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

        test = test + 1;
        it(test + ". Using limit > 100. Should fail", function (done) {
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

        test = test + 1;
        it(test + ". Using invalid parameters. Should fail", function (done) {
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

});

describe("Blocks", function () {

    describe("GET /blocks/getHeight", function () {

        test = test + 1;
        it(test + ". Should be ok", function (done) {
            node.api.get("/blocks/getHeight")
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    // console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    if (res.body.success == true && res.body.height != null) {
                        node.expect(res.body).to.have.property("height").to.be.above(0);
                        if (res.body.success == true) {
                            block.blockHeight = res.body.height;
                            if (res.body.height > 100) {
                                testBlocksUnder101 = true;
                            }
                        }
                    } else {
                        console.log("Request failed or height is null");
                    }
                    done();
                });
        });

    });

    describe("GET /blocks/getFee", function () {

        test = test + 1;
        it(test + ". Should be ok", function (done) {
            node.api.get("/blocks/getFee")
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    // console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    if (res.body.success == true && res.body.fee != null) {
                        node.expect(res.body).to.have.property("fee");
                        node.expect(res.body.fee).to.equal(node.Fees.transactionFee);
                    } else {
                        console.log("Request failed or fee is null");
                    }
                    done();
                });
        });

    });

    describe("GET /blocks", function () {

        test = test + 1;
        it(test + ". Using height. Should be ok", function (done) {
            var height = block.blockHeight, limit = 100, offset = 0;
            node.api.get("/blocks?height="+height+"&limit="+limit+"&offset="+offset)
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    // console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    if (res.body.success == true && res.body.blocks != null) {
                        node.expect(res.body).to.have.property("blocks").that.is.an("array");
                        node.expect(res.body).to.have.property("count").to.equal(1);
                        node.expect(res.body.blocks.length).to.equal(1);
                        node.expect(res.body.blocks[0]).to.have.property("previousBlock");
                        node.expect(res.body.blocks[0]).to.have.property("totalAmount");
                        node.expect(res.body.blocks[0]).to.have.property("totalFee");
                        node.expect(res.body.blocks[0]).to.have.property("generatorId");
                        node.expect(res.body.blocks[0]).to.have.property("confirmations");
                        node.expect(res.body.blocks[0]).to.have.property("blockSignature");
                        node.expect(res.body.blocks[0]).to.have.property("numberOfTransactions");
                        node.expect(res.body.blocks[0].height).to.equal(block.blockHeight);
                        block.id = res.body.blocks[0].id;
                        block.generatorPublicKey = res.body.blocks[0].generatorPublicKey;
                        block.totalAmount = res.body.blocks[0].totalAmount;
                        block.totalFee = res.body.blocks[0].totalFee;
                    } else {
                        console.log("Request failed or blocks array is null");
                    }
                    done();
                });
        });

        test = test + 1;
        it(test + ". Using height < 100. Should be ok", function (done) {
            if (testBlocksUnder101) {
                var height = 10;
                node.api.get("/blocks?height="+height)
                    .set("Accept", "application/json")
                    .expect("Content-Type", /json/)
                    .expect(200)
                    .end(function (err, res) {
                        // console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        if (res.body.success == true && res.body.blocks != null) {
                            node.expect(res.body).to.have.property("count");
                            node.expect(res.body).to.have.property("blocks").that.is.an("array");
                            node.expect(res.body.blocks.length).to.equal(1);
                            node.expect(res.body.blocks[0]).to.have.property("previousBlock");
                            node.expect(res.body.blocks[0]).to.have.property("totalAmount");
                            node.expect(res.body.blocks[0]).to.have.property("totalFee");
                            node.expect(res.body.blocks[0]).to.have.property("generatorId");
                            node.expect(res.body.blocks[0]).to.have.property("confirmations");
                            node.expect(res.body.blocks[0]).to.have.property("blockSignature");
                            node.expect(res.body.blocks[0]).to.have.property("numberOfTransactions");
                            node.expect(res.body.blocks[0].height).to.equal(10);
                            block.id = res.body.blocks[0].id;
                            block.generatorPublicKey = res.body.blocks[0].generatorPublicKey;
                            block.totalAmount = res.body.blocks[0].totalAmount;
                            block.totalFee = res.body.blocks[0].totalFee;
                        } else {
                            console.log("Request failed or blocks array is null");
                        }
                        done();
                    });
            } else {
                done();
            }
        });

        test = test + 1;
        it(test + ". Using generatorPublicKey. Should be ok", function (done) {
            var generatorPublicKey = block.generatorPublicKey, limit = 100, offset = 0, orderBy = "";
            node.api.get("/blocks?generatorPublicKey="+generatorPublicKey+"&limit="+limit+"&offset="+offset)
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    // console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("blocks").that.is.an("array");
                    for (var i = 0; i < res.body.blocks.length; i++) {
                        node.expect(res.body.blocks[i].generatorPublicKey).to.equal(block.generatorPublicKey);
                    }
                    done();
                });
        });

        test = test + 1;
        it(test + ". Using totalFee. Should be ok", function (done) {
            var totalFee = block.totalFee, limit = 100, offset = 0;
            node.api.get("/blocks?totalFee="+totalFee+"&limit="+limit+"&offset="+offset)
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    // console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("blocks").that.is.an("array");
                    for (var i = 0; i < res.body.blocks.length; i++) {
                        node.expect(res.body.blocks[i].totalFee).to.equal(block.totalFee);
                    }
                    done();
                });
        });

        test = test + 1;
        it(test + ". Using totalAmount. Should be ok", function (done) {
            var totalAmount = block.totalAmount, limit = 100, offset = 0;
            node.api.get("/blocks?totalAmount="+totalAmount+"&limit="+limit+"&offset="+offset)
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    // console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("blocks").that.is.an("array");
                    for (var i = 0; i < res.body.blocks.length; i++) {
                        node.expect(res.body.blocks[i].totalAmount).to.equal(block.totalAmount);
                    }
                    done();
                });
        });

        test = test + 1;
        it(test + ". Using previousBlock. Should be ok", function (done) {
            if (block.id != null) {
                var previousBlock = block.id;
                node.onNewBlock(function (err) {
                    node.expect(err).to.be.not.ok;
                    node.api.get("/blocks?previousBlock="+previousBlock)
                        .set("Accept", "application/json")
                        .expect("Content-Type", /json/)
                        .expect(200)
                        .end(function (err, res) {
                            // console.log(JSON.stringify(res.body));
                            node.expect(res.body).to.have.property("success").to.be.true;
                            node.expect(res.body).to.have.property("blocks").that.is.an("array");
                            node.expect(res.body.blocks).to.have.length(1);
                            node.expect(res.body.blocks[0].previousBlock).to.equal(previousBlock);
                            done();
                        });
                });
            }
        });

        test = test + 1;
        it(test + ". Using orderBy. Should be ok", function (done) {
            var orderBy = "height:desc";
            node.api.get("/blocks?orderBy="+orderBy)
                .set("Accept", "application/json")
                .expect("Content-Type", /json/)
                .expect(200)
                .end(function (err, res) {
                    // console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    node.expect(res.body).to.have.property("blocks").that.is.an("array");
                    for (var i = 0; i < res.body.blocks.length; i++) {
                        if (res.body.blocks[i+1] != null) {
                            node.expect(res.body.blocks[i].height).to.be.above(res.body.blocks[i+1].height);
                        }
                    }
                    done();
                });
        });
    });

});
