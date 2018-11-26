<?php
/**
 * Created by PhpStorm.
 * User: owen pan
 * Date: 2016/12/15
 * Time: 11:23
 */



class DataHandlerUtil
{
    public static function returnJson($code,$arr){
        return json_encode(['success'=>true,'code'=>$code,'data'=>$arr]);
    }

    public static function returnJsonOnly($arr){
        echo json_encode($arr);
    }

    public static function getUtf8FromGbk($it){
        return iconv('GB2312', 'UTF-8', $it);
    }

   public static function getEnvFromFile($key,$default=""){
        $envPath = base_path() . DIRECTORY_SEPARATOR . '.env';
        $contentArray = collect(file($envPath, FILE_IGNORE_NEW_LINES));
        $contentArray->transform(function ($item) use ($key) {
            if (str_contains($item, $key)) {
                if(substr($item,0,strpos($item,"="))==$key){
                    return substr($item,strpos($item,"=")+1);
                }
            }
            return "";
        });
        $content = trim(implode($contentArray->toArray(), ""));
        if(strlen($content)==0){
            return $default;
        }else{
            return $content;
        }
    }
}