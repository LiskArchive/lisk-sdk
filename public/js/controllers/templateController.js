require('angular');

angular.module('liskApp').controller('templateController', ['$scope', '$rootScope', '$http', 'userService', "$interval", 'gettextCatalog', function ($rootScope, $scope, $http, userService, $interval, gettextCatalog) {

    $scope.getInitialSync = function () {
        $http.get("/api/loader/status/sync").then(function (resp) {
            if (resp.data.success) {
                $rootScope.syncing = resp.data.syncing;
                $rootScope.height = resp.data.height;
                $rootScope.heightToSync = resp.data.blocks;
            }
        });
    }

    $scope.syncInterval = $interval(function () {
        $scope.getInitialSync();
    }, 1000 * 10);

    $scope.getInitialSync();

}]);
