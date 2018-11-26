chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
      if (request.type === "console"){
        console.log(request.data);
      }else if (request.type === "alert"){
        alert(request.data);
      }else{
        console.log(request.data);
      }
    });