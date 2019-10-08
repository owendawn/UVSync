<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: x-requested-with");
header("Access-Control-Max-Age: 1800");
header("Set-Cookie: widget_session=abc123; SameSite=None; Secure");
  // var_dump($_GET);
  $url=$_SERVER["REQUEST_URI"];
  $uri=$_SERVER["PHP_SELF"];
  $queryStr=$_SERVER['QUERY_STRING'];
  // var_dump($_SERVER);
  // var_dump($url);
  // var_dump($uri);
  // var_dump($queryStr);


  if(count($_GET)>0){
    $api=$_GET["m"];
    if(!is_null($api)){
      $apiarr=explode("!",$api);
      if(count($apiarr)==2){
        include_once __DIR__."/controller/".$apiarr[0].".php";
        $controller=new $apiarr[0]();
        $method=$apiarr[1];
        $re=$controller->$method();
        print(json_encode($re));

      }else{
        print_r("非法api调用：101");
      }
    }else{
      print_r("非法api调用：002");
    }
  }else{
    print_r("非法api调用：001");
  }


?>