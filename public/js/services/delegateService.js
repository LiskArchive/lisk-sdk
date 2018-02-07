require('angular');

angular.module('liskApp').service('delegateService', function ($http, $filter, $q) {

    function filterData(data, filter) {
        return $filter('filter')(data, filter);
    }

    function orderData(data, params) {
        return params.sorting() ? $filter('orderBy')(data, params.orderBy()) : filteredData;
    }

    function sliceData(data, params) {
        return data.slice((params.page() - 1) * params.count(), params.page() * params.count());
    }

    function transformData(data, filter, params) {
        return sliceData(orderData(filterData(data, filter), params), params);
    }

    var delegates = {
        topRate: 101,
        gettingStandBy: false,
        gettingTop: false,
        gettingVoted: false,
        cachedTOP: {data: [], time: new Date()},
        cachedStandby: {data: [], time: new Date()},
        cachedVotedDelegates: {data: [], time: new Date()},

        isActiveRate: function (rate) {
            return rate <= this.topRate;
        },

        getTopList: function ($defer, params, filter, cb) {
            if (!this.gettingTop) {
                this.gettingTop = !this.gettingTop;
                if (delegates.cachedTOP.data.length > 0 && new Date() - delegates.cachedTOP.time < 1000 * 10) {
                    var filteredData = filterData(delegates.cachedTOP.data, filter);
                    var transformedData = sliceData(orderData(filteredData, params), params);
                    params.total(filteredData.length)
                    this.gettingTop = !this.gettingTop;
                    cb();
                    $defer.resolve(transformedData);
                } else {
                    $http.get("/api/delegates/", {params: {orderBy: "rate:asc", limit: this.topRate, offset: 0}})
                        .then(function (response) {
                            angular.copy(response.data.delegates, delegates.cachedTOP.data);
                            delegates.cachedTOP.time = new Date();
                            params.total(response.data.delegates.length);
                            var filteredData = $filter('filter')(delegates.cachedTOP.data, filter);
                            var transformedData = transformData(delegates.cachedTOP.data, filter, params);
                            delegates.gettingTop = !delegates.gettingTop;
                            cb();
                            $defer.resolve(transformedData);
                        });
                }
            }
        },
        getStandbyList: function ($defer, params, filter, cb) {
            if (!this.gettingStandBy) {
                this.gettingStandBy = !this.gettingStandBy;
                if (delegates.cachedStandby.data.length > 0 && new Date() - delegates.cachedStandby.time < 1000 * 10) {
                    var filteredData = filterData(delegates.cachedStandby.data, filter);
                    var transformedData = sliceData(orderData(filteredData, params), params);
                    params.total(filteredData.length);
                    this.gettingStandBy = !this.gettingStandBy;
                    cb();
                    $defer.resolve(transformedData);
                }
                else {
                    this.cachedStandby.data = [];
                    var getPart = function (limit, offset) {
                        $http.get("/api/delegates/", {params: {orderBy: "rate:asc", limit: limit, offset: offset}})
                            .then(function (response) {
                                if (response.data.delegates.length > 0) {
                                    delegates.cachedStandby.data = delegates.cachedStandby.data.concat(response.data.delegates);
                                    getPart(limit, limit + offset);
                                } else {
                                    delegates.cachedStandby.time = new Date();
                                    params.total(delegates.cachedStandby.data.length);
                                    var filteredData = $filter('filter')(delegates.cachedStandby.data, filter);
                                    var transformedData = transformData(delegates.cachedStandby.data, filter, params);
                                    delegates.gettingStandBy = !delegates.gettingStandBy;
                                    cb();
                                    $defer.resolve(transformedData);
                                }
                            });
                    };
                    getPart(this.topRate, this.topRate);
                }
            }
        },
        getMyDelegates: function ($defer, params, filter, address, cb) {
            if (!this.gettingVoted) {
                this.gettingVoted = !this.gettingVoted;
                if (delegates.cachedVotedDelegates.data.length > 0 && new Date() - delegates.cachedVotedDelegates.time < 1000 * 10) {
                    var filteredData = filterData(delegates.cachedVotedDelegates.data, filter);
                    var transformedData = sliceData(orderData(filteredData, params), params);
                    params.total(filteredData.length);
                    this.gettingVoted = !this.gettingVoted;
                    $defer.resolve(transformedData);
                    cb();
                } else {
                    $http.get("/api/accounts/delegates/", {params: {address: address}})
                        .then(function (response) {
                            angular.copy(response.data.delegates ? response.data.delegates : [], delegates.cachedVotedDelegates.data);
                            delegates.cachedVotedDelegates.time = new Date();
                            params.total(response.data.delegates ? response.data.delegates.length : 0);
                            var filteredData = $filter('filter')(delegates.cachedVotedDelegates.data, filter);
                            var transformedData = transformData(delegates.cachedVotedDelegates.data, filter, params);
                            delegates.gettingVoted = !delegates.gettingVoted;
                            $defer.resolve(transformedData);
                            cb();
                        });
                }
            }
        },
        getDelegate: function (publicKey, cb) {
            $http.get("/api/delegates/get/", {params: {publicKey: publicKey}})
                .then(function (response) {
                    if (response.data.success) {
                        response.data.delegate.active = delegates.isActiveRate(response.data.delegate.rate);
                        cb(response.data.delegate);
                    } else {
                        cb({noDelegate: true, rate: 0, productivity: 0, vote: 0});
                    }
                });
        },
        getCountedDelegate: function (publicKey, cb) {
            $q.all([
                $http.get("/api/delegates/get/", {params: {publicKey: publicKey}}),
                $http.get("/api/delegates/count")
            ]).then(function(results) {
                if (results[0].data.success) {
                    var response = results[0];

                    if (results[1].data.success) {
                        response.data.delegate.totalCount = parseInt(results[1].data.count) || 0;
                    } else {
                        response.data.delegate.totalCount = 0;
                    }

                    response.data.delegate.active = delegates.isActiveRate(response.data.delegate.rate);
                    cb(response.data.delegate);
                } else {
                    cb({noDelegate: true, rate: 0, productivity: 0, vote: 0, totalCount: 0});
                }
            });
        },
        getSearchList: function ($defer, search, params, filter, cb) {
            $http.get("/api/delegates/search", {params: {q: search}})
                .then(function (response) {
                    var delegates = angular.copy(response.data.delegates) || [];
                    params.total(delegates.length);
                    var transformedData = transformData(delegates, filter, params);
                    cb();
                    $defer.resolve(transformedData);
                });
        },
    };

    return delegates;

});
