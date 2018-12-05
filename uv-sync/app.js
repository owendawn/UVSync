(function () {
  // var urlRoot = "http://localhost:80";
  var urlRoot = "http://webpan.fast-page.org:80";
  var firstCheck = false;
  function toggleMode(type) {
    switch (type) {
      //register mode
      case 0: {
        document.querySelectorAll("#commonmode,#registermode").forEach(it => { it.style.display = "block"; });
        document.querySelectorAll("#loginmode,#firstmode,#alreadyloadmode").forEach(it => { it.style.display = "none"; });
        break;
      }
      //login mode
      case 1: {
        document.querySelectorAll("#commonmode,#loginmode").forEach(it => { it.style.display = "block"; });
        document.querySelectorAll("#registermode,#firstmode,#alreadyloadmode").forEach(it => { it.style.display = "none"; });
        break;
      }
      //first download mode
      case 2: {
        document.querySelectorAll("#firstmode").forEach(it => { it.style.display = "block"; });
        document.querySelectorAll("#commonmode,#registermode,#loginmode,#alreadyloadmode").forEach(it => { it.style.display = "none"; });
        break;
      }
      //already download mode
      case 3: {
        document.querySelectorAll("#alreadyloadmode").forEach(it => { it.style.display = "block"; });
        document.querySelectorAll("#commonmode,#registermode,#loginmode,#firstmode").forEach(it => { it.style.display = "none"; });
      }
    }
  }

  var DataKeeper = {
    setData: function (k, v) {
      window.localStorage.setItem(k, v);
    },
    getData: function (k) {
      return window.localStorage.getItem(k);
    },
    removeData: function (k) {
      window.localStorage.removeItem(k);
    }
  };

  var DataNotify = {
    alert: function (data) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendRequest(tabs[0].id, { type: "alert", data: data }, function (response) {
          console.log(response);
        });
      });
    },
    console: function (data) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendRequest(tabs[0].id, { type: "console", data: data }, function (response) {
          console.log(response);
        });
      });
    }
  }

  function hasBookMark(it, p, fun) {
    chrome.bookmarks.search(it.title, function (re) {
      var flag = -1;
      var pid;
      var oid;
      re.forEach(function (o, idx, all) {
        if (o.url === it.url) {
          if (o.parentId === p) {
            if (o.index === it.index) {
              pid = o.id;
              flag = 0;
              return;
            } else {
              pid = o.parentId;
              oid=o.id;
              flag = 1;
              return;
            }
          }
        }
      });
      fun(flag, pid);
    })
  }
  function renderTree(arr, pid) {
    arr.forEach(function (it, idx) {
      hasBookMark(it, pid, function (flag, p,oid) {
        if (flag === -1) {
          chrome.bookmarks.create({
            'parentId': pid,
            'title': it.title,
            'url': it.url,
            'index': it.index
          }, function (o) {
            if (it.children) {
              renderTree(it.children, o.id);
            }
          });
        } else if (flag === 1) {
          // chrome.bookmarks.create({
          //   'parentId': p,
          //   'title': it.title,
          //   'url': it.url,
          //   'index': it.index
          // }, function (o) {
           
          // }); 
          if (it.children) {
              renderTree(it.children, oid);
            }
        } else if (flag === 0) {
          if (it.children) {
            renderTree(it.children, p);
          }
        }
      });

    });
  }




  document.getElementById("theform").addEventListener("submit", e => { e.preventDefault(); })
  document.getElementById("toregister").addEventListener("click", function () { toggleMode(0) });
  document.getElementById("tologin").addEventListener("click", function () { toggleMode(1) });
  document.getElementById("doregister").addEventListener("click", function () {
    $.get(urlRoot + "/UVSync/backend/api.php?m=UserController!register", $("#theform").serialize() + "&mail=", function (re) {
      if (re.register) {
        toggleMode(1);
      } else {
        if (re.info) {
          alert(re.info);
        }
      }
    }, "json");
  });
  document.getElementById("dologin").addEventListener("click", function () {
    $.get(urlRoot + "/UVSync/backend/api.php?m=UserController!login", $("#theform").serialize() + "&mail=", function (re) {
      if (re.login) {
        DataKeeper.setData("islogin", true);
        DataKeeper.setData("token", re.token);
        toggleMode(2);
      } else {
        if (re.info) {
          alert(re.info);
        }
      }
    }, "json");
  });
  document.getElementById("dofirstload").addEventListener("click", function () {
    $.post(urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", { token: DataKeeper.getData("token") }, function (re) {
      if (re.code === 200) {
        if (re.data && re.data[0]) {
          var tree = JSON.parse(re.data[0].bookmarks);
          renderTree(tree[0].children[0].children, "1");
        }
        DataKeeper.setData("last", PanUtil.dateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
        DataKeeper.setData("isloaded", true);
        document.getElementById("lasttime").value = DataKeeper.getData("last");
        $("#dosynchronize").trigger("click");
        toggleMode(3);
      } else {
        if (re.info) {
          alert(re.info);
        }
      }
    }, "json");
  });
  document.getElementById("domerge").addEventListener("click", function () {
    $.post(urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", { token: DataKeeper.getData("token"), hash: DataKeeper.getData("last") }, function (re) {
      if (re.code === 200 && re.needUpdate) {
        if (re.data && re.data[0]) {
          var tree = JSON.parse(re.data[0].bookmarks);
          renderTree(tree[0].children[0].children, "1");
          DataKeeper.setData("last", re.data[0].hash);
          document.getElementById("lasttime").value = DataKeeper.getData("last");
        }
      } else {
        if (re.info) {
          alert(re.info);
        }
      }
    }, "json");
  });
  document.getElementById("dosynchronize").addEventListener("click", function () {
    chrome.bookmarks.getTree(function (tree) {
      $.post(urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", { token: DataKeeper.getData("token"), hash: DataKeeper.getData("last") }, function (re) {
        if (re.code === 200 && re.needUpdate) {
          var hash = DataKeeper.getData("last");
          $.post(urlRoot + "/UVSync/backend/api.php?m=BookMarkController!addBookMarkLog",
            {
              token: DataKeeper.getData("token"),
              hash: hash,
              bookmarks: JSON.stringify(tree)
            },
            function (re) {
              if (re.code === 200 && re.needUpdate) {
                DataKeeper.setData("last", hash);
                document.getElementById("lasttime").value = DataKeeper.getData("last");
              } else {
                if (re.info) {
                  alert(re.info);
                }
              }
            }, "json");
        }
      }, "json");
    });
  });
  document.getElementById("dologout").addEventListener("click", function () {
    DataKeeper.removeData("islogin");
    DataKeeper.removeData("token");
    DataKeeper.removeData("isloaded");
    DataKeeper.removeData("last");
    toggleMode(1);
  });


  var changeBookMarks = function (id, data) {
    DataKeeper.setData("last", PanUtil.dateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
    $("#dosynchronize").trigger("click");
  }
  chrome.bookmarks.onCreated.addListener(changeBookMarks);
  chrome.bookmarks.onChanged.addListener(changeBookMarks);
  chrome.bookmarks.onRemoved.addListener(changeBookMarks);
  chrome.bookmarks.onChildrenReordered.addListener(changeBookMarks);
  chrome.bookmarks.onImportEnded.addListener(changeBookMarks);
  chrome.bookmarks.onMoved.addListener(changeBookMarks);

  function updateBookMarks() {
    $.post(urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", { token: DataKeeper.getData("token"), hash: DataKeeper.getData("last") }, function (re) {
      if (re.code === 200 && re.needUpdate) {
        if (re.data && re.data[0]) {
          var tree = JSON.parse(re.data[0].bookmarks);
          renderTree(tree[0].children[0].children, "1");
          DataKeeper.setData("last", re.data[0].hash);
          document.getElementById("lasttime").value = DataKeeper.getData("last");

          var colls = {};
          (function collect(tt) {
            tt.forEach(function (it) {
              if (!colls[it.title]) {
                colls[it.title] = it;
              }
              if (it.children) {
                collect(it.children);
              }
            });
          })(tree[0].children[0].children);

          chrome.bookmarks.getTree(function (t) {
            (function intree(ch) {
              ch.forEach(function (it) {
                if (!colls[it.title]) {
                  chrome.bookmarks.removeTree(it.id, function () { });
                }
              });
            })(t[0].children[0].children);
          });
        }
      } else {
        if (re.info) {
          alert(re.info);
        }
      }
    }, "json");
  }
  chrome.tabs.onCreated.addListener(function (info) {
    if (!firstCheck) {
      firstCheck=true;
      updateBookMarks();
    }
  });
  chrome.windows.onCreated.addListener(function (id) {
    if (!firstCheck) {
      firstCheck=true;
      updateBookMarks();
    }
  });

  $("#tmp").load("http://webpan.fast-page.org/?i=1",function(re){
    //alert(re);
  });


  if (!DataKeeper.getData("islogin")) {
    toggleMode(1);
  } else if (!DataKeeper.getData("isloaded")) {
    toggleMode(2);
  } else {
    toggleMode(3);
    document.getElementById("lasttime").value = DataKeeper.getData("last");
  }
})();
