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
    public function getDateTime()
    {
        try {
            $sqliteUtil = new SqliteUtil();
            $db = $sqliteUtil->getDB();
            $ps = $db->prepare("SELECT datetime('now','+8 hour') as dt,datetime(CURRENT_TIMESTAMP,'localtime') as localtime");
            $rs = $ps->execute();
            $row = array();
            $i = 0;
            if ($res = $rs->fetchArray(SQLITE3_ASSOC)) {
                $row = $res;
                $i++;
            }

            return array("data" => $row ,  "code" => 200);
        } catch (\Exception $e) {
            return array("code" => 500, "info" => $e->getMessage());
        }
    }

    public function getBookMarkList()
    {
        $hash = isset($_REQUEST["hash"]) ? $_REQUEST["hash"] : null;
        $token = $_REQUEST["token"];
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
            $needPush=false;

            if ($hash != null) {
                if (count($row) > 0) {
                    $needUpdate = $res["hash"] > $hash;
                    $needPush = $res["hash"] < $hash;
                }else{
                    $needUpdate=false;
                    $needPush=true;
                }
            } else {
                $needUpdate = false;
                $needPush=true;
            }

            return array(
                "data" => $needUpdate ? $row : null, 
                "needUpdate" => $needUpdate,
                "needPush" => $needPush,
                "serverHash"=>$serverHash, 
                "code" => 200
            );
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
                    return array("code" => 200,"info"=>"the hash is exists","updated"=>false);
                }else{
                    $ps = $db->prepare("select a.* from bookmarklog a, (select max(create_at) as last,userid  from bookmarklog  where userid=:userId )b where a.userid=b.userid and a.create_at=b.last and (julianday(datetime('now','+8 hour'))-julianday(a.hash))*24*60<1");
                    $ps->bindParam(":userId", $userId);
                    $rs = $ps->execute();
                    if ($res = $rs->fetchArray(SQLITE3_ASSOC)) {
                        $id=$res["id"];
                        $ps = $db->prepare("update bookmarklog set bookmarks=:bookmarks, hash=:hash where id=:id");
                        $ps->bindParam(":id", $id);
                        $ps->bindParam(":bookmarks", $bookmarks);
                        $ps->bindParam(":hash", $hash);
                        $rs = $ps->execute();
                        if ($rs) {
                            return array("code" => 200,"desc"=>"update","updated"=>true);
                        }
                    }else{
                        $id = UUIDUtil::uuid();
                        $ps = $db->prepare("insert into bookmarklog(id,userid,bookmarks,hash)values(:id,:userId,:bookmarks,:hash)");
                        $ps->bindParam(":id", $id);
                        $ps->bindParam(":userId", $userId);
                        $ps->bindParam(":bookmarks", $bookmarks);
                        $ps->bindParam(":hash", $hash);
                        $rs = $ps->execute();
                        if ($rs) {
                            return array("code" => 200,"desc"=>"add","updated"=>true);
                        }
                    }
                }
            }

            return array("code" => 500,"updated"=>false);
        } catch (\Exception $e) {
            return array("code" => 500, "info" => $e->getMessage(),"updated"=>false);
        }
    }

    public function getBookMarkHistory()
    {
        $token = $_REQUEST["token"];
        $pageNum = $_REQUEST["pageNum"];
        $jwtUtil = new JwtUtil();
        $jwt = $jwtUtil->parseJwt($token);

        $userId = $jwt->id;
        try {
            $sqliteUtil = new SqliteUtil();
            $db = $sqliteUtil->getDB();
            $id = UUIDUtil::uuid();
            $ps = $db->prepare("select * from bookmarklog where userid=:userId order by create_at desc limit 10 offset ".(intval($pageNum)-1)*10);
            $ps->bindParam(":userId", $userId);

            $rs = $ps->execute();
            $row = array();
            $i = 0;
            $serverHash=null;
            while ($res = $rs->fetchArray(SQLITE3_ASSOC)) {
                $row[$i] = $res;
                $serverHash=$res["hash"];
                $i++;
            }
           
            return array("data" =>  $row ,"serverHash"=>$serverHash, "code" => 200);
        } catch (\Exception $e) {
            return array("code" => 500, "info" => $e->getMessage());
        }
    }

}
