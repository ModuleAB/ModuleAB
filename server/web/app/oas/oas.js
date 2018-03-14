'use strict';

angular.module('ModuleAB.oas', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/oas', {
    templateUrl: 'oas/oas.html',
    controller: 'oas'
  });
}])

.controller('oas', ['$scope', '$http', '$uibModal', '$rootScope',
  function($scope, $http, $uibModal, $rootScope) {
    $scope.oassGet = function() {
      $http({
        method: "GET",
        url: "/api/v1/oas"
      }).then(function(response) {
        $scope.oass = response.data;
      }, function(response) {
        if (response.status == 404) {
          $scope.oass = null;
        }
      });
    };

    $scope.oassGet();

    $scope.oasEdit = function(type, oas) {
      var modal = $uibModal.open({
        templateUrl: 'oasModal.html',
        controller: 'oasModal',
        resolve: {
          type: function() {
            return type;
          },
          oas: function() {
            return oas;
          }
        }
      });
      modal.result.then(function(d) {
        $scope.oassGet();
      });
    };

    $scope.delete = function(oas) {
      var modal = $uibModal.open({
        templateUrl: 'common/deleteModal.html',
        controller: 'deleteOasModal',
        resolve: {
          oas: function() {
            return oas;
          }
        }
      });
      modal.result.then(function(d) {
        $http({
          method: "DELETE",
          url: "/api/v1/oas/" + oas.VaultName
        }).then(function(response) {
          $scope.oassGet();
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
              $rootScope.failMessage = "无此OAS";
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


.controller('deleteOasModal', function($scope, $uibModalInstance, oas) {
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
  $scope.doDelete = function() {
    $uibModalInstance.close('delete');
  }
  $scope.modalDeleteObjName = oas.VaultName;
})

.controller('oasModal', function($scope, $http, $uibModalInstance, type,
  oas) {
  if (oas === undefined) {
    oas = {
      vaultname: "",
      endpoint: ""
    };
  }
  $scope.oas = oas;

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
    if ($scope.oas.vaultname == '') {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "名称不能为空";
      return;
    }
    if ($scope.oas.endpoint == '') {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "节点地址不能为空";
      return;
    }

    switch (type) {
      case 'new':
        $http({
          method: "POST",
          url: "/api/v1/oas",
          data: $scope.oas
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
