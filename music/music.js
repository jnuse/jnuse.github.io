(function(){
    if (typeof jQuery == 'undefined'){
    alert("请先引用jQ");
};
    mic={
        "http":"https://ws.stream.qqmusic.qq.com/",//https://isure.stream.qqmusic.qq.com/
        "api":"https://music.valderfield.com/api.php?types=url&id=",
        get:function(url,callback,name){
            $.ajax({
                url:url,
                jsonpCallback:name,
                success:callback,
                dataType:'jsonp'
                });
            },
        getcookie:function(cname){
          var name = cname + "=";
          var ca = document.cookie.split(';');
          for(var i=0; i<ca.length; i++) 
          {
            var c = ca[i].trim();
            if (c.indexOf(name)==0) return c.substring(name.length,c.length);
          }
          return "";
        },
        setcookie:function(cname,cvalue)//一年保质期
            {
              var d = new Date();
              d.setTime(d.getTime()+(360*24*60*60*1000));
              var expires = "expires="+d.toGMTString();
              document.cookie = cname + "=" + cvalue + "; " + expires;
            },
        kg_verify:function(){
            let i=document.createElement("IFRAME");
            let n=document.createElement("BUTTON");
            let el=document.body;
            
            i.className='get_kg_verify';
            n.className='get_kg_verify';
            n.innerHTML='消失';
            n.onclick=function(){document.getElementsByClassName('get_kg_verify')[1].remove();this.remove();};
            i.src='https://www.kugou.com/song/#hash=3C0C8F00EFB395A3A9D546B1349AF44E';
            i.width='100%';i.height='500px';
            el.insertBefore(i,el.childNodes[0]);
            el.insertBefore(n,el.childNodes[0]);
        },
        qq:function(id,callback,canshu=false){//callback可自带参数，自带参数将放于url后面
            var data=encodeURIComponent('{"req_0":{"module":"vkey.GetVkeyServer","method":"CgiGetVkey","param":{"guid":"3803539930","songmid":["'+id+'"],"songtype":[0],"uin":"0","loginflag":1,"platform":"20"}}}');
            mic.get(
            "https://u.y.qq.com/cgi-bin/musicu.fcg?-=getplaysongvkey887946017177156&format=jsonp&platform=yqq.json&data=" + data,
            function(data){canshu?callback(mic.http+data.req_0.data.midurlinfo[0].purl,canshu):callback(mic.http+data.req_0.data.midurlinfo[0].purl)},
            mic.rds(7)
            );
        },
        kg:function(hash,callback,canshu=false){
            var url = 'https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash='+hash+'&mid='+mic.getcookie("kg_mid");
            mic.get(
            url,
            function(data){
                if(!mic.kgpd){
                if(data.data.audio_name==undefined && mic.getcookie("kg_mid")==''){//
                if(confirm('由于音乐播放器问题，是否先验证一下，再刷新回到本站？验证后刷新即可！')){
                    mic.kg_verify()
                }
                mic.kgpd=true;
                }}
                ;canshu?callback(data.data.play_url,canshu):callback(data.data.play_url)},
            mic.rds(8)
            );
        },
        wy:function(id,callback,canshu=false){
           mic.get(
           mic.api+id+"&source=netease",
           function(data){canshu?callback(data.url.replace("http","https"),canshu):callback(data.url.replace("http","https"))},
            mic.rds(9)
           ); 
        },
        rds:function(len) {
        　　len = len || 32;
        　　var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz'; 
        　　var maxPos = $chars.length;
        　　var pwd = '';
        　　for (i = 0; i < len; i++) {
        　　　　pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
        　　}
        　　return pwd;
        }
    };
})();