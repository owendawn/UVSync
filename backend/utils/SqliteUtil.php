<?php
class MySqlite extends SQLite3{
    function __construct()
    {
       $this->open(dirname(__DIR__).'/app.db');
    }
 }

class SqliteUtil{
    
	private static $db;
	
	private function init(){
		if (!self::$db) {
			self::$db = new MySqlite();
		}		
    }

    public function getDB(){
        self::init();
        if(!self::$db){
           echo self::$db->lastErrorMsg();
           return null;
        } else {
           return self::$db;
        }
    }

    public function fetchList($ret){
        $result = array();
		if (!$ret) {
			return $result;
		}
		while($row = $ret->fetchArray(SQLITE3_ASSOC) ){
			array_push($result, $row);
		}
		return $result;	
    }

 }
