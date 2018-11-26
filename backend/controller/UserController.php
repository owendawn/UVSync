<?php
/**
 * Created by PhpStorm.
 * User: owen pan
 * Date: 2016/11/30
 * Time: 16:33
 */

require_once __DIR__ . "/../utils/SqliteUtil.php";
require_once __DIR__ . "/../utils/UUIDUtil.php";
require_once __DIR__ . "/../utils/JwtUtil.php";

class UserController
{

   

    public function login()
    {
        $name = !empty($_GET["name"]) ? $_GET["name"] : null;
        $pwd = !empty($_GET["password"]) ? $_GET["password"] : null;
        $remember = !empty($_GET["remember"]) ? $_GET["remember"] : null;

        $store = isset($_GET["pwdsave"]) ? $_GET["pwdsave"] : "";
        $info = "";
        try {
            $sqliteUtil = new SqliteUtil();
            $db = $sqliteUtil->getDB();
            $ps = $db->prepare("select PASSWORD as pwd,id as id from user where NAME= :name");
            $ps->bindParam(':name', $name);
            $rs = $ps->execute();
            if ($rs->numColumns()) {
                $all = $rs->fetchArray();
                if ($all != false) {
                    $pwdreal = $all["pwd"];
                    $id = $all["id"];
                    if ($pwd == $pwdreal) {
                        // $dt = new \DateTime();
                        // $key=$id."-".$name.'-'.UUIDUtil::uuid() . "-" .$dt->getTimestamp();
                        // $encreptKey=base64_encode(base64_encode($key.($store=="on"?"-all":"")));

                        $jwtUtil = new JwtUtil();
                        $day = 1;
                        if ("true" == $remember) {
                            $day = 30;
                        }
                        $time = date('Y-m-d H:i:s', strtotime(date("Y-m-d H:i:s")) + $day * 24 * 60 * 60);
                        $code = $jwtUtil->createJwt($id, $name, $time);

                        return array("login" => true, "path" => "/index", "isStore" => strcmp($store, "true") == 0
                            // ,"storeKey"=>$encreptKey,"session"=>$key
                            , "token" => $code,
                        );
                    }
                }
                $info = "User or Password is Wrong!";

            } else {
                $info = "the name is not exists!";
            }
        } catch (\PDOException $e) {
            $info = "cause exception ( " . $e->getMessage() . " ) !";
        }
        return array("login" => false, "info" => $info, "name" => $name);
    }

   

    public function register()
    {
        $name = $_GET["name"];
        $pwd = $_GET["password"];
        $pwd2 = $_GET["passwordcheck"];
        $mail = $_GET["mail"];
        $info = "";
        $success = false;
        if ($pwd == $pwd2) {
            try {
                $sqliteUtil = new SqliteUtil();
                $db = $sqliteUtil->getDB();

                $ps = $db->prepare("select count(1) as count from user where NAME= :name");
                $ps->bindParam(':name', $name);
                $rs = $ps->execute();
                if ($rs->numColumns() && $rs->fetchArray()["count"] > 0) {
                    $info = "the name is already exists!";
                } else {
                    $id = UUIDUtil::uuid();
                    $db = $sqliteUtil->getDB();
                    $ps = $db->prepare("insert into user (id,NAME,email,PASSWORD) values (:id,:name,:mail,:pwd)");
                    $ps->bindParam(':id', $id);
                    $ps->bindParam(':name', $name);
                    $ps->bindParam(":mail", $mail);
                    $ps->bindParam(":pwd", $pwd);
                    $rs = $ps->execute();
                    if ($rs) {
                        $success = true;
                        return array("register" => $success, "info" => "register success");
                    } else {
                        $info = "create new account fail ,please try again!";
                    }
                }
            } catch (\PDOException $e) {
                $info = "cause exception ( " . $e->getMessage() . " ) !";
            }
        } else {
            $info = "password again is't same as password!";
        }
        return array("register" => $success, "info" => $info);
    }

   

}
