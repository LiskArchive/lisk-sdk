require('angular');

angular.module('liskApp').controller('openDappModalController', ["$scope", "openDappModal", 'gettextCatalog', function ($scope, openDappModal, gettextCatalog) {

    $scope.close = function (openAnyway) {
        if ($scope.destroy) {
            $scope.destroy(openAnyway);
        }
        openDappModal.deactivate();
    }

    $scope.openAnyway = function (openAnyway) {
        $scope.close(openAnyway);
    }

}]);
