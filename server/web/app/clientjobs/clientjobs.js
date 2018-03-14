'use strict';

angular.module('ModuleAB.clientjobs', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/clientjob', {
    templateUrl: 'clientjobs/clientjobs.html',
    controller: 'clientJobs'
  });
}])

.controller('clientJobs', ['$scope', '$http', '$uibModal', '$rootScope',
  function($scope, $http, $uibModal, $rootScope) {
    $scope.actions = {
      1: "删除"
    }
    $scope.clientJobsGet = function() {
      $http({
        method: "GET",
        url: "/api/v1/clientJobs"
      }).then(function(response) {
        $scope.clientJobs = response.data;
      }, function(response) {
        if (response.status == 404) {
          $scope.clientJobs = null;
        }
      });
    };

    $scope.clientJobsGet();

    $scope.clientJobEdit = function(type, clientJob) {
      var modal = $uibModal.open({
        templateUrl: 'clientJobModal.html',
        controller: 'clientJobModal',
        resolve: {
          type: function() {
            return type;
          },
          clientJob: function() {
            return clientJob;
          },
          actions: function() {
            return $scope.actions;
          }
        }
      });
      modal.result.then(function(d) {
        $scope.clientJobsGet();
      });
    };

    $scope.delete = function(clientJob) {
      var modal = $uibModal.open({
        templateUrl: 'common/deleteModal.html',
        controller: 'deleteClientJobModal',
        resolve: {
          clientJob: function() {
            return clientJob;
          }
        }
      });
      modal.result.then(function(d) {
        $http({
          method: "DELETE",
          url: "/api/v1/clientJobs/" + clientJob.id
        }).then(function(response) {
          $scope.clientJobsGet();
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
              $rootScope.failMessage = "无此策略";
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

.controller('deleteClientJobModal', function($scope, $uibModalInstance,
  clientJob) {
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
  $scope.doDelete = function() {
    $uibModalInstance.close('delete');
  }
  $scope.modalDeleteObjName = clientJob.id;
})

.controller('clientJobModal', function($scope, $http, $uibModalInstance, type,
  clientJob, actions) {

  $scope.actions = actions;
  if (clientJob === undefined) {
    clientJob = {
      period: 0,
      type: 1,
      reservedtime: 0,
      hosts: [],
      paths: []
    };
  }
  $scope.clientJob = clientJob;
  $scope.clientJobperiod = clientJob.period / 86400;
  $scope.clientJobreservedtime = clientJob.reservedtime / 86400;

  $http({
    method: "GET",
    url: "/api/v1/hosts"
  }).then(function(response) {
    $scope.hosts = response.data;
  }, function(response) {
    // do nothing
  });

  $http({
    method: "GET",
    url: "/api/v1/paths"
  }).then(function(response) {
    $scope.paths = response.data;
  }, function(response) {
    if (response.status == 404) {
      $scope.paths = response.data;
    }
    // do nothing
  });

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
  $scope.selectedHosts = [];
  $scope.$watch('clientJob.hosts', function(s) {
    if (!s) {
      return;
    }
    angular.forEach(s, function(v) {
      $scope.selectedHosts.push(v.id.toString());
    });
  });
  $scope.selectedPaths = [];
  $scope.$watch('clientJob.paths', function(s) {
    if (!s) {
      return;
    }
    angular.forEach(s, function(v) {
      $scope.selectedPaths.push(v.id.toString());
    });
  });

  $scope.doJob = function() {
    $scope.clientJob.period = (+$scope.clientJobperiod) * 86400;
    if ($scope.clientJob.period == 0) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "执行周期不能为 0";
      return;
    }

    $scope.clientJob.reservedtime = (+$scope.clientJobreservedtime) *
      86400;
    if ($scope.clientJob.reservedtime == 0) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "保留时长不能为 0";
      return;
    }

    $scope.clientJob.hosts = [];
    angular.forEach($scope.selectedHosts,
      function(s0) {
        angular.forEach($scope.hosts, function(s1) {
          if (s1.id == s0) {
            $scope.clientJob.hosts.push(s1);
          }
        });
      });
    if ($scope.clientJob.hosts.length == 0) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "请绑定至少一个主机";
      return;
    }

    $scope.clientJob.paths = [];
    angular.forEach($scope.selectedPaths,
      function(s0) {
        angular.forEach($scope.paths, function(s1) {
          if (s1.id == s0) {
            $scope.clientJob.paths.push(s1);
          }
        });
      });
    if ($scope.clientJob.paths.length == 0) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "请绑定至少一个路径";
      return;
    }

    switch (type) {
      case 'new':
        $http({
          method: "POST",
          url: "/api/v1/clientJobs",
          data: $scope.clientJob
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
          url: "/api/v1/clientJobs/" + $scope.clientJob.id,
          data: $scope.clientJob
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
              $scope.modalInfoMsg = "无此路径";
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
