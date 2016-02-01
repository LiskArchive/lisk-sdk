'use strict';

// Requires and node configuration
var node = require('./../variables.js');

// Account info for a RANDOM account (which we create later) - 0 LISK amount | Will act as delegate
var Account1 = node.randomTxAccount();
var Account2 = node.randomTxAccount();
var Account3 = node.randomTxAccount();

var transactionCount = 0;
var transactionList = [];
var offsetTimestamp = 0;

// Used for calculating amounts
var expectedFee = 0;
var totalTxFee = 0;

// Used for test labeling
var test = 0;

// Print data to console
console.log("Starting transactions-test suite");
console.log("Password for Account 1 is: " + Account1.password);
console.log("Password for Account 2 is: " + Account2.password);

// Starting tests //

describe('Transactions', function() {

    before(function (done) {
        node.api.post('/accounts/open')
            .set('Accept', 'application/json')
            .send({
                secret: Account1.password,
                secondSecret: Account1.secondPassword
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                console.log(JSON.stringify(res.body));
                console.log('Opening Account 1 with password: ' + Account1.password);
                node.expect(res.body).to.have.property("success").to.be.true;
                if (res.body.success == true && res.body.account != null){
                    Account1.address = res.body.account.address;
                    Account1.publicKey = res.body.account.publicKey;
                    Account1.balance = res.body.account.balance;
                }
                else {
                    console.log('Unable to open account1, tests will fail');
                    console.log('Data sent: secret: ' + Account1.password + ' , secondSecret: ' + Account1.secondPassword );
                    node.expect("TEST").to.equal("FAILED");
                }
                done();
            });
    });

    before(function (done) {
        node.api.post('/accounts/open')
            .set('Accept', 'application/json')
            .send({
                secret: Account2.password,
                secondSecret: Account2.secondPassword
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                console.log(JSON.stringify(res.body));
                console.log('Opening Account 2 with password: ' + Account2.password);
                node.expect(res.body).to.have.property("success").to.be.true;
                if (res.body.success == true && res.body.account != null) {
                    Account2.address = res.body.account.address;
                    Account2.publicKey = res.body.account.publicKey;
                    Account2.balance = res.body.account.balance;
                }
                else{
                    console.log('Unable to open account2, tests will fail');
                    console.log('Data sent: secret: ' + Account2.password + ' , secondSecret: ' + Account2.secondPassword );
                    node.expect("TEST").to.equal("FAILED");
                }
                done();
            });
    });

    before(function (done) {
        node.api.post('/accounts/open')
            .set('Accept', 'application/json')
            .send({
                secret: Account3.password,
                secondSecret: Account3.secondPassword
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                console.log(JSON.stringify(res.body));
                console.log('Opening Account 3 with password: ' + Account3.password);
                node.expect(res.body).to.have.property("success").to.be.true;
                if (res.body.success == true && res.body.account != null) {
                    Account3.address = res.body.account.address;
                    Account3.publicKey = res.body.account.publicKey;
                    Account3.balance = res.body.account.balance;
                }
                else{
                    console.log('Unable to open account3, tests will fail');
                    console.log('Data sent: secret: ' + Account3.password + ' , secondSecret: ' + Account3.secondPassword );
                    node.expect("TEST").to.equal("FAILED");
                }
                done();
            });
    });

    before(function (done) {
        // Send to LISK to account 1 address
        setTimeout(function() {
            randomLISK = node.randomizeLISK();
            expectedFee = node.expectedFee(randomLISK);
            node.api.put('/transactions')
                .set('Accept', 'application/json')
                .send({
                    secret: node.Faccount.password,
                    amount: randomLISK,
                    recipientId: Account1.address
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    node.expect(res.body).to.have.property("success").to.be.true;
                    if (res.body.success == true && res.body.transactionId != null) {
                        console.log('Sent to ' + Account1.address + ' ' + (randomLISK / node.normalizer) + ' LISK');
                        console.log('Expected fee (paid by sender): ' + expectedFee / node.normalizer + ' LISK');
                        Account1.transactions.push(transactionCount);
                        transactionCount += 1;
                        totalTxFee += (expectedFee / node.normalizer);
                        Account1.balance += randomLISK;
                        transactionList[transactionCount - 1] = {
                            'sender': node.Faccount.address,
                            'recipient': Account1.address,
                            'brutoSent': (randomLISK + expectedFee) / node.normalizer,
                            'fee': expectedFee / node.normalizer,
                            'nettoSent': randomLISK / node.normalizer,
                            'txId': res.body.transactionId,
                            'type':node.TxTypes.SEND
                        }
                    }
                    else{
                        console.log("Sending LISK to Account1 failed.");
                        console.log("Sent: secret: " + node.Faccount.password + ", amount: " + randomLISK + ", recipientId: " + Account1.address );
                        node.expect("TEST").to.equal("FAILED");
                    }
                    done();
                });
        },2000);
    });

    before(function (done) {
        // Send to LISK to account 1 address
        setTimeout(function() {
            randomLISK = node.randomizeLISK();
            expectedFee = node.expectedFee(randomLISK);
            node.api.put('/transactions')
                .set('Accept', 'application/json')
                .send({
                    secret: node.Faccount.password,
                    amount: randomLISK,
                    recipientId: Account2.address
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    console.log(JSON.stringify(res.body));
                    console.log('We send the LISK from foundation account to account. Recipient is: ' + Account2.address);
                    console.log('Sent to ' + Account2.address + ' ' + (randomLISK / node.normalizer) + ' LISK');
                    console.log('Expected fee (paid by sender): ' + expectedFee / node.normalizer + ' LISK');
                    node.expect(res.body).to.have.property("success").to.be.true;
                    if (res.body.success == true && res.body.transactionId != null) {
                        Account2.transactions.push(transactionCount);
                        transactionCount += 1;
                        totalTxFee += (expectedFee / node.normalizer);
                        Account2.balance += randomLISK;
                        transactionList[transactionCount - 1] = {
                            'sender': node.Faccount.address,
                            'recipient': Account2.address,
                            'brutoSent': (randomLISK + expectedFee) / node.normalizer,
                            'fee': expectedFee / node.normalizer,
                            'nettoSent': randomLISK / node.normalizer,
                            'txId': res.body.transactionId,
                            'type':node.TxTypes.SEND
                        }
                    }
                    else{
                        console.log("Sending LISK to Account2 failed.");
                        console.log("Sent: secret: " + node.Faccount.password + ", amount: " + randomLISK + ", recipientId: " + Account2.address );
                        node.expect("TEST").to.equal("FAILED");
                    }
                    done();
                });
        },2000);
    });

    before(function (done) {

        // Wait for new block to ensure all data has been recieved
        node.onNewBlock(function(err) {
      node.expect(err).to.be.not.ok;
            console.log("ACCOUNT 1:" + Account1);
            console.log("ACCOUNT 2:" + Account2);
            done();
        });
    });

        describe('/transactions', function () {
            test = test + 1;
            it(test + '. Attempting to get transactions list. Expecting success', function (done) {
                var senderId = node.Faccount.address, blockId = '', recipientId = Account1.address, limit = 10, offset = 0, orderBy = 't_amount:asc';

                console.log(Account1);
                console.log('/transactions?blockId=' + blockId + '&senderId=' + senderId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy);
                node.api.get('/transactions?blockId=' + blockId + '&senderId=' + senderId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        node.expect(res.body).to.have.property("transactions").that.is.an('array');
                        node.expect(res.body.transactions).to.have.length.within(transactionCount, limit);
                        if (res.body.transactions.length > 0){
                            for (var i=0; i < res.body.transactions.length; i++){
                                if (res.body.transactions[i+1] != null){
                                    node.expect(res.body.transactions[i].amount).to.be.at.most(res.body.transactions[i+1].amount);
                                }
                            }
                        }
                        else{
                            console.log("Request failed. Expected success");
                            node.expect("TEST").to.equal("FAILED");
                        }
                        done();
                    });
            });

            test = test + 1;
            it(test + '. Attempting to get transactions list. Invalid limit. Expecting error', function (done) {
                var senderId = node.Faccount.address, blockId = '', recipientId = Account1.address, limit = 999999, offset = 0, orderBy = 't_amount:asc';

                node.api.get('/transactions?blockId=' + blockId + '&senderId=' + senderId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            });

            test = test + 1;
            it(test + '. Attempting to get transactions list. Order by timestamp. Expecting success', function (done) {
                var senderId = '', blockId = '', recipientId = '', limit = 100, offset = 0, orderBy = 't_timestamp:asc';

                node.onNewBlock(function(err){
                    node.api.get('/transactions?blockId=' + blockId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            console.log(JSON.stringify(res.body));
                            node.expect(res.body).to.have.property("success").to.be.true;
                            node.expect(res.body).to.have.property("transactions").that.is.an('array');
                            node.expect(res.body.transactions).to.have.length.within(transactionCount, limit);
                            if (res.body.transactions.length > 0) {
                                var flag = 0;
                                for (var i = 0; i < res.body.transactions.length; i++) {
                                    if (res.body.transactions[i + 1] != null) {
                                        node.expect(res.body.transactions[i].timestamp).to.be.at.most(res.body.transactions[i + 1].timestamp);
                                        if (flag == 0) {
                                            offsetTimestamp = res.body.transactions[i + 1].timestamp;
                                            flag = 1;
                                        }
                                    }
                                }
                            }
                            else{
                                console.log("Request failed. Expected success");
                                node.expect("TEST").to.equal("FAILED");
                            }
                            done();
                        });
                });
            });

            test = test + 1;
            it(test + '. Attempting to get transactions list. Using Offset. Expecting success', function (done) {
                var senderId = '', blockId = '', recipientId = '', limit = 100, offset = 1, orderBy = 't_timestamp:asc';
                node.onNewBlock(function(err) {
                    node.api.get('/transactions?blockId=' + blockId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            console.log(JSON.stringify(res.body));
                            node.expect(res.body).to.have.property("success").to.be.true;
                            node.expect(res.body).to.have.property("transactions").that.is.an('array');
                            node.expect(res.body.transactions).to.have.length.within(transactionCount, limit);
                            if (res.body.transactions.length > 0) {
                                node.expect(res.body.transactions[0].timestamp).to.be.equal(offsetTimestamp);
                            }
                            done();
                        });
                });
            });

            test = test + 1;
            it(test + '. Attempting to get transactions list. Using Offset as TEXT. Expecting error', function (done) {
                var senderId = '', blockId = '', recipientId = '', limit = 100, offset = 'ONE', orderBy = 't_timestamp:asc';
                node.api.get('/transactions?blockId=' + blockId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                   });
            });

            test = test + 1;
            it(test + '. Attempting to get transactions list. No limit. Expecting success', function (done) {
                var senderId = node.Faccount.address, blockId = '', recipientId = Account1.address, offset = 0, orderBy = 't_amount:desc';

                node.api.get('/transactions?blockId=' + blockId + '&senderId=' + senderId + '&recipientId=' + recipientId + '&offset=' + offset + '&orderBy=' + orderBy)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        node.expect(res.body).to.have.property("transactions").that.is.an('array');
                        if (res.body.transactions.length > 0){
                            for (var i = 0; i < res.body.transactions.length; i++){
                                if (res.body.transactions[i+1] != null){
                                    node.expect(res.body.transactions[i].amount).to.be.at.least(res.body.transactions[i+1].amount);
                                }
                            }
                        }
                        done();
                    });
            });

            test = test + 1;
            it(test + '. Attempting to get transactions list. Sending INVALID FIELDS. Expecting error', function (done) {
                var senderId = "notAReadAddress", blockId = 'about5', recipientId = 'LISKLIOnair3', limit = 'aLOT', offset = 'Boris', orderBy = 't_blockId:asc';

                node.api.get('/transactions?blockId=' + blockId + '&senderId=' + senderId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            });

            test = test + 1;
            it(test + '. Attempting to get transactions list. Sending PARTIAL INVALID FIELDS. Expecting error', function (done) {
                var senderId = "notAReadAddress", blockId = 'about5', recipientId = Account1.address, limit = 'aLOT', offset = 'Boris', orderBy = 't_blockId:asc';
                node.onNewBlock(function(err){
          node.expect(err).to.be.not.ok;
          node.api.get('/transactions?blockId=' + blockId + '&senderId=' + senderId + '&recipientId=' + recipientId + '&limit=' + limit + '&offset=' + offset + '&orderBy=' + orderBy)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
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
            it(test + '. We send LISK from Account 1 (' + Account1.password + ') to Account 2 (' + Account2.address + ') - valid data. We expect success',function(done){
                node.onNewBlock(function(err) {
          node.expect(err).to.be.not.ok;
                    amountToSend = 100000000;
                    node.api.put('/transactions')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            amount: amountToSend,
                            recipientId: Account2.address
                        })
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            console.log(JSON.stringify(res.body));
                            node.expect(res.body).to.have.property("success").to.be.true;
                            node.expect(res.body).to.have.property("transactionId");
                            if (res.body.success == true && res.body.transactionId != null){
                                expectedFee = node.expectedFee(amountToSend);
                                Account1.balance -= (amountToSend + expectedFee);
                                Account2.balance += amountToSend;
                                Account1.transactions.push(transactionCount);
                                transactionList[transactionCount] = {
                                    'sender': Account1.address,
                                    'recipient': Account2.address,
                                    'brutoSent': (amountToSend + expectedFee) / node.normalizer,
                                    'fee': expectedFee / node.normalizer,
                                    'nettoSent': amountToSend / node.normalizer,
                                    'txId': res.body.transactionId,
                                    'type': node.TxTypes.SEND
                                }
                                transactionCount += 1;
                            }
                            else{
                                console.log("Failed Tx or transactionId is null");
                                console.log("Sent: secret: " + Account1.password + ", amount: " + amountToSend + ", recipientId: " + Account2.address);
                                node.expect("TEST").to.equal("FAILED");
                            }
                            done();
                        });
                });
            });

            test += 1;
            it(test + '. We attempt to GET the UNCONFIRMED TX. We expect success',function(done){
                node.api.get('/transactions/unconfirmed/get?id=' + transactionList[transactionCount-1].txId)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success");
                        if (res.body.success == true){
                            if (res.body.transaction != null){
                                node.expect(res.body.transaction.id).to.equal(transactionList[transactionCount-1].txId);
                            }
                        }
                        else{
                            console.log("Transaction already processed");
                            node.expect(res.body).to.have.property("error");
                        }
                        done();
                    });
            });

            test += 1;
            it(test + '. We try to send NEGATIVE LISK VALUE from Account 1 to Account 2. We expect error',function(done){
                    amountToSend = -100000000;
                    node.api.put('/transactions')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            amount: amountToSend,
                            recipientId: Account2.address
                        })
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            console.log(JSON.stringify(res.body));
                            node.expect(res.body).to.have.property("success").to.be.false;
                            node.expect(res.body).to.have.property("error");
                            done();
                        });
            });

            test += 1;
            it(test + '. We try to send INVALID LISK VALUE from Account 1 to Account 2. We expect error',function(done){
                amountToSend = 1.2;
                node.api.put('/transactions')
                    .set('Accept', 'application/json')
                    .send({
                        secret: Account1.password,
                        amount: amountToSend,
                        recipientId: Account2.address
                    })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            });

            test += 1;
            it(test + '. We try to send 100% LISK as amout from Account 1 to Account 2. We expect error',function(done){
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/transactions')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            amount: Account1.balance,
                            recipientId: Account2.address
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to send 0 LISK from Account 1 to Account 2. We expect error',function(done){
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/transactions')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            amount: 0,
                            recipientId: Account2.address
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to send VERY LARGE LISK NUMBER from Account 1 to Account 2. We expect error',function(done){
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/transactions')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            amount: 1298231812939123812939123912939123912931823912931823912903182309123912830123981283012931283910231203,
                            recipientId: Account2.address
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to send VERY LARGE NEGATIVE LISK NUMBER of LISK from Account 1 to Account 2. We expect error',function(done){
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/transactions')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            amount: -1298231812939123812939123912939123912931823912931823912903182309123912830123981283012931283910231203,
                            recipientId: Account2.address
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to send VERY SMALL LISK NUMBER (0.00000001) from Account 1 to Account 2. We get success',function(done){
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/transactions')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            amount: 1,
                            recipientId: Account2.address
                        })
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            console.log(JSON.stringify(res.body));
                            node.expect(res.body).to.have.property("success").to.be.true;
              node.expect(res.body).to.have.property("transactionId");
                            done();
                        });
                }, 1000);
            });

            test += 1;
            it(test + '. We try to send VERY SMALL NEGATIVE LISK NUMBER (0.00000001) from Account 1 to Account 2. We expect error',function(done){
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/transactions')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            amount: -1,
                            recipientId: Account2.address
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to send LISK WITHOUT PASSWORD. We expect error',function(done){
                amountToSend = 100000000;
                node.api.put('/transactions')
                    .set('Accept', 'application/json')
                    .send({
                        amount: amountToSend,
                        recipientId: Account2.address
                    })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            });

            test += 1;
            it(test + '. We try to send LISK WITHOUT RECIPIENT. We expect error',function(done){
                amountToSend = 100000000;
                node.api.put('/transactions')
                    .set('Accept', 'application/json')
                    .send({
                        secret: Account1.password,
                        amount: amountToSend
                    })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            });

            test += 1;
            it(test + '. We attempt to GET TX by ID. We expect success',function(done){
                var transactionInCheck = transactionList[0];
                node.api.get('/transactions/get?id='+transactionInCheck.txId)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        node.expect(res.body).to.have.property("transaction").that.is.an('object');
                        if (res.body.success == true && res.body.transaction.id != null){
                            node.expect(res.body.transaction.id).to.equal(transactionInCheck.txId);
                            node.expect(res.body.transaction.amount / node.normalizer).to.equal(transactionInCheck.nettoSent);
                            node.expect(res.body.transaction.fee / node.normalizer).to.equal(transactionInCheck.fee);
                            node.expect(res.body.transaction.recipientId).to.equal(transactionInCheck.recipient);
                            node.expect(res.body.transaction.senderId).to.equal(transactionInCheck.sender);
                            node.expect(res.body.transaction.type).to.equal(transactionInCheck.type);
                        }
                        else{
                            console.log("Transaction failed or transaction list is null");
                            node.expect("TEST").to.equal("FAILED");
                        }
                        done();
                    });
            });

            test += 1;
            it(test + '. We attempt to GET TX by ID but send INVALID ID. We expect error',function(done){
                node.api.get('/transactions/get?id=NotTxId')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.false;
                        node.expect(res.body).to.have.property("error");
                        done();
                    });
            });

            test += 1;
            it(test + '. We attempt to GET TX by TYPE. We expect success',function(done){
                node.api.get('/transactions?type=' + node.TxTypes.SEND)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        if (res.body.success == true && res.body.transactions != null){
                            for (var i=0; i < res.body.transactions.length; i++){
                                if (res.body.transactions[i] != null){
                                    node.expect(res.body.transactions[i].type).to.equal(node.TxTypes.SEND);
                                }
                            }
                        }
                        else{
                            console.log("Request failed or transaction list is null");
                            node.expect("TEST").to.equal("FAILED");
                        }
                        done();
                    });
            });

            test += 1;
            it(test + '. We attempt to GET ALL UNCONFIRMED TX. We expect success',function(done){
                node.api.get('/transactions/unconfirmed')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        node.expect(res.body).to.have.property("transactions").that.is.an('array');
                        done();
                    });
            });

            test += 1;
            it(test + '. We attempt to created 2nd password from account with 0 LISK. We expect error',function(done){
                this.timeout(5000);
                setTimeout(function(){
                node.api.put('/signatures')
                    .set('Accept', 'application/json')
                    .send({
                        secret: Account3.password,
                        secondSecret: Account3.password
                    })
                    .expect('Content-Type', /json/)
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
            it(test + '. We attempt to created 2nd password for Account 1, but sending INVALID SECRET. We expect error',function(done){
                node.onNewBlock(function(){
                node.api.put('/signatures')
                    .set('Accept', 'application/json')
                    .send({
                        secret: "Account1.password",
                        secondSecret: Account1.password
                    })
                    .expect('Content-Type', /json/)
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
            it(test + '. We attempt to created 2nd password for Account 1, but not sending 2nd pass. We expect error',function(done){
                this.timeout(5000);
                setTimeout(function(){
                node.api.put('/signatures')
                    .set('Accept', 'application/json')
                    .send({
                        secret: Account1.password
                    })
                    .expect('Content-Type', /json/)
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
            it(test + '. We attempt to created 2nd password ( ' + (Account1.secondPassword) + ' ) for Account 1. We expect success',function(done){
                node.onNewBlock(function(){
                node.api.put('/signatures')
                    .set('Accept', 'application/json')
                    .send({
                        secret: Account1.password,
                        secondSecret: Account1.secondPassword
                    })
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function (err, res) {
                        console.log(JSON.stringify(res.body));
                        node.expect(res.body).to.have.property("success").to.be.true;
                        node.expect(res.body).to.have.property("transaction").that.is.an('object');
                        if (res.body.success == true && res.body.transaction != null){
                            node.expect(res.body.transaction).to.have.property("type").to.equal(node.TxTypes.SIGNATURE);
                            node.expect(res.body.transaction).to.have.property("senderPublicKey").to.equal(Account1.publicKey);
                            node.expect(res.body.transaction).to.have.property("senderId").to.equal(Account1.address);
                            node.expect(res.body.transaction).to.have.property("fee").to.equal(node.Fees.secondPasswordFee);
                            Account1.transactions.push(transactionCount);
                            transactionCount += 1;
                            Account1.balance -= node.Fees.secondPasswordFee;
                            transactionList[transactionCount - 1] = {
                                'sender': Account1.address,
                                'recipient': 'SYSTEM',
                                'brutoSent': 0,
                                'fee': node.Fees.secondPasswordFee,
                                'nettoSent': 0,
                                'txId': res.body.transaction.id,
                                'type':node.TxTypes.SIGNATURE
                            }
                        }
                        else {
                            console.log("Transaction failed or transaction object is null");
                            console.log("Sent: secret: " + Account1.password + ", secondSecret: " + Account1.secondPassword);
                            node.expect("TEST").to.equal("FAILED");
                        }
                        done();
                    });
                });
            });

            test += 1;
            it(test + '. We try to send LISK WITHOUT SECOND PASSWORD. We expect error',function(done){
                amountToSend = 100000000;
                node.onNewBlock(function(err){
          node.expect(err).to.be.not.ok;

          node.api.put('/transactions')
            .set('Accept', 'application/json')
            .send({
              secret: Account1.password,
              recipientId: Account2.address,
              amount: amountToSend
            })
            .expect('Content-Type', /json/)
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
            it(test + '. We try to send LISK WITH SECOND PASSWORD but NO SECRET. We expect error',function(done){
                amountToSend = 100000000;
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/transactions')
                        .set('Accept', 'application/json')
                        .send({
                            secondSecret: Account1.secondPassword,
                            recipientId: Account2.address,
                            amount: amountToSend
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to REGISTER USERNAME, no secret. We expect error',function(done){
                amountToSend = 100000000;
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/accounts/username')
                        .set('Accept', 'application/json')
                        .send({
                            secondSecret: Account1.secondPassword,
                            username: Account1.username
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to REGISTER USERNAME, no second secret. We expect error',function(done){
                amountToSend = 100000000;
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/accounts/username')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            username: Account1.username
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to REGISTER USERNAME, no username. We expect error',function(done){
                amountToSend = 100000000;
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/accounts/username')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            secondSecret: Account1.secondPassword
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to REGISTER USERNAME, VERY LONG username. We expect error',function(done){
                amountToSend = 100000000;
                node.onNewBlock(function(){
                    node.api.put('/accounts/username')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            secondSecret: Account1.secondPassword,
                            username: "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to REGISTER USERNAME, WITH INVALID CHARACTERS. We expect error',function(done){
                amountToSend = 100000000;
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/accounts/username')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            secondSecret: Account1.secondPassword,
                            username: "~!@#$%^&*()_+,./?|"
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to REGISTER USERNAME. Valid data. We expect success',function(done){
        console.log(Account1);
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/accounts/username')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            secondSecret: Account1.secondPassword,
                            username: Account1.username
                       })
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            console.log(JSON.stringify(res.body));
                            node.expect(res.body).to.have.property("success").to.be.true;
                            if (res.body.success == true && res.body.transaction != null){
                                Account1.transactions.push(transactionCount);
                                transactionCount += 1;
                                Account1.balance -= node.Fees.usernameFee;
                                transactionList[transactionCount - 1] = {
                                    'sender': Account1.address,
                                    'recipient': 'SYSTEM',
                                    'brutoSent': 0,
                                    'fee': node.Fees.usernameFee,
                                    'nettoSent': 0,
                                    'txId': res.body.transaction.id,
                                    'type':node.TxTypes.SIGNATURE
                                }
                            }
                            else {
                                console.log("Transaction failed or transaction object is null");
                                console.log("Sent: secret: " + Account1.secret + ", secondSecret: " + Account1.secondPassword + ", username: " + Account1.username);
                                node.expect("TEST").to.equal("FAILED");
                            }
                            done();
                        });
                }, 1000);
            });

            test += 1;
            it(test + '. We try to REGISTER SAME USERNAME FROM DIFFERENT ACCOUNT. We expect error',function(done){
                node.onNewBlock(function(err) {
          node.expect(err).to.be.not.ok;
                    node.api.put('/accounts/username')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account2.password,
                            secondSecret: Account2.secondPassword,
                            username: Account1.username
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to REGISTER SAME USERNAME FROM SAME ACCOUNT. We expect error',function(done){
                node.onNewBlock(function(){
                    node.api.put('/accounts/username')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            secondSecret: Account1.secondPassword,
                            username: Account1.username
                        })
                        .expect('Content-Type', /json/)
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
            it(test + '. We try to SEND LISK to USERNAME. We expect success',function(done){
                node.onNewBlock(function(){
                    amountToSend = 100000000;
                    node.api.put('/transactions')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account2.password,
                            secondSecret: Account2.secondSecret,
                            amount: amountToSend,
                            recipientId: Account1.username
                        })
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            console.log(JSON.stringify(res.body));
                            node.expect(res.body).to.have.property("success").to.be.true;
                            node.expect(res.body).to.have.property("transactionId");
                            if (res.body.success == true && res.body.transactionId != null){
                                expectedFee = node.expectedFee(amountToSend);
                                Account2.balance -= (amountToSend + expectedFee);
                                Account1.balance += amountToSend;
                                Account2.transactions.push(transactionCount);
                                transactionList[transactionCount] = {
                                    'sender': Account2.address,
                                    'recipient': Account1.address,
                                    'brutoSent': (amountToSend + expectedFee) / node.normalizer,
                                    'fee': expectedFee / node.normalizer,
                                    'nettoSent': amountToSend / node.normalizer,
                                    'txId': res.body.transactionId,
                                    'type': node.TxTypes.SEND
                                }
                                transactionCount += 1;
                            }
                            else {
                                console.log("Transaction failed or transactionId is null");
                                console.log("Sent: secret: " + Account2.password + ", secondSecret: " + Account2.secondPassword
                                + ", amount: " + amountToSend + ", recipientId: " + Account1.username);
                                node.expect("TEST").to.equal("FAILED");
                            }
                            done();
                        });
                });
            });

            test += 1;
            it(test + '. We attempt to register as delegate without sending 2nd password. We expect error',function(done){
                this.timeout(5000);
                setTimeout(function(){
                    node.api.put('/delegates')
                        .set('Accept', 'application/json')
                        .send({
                            secret: Account1.password,
                            username: Account1.delegateName
                        })
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            console.log(JSON.stringify(res.body));
                            node.expect(res.body).to.have.property("success").to.be.false;
                            node.expect(res.body).to.have.property("error");
                            done();
                        });
                }, 1000);
            });
        });
    });
