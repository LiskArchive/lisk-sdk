require('angular');

angular.module('liskApp').service('transactionsService', function ($http, userService) {

    var transactionsList = {
        requestTransactions: function (params, cb) {
            $http.get("/api/transactions", {
                params: params
            }).then(function (response) {
                if (response.data.success) {
                    cb(response.data);
                } else {
                    cb({transactions: [], count: 0});
                }
            });
        },
        getTransaction: function (transactionId, cb) {
            $http.get("/api/transactions/get", {
                params: {
                    id: transactionId
                }
            }).then(function (response) {
                    if (response.data.success) {
                        if (response.data.transaction.senderId == userService.address || response.data.transaction.recipientId == userService.address) {
                            cb({transactions: [response.data.transaction], count: 1});
                        } else {
                            cb({transactions: [], count: 0});
                        }
                    } else {
                        cb({transactions: [], count: 0});
                    }
                }
            );
        },
        count: 0,
        searchForTransaction: '',
        getMultiTransactions: function ($defer, params, filter, requestParams, cb) {
            var sortString = '';
            var keys = [];

            for (var key in params.$params.sorting) {
                if (params.$params.sorting.hasOwnProperty(key)) {
                    sortString = key + ':' + params.$params.sorting[key];
                }
            };

            requestParams.orderBy = sortString;
            requestParams.limit = params.count();
            requestParams.offset = (params.page() - 1) * params.count()

            $http.get("/api/transactions", {
                params: requestParams
            }).then(function (response) {
                if (response.data.success) {
                    var transactions = response.data.transactions;
                    transactionsList.count = response.data.count;
                    params.total(response.data.count);
                    cb(null);
                    $defer.resolve(transactions);
                } else {
                    var transactions = [];
                    transactionsList.count = 0;
                    params.total(0);
                    cb(null);
                    $defer.resolve(transactions);
                }
            });
        },
        getTransactions: function ($defer, params, filter, searchForTransaction, cb) {
            searchForTransaction = searchForTransaction.trim();
            if (searchForTransaction != '') {
                this.getTransaction(searchForTransaction, function (response) {
                    var transactions = response.transactions;

                    if (transactions.length) {
                        params.total(transactions.length);
                        cb(null);
                        $defer.resolve(transactions);

                    } else {
                        var sortString = '';
                        var keys = [];

                        for (var key in params.$params.sorting) {
                            if (params.$params.sorting.hasOwnProperty(key)) {
                                sortString = key + ':' + params.$params.sorting[key];
                            }
                        }

                        transactionsList.requestTransactions({
                            ownerPublicKey: userService.publicKey,
                            ownerAddress: userService.address,
                            recipientId: searchForTransaction,
                            senderId: searchForTransaction,
                            orderBy: sortString,
                            limit: params.count(),
                            offset: (params.page() - 1) * params.count()
                        }, function (response) {
                            var transactions = response.transactions;

                            transactionsList.count = response.count;
                            params.total(response.count);
                            cb(null);
                            $defer.resolve(transactions);
                        });
                    }
                });
            } else {
                var sortString = '';
                var keys = [];

                for (var key in params.$params.sorting) {
                    if (params.$params.sorting.hasOwnProperty(key)) {
                        sortString = key + ':' + params.$params.sorting[key];
                    }
                }

                this.requestTransactions({
                    senderPublicKey: userService.publicKey,
                    recipientId: userService.address,
                    orderBy: sortString,
                    limit: params.count(),
                    offset: (params.page() - 1) * params.count()
                }, function (response) {
                    var transactions = response.transactions;

                    transactionsList.count = response.count;
                    params.total(response.count);
                    cb(null);
                    $defer.resolve(transactions);
                });
            }
        }
    }

    return transactionsList;

});
