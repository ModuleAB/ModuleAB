'use strict';

angular.module('ModuleAB.policies', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/policies', {
    templateUrl: 'policies/policies.html',
    controller: 'policies'
  });
}])

.controller('policies', ['$scope', '$http', '$uibModal', '$rootScope',
  function($scope, $http, $uibModal, $rootScope) {
    $scope.types = {
      1: "备份",
      2: "归档"
    };
    $scope.actions = {
      1: "转换为归档",
      2: "删除"
    };
    $scope.policiesGet = function() {
      $http({
        method: "GET",
        url: "/api/v1/policies"
      }).then(function(response) {
        $scope.policies = response.data;
      }, function(response) {
        if (response.status == 404) {
          $scope.policies = null;
        }
      });
    };

    $scope.policiesGet();

    $scope.policyEdit = function(type, policy) {
      var modal = $uibModal.open({
        templateUrl: 'policyModal.html',
        controller: 'policyModal',
        resolve: {
          type: function() {
            return type;
          },
          policy: function() {
            return policy;
          },
          types: function() {
            return $scope.types
          },
          actions: function() {
            return $scope.actions
          }
        }
      });
      modal.result.then(function(d) {
        $scope.policiesGet();
      });
    };

    $scope.delete = function(policy) {
      var modal = $uibModal.open({
        templateUrl: 'common/deleteModal.html',
        controller: 'deletePolicyModal',
        resolve: {
          policy: function() {
            return policy;
          }
        }
      });
      modal.result.then(function(d) {
        $http({
          method: "DELETE",
          url: "/api/v1/policies/" + policy.name
        }).then(function(response) {
          $scope.policiesGet();
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

.controller('deletePolicyModal', function($scope, $uibModalInstance, policy) {
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
  $scope.doDelete = function() {
    $uibModalInstance.close('delete');
  }
  $scope.modalDeleteObjName = policy.name;
})

.controller('policyModal', function($scope, $http, $uibModalInstance, type,
  policy, types, actions) {

  if (policy === undefined) {
    policy = {
      name: "",
      description: "",
      backupset: null,
      appsets: [],
      paths: [],
      hosts: [],
      target: null,
      action: null,
      starttime: null,
      endtime: null,
      step: 0
    };
  }
  $scope.policy = policy;
  $scope.types = types;
  $scope.actions = actions;
  $scope.oldName = policy.name;
  $scope.startTime = policy.starttime / 86400;
  $scope.endTime = policy.endtime == -1 ? policy.endtime : policy.endtime /
    86400;
  $scope.step = policy.step == -1 ? policy.step : policy.step / 86400;

  $http({
    method: "GET",
    url: "/api/v1/backupSets"
  }).then(function(response) {
    $scope.backupSets = response.data;
  }, function(response) {});

  $http({
    method: "GET",
    url: "/api/v1/appSets"
  }).then(function(response) {
    $scope.appSets = response.data;
  }, function(response) {});

  $http({
    method: "GET",
    url: "/api/v1/hosts"
  }).then(function(response) {
    $scope.hosts = response.data;
  }, function(response) {});

  $http({
    method: "GET",
    url: "/api/v1/paths"
  }).then(function(response) {
    $scope.paths = response.data;
  }, function(response) {});

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
  try {
    $scope.selectedBackupSet = policy.backupset.id;
  } catch (e) {
    $scope.selectedBackupSet = "";
  }
  $scope.selectedAppSets = [];
  $scope.$watch('policy.appsets', function(s) {
    if (!s) {
      return;
    }
    angular.forEach(s, function(v) {
      $scope.selectedAppSets.push(v.id);
    });
  });
  $scope.selectedHosts = [];
  $scope.$watch('policy.hosts', function(s) {
    if (!s) {
      return;
    }
    angular.forEach(s, function(v) {
      $scope.selectedHosts.push(v.id);
    });
  });
  $scope.selectedPaths = [];
  $scope.$watch('policy.paths', function(s) {
    if (!s) {
      return;
    }
    angular.forEach(s, function(v) {
      $scope.selectedPaths.push(v.id);
    });
  });
  $scope.doJob = function() {
    if ($scope.policy.name == '') {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "名称不能为空";
      return;
    }

    angular.forEach($scope.backupSets, function(s0) {
      if ($scope.selectedBackupSet == s0.id) {
        $scope.policy.backupset = s0;
        return;
      }
    });
    try {
      if ($scope.policy.backupset.id == "")
        throw "bad";
    } catch (e) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "需要指定一个备份集";
      return;
    }

    $scope.policy.appsets = [];
    angular.forEach($scope.selectedAppSets, function(s0) {
      angular.forEach($scope.appSets, function(s1) {
        if (s1.id == s0)
          $scope.policy.appsets.push(s1);
      });
    });
    if ($scope.policy.appsets.length == 0) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "需要指定至少一个应用集";
      return;
    }

    $scope.policy.hosts = [];
    angular.forEach($scope.selectedHosts, function(s0) {
      angular.forEach($scope.hosts, function(s1) {
        if (s1.id == s0)
          $scope.policy.hosts.push(s1);
      });
    });
    if ($scope.policy.hosts.length == 0) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "需要绑定至少一个主机";
      return;
    }

    $scope.policy.paths = [];
    angular.forEach($scope.selectedPaths, function(s0) {
      angular.forEach($scope.paths, function(s1) {
        if (s1.id == s0)
          $scope.policy.paths.push(s1);
      });
    });
    if ($scope.policy.paths.length == 0) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "需要绑定至少一个路径";
      return;
    }

    if (isNaN($scope.startTime)) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "需要指定有效的起始时间";
      return;
    }
    $scope.policy.starttime = (+$scope.startTime) * 86400;

    if (isNaN($scope.endTime)) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "需要指定有效的结束时间";
      return;
    }
    $scope.policy.endtime = $scope.endTime == -1 ? +$scope.endTime :
      (+$scope.endTime) * 86400;

    if ($scope.policy.target == 0) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "需要指定目标类型";
      return;
    }
    if ($scope.policy.action == 0) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "需要指定一个动作";
      return;
    }
    if (isNaN($scope.step)) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "需要指定有效的删除间隔";
      return;
    }
    $scope.policy.step = $scope.step == -1 ? +$scope.step :
      (+$scope.step) * 86400;

    $scope.policy.target = +$scope.policy.target;
    $scope.policy.action = +$scope.policy.action;

    if ($scope.policy.target == 2 && $scope.policy.action == 1) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "归档不适用此动作";
      return;
    }

    console.log($scope.policy);

    switch (type) {
      case 'new':
        $http({
          method: "POST",
          url: "/api/v1/policies",
          data: $scope.policy
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
          url: "/api/v1/policies/" + $scope.oldName,
          data: $scope.policy
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
