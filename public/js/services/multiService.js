require('angular');

angular.module('liskApp').service('multiService', function ($http, userService, $filter) {

    var service = {
        gettingPendings: false,
        gettingWallets: false,
        getPendings: function ($defer, params, filter, cb) {
            if (!service.gettingPendings) {
                service.gettingPendings = !service.gettingPendings;
                var keys = [];
                for (var key in params.$params.sorting) {
                    if (params.$params.sorting.hasOwnProperty(key)) {
                        sortString = key + ':' + params.$params.sorting[key];
                    }
                }
                var queryParams = {
                    publicKey: userService.publicKey
                }


                $http.get("/api/multisignatures/pending", {
                    params: queryParams
                })
                    .then(function (response) {
                        service.gettingPendings = !service.gettingPendings;
                        if (response.data.success) {
                            params.total(response.data.transactions.length);
                            cb();
                            var orderedData = params.sorting() ?
                                $filter('orderBy')(response.data.transactions, params.orderBy()) : response.data.transactions;
                            $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                        }
                        else {
                            params.total(0);
                            cb();
                            $defer.resolve([]);
                        }
                    });
            }
            else {
                cb();
            }
        },
        getWallets: function ($defer, params, filter, cb) {
            if (!service.gettingWallets) {
                service.gettingWallets = !service.gettingWallets;
                var keys = [];
                for (var key in params.$params.sorting) {
                    if (params.$params.sorting.hasOwnProperty(key)) {
                        sortString = key + ':' + params.$params.sorting[key];
                    }
                }
                var queryParams = {
                    publicKey: userService.publicKey
                }


                $http.get("/api/multisignatures/accounts", {
                    params: queryParams
                })
                    .then(function (response) {
                        service.gettingWallets = !service.gettingWallets;
                        if (response.data.success) {
                            params.total(response.data.accounts.length);
                            cb();

                            var orderedData = params.sorting() ?
                                $filter('orderBy')(response.data.accounts, params.orderBy()) : response.data.accounts;
                            $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                        }
                        else {
                            params.total(0);
                            cb();
                            $defer.resolve([]);
                        }
                    });
            }
            else {
                cb();
            }
        },

        confirmTransaction: function (queryParams, cb) {
            $http.post("/api/multisignatures/sign",
                queryParams
            )
                .then(function (response) {
                    if (response.data.success) {
                        cb(null);
                    }
                    else {
                        cb(response.data.error);
                    }

                });
        }
    }

    return service;

});
