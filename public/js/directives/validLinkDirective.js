require('angular');

angular.module('liskApp').directive('validLink', function () {
    return {
        require: 'ngModel',
        restrict: 'A',
        scope: {
            validLink: '@validLink',
        },
        link: function (scope, element, attrs, ctrl) {
            scope.validLink = (!scope.validLink) ? '' : scope.validLink;
            var regexp = new RegExp('^(http[s]?:\/\/)([a-z0-9-./]+)(' + scope.validLink + ')$', 'i');

            ctrl.$validators.validLink = function (modelValue, viewValue) {
              var value = (modelValue || viewValue);

              return !value || value.length == 0 || regexp.test(viewValue);
            };
        }
    }
});
