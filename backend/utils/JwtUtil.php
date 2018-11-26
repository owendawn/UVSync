<?php

class JwtUtil{
    var $serect="prh123";
    var $header=array(
        "typ"=>"JWT",
        "alg"=>"HS256"
    );

    public function buildPayLoad($id,$name,$time){
        return json_encode(array(
            "id"=>$id,
            "aud"=>$name,
            "exp"=>$time,
            "iat"=>date("Y-m-d H:i:s")
        ));
    }


    public function createJwt($id,$name,$time){
        $head=base64_encode(json_encode($this->header));
        $payload=base64_encode($this->buildPayLoad($id,$name,$time));
        $signature=hash_hmac("sha256",$head.".".$payload,$this->serect);
        return $head.".".$payload.".".$signature;
    }

    public function parseJwt($jwt){
        $arr=explode(".",$jwt);
        $payload=$arr[1];
        return json_decode(base64_decode( $payload));
    }
}