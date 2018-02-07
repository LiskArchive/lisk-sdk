require('angular');

angular.module('liskApp').controller('dappsController', ['$scope', 'viewFactory', '$http', 'dappsService', '$timeout', 'addDappModal', "$interval", 'gettextCatalog', function ($scope, viewFactory, $http, dappsService, $timeout, addDappModal, $interval, gettextCatalog) {

    $scope.view = viewFactory;
    $scope.view.inLoading = true;
    $scope.view.loadingText = gettextCatalog.getString('Loading applications');
    $scope.view.page = {title: gettextCatalog.getString('Applications'), previous: null};
    $scope.view.bar = {showDappsBar: true, searchDapps: false, showCategories: false};
    $scope.searchDapp = dappsService;
    $scope.searchDapp.searchForDappGlobal = '';
    $scope.searchDapp.inSearch = false;
    $scope.showPlaceholder = false;

    $scope.shuffle = function (array) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    // Search dapps watcher
    var tempsearchForDappID = '',
        searchForDappIDTimeout;
    $scope.$watch('searchDapp.searchForDappGlobal', function (val) {
        if (searchForDappIDTimeout) $timeout.cancel(searchForDappIDTimeout);
        if (val.trim() != '') {
            $scope.searchDapp.inSearch = true;
        } else {
            $scope.searchDapp.inSearch = false;
            if (tempsearchForDappID != val) {
                tempsearchForDappID = val;
                $scope.searchDapp.searchForDappGlobal = tempsearchForDappID;
                $scope.searchDappText();
                return;
            }
        }
        tempsearchForDappID = val;
        searchForDappIDTimeout = $timeout(function () {
            $scope.searchDapp.searchForDappGlobal = tempsearchForDappID;
            $scope.searchDappText();
        }, 2000); // Delay 2000 ms
    })

    $scope.addNewDapp = function () {
        $scope.addDappModal = addDappModal.activate({
            destroy: function () {
            }
        });
    }

    $scope.searchedText = '';
    $scope.searchedInstalledText = '';

    $scope.searchDappText = function () {
        if ($scope.searchDapp.searchForDappGlobal.trim() == '') {

            $http.get("/api/dapps").then(function (response) {
                $scope.dapps = $scope.shuffle(response.data.dapps);
                $scope.searchedText = '';
                $scope.view.inLoading = false;
            });
            $http.get("/api/dapps/installed").then(function (response) {
                $scope.installedDapps = $scope.shuffle(response.data.dapps);
                $scope.searchedInstalledText = '';

                    $scope.showPlaceholder = !response.data.success;
            });

        } else {
            $http.get("/api/dapps/search?q=" + $scope.searchDapp.searchForDappGlobal).then(function (response) {
                $scope.dapps = $scope.shuffle(response.data.dapps);
                $scope.searchDapp.inSearch = false;
                $scope.view.inLoading = false;
                $scope.searchedText = '(search for "' + $scope.searchDapp.searchForDappGlobal + '")';
            });
            if (!$scope.showPlaceholder) {
                $http.get("/api/dapps/search?q=" + $scope.searchDapp.searchForDappGlobal + "&installed=1").then(function (response) {
                    $scope.installedDapps = $scope.shuffle(response.data.dapps);
                    $scope.searchedInstalledText = '(search for "' + $scope.searchDapp.searchForDappGlobal + '")';
                });
            }
        }
    };

    $scope.$on('updateControllerData', function (event, data) {
        if (data.indexOf('main.dapps') != -1) {
            $scope.searchDappText();
        }
    });

    $scope.searchDappText();

}]);
