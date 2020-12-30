chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type === "console") {
    console.log(request.data);
  } else if (request.type === "alert") {
    alert(request.data);
  } else if (request.type === "notify") {
    var NotificationInstance = Notification || window.Notification;
    if (NotificationInstance.permission !== 'granted') {
      NotificationInstance.requestPermission(function (PERMISSION) {
        if (PERMISSION === 'granted') {
          console.log("Notify已开启!")
        } else {
          console.log('用户无情残忍的拒绝了你!!!');
        }
      });
    }
    if (!!NotificationInstance) {
      var permissionNow = NotificationInstance.permission;
      if (permissionNow === 'granted') {
        var n = new NotificationInstance('UVSync书签同步', {
          body: request.data,
          tag: '2ue',
          icon: 'https://2ue.github.io/images/common/avatar.png',
          data: {
            url: '#'
          }
        });
        n.onshow = function () {
          console.log('通知显示了！');
        }
        n.onclick = function (e) {
          window.open(n.data.url, '_blank');
          n.close();
        }
        n.onclose = function () {
          console.log('你墙壁了我！！！');
        }
        n.onerror = function (err) {
          console.log('出错了，小伙子在检查一下吧');
          throw err;
        }
        setTimeout(() => {
          n.close();
        }, 5000);
      }
    }
  } else {
    console.log(request.data);
  }
  sendResponse("runtime receive success! from content.js")
  return true;
});