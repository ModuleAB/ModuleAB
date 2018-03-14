'use strict';

angular.module('ModuleAB.oss', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/oss', {
    templateUrl: 'oss/oss.html',
    controller: 'oss'
  });
}])

.controller('oss', ['$scope', '$http', '$uibModal', '$rootScope',
  function($scope, $http, $uibModal, $rootScope) {
    $scope.osssGet = function() {
      $http({
        method: "GET",
        url: "/api/v1/oss"
      }).then(function(response) {
        $scope.osss = response.data;
      }, function(response) {
        if (response.status == 404) {
          $scope.oass = null;
        }
      });
    };

    $scope.osssGet();

    $scope.ossEdit = function(type, oss) {
      var modal = $uibModal.open({
        templateUrl: 'ossModal.html',
        controller: 'ossModal',
        resolve: {
          type: function() {
            return type;
          },
          oss: function() {
            return oss;
          }
        }
      });
      modal.result.then(function(d) {
        $scope.osssGet();
      });
    };

    $scope.delete = function(oss) {
      var modal = $uibModal.open({
        templateUrl: 'common/deleteModal.html',
        controller: 'deleteOssModal',
        resolve: {
          oss: function() {
            return oss;
          }
        }
      });
      modal.result.then(function(d) {
        $http({
          method: "DELETE",
          url: "/api/v1/oss/" + oss.bucket
        }).then(function(response) {
          $scope.osssGet();
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
              $rootScope.failMessage = "无此OSS";
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

.controller('deleteOssModal', function($scope, $uibModalInstance, oss) {
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
  $scope.doDelete = function() {
    $uibModalInstance.close('delete');
  }
  $scope.modalDeleteObjName = oss.bucket;
})

.controller('ossModal', function($scope, $http, $uibModalInstance, type,
  oss) {
  if (oss === undefined) {
    oss = {
      bucket: "",
      endpoint: ""
    };
  }
  $scope.oss = oss;

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
    if ($scope.oss.bucket == '') {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "Bucket不能为空";
      return;
    }
    if ($scope.oss.endpoint == '') {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "节点地址不能为空";
      return;
    }

    switch (type) {
      case 'new':
        $http({
          method: "POST",
          url: "/api/v1/oss",
          data: $scope.oss
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
        break;
    }
  }
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  }
});
