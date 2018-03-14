'use strict';

angular.module('ModuleAB.appsets', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/appsets', {
    templateUrl: 'appsets/appsets.html',
    controller: 'appSets'
  });
}])

.controller('appSets', ['$scope', '$http', '$uibModal', '$rootScope',
  function($scope, $http, $uibModal, $rootScope) {
    $scope.appSetsGet = function() {
      $http({
        method: "GET",
        url: "/api/v1/appSets"
      }).then(function(response) {
        $scope.appSets = response.data;
      }, function(response) {
        if (response.status == 404) {
          $scope.appSets = null;
        }
      });
    };

    $scope.appSetsGet();

    $scope.appSetEdit = function(type, appSet) {
      var modal = $uibModal.open({
        templateUrl: 'appSetModal.html',
        controller: 'appSetModal',
        resolve: {
          type: function() {
            return type;
          },
          appSet: function() {
            return appSet;
          }
        }
      });
      modal.result.then(function(d) {
        $scope.appSetsGet();
      });
    };

    $scope.delete = function(appSet) {
      var modal = $uibModal.open({
        templateUrl: 'common/deleteModal.html',
        controller: 'deleteAppSetModal',
        resolve: {
          appSet: function() {
            return appSet;
          }
        }
      });
      modal.result.then(function(d) {
        $http({
          method: "DELETE",
          url: "/api/v1/appSets/" + appSet.name
        }).then(function(response) {
          $scope.appSetsGet();
        }, function(response) {
          $rootScope.alertType = 'alert-warning';
          $rootScope.fadein = 'fadein-opacity';
          switch (response.status) {
            case 401:
              window.location.href = "/login";
              break;
            case 403:
              $rootScope.failMessage = "没有权限";
              break;
            case 404:
              $rootScope.failMessage = "无此应用集";
              break;
            case 500:
              $rootScope.failMessage = "服务器错误，见控制台输出";
              console.log(response.data);
              break;
            default:
              $rootScope.failMessage = "通讯故障";
              break;
          }
        });
      });
    };
  }
])

.controller('deleteAppSetModal', function($scope, $uibModalInstance, appSet) {
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
  $scope.doDelete = function() {
    $uibModalInstance.close('delete');
  }
  $scope.modalDeleteObjName = appSet.name;
})

.controller('appSetModal', function($scope, $http, $uibModalInstance, type,
  appSet) {
  if (appSet === undefined) {
    appSet = {
      name: "",
      description: ""
    };
  }
  $scope.appSet = appSet;
  $scope.oldName = appSet.name;

  switch (type) {
    case 'new':
      $scope.type = "新增";
      $scope.jobType = "fa-plus";
      $scope.job = "新增"
      break;
    case 'modify':
      $scope.type = "修改";
      $scope.jobType = "fa-pencil";
      $scope.job = "修改";
      break;
  }

  $scope.modalInfoFadein = "";
  $scope.doJob = function() {
    if ($scope.appSet.name == '') {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "名称不能为空";
      return;
    }

    switch (type) {
      case 'new':
        $http({
          method: "POST",
          url: "/api/v1/appSets",
          data: $scope.appSet
        }).then(function(response) {
          $uibModalInstance.close(response.data.id);
        }, function(response) {
          $scope.modalInfoFadein = "fadein-opacity";
          switch (response.status) {
            case 400:
              $scope.modalInfoMsg = "数据错误";
              break;
            case 401:
              $scope.modalInfoMsg = "未登录";
              window.location.href = "/login";
              break;
            case 403:
              $scope.modalInfoMsg = "访问被拒绝";
              break;
            case 500:
              $scope.modalInfoMsg = "服务器错误，见控制台输出";
              console.log(response.data);
              break;
            default:
              $scope.modalInfoMsg = "通讯故障";
              break;
          }
        });
        break;
      case 'modify':
        $http({
          method: "PUT",
          url: "/api/v1/appSets/" + $scope.oldName,
          data: $scope.appSet
        }).then(function(response) {
          $uibModalInstance.close(response.status);
        }, function(response) {
          $scope.modalInfoFadein = "fadein-opacity";
          switch (response.status) {
            case 400:
              $scope.modalInfoMsg = "数据错误";
              break;
            case 401:
              $scope.modalInfoMsg = "未登录";
              window.location.href = "/login";
              break;
            case 403:
              $scope.modalInfoMsg = "访问被拒绝";
              break;
            case 404:
              $scope.modalInfoMsg = "无此应用集";
              break;
            case 500:
              $scope.modalInfoMsg = "服务器错误，见控制台输出";
              console.log(response.data);
              break;
            default:
              $scope.modalInfoMsg = "通讯故障";
              break;
          }
        });
        break;
    }
  }
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  }
});
