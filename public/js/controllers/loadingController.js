require('angular');

angular.module('liskApp').controller("loadingController", ["$scope", "$http", "$interval", "$window", function ($scope, $http, $interval, $window) {

    $scope.height = null;
    $scope.height = 0;

    $scope.getHeight = function () {
        $http.get("/api/loader/status")
            .then(function (resp) {
                if (resp.data.success) {
                    if (!resp.data.loaded) {
                        $scope.height = resp.data.now;
                        $scope.blocksCount = resp.data.blocksCount;
                        $scope.loadingState = $scope.blocksCount ? Math.floor($scope.height / $scope.blocksCount * 100) : 0;
                    } else {
                        $window.location.href = '/';
                    }
                }
            });
    }

    $scope.getHeight();

    $scope.heightInterval = $interval(function () {
        $scope.getHeight();
    }, 2000);

}]);
