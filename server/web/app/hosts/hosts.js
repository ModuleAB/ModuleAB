'use strict';

angular.module('ModuleAB.hosts', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/hosts', {
    templateUrl: 'hosts/hosts.html',
    controller: 'hosts'
  });
}])

.controller('hosts', ['$scope', '$http', '$uibModal', '$rootScope',
  function($scope, $http, $uibModal, $rootScope) {
    var clientStatus;
    $scope.currentPage = 1;
    $scope.numPerPage = 15;
    $scope.hostsGet = function() {
      $http({
        method: "GET",
        url: "/api/v1/hosts"
      }).then(function(response) {
        $scope.hosts = response.data;
        if ($scope.hosts.length > $scope.numPerPage) {
          $scope.$watch("currentPage + numPerPage", function() {
            var begin = ($scope.currentPage - 1) * $scope.numPerPage
            var end = begin + $scope.numPerPage;
            $scope.hostSlice = $scope.hosts.slice(begin, end)
          });
        } else {
          $scope.hostSlice = $scope.hosts
        }
      }, function(response) {
        if (response.status == 404) {
          $scope.hostSlice = null;
        }
      });
    };

    $scope.hostsRunGet = function() {
      $http({
        method: "GET",
        url: "/api/v1/client/config/status"
      }).then(function(response) {
        clientStatus = response.data;
      }, function(response) {
        clientStatus = null;
      });
    };

    $scope.hostsGet();
    $scope.hostsRunGet();

    $scope.hostEdit = function(type, host) {
      var modal = $uibModal.open({
        templateUrl: 'hostModal.html',
        controller: 'hostModal',
        resolve: {
          type: function() {
            return type;
          },
          host: function() {
            return host;
          }
        }
      });
      modal.result.then(function(d) {
        $scope.hostsGet();
      });
    };

    $scope.orderBy = function(o) {
      $scope.order = o;
    }

    $scope.getStatus = function(id) {
      try {
        return clientStatus[id];
      } catch (e) {
        return 0;
      }
    }

    $scope.delete = function(host) {
      var modal = $uibModal.open({
        templateUrl: 'common/deleteModal.html',
        controller: 'deleteHostModal',
        resolve: {
          host: function() {
            return host;
          }
        }
      });
      modal.result.then(function(d) {
        $http({
          method: "DELETE",
          url: "/api/v1/hosts/" + host.name
        }).then(function(response) {
          $scope.hostsGet();
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
              $rootScope.failMessage = "无此主机";
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

.controller('deleteHostModal', function($scope, $uibModalInstance, host) {
  $scope.cancel = function() {
    $uibModalInstance.dismiss('cancel');
  };
  $scope.doDelete = function() {
    $uibModalInstance.close('delete');
  }
  $scope.modalDeleteObjName = host.name;
})

.controller('hostModal', function($scope, $http, $uibModalInstance, type,
  host) {
  if (host === undefined) {
    host = {
      name: "",
      ip: "",
      appset: null,
      path: []
    };
  }
  $scope.host = host
  $scope.oldHostName = host.name
  $http({
    method: "GET",
    url: "/api/v1/appSets"
  }).then(function(response) {
    $scope.appSets = response.data;
  }, function(response) {
    // do nothing.
  });

  $http({
    method: "GET",
    url: "/api/v1/paths"
  }).then(function(response) {
    $scope.paths = response.data;
  }, function(response) {
    // do nothing.
  });
  try {
    $scope.selectedAppSet = $scope.host.appset.id;
  } catch (e) {
    $scope.selectedAppSet = "";
  }
  $scope.selectedPaths = [];
  $scope.$watch('host.path', function(s) {
    if (!s) {
      return;
    }
    angular.forEach(s, function(v) {
      $scope.selectedPaths.push(v.id.toString());
    });
  });

  switch (type) {
    case 'new':
      $scope.type = "新增";
      $scope.jobType = "fa-plus";
      $scope.job = "新增"
      $scope.isModifyMode = false;
      break;
    case 'modify':
      $scope.type = "修改";
      $scope.jobType = "fa-pencil";
      $scope.job = "修改";
      $scope.isModifyMode = true;
      break;
  }
  $scope.modalInfoFadein = "";
  $scope.doJob = function() {
    if ($scope.host.name == '') {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "主机名不能为空";
      return;
    }
    if ($scope.host.ip == '') {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "IP不能为空";
      return;
    }

    angular.forEach($scope.appSets, function(s0) {
      if ($scope.selectedAppSet == s0.id) {
        $scope.host.appset = s0;
        return;
      }
    });
    try {
      if ($scope.host.appset.id == "")
        throw "bad";
    } catch (e) {
      $scope.modalInfoFadein = "fadein-opacity";
      $scope.modalInfoMsg = "需要指定一个应用集";
      return;
    }

    $scope.host.path = [];
    angular.forEach($scope.selectedPaths, function(s0) {
      angular.forEach($scope.paths, function(s1) {
        if (s1.id == s0) {
          $scope.host.path.push(s1);
        }
      });
    });

    switch (type) {
      case 'new':
        $http({
          method: "POST",
          url: "/api/v1/hosts",
          data: $scope.host
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
          url: "/api/v1/hosts/" + $scope.oldHostName,
          data: $scope.host
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
              $scope.modalInfoMsg = "无此主机";
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
