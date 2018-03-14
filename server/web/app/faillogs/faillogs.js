'use strict';

angular.module('ModuleAB.faillogs', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/faillogs', {
    templateUrl: 'faillogs/faillogs.html',
    controller: 'faillogs'
  });
}])

.controller('faillogs', ['$scope', '$http', '$uibModal', '$rootScope',
  function($scope, $http, $uibModal, $rootScope) {
    $scope.currentPage = 1;
    $scope.numPerPage = 15;
    $scope.recordsGet = function(query) {
      if (query === undefined) {
        var query = {
          host: "",
          date: ""
        }
      }
      if (query.host === '' && query.date === '') {
        var url = "/api/v1/faillogs";
      } else {
        if (!/[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(query.date)) {
          $rootScope.alertType = 'alert-warning';
          $rootScope.fadein = 'fadein-opacity';
          $rootScope.failMessage = "日期格式错误";
        }
        q = 'host='+ query.host + '&time=' +query.date
        var url = "/api/v1/faillogs?" + query;
      }
      $http({
        method: "GET",
        url: url
      }).then(function(response) {
        $scope.failLogs = response.data;
        if ($scope.failLogs.length > $scope.numPerPage) {
          $scope.$watch("currentPage + numPerPage", function() {
            var begin = ($scope.currentPage - 1) * $scope.numPerPage
            var end = begin + $scope.numPerPage;
            $scope.recordSlice = $scope.records.slice(begin, end)
          });
        } else {
          $scope.recordSlice = $scope.records
        }
      }, function(response) {
        if (response.status == 404) {
          $scope.recordSlice = null;
        }
      });
    };

    $scope.recordsGet();

  }
])
