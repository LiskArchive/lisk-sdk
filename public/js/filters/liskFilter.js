require('angular');

angular.module('liskApp').filter('liskFilter', function () {
    return function (fee) {
        if (!fee) {
            return 0;
        }

        fee = fee.toString();

        while (fee.length < 9) {
            fee = '0'.concat(fee);
        }

        fee = fee.slice(0, -8).concat('.', fee.slice(-8));

        var clearView = false;

        while (!clearView) {
            if (fee[fee.length - 1] == '0') {
                fee = fee.slice(0, fee.length - 1);
            }
            else {
                clearView = true;
            }
        }

        if (fee[fee.length - 1] == '.') {
            fee = fee.slice(0, fee.length - 1);
        }

        return fee;
    }
});
