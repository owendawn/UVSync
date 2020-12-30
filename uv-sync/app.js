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
	window.DataNotify = {
		alert: function (data) {
			chrome.tabs.query({
				active: true,
				currentWindow: true
			}, function (tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
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
				console.log(tabs)
				chrome.tabs.sendMessage(tabs[0].id, {
					type: "console",
					data: data
				}, function (response) {
					console.log(response);
				});
			});
		},
		notify: function (data) {
			chrome.notifications.create(new Date().getTime() + "", {
				title: 'UVSync书签同步',
				message: data + "",
				type: 'basic',
				iconUrl: 'https://2ue.github.io/images/common/avatar.png',
			}, (page) => {
				console.log(arguments)
			});
		}
	}

	$.ajaxSetup({
		header: {
			'Set-Cookie': 'widget_session=abc123; SameSite=None; Secure'
		}
	});

	setTimeout(function () {
		document.getElementById("testIframe").src = "http://pan.is-best.net/UVSync/backend/api.php?m=BookMarkController!getDateTime&-1";
	}, 100);
	// var urlRoot = "http://localhost:80";
	var urlRoot = "http://pan.is-best.net:80";
	var doWork = false;
	DataKeeper.setData("do", "false");

	function panAjax(type, url, data, succ, dataType, idx) {
		onLine(function (flag) {
			if (flag) {
				idx = idx || 1;
				$.ajax({
					url: url,
					data: data,
					type: type,
					// headers:{'Set-Cookie':'widget_session=abc123; SameSite=None; Secure'},
					success: succ,
					dataType: dataType,
					error: function (xhr, status, error) {
						console.warn("request retry again,due to : ", error)
						document.getElementById("testIframe").src = url;
						if (idx < 5) {
							setTimeout(function () {
								idx++;
								panAjax(type, url, data, succ, dataType, idx);
							}, 1000);
						} else {
							console.error("request 5th failed, no try again!");
							DataNotify.notify("同步数据请求已失败5次！！！");
						}
					}
				});
			} else {
				console.error("网络异常")
			}
		})
	}
	function onLine(callback) {
		var img = new Image();
		img.src = 'https://www.baidu.com/favicon.ico?_t=' + Date.now();
		img.onload = function () {
			if (callback) callback(true)
		};
		img.onerror = function () {
			if (callback) callback(false)
		};
	}
	function servercheck(callback, idx) {
		idx = idx || 1;
		$.ajax({
			url: urlRoot + "/UVSync/backend/alive.html",
			data: {},
			type: 'get',
			// headers:{'Set-Cookie':'widget_session=abc123; SameSite=None; Secure'},
			success: function (re, textStatus, request) {
				// console.log(request);
				re === "hi" && console.info("uv-sync server say \"%s\" to you", re);
				if (!doWork) {
					$("#loading").show();
					DataKeeper.setData("do", "true");
					doWork = true;
					callback && callback(function () {
						DataKeeper.setData("do", "false");
						doWork = false;
						$("#loading").hide();
					});
				}
			},
			error: function (xhr, status, error) {
				console.warn("retry again,due to : ", error)
				document.getElementById("testIframe").src = urlRoot + "/UVSync/backend/alive.html";
				if (idx < 5) {
					setTimeout(function () {
						idx++;
						servercheck(callback, idx);
					}, 3000);
				} else {
					console.error("5th failed, no try again!");
				}
			}
		});
	}
	window.check = servercheck;
	servercheck(function (end) {
		end();
	});


	function hasBookMark(it, p, fun) {
		chrome.bookmarks.search(it.title, function (re) {
			var flag = -1;
			var pid;
			var oid;
			for (var i = 0; i < re.length; i++) {
				var o = re[i];
				if (o.url === it.url && o.title === it.title) {
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
			fun(flag, pid, oid);
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
						renderTree(it.children, oid);
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
		console.log(tree)
		renderTree(tree[0].children[0].children, "1");

		var colls = {};
		(function collect(tt, p) {
			p++;
			tt.forEach(function (it, idx) {
				if (!colls[p + '|' + it.url + '|' + it.title]) {
					colls[p + '|' + it.url + '|' + it.title] = it;
				}
				if (it.children) {
					collect(it.children, p);
				}
			});
		})(tree[0].children[0].children, 0);

		chrome.bookmarks.getTree(function (t) {
			(function intree(ch, p) {
				p++;
				ch.forEach(function (it, idx) {
					if (!colls[p + '|' + it.url + '|' + it.title]) {
						chrome.bookmarks.removeTree(it.id, function () { });
					}
					if (it.children) {
						intree(it.children, p);
					}
				});
			})(t[0].children[0].children, 0);
		});
	}

	var pageNum = 1;
	var timeout = null;

	var initBookMarks = function () {
		servercheck(function (callBack) {
			panAjax(
				"post",
				urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", {
				token: DataKeeper.getData("token"),
				hash: DataKeeper.getData("last")
			},
				function (re) {
					callBack();
					if (re.code === 200) {
						if (re.needUpdate && re.data && re.data[0]) {
							cloneBookMarks(re.data[0]);
						} else if (re.needPush) {
							changeBookMarks();
						}
					} else {
						if (re.info) {
							alert(re.info);
						}
					}
				},
				"json"
			);
		});
	};

	chrome.alarms.clearAll();
	chrome.alarms.create("job", {
		when: new Date().getTime() + 10 * 1000,
		periodInMinutes: 5
	});
	chrome.alarms.onAlarm.addListener(function (alarm) {
		console.log('hash check now!')
		if (DataKeeper.getData("token")) {
			initBookMarks();
		}
	});

	chrome.windows.onCreated.addListener(initBookMarks);
	// chrome.tabs.onCreated.addListener(initBookMarks);
	var changeBookMarks = function (id, data) {
		if (timeout !== null) {
			clearTimeout(timeout);
			timeout = null;
		}
		timeout = setTimeout(function () {
			DataKeeper.setData("last", PanUtil.dateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
			sychrosize();
			timeout = null;
		}, 0);
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

	function sychrosize() {
		servercheck(function (callBack) {
			chrome.bookmarks.getTree(function (tree) {
				panAjax(
					"post",
					urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", {
					token: DataKeeper.getData("token"),
					hash: DataKeeper.getData("last")
				},
					function (re) {
						callBack();
						if (re.code === 200 && re.needPush) {
							var hash = DataKeeper.getData("last");
							panAjax(
								"post",
								urlRoot + "/UVSync/backend/api.php?m=BookMarkController!addBookMarkLog", {
								token: DataKeeper.getData("token"),
								hash: hash,
								bookmarks: JSON.stringify(tree)
							},
								function (re) {
									console.info(hash, re)
									if (re.code === 200 && re.updated) {
										DataKeeper.setData("last", hash);
										document.getElementById("lasttime").value = DataKeeper.getData("last");
										if (timeout !== null) {
											clearTimeout(timeout);
											timeout = null;
										}
									} else if (re.code === 500) {
										if (re.info) {
											alert(re.info);
										}
									}
								},
								"json"
							);
						}
					},
					"json"
				);
			});
		});
	}


	function showHistory(pageNum, callBack) {
		panAjax(
			"post",
			urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkHistory", {
			token: DataKeeper.getData("token"),
			pageNum: pageNum
		},
			function (re) {
				callBack();
				$("#history").html(re.data.map(function (it, idx, all) {
					return '<div class="text-white" title="' + it.size + '">' + it.hash +
						'<a class="pull-right text-white bookmark-back" data-id="' + it.id + '" data-hash="' + it.hash + '" data-props="' + encodeURIComponent(it.bookmarks) + '">≈</a></div>';
				}).join(""));
				(function activeBookmarkRollback() {
					var items = document.getElementsByClassName("bookmark-back");
					for (var i = 0; i < items.length; i++) {
						items[i].addEventListener("click", function () {
							if (confirm("确定回滚至" + this.getAttribute("data-hash") + "吗？")) {
								var that = this;
								servercheck(function (callBack) {
									panAjax(
										"post",
										urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkById", {
										token: DataKeeper.getData("token"),
										id: that.getAttribute("data-id")
									},
										function (re) {
											var props = re.data.bookmarks;
											cloneBookMarks({
												bookmarks: props,
												hash: that.getAttribute("data-hash"),
												id: that.getAttribute("data-id")
											});
											DataKeeper.setData("last", PanUtil.dateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
											toggleMode(3);
											setTimeout(function () {
												sychrosize();
											}, 10 * 1000)
											callBack();
										},
										"json"
									);
								});
							}
						});
					}
				})();
				toggleMode(4)
				$("#pageNum").html("- " + pageNum + " -");
			},
			"json"
		);
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
		doWork = false;
		$("#loading").hide();
	});
	document.getElementById("doregister").addEventListener("click", function () {
		servercheck(function (callBack) {
			panAjax(
				"get",
				urlRoot + "/UVSync/backend/api.php?m=UserController!register",
				$("#theform").serialize() + "&mail=",
				function (re) {
					callBack();
					if (re.register) {
						DataKeeper.setData("process", "0");
						toggleMode(1);
					} else {
						if (re.info) {
							alert(re.info);
						}
					}
				},
				"json"
			);
		});
	});
	document.getElementById("dologin").addEventListener("click", function () {
		servercheck(function (callBack) {
			panAjax(
				"get",
				urlRoot + "/UVSync/backend/api.php?m=UserController!login",
				$("#theform").serialize() + "&mail=",
				function (re) {
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
				},
				"json"
			);
		});
	});
	document.getElementById("dofirstload").addEventListener("click", function () {
		servercheck(function (callBack) {
			panAjax(
				"post",
				urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", {
				token: DataKeeper.getData("token")
			},
				function (re) {
					callBack();
					if (re.code === 200) {
						if (re.data && re.data[0]) {
							var tree = JSON.parse(re.data[0].bookmarks);
							renderTree(tree[0].children[0].children, "1");
						}
						DataKeeper.setData("last", PanUtil.dateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
						DataKeeper.setData("process", "2");
						document.getElementById("lasttime").value = DataKeeper.getData("last");
						toggleMode(3);
						setTimeout(function () {
							sychrosize();
						}, 10 * 1000)
					} else {
						if (re.info) {
							alert(re.info);
						}
					}
				},
				"json"
			);
		});
	});
	document.getElementById("domerge").addEventListener("click", function () {
		servercheck(function (callBack) {
			panAjax(
				"post",
				urlRoot + "/UVSync/backend/api.php?m=BookMarkController!getBookMarkList", {
				token: DataKeeper.getData("token"),
				hash: DataKeeper.getData("last")
			},
				function (re) {
					callBack();
					if (re.code === 200 && re.needUpdate) {
						if (re.data && re.data[0]) {
							var tree = JSON.parse(re.data[0].bookmarks);
							renderTree(tree[0].children[0].children, "1");
							// DataKeeper.setData("last", re.data[0].hash);
							DataKeeper.setData("last", PanUtil.dateFormat.format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
							document.getElementById("lasttime").value = DataKeeper.getData("last");
							setTimeout(function () {
								sychrosize();
							}, 10 * 1000)
						}
					} else {
						if (re.info) {
							alert(re.info);
						}
					}
				},
				"json"
			);
		});
	});
	document.getElementById("dosynchronize").addEventListener("click", sychrosize);
	document.getElementById("doclone").addEventListener("click", initBookMarks);
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