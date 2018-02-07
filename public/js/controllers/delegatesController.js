require('angular');

angular.module('liskApp').controller('delegatesController', ['$scope', '$rootScope', '$http', "userService", "$interval", "$timeout", "$filter", "ngTableParams", "delegateService", "voteModal", "viewFactory", "userInfo", 'gettextCatalog', function ($rootScope, $scope, $http, userService, $interval, $timeout, $filter, ngTableParams, delegateService, voteModal, viewFactory, userInfo, gettextCatalog) {

    $scope.view = viewFactory;
    $scope.view.inLoading = true;
    $scope.view.loadingText = gettextCatalog.getString('Loading delegates');

    $scope.view.page = {title: gettextCatalog.getString('Forging'), previous: null};
    $scope.view.bar = {forgingMenu: true};

    $scope.countTop = 0;
    $scope.countStandby = 0;

    $scope.searchDelegates = '';

    $scope.address = userService.address;

    $scope.showVotes = false;

    $scope.loadingTop = true;
    $scope.loadingStandby = true;
    $scope.moreDropdownSeelction = {
        isopen: false
    };

    $scope.voteList = {
        list: {},
        length: 0,
        recalcLength: function () {
            var size = 0, key;
            for (key in this.list) {
                if (this.list.hasOwnProperty(key)) size++;
            }
            this.length = size;
        },
        inList: function (publicKey) {
            return !!this.list[publicKey];
        },
        vote: function (publicKey, username, $event, stop) {
            if (stop) {
                $event.stopPropagation();
            }
            if (this.inList(publicKey)) {
                delete this.list[publicKey];
            } else {
                this.list[publicKey] = username;
            }
            this.recalcLength();
            if (this.length == 0) {
                $scope.moreDropdownSeelction.isopen = false;
            }
        },
        toggle: function () {
            $scope.showVotes = !$scope.showVotes;
        }
    };

    $scope.vote = function () {
        if ($scope.voteList.length < 1) {
            return;
        }
        $scope.showVotes = false;
        $scope.voteModal = voteModal.activate({
            totalBalance: $scope.unconfirmedBalance,
            voteList: $scope.voteList.list,
            adding: true,
            destroy: function (keepVotes) {
                if (keepVotes) {
                    $scope.voteList.recalcLength();
                    return;
                } else {
                    $scope.voteList.list = {};
                    $scope.voteList.recalcLength();
                    $scope.delegates.getList(function () {
                        $scope.unconfirmedTransactions.getList();
                    });
                }
            }
        });
    };

    $scope.balance = userService._unconfirmedBalance;

    $scope.userInfo = function (userId) {
        $scope.modal = userInfo.activate({userId: userId});
    }

    // Unconfirmed transactions
    $scope.unconfirmedTransactions = {
        list: [],
        getList: function () {
            $http.get("/api/transactions/unconfirmed/", {params: {senderPublicKey: userService.publicKey}})
                .then(function (response) {
                    $scope.unconfirmedTransactions.list = [];
                    response.data.transactions.forEach(function (transaction) {
                        $scope.unconfirmedTransactions.list = $scope.unconfirmedTransactions.list.concat(transaction.asset.votes);
                    });
                });

        },
        inList: function (publicKey) {
            return this.list.indexOf('+' + publicKey) != -1;
        }
    };
    $scope.unconfirmedTransactions.getList();
    // end Unconfirmed transactions

    // Delegates exist
    $scope.delegates = {
        list: [],
        getList: function (cb) {
            $http.get("/api/accounts/delegates/", {params: {address: userService.address}})
                .then(function (response) {
                    if (response.data.delegates == null) {
                        return [];
                    }
                    $scope.delegates.list = response.data.delegates.map(function (delegate) {
                        return delegate.publicKey;
                    });
                    cb();
                });
        },
        voted: function (publicKey) {
            return this.list.indexOf(publicKey) != -1;
        }
    };
    $scope.delegates.getList(function () {
    });
    // end Delegates exist

    // Search deletates
    $scope.tableSearchDelegates = new ngTableParams({
        page: 1,            // Show first page
        count: 25,
    }, {
        counts: [],
        total: 0,
        getData: function ($defer, params) {
            $scope.loadingSearch = true;
            delegateService.getSearchList($defer, $scope.searchDelegates, params, $scope.filter, function () {
                $scope.loadingSearch = false;
            });
        }
    });

    $scope.tableSearchDelegates.cols = {
        username : gettextCatalog.getString('Name'),
        address : gettextCatalog.getString('Lisk Address'),
    };

    $scope.updateSearch = function (search) {
        $scope.searchDelegates = search;
        $scope.tableSearchDelegates.reload();
    };

    $scope.selectFirstSearchResult = function () {
        var delegate = $scope.tableSearchDelegates.data[0];
        $scope.voteList.vote(delegate.publicKey, delegate.username);
    };
    // end Search delegates 

    // Top deletates
    $scope.tableTopDelegates = new ngTableParams({
        page: 1,            // Show first page
        count: 25,
        sorting: {
            rate: 'asc'     // Initial sorting
        }
    }, {
        counts: [],
        total: delegateService.topRate,
        getData: function ($defer, params) {
            delegateService.getTopList($defer, params, $scope.filter, function () {
                $scope.countTop = params.total();
                $scope.loadingTop = false;
                $scope.view.inLoading = false;
                $timeout(function () {
                    $scope.delegates.getList(function () {
                        $scope.unconfirmedTransactions.getList();

                    });
                }, 1);
            });
        }
    });

    $scope.tableTopDelegates.cols = {
        rate : gettextCatalog.getString('Rank'),
        username : gettextCatalog.getString('Name'),
        address : gettextCatalog.getString('Lisk Address'),
        productivity : gettextCatalog.getString('Uptime'),
        vote : gettextCatalog.getString('Approval')
    };

    $scope.tableTopDelegates.settings().$scope = $scope;

    $scope.$watch("filter.$", function () {
        $scope.tableTopDelegates.reload();
    });

    $scope.updateTop = function () {
        $scope.tableTopDelegates.reload();
    };
    // end Top delegates

    // Standby delegates
    $scope.tableStandbyDelegates = new ngTableParams({
        page: 1,            // Show first page
        count: 25,
        sorting: {
            rate: 'asc'     // Initial sorting
        }
    }, {
        total: 0,
        counts: [],
        getData: function ($defer, params) {
            delegateService.getStandbyList($defer, params, $scope.filter, function () {
                $scope.countStandby = params.total();
                $scope.loadingStandby = false;
                $timeout(function () {
                    $scope.delegates.getList(function () {
                        $scope.unconfirmedTransactions.getList();
                    });
                }, 1);
            });
        }
    });

    $scope.tableStandbyDelegates.cols = $scope.tableTopDelegates.cols;
    $scope.tableStandbyDelegates.settings().$scope = $scope;

    $scope.$watch("filter.$", function () {
        $scope.tableStandbyDelegates.reload();
    });

    $scope.updateStandby = function () {
        $scope.tableStandbyDelegates.reload();
    };
    // end Standby delegates

    $scope.$on('updateControllerData', function (event, data) {
        if (data.indexOf('main.delegates') != -1) {
            $scope.updateStandby();
            $scope.updateTop();
        }
    });

    $scope.$on('$destroy', function () {
    });

}]);
