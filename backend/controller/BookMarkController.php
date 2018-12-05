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

class BookMarkController
{
    public function getBookMarkList()
    {
        $hash = isset($_POST["hash"]) ? $_POST["hash"] : null;
        $token = $_POST["token"];
        $jwtUtil = new JwtUtil();
        $jwt = $jwtUtil->parseJwt($token);

        $userId = $jwt->id;
        try {
            $sqliteUtil = new SqliteUtil();
            $db = $sqliteUtil->getDB();
            $id = UUIDUtil::uuid();
            $ps = $db->prepare("select * from bookmarklog where userid=:userId and create_at = (select max(create_at) from bookmarklog where userid=:userId)");
            $ps->bindParam(":userId", $userId);

            $rs = $ps->execute();
            $row = array();
            $i = 0;
            $serverHash=null;
            if ($res = $rs->fetchArray(SQLITE3_ASSOC)) {
                $row[$i] = $res;
                $serverHash=$res["hash"];
                $i++;
            }
            $needUpdate = false;

            if ($hash != null) {
                if (count($row) > 0) {
                    $needUpdate = $res["hash"] != $hash;
                }else{
                    $needUpdate=true;
                }
            } else {
                $needUpdate = true;
            }

            return array("data" => $needUpdate ? $row : null, "needUpdate" => $needUpdate,"serverHash"=>$serverHash, "code" => 200);
        } catch (\Exception $e) {
            return array("code" => 500, "info" => $e->getMessage());
        }
    }

    public function addBookMarkLog()
    {
        $bookmarks = isset($_POST["bookmarks"]) ? $_POST["bookmarks"] : null;
        $hash = isset($_POST["hash"]) ? $_POST["hash"] : null;
        $token = $_POST["token"];
        $jwtUtil = new JwtUtil();
        $jwt = $jwtUtil->parseJwt($token);

        $userId = $jwt->id;
        try {
            $sqliteUtil = new SqliteUtil();
            $db = $sqliteUtil->getDB();
            $ps = $db->prepare("select count(1) as cnt from bookmarklog where userid=:userId and hash = :hash");
            $ps->bindParam(":userId", $userId);
            $ps->bindParam(":hash", $hash);
            $rs = $ps->execute();
            $serverHash=null;
            if ($res = $rs->fetchArray(SQLITE3_ASSOC)) {
                $count=intval($res["cnt"]);
                if($count>0){
                    return array("code" => 200,"info"=>"the hash is exists");
                }else{
                    $id = UUIDUtil::uuid();
                    $ps = $db->prepare("insert into bookmarklog(id,userid,bookmarks,hash)values(:id,:userId,:bookmarks,:hash)");
                    $ps->bindParam(":id", $id);
                    $ps->bindParam(":userId", $userId);
                    $ps->bindParam(":bookmarks", $bookmarks);
                    $ps->bindParam(":hash", $hash);
                    $rs = $ps->execute();
                    if ($rs) {
                        return array("code" => 200);
                    }
                }
            }

            return array("code" => 500);
        } catch (\Exception $e) {
            return array("code" => 500, "info" => $e->getMessage());
        }
    }

}
