<?php  
class JsonResult{
    var $status;
    var $message;
    var $success=true;
    var $obj;
    
    public function setStatus($s){
        $this->status=$s;
        return $this;
    }

    public function setMessage($s){
        $this->message=$s;
        return $this;
    }

    public function setObj($s){
        $this->obj=$s;
        return $this;
    }
}