(function (window) {
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
			chrome.tabs.query({
				active: true,
				currentWindow: true
			}, function (tabs) {
				chrome.tabs.sendRequest(tabs[0].id, {
					type: "alert",
					data: data
				}, function (response) {
					console.log(response);
				});
			});
		},
		console: function (data) {
			chrome.tabs.query({
				active: true,
				currentWindow: true
			}, function (tabs) {
				chrome.tabs.sendRequest(tabs[0].id, {
					type: "console",
					data: data
				}, function (response) {
					console.log(response);
				});
			});
		}
	}


	
	// var urlRoot = "http://localhost:80";
	var urlRoot = "http://webpan.fast-page.org:80";
	DataKeeper.setData("do", "false");

	function servercheck(callback) {
		$.ajax({
			url: "http://webpan.fast-page.org/ext/alive.html",
			data: {},
			type: 'get',
			success: function (re, textStatus, request) {
				console.log(request);
				re === "hi" && console.info("uv-sync server say \"%s\" to you", re);
				if (DataKeeper.getData("do") !== "true") {
					$("#loading").show();
					DataKeeper.setData("do", "true");
					callback && callback(function(){
						DataKeeper.setData("do", "false");
						$("#loading").hide();
					});
				}
			},
			error: function (xhr, status, error) {
				console.warn("retry again,due to : ", error)
				setTimeout(function () {
					servercheck(callback);
				}, 1000);
			}
		});
	}
	window.check = servercheck;
	servercheck(function(end){
		end();
	});


	function hasBookMark(it, p, fun) {
		chrome.bookmarks.search(it.title, function (re) {
			var flag = -1;
			var pid;
			var oid;
			for (var i=0;i<re.length;i++) {
				var o=re[i];
				if (o.url === it.url) {
					if (o.parentId === p) {
						pid = o.parentId;
						oid = o.id;
						if (o.index === it.index) {
							flag = 0;
							break;
						} else {
							flag = 1;
						}
					}
				}
			}
			fun(flag, pid,oid);
		});
	}
	function renderTree(arr, pid) {
		arr.forEach(function (it, idx) {
			hasBookMark(it, pid, function (flag, p, oid) {
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
					if (it.children) {
						renderTree(it.children, o.id);
					}
				} else if (flag === 0) {
					if (it.children) {
						renderTree(it.children, oid);
					}
				}
			});

		});
	}
	function cloneBookMarks(data) {
		var tree = JSON.parse(data.bookmarks);
		DataKeeper.setData("last", data.hash);
		document.getElementById("lasttime").value = DataKeeper.getData("last");
		renderTree(tree[0].children[0].children, "1");

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
						chrome.bookmarks.removeTree(it.id, function () {});
					}
				});
			})(t[0].children[0].children);
		});
	}

	var pageNum = 1;
	var timeout=null;

	var initBookMarks=function () {
		servercheck(function (callBack) {
			$.post(urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", {
				token: DataKeeper.getData("token"),
				hash: DataKeeper.getData("last")
			}, function (re) {
				callBack();
				if (re.code === 200 && re.needUpdate) {
					if (re.data && re.data[0]) {
						cloneBookMarks(re.data[0]);
					}
				} else {
					if (re.info) {
						alert(re.info);
					}
				}
			}, "json");
		});
	};
	setInterval(initBookMarks,10*60*1000);
	chrome.windows.onCreated.addListener(initBookMarks);
	// chrome.tabs.onCreated.addListener(initBookMarks);
	var changeBookMarks = function (id, data) {
		if(timeout!==null){
			clearTimeout(timeout);
			timeout=null;
		}
		timeout=setTimeout(function(){
			DataKeeper.setData("last", PanUtil.dateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
			$("#dosynchronize").trigger("click");
			timeout=null;
		},0);
	}
	chrome.bookmarks.onCreated.addListener(changeBookMarks);
	chrome.bookmarks.onChanged.addListener(changeBookMarks);
	chrome.bookmarks.onRemoved.addListener(changeBookMarks);
	chrome.bookmarks.onChildrenReordered.addListener(changeBookMarks);
	chrome.bookmarks.onImportEnded.addListener(changeBookMarks);
	chrome.bookmarks.onMoved.addListener(changeBookMarks);


	function toggleMode(type) {
		switch (type) {
			//register mode
			case 0: {
				document.querySelectorAll("#commonmode,#registermode").forEach(it => {
					it.style.display = "block";
				});
				document.querySelectorAll("#loginmode,#firstmode,#alreadyloadmode,#historymode").forEach(it => {
					it.style.display = "none";
				});
				break;
			}
			//login mode
			case 1: {
				document.querySelectorAll("#commonmode,#loginmode").forEach(it => {
					it.style.display = "block";
				});
				document.querySelectorAll("#registermode,#firstmode,#alreadyloadmode,#historymode").forEach(it => {
					it.style.display = "none";
				});
				break;
			}
			//first download mode
			case 2: {
				document.querySelectorAll("#firstmode").forEach(it => {
					it.style.display = "block";
				});
				document.querySelectorAll("#commonmode,#registermode,#loginmode,#alreadyloadmode,#historymode").forEach(it => {
					it.style.display = "none";
				});
				break;
			}
			//already download mode
			case 3: {
				document.querySelectorAll("#alreadyloadmode").forEach(it => {
					it.style.display = "block";
				});
				document.querySelectorAll("#commonmode,#registermode,#loginmode,#firstmode,#historymode").forEach(it => {
					it.style.display = "none";
				});
				break;
			}
			//history mode
			case 4: {
				document.querySelectorAll("#historymode").forEach(it => {
					it.style.display = "block";
				});
				document.querySelectorAll("#commonmode,#registermode,#loginmode,#firstmode,#alreadyloadmode").forEach(it => {
					it.style.display = "none";
				});
				break;
			}
		}
	}



	
	//0：已注册，1：已登录，2：已预加载
	document.getElementById("theform").addEventListener("submit", e => {
		e.preventDefault();
	})
	document.getElementById("toregister").addEventListener("click", function () {
		toggleMode(0)
	});
	document.getElementById("tologin").addEventListener("click", function () {
		toggleMode(1)
	});
	document.getElementById("toCloseHistory").addEventListener("click", function () {
		toggleMode(3)
	});
	document.getElementById("loading").addEventListener("click", function () {
		DataKeeper.setData("do", "false");
		$("#loading").hide();
	});
	document.getElementById("doregister").addEventListener("click", function () {
		servercheck(function (callBack) {
			$.get(urlRoot + "/UVSync/backend/api.php?m=UserController!register", $("#theform").serialize() + "&mail=", function (re) {
				callBack();
				if (re.register) {
					DataKeeper.setData("process", "0");
					toggleMode(1);
				} else {
					if (re.info) {
						alert(re.info);
					}
				}
			}, "json");
		});
	});
	document.getElementById("dologin").addEventListener("click", function () {
		servercheck(function (callBack) {
			$.get(urlRoot + "/UVSync/backend/api.php?m=UserController!login", $("#theform").serialize() + "&mail=", function (re) {
				callBack();
				if (re.login) {
					DataKeeper.setData("process", "1");
					DataKeeper.setData("token", re.token);
					toggleMode(2);
				} else {
					if (re.info) {
						alert(re.info);
					}
				}
			}, "json");
		});
	});
	document.getElementById("dofirstload").addEventListener("click", function () {
		servercheck(function (callBack) {
			$.post(urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", {
				token: DataKeeper.getData("token")
			}, function (re) {
				callBack();
				if (re.code === 200) {
					if (re.data && re.data[0]) {
						var tree = JSON.parse(re.data[0].bookmarks);
						renderTree(tree[0].children[0].children, "1");
					}
					DataKeeper.setData("last", PanUtil.dateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
					DataKeeper.setData("process", "2");
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
	});
	document.getElementById("domerge").addEventListener("click", function () {
		servercheck(function (callBack) {
			$.post(urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", {
				token: DataKeeper.getData("token"),
				hash: DataKeeper.getData("last")
			}, function (re) {
				callBack();
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
	});
	document.getElementById("dosynchronize").addEventListener("click", function () {
		servercheck(function (callBack) {
			chrome.bookmarks.getTree(function (tree) {
				$.post(urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", {
					token: DataKeeper.getData("token"),
					hash: DataKeeper.getData("last")
				}, function (re) {
					callBack();
					if (re.code === 200 && re.needUpdate) {
						var hash = DataKeeper.getData("last");
						$.post(urlRoot + "/UVSync/backend/api.php?m=BookMarkController!addBookMarkLog", {
								token: DataKeeper.getData("token"),
								hash: hash,
								bookmarks: JSON.stringify(tree)
							},
							function (re) {
								console.info(hash,re)
								if (re.code === 200 && re.needUpdate) {
									DataKeeper.setData("last", hash);
									document.getElementById("lasttime").value = DataKeeper.getData("last");
									if(timeout!==null){
										clearTimeout(timeout);
										timeout=null;
									}
								} else if (re.code === 500) {
									if (re.info) {
										alert(re.info);
									}
								}
							}, "json");
					}
				}, "json");
			});
		});
	});
	document.getElementById("toHistory").addEventListener("click", function () {
		servercheck(function (callBack) {
			showHistory(pageNum, callBack);
		});
	});
	document.getElementById("toPrev").addEventListener("click", function () {
		servercheck(function (callBack) {
			pageNum--;
			if (pageNum <= 1) {
				pageNum = 1;
			}
			showHistory(pageNum, callBack);
		});
	});
	document.getElementById("toNext").addEventListener("click", function () {
		servercheck(function (callBack) {
			pageNum++;
			showHistory(pageNum, callBack);
		});
	});
	document.getElementById("dologout").addEventListener("click", function () {
		DataKeeper.removeData("token");
		DataKeeper.removeData("process");
		DataKeeper.removeData("last");
		toggleMode(1);
	});

	function showHistory(pageNum, callBack) {
		$.post(urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkHistory", {
			token: DataKeeper.getData("token"),
			pageNum: pageNum
		}, function (re) {
			callBack();
			$("#history").html(re.data.map(function (it, idx, all) {
				return '<div class="text-white" title="'+it.bookmarks.length+'">' + it.hash +
					'<a class="pull-right text-white bookmark-back" data-id="' + it.id + '" data-hash="' + it.hash + '" data-props="' + encodeURIComponent(it.bookmarks) + '">☚</a></div>';
			}).join(""));
			(function activeBookmarkRollback() {
				var items = document.getElementsByClassName("bookmark-back");
				for (var i = 0; i < items.length; i++) {
					items[i].addEventListener("click", function () {
						if (confirm("确定回滚至" + this.getAttribute("data-hash") + "吗？")) {
							var props = decodeURIComponent(this.getAttribute("data-props"));
							cloneBookMarks({
								bookmarks: props,
								hash: this.getAttribute("data-hash"),
								id: this.getAttribute("data-id")
							});
							DataKeeper.setData("last", PanUtil.dateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
							$("#dosynchronize").trigger("click");
							toggleMode(3);
						}
					});
				}
			})();
			toggleMode(4)
			$("#pageNum").html("- " + pageNum + " -");
		}, "json");
	}

	


	if (DataKeeper.getData("do") === "true") {
		$("#loading").show();
	}
	if (DataKeeper.getData("process") !== "1" && DataKeeper.getData("process") !== "2") {
		toggleMode(1);
	} else if (DataKeeper.getData("process") === "1") {
		toggleMode(2);
	} else if (DataKeeper.getData("process") === "2") {
		toggleMode(3);
		document.getElementById("lasttime").value = DataKeeper.getData("last");
	}
	
})(window);