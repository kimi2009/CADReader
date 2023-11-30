

var cad = new CadModel();
var util = new Util();
cad.util = util;

function CadModel(){
    this.dpi = 10;
    this.debug = false;
    this.black = true;
    this.color = true;
    this.showLog = false;
}

CadModel.prototype.cad2svg = function (cadFile, callback, statFunc){
    if(!callback){
        return;
    }
    util.cad2json(cadFile, function(avgFile){
        util.avg2svg(avgFile, callback, statFunc);
    });
};
CadModel.prototype.cad2hvg = function (cadFile, callback, statFunc){
    if(!callback){
        return;
    }
    util.cad2json(cadFile, function(avgFile){
        util.avg2hvg(avgFile, callback, statFunc);
    });
};
CadModel.prototype.drawCad = function (cadFile, cbox, opts){
    cbox = $(cbox);
    var draw = new CadDraw(cbox);
    draw.options = $.extend({}, CadDraw.prototype.defaults, opts);
    draw.initCadBox(cbox);
    var t = new Date().getTime();
    if(!window.fs){
      console.log('请在客户端运行！');
    }
    util.cad2json(cadFile, function(avgFile){
        log('读取数据文件');
        $('.progress-val', cbox).animate({width:'50%'}, 500);
        fs.readFile(avgFile, function(err, str){
            if(err){
                log('读取数据文件出错，错误信息:'+err);
            }
            var draw = cad.draw;
            log('提取CAD矢量图');
            var ary = JSON.parse(str);
            $('.progress-val', cbox).animate({width:'75%'}, 500);
            draw.colorMap = {};
            log('元素数量：'+ary.length)
            for(var i=0;i<ary.length;i++){
                draw.buildShape(ary[i]);
            }
            draw.init();
            log('渲染元素：'+draw.shapes.length)
            log('开始渲染图像');
            $('.progress-val', cbox).animate({width:'100%'}, 500);
            draw.scale = Math.min(draw.winRect.width()/draw.imgRect.width(), draw.winRect.height()/draw.imgRect.height())*0.95;
            draw.makeCenter(draw.imgRect.center());
            log('渲染图像结束，图元'+draw.shapes.length+'个，文本块'+draw.texts.length+'个，用时 '+(new Date().getTime()-t)+' ms');
            $('.progress-val', cbox).stop(true).css({width:'100%'}).delay(200).fadeOut();
        });
    });
}
CadModel.prototype.drawHvg = function (ary, cbox, opts){
    cbox = $(cbox);
    var draw = cad.draw = new CadDraw(cbox);
    draw.options = $.extend({}, CadDraw.prototype.defaults, opts);
    draw.initCadBox(cbox);
    $('body').data('draw', draw);
    var t = new Date().getTime();
    $('.progress-val', cbox).animate({width:'50%'}, 500);
    log('提取HVG矢量图');
    $('.progress-val', cbox).animate({width:'75%'}, 500);
    draw.colorMap = {};
    log('元素数量：'+ary.length)
    draw.uses = [];
    for(var i=0;i<ary.length;i++){
        draw.buildHvgShape(ary[i]);
    }
    for(var i=0;i<draw.uses.length;i++){
        var shape = draw.uses[i];
        shape.block = draw.blockMap[shape.blockName];
    }
    draw.uses = undefined;
    log('渲染元素：'+draw.shapes.length)
    for(var i=0;i<draw.shapes.length;i++){
        var shape = draw.shapes[i];
        if(shape.rect){
            draw.imgRect.resizeRect(shape.rect);
        }
        if(!isNaN(shape.handle) && shape.handle>draw.maxHandle){draw.maxHandle=shape.handle;}
    }
    var css = '<style>';
    for(var key in draw.colorMap){
        css += key+draw.colorMap[key];
    }
    css+='</style>';
    var bcnt = 0;
    for(var key in draw.blockMap){
        bcnt++;
    }
    cbox.append(css);
    log('开始渲染图像');
    $('.progress-val', cbox).animate({width:'100%'}, 500);
    draw.scale = Math.min(draw.winRect.width()/draw.imgRect.width(), draw.winRect.height()/draw.imgRect.height())*0.95;
    draw.makeCenter(draw.imgRect.center());
    log('渲染图像结束，模板'+bcnt+'个，图元'+(draw.shapes.length-draw.texts.length)+'个，文本块'+draw.texts.length+'个，用时 '+(new Date().getTime()-t)+' ms');
    $('.progress-val', cbox).stop(true).css({width:'100%'}).delay(200).fadeOut();
}
CadModel.prototype.drawSvg = function (cbox, svgTxt){
  new SvgDraw(cbox, svgTxt);
}

CadModel.prototype.clear = function(){
    if(cad.draw){
        cad.draw.clear();
    }
}
CadModel.prototype.splitCad = function(){
    if(cad.splitDom && cad.splitDom.is(':visible')){
        cad.splitStart = cad.splitEnd = false;
        cad.spliting = false;
    }
    else{
        if(cad.spliting){
            cad.spliting = false;
            $('body').css('user-select','auto');
        }
        else{
            cad.spliting = true;
            cad.splitStart = cad.splitEnd = false;
            $('body').css('user-select','none');
        }
    } 
    if(cad.splitDom){
        cad.splitDom.hide();
    }

/*
    var ary = cad.draw.shapes;
    var rects = {}, boxs = [];
    for(var i=0;i<ary.length;i++){
        if(ary[i].constructor!=Line){
            continue;
        }
        var th = ary[i], tail = th.points[th.points.length-1];
        if(th.points.length==4 && th.x==tail.x && th.y == tail.y){
            var isBig = true;
            for(var key in rects){
                if(rects[key].rect.contains(th.rect)){
                    isBig = false;
                    break;
                }
            }
            if(isBig){
                rects[th.handle] = th;
            }
        }
    }
    for(var key in rects){
        var th = rects[key];
        var isBig = true;
        for(var key2 in rects){
            var th2 = rects[key2];
            if(th2==th){
                continue;
            }
            if(th2.rect.contains(th.rect)){
                isBig = false;
                break;
            }
        }
        if(isBig){
            boxs.push(th);
        }
    }
    var texts = cad.draw.texts;
    for(var i=0;i<texts.length;i++){
        var th = texts[i];
        for(var j=0;j<boxs.length;j++){
            var box = boxs[j];
            if(box.rect.contains(th.rect)){
                box.textCnt = (box.textCnt||0)+1;
                if(th.textSize>(box.maxFont||0)){
                    box.maxFont = th.textSize;
                    box.titles = [th];
                }
                else if(th.textSize==box.maxFont){
                    box.titles.push(th);
                }
            }
        }
    }
    for(var i=0;i<boxs.length;i++){
        var box = boxs[i];
        if(box.textCnt>10){
            console.log(box, box.titles, box.rect)
        }
    }
    console.log(boxs)
    */
};
CadModel.prototype.saveCad = function(){
    var rect = new Rect(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    if(cad.splitStart && cad.splitEnd){
        var s = cad.splitStart, e = cad.splitEnd;
        rect = new Rect(Math.min(s.x, e.x), Math.min(s.y, e.y), Math.max(s.x, e.x), Math.max(s.y, e.y));
    }
    var draw = cad.draw;
    var ary = [];
    var blocks = {};
    var bcnt = 0, scnt = 0, tcnt = 0;
    for(var i=0;i<draw.shapes.length;i++){
        var shape = draw.shapes[i];
        if(!rect.contains(shape.rect)){
            continue;
        }
        if(shape.constructor==Use){
            util.buildBlocks(shape, blocks);
        }
        if(shape.constructor!=Text){
            var obj = shape.toJSON();
            if(obj){
                ary.push(obj);
                scnt++;
            }
        }
    }
    var title = [], titleMap = {}, allText = [];
    for(var i=0;i<draw.texts.length;i++){
        var shape = draw.texts[i];
        var srect = shape.p1?new Rect(Math.min(shape.p1.x, shape.p2.x), Math.min(shape.p1.y, shape.p2.y), Math.max(shape.p1.x, shape.p2.x), Math.max(shape.p1.y, shape.p2.y)):shape.rect;
        if(!rect.contains(srect)){
            continue;
        }
        var text = shape.text.replace(/<br>/g, ' ');
        if(!titleMap[text] && util.countChinese(shape.text)>=5){
            titleMap[text] = true;
            allText.push(text);
            if(text.indexOf('图')>=0 || text.indexOf('配线')>=0){
                title.push(text);
            }
        }
        ary.push(shape.toJSON());
        tcnt++;
    }
    if(title.length==0){
        title = title.concat(allText);
    }
    title.sort(function(s1, s2){
        if(s1.length<s2.length){
            return -1;
        }
        else if(s1.length==s2.length){
            return /图(\s|$)/g.test(s1)?-1:1;
        }
        else{
            return 1;
        }
    });
    cad.splitTitles = title;
    var bary = [];
    for(var key in blocks){
        if(blocks[key]){
            bary.push(blocks[key]);
            bcnt++;
        }
    }
    console.log('模板'+bcnt+'个，图元'+scnt+'个，文本块'+tcnt+'个');
    return bary.concat(ary);
}

function Util(){}
Util.prototype.buildBlocks = function (shape, blocks, texts){
    if(shape.block && shape.block.rect){
        blocks[shape.blockName] = (shape.block);
        for(var i=0;i<shape.block.shapes.length;i++){
            var sh = shape.block.shapes[i];
            if(sh.constructor==Use){
                sh.parentUse = shape;
                this.buildBlocks(sh, blocks, texts);
            }
            else if(sh.constructor==Text){
                sh.idx = sh.idx||1;
                var text = $.extend(new Text(), sh, true);
                text.handle = sh.handle+'-'+(sh.idx++);
                text.parentUse = shape;
                // text.inited = false;
                // text.init();
                if(texts){
                    texts.push(text);
                }
            }
        }
    }
}
Util.prototype.cad2json = function (cadFile, callback){
    var avgFile = cadFile.substr(0, cadFile.length-4)+'.avg';
    if(!window.fs){
      console.log('请在客户端运行！');
    }
    if(fs.existsSync(avgFile)){
        callback(avgFile);
    }
    else{
        var dwgPath = fs.realpathSync(cadFile);
        var child = exec('exe\\DM_CAD2JSON_TOOL.exe "'+dwgPath+'"');
        child.on('close', function() {
            callback(avgFile);
        });
    }
}

Util.prototype.avg2svg = function (avgFile, callback, statFunc){
    statFunc = statFunc || function(info){
        log(info);
    }
    statFunc('读取数据文件');
    if(!window.fs){
      console.log('请在客户端运行！');
    }
    fs.readFile(avgFile, function(err, str){
        if(err){
            statFunc('读取数据文件出错，错误信息:'+err);
            callback(err);
        }
        statFunc('提取CAD矢量图');
        var ary = JSON.parse(str);
        var svg = new JsonSvg(ary);
        var svgStr = svg.buildSvg();
        fs.writeFile(avgFile.substr(0, avgFile.length-4)+'.svg', svgStr, function(){
            log('写入svg成功！');
        });
        statFunc('开始渲染图像');
        callback(svgStr);
        statFunc('渲染图像结束');
    });
}
Util.prototype.avg2hvg = function (avgFile, callback, statFunc){
    statFunc = statFunc || function(info){
        log(info);
    }
    statFunc('读取数据文件');
    if(!window.fs){
      console.log('请在客户端运行！');
    }
    fs.readFile(avgFile, function(err, str){
        if(err){
            statFunc('读取数据文件出错，错误信息:'+err);
            callback(err);
        }
        try{
            statFunc('提取CAD矢量图');
            var ary = JSON.parse(str);
            var draw = cad.draw = new CadDraw();
            draw.options = $.extend({}, CadDraw.prototype.defaults);
            var t = new Date().getTime();
            draw.colorMap = {};
            log('元素数量：'+ary.length)
            for(var i=0;i<ary.length;i++){
                draw.buildShape(ary[i]);
            }
            ary = [];
            var blocks = {};
            var uses = [];
            var texts = draw.texts;
            var bcnt = 0, scnt = 0, tcnt = 0;
            for(i=0;i<draw.shapes.length;i++){
                var shape = draw.shapes[i];
                if(shape.constructor==Use){
                    uses.push(shape);
                }
                else if(shape.constructor==Block){
                    // blocks[shape.infos[0]] = shape;
                }
                else if(shape.constructor==Text){
                     texts.push(shape);
                }
                else{
                    shape.init();
                }
            }
            for(i=0;i<uses.length;i++){
                shape = uses[i];
                shape.block = draw.blockMap[shape.infos[5]];
                if(!shape.block){
                    console.log('use['+shape.handle+']\' block ['+shape.infos[5]+'] can not find!');
                    continue;
                }
                shape.block.init(draw);
                shape.init(draw);
                util.buildBlocks(shape, blocks, texts);
            }
            for(i=0;i<draw.shapes.length;i++){
                shape = draw.shapes[i];
                if(shape.constructor!=Text){
                  var obj = shape.toJSON();
                  if(obj){
                      ary.push(obj);
                      scnt++;
                  }
                }
            }
            for(i=0;i<texts.length;i++){
                shape = texts[i];
                shape.init();
                shape.calcTransform();
                var obj = shape.toJSON();
                if(obj){
                    tcnt++;
                    ary.push(obj);
                }
            }
            var bary = [];
            for(var key in blocks){
                if(blocks[key]){
                    var obj = blocks[key].toJSON();
                    if(obj){
                        bary.push(obj);
                        bcnt++;
                    }
                }
            }
            console.log('模板'+bcnt+'个，图元'+scnt+'个，文本块'+tcnt+'个');
            ary = bary.concat(ary);
            var fname = avgFile.substr(0, avgFile.length-4)+'.hvg';
            fs.writeFile(fname, JSON.stringify(ary), function(){
                setTimeout(function(){
                    var size = fs.statSync(fname).size;
                    console.log('文件大小'+size+'字节')
                    log('写入hvg成功,文件大小'+size+'字节！');
                }, 100);
            });
            setTimeout(function(){
                callback(null, ary);
            }, 100);
        }
        catch(e){
            console.error(e);
            fs.unlinkSync(avgFile);
        }
    });
}
Util.prototype.buildEmptyShape = function (obj){
    var shape = null;
    switch(obj.et) {
    case 3:
    case 12:
        shape = new Ellipse();
        break;
    case 15:
        shape = new Use();
        break;
    case 17:
    case 18:
        shape = new Line();
        break;
    case 19:
    case 25:
        shape = new Text();
        break;
    case 30:
        shape = new Shadow();
        break;
    case 31:
        shape = new Arc();
        break;
    case 101:
    case 202:
        shape = new Text();
        break;
    case 303:
        shape = new PolyLine();
        break;
    case 808:
        shape = new Block();
        break;
    default:
        shape = {};
        console.log('no shape:'+obj.et)
    }
    shape.shapes = [];
    return shape;
}

Util.prototype.buildShape = function (obj){
    try{
        var shape = util.buildEmptyShape(obj);
        shape.etype = obj.et;
        shape.handle = obj.handle;
        shape.infos = (obj.infos||'').split('$^');
        shape.color = obj.color;
        shape.x = (util.infosNum(shape, 0)*cad.dpi);
        shape.y = (util.infosNum(shape, 1)*cad.dpi);
        if(shape.color==-1) {
            shape.color = '';
        }
        else{
            var color = shape.color<0?(0xFFFFFFFF+shape.color+1):shape.color;
            var hex = color.toString(16).toLowerCase();
            if(hex.length<6) {
                hex = "000000".substring(hex.length)+hex;
            }
            else if(hex.length>=6) {
                hex = hex.substring(hex.length-6);
            }
            shape.stroke = "#"+hex;
            if(shape.stroke=='#ffffff'){
                shape.stroke = null;
            }
        }
        if(shape.constructor==Line && obj.line){
            var ary = obj.line.split(',');
            shape.lineWeight = Math.abs(parseFloat(ary[0]));
            if(ary.length>1){
                var dash = [];
                for(var i=1;i<ary.length;i++){
                    var dot = Math.abs(parseFloat(ary[i]));
                    dash.push(dot);
                }
                shape.dash = dash;
            }
        }
        return shape;
    }catch(e){
        console.error(e);
    }
}
Util.prototype.strokeInfo = function (shape){
    var buff = '';
    if(shape.stroke){
        buff += ' class="s'+shape.stroke.substr(1)+'"';
        shape.colorMap['.color .s'+shape.stroke.substr(1)] = '{stroke:'+shape.stroke+'}';
    }
    if(shape.strokeWidth && shape.strokeWidth>1){
        buff += ' stroke-width="'+shape.strokeWidth+'"';
    }
    return buff;
}

Util.prototype.buidChildShapes = function (shape){
    var buff = '';
    if(shape.shapes && shape.shapes.length>0) {
        for(var i=0;i<shape.shapes.length;i++) {
            var txt = shape.shapes[i].buildSvgText?shape.shapes[i].buildSvgText():'';
            if(!txt) {
                continue;
            }
            buff += txt+"\n";
            shape.left = Math.min(shape.shapes[i].left, shape.left);
            shape.top = Math.min(shape.shapes[i].top, shape.top);
            shape.right = Math.max(shape.shapes[i].right, shape.right);
            shape.bottom = Math.max(shape.shapes[i].bottom, shape.bottom);
        }
    }
    return buff;
}

Util.prototype.infos = function (obj, idx){
    return obj.infos[idx]||'';
}
Util.prototype.infosNum = function (obj, idx){
    var num = 0;
    try{
        num = parseFloat(obj.infos[idx]||0);
    }catch(e){;}
    return num;
}
Util.prototype.buildDebugInfo = function (th){
    return cad.debug?' handle="'+th.handle+'" et="'+th.etype+'"':'';
}
Util.prototype.hasChinese = function (text){
    if(!text){
        return false;
    }
    for(var i=0;i<text.length;i++){
        if(text.charCodeAt(i)>256){
            return true;
        }
    }
    return false;
}
Util.prototype.countChinese = function (text){
    if(!text){
        return 0;
    }
    var cnt = 0;
    for(var i=0;i<text.length;i++){
        if(text.charCodeAt(i)>256){
            cnt++;
        }
    }
    return cnt;
}
Util.prototype.calcColor = function (shape){
    if(cad.debug){
        var tmp = shape, curClick = false;
        while(tmp && !(curClick=tmp.curClick)){
            tmp = (tmp.parentUse||tmp.parent);
        }
        if(curClick){
            return '#28FF28';
        }
    }
    if(cad.color){
        if(shape.stroke){
            return shape.stroke;
        }
        else if(shape.parent && shape.parent.constructor==Use && shape.parent.stroke){
            return shape.parent.stroke;
        }
        else{
            var use = shape.parentUse;
            while(use && !use.stroke){
                use = use.parentUse;
            }
            return (use && use.stroke) || (cad.black?'#ffffff':'#000000');
        }
    }
    else{
        return cad.black?'#ffffff':'#000000';
    }
    // return (cad.color?shape.stroke:null) || (cad.black?'#ffffff':'#000000');
}
Util.prototype.transEquName = function(name){
  return (name||'').replace(/<.+?>/g, '').replace(/\s+/g, '').replace(/^\((.+)\)$/g, '$1').replace(/\(.+?\)$/g, '');
};
Util.prototype.initEquInfo = function(draw, equs, rootType, typeMap, types){
    draw.rootType = rootType||[];
    draw.rootTypeMap = typeMap||{};
    draw.typeMap = {};
    draw.types = types||[];
    draw.equs = equs||[];
    draw.equMap = {};
    draw.equObjMap = {};
    for(var i=0;types && i<types.length;i++){
        draw.typeMap[types[i].vcId] = types[i];
    }
    for(var i=0;equs && i<equs.length;i++){
        var equ = equs[i];
        equ.type = draw.typeMap[equ.vcParId]||{};
        equ.rootTypeId = draw.rootTypeMap[equ.vcParId]||equ.vcParId;
        equ.rootTypeName = (draw.typeMap[equ.rootTypeId]||{}).vcName;
        equ.isQc = equ.type.vcUserData=='1';
        draw.equMap[equ.vcName] = equ.vcId;
        draw.equObjMap[equ.vcId] = equ;
    }
};
Util.prototype.paintDebugInfo = function(shape){
    if(cad.debug && shape.curClick){
        var draw = cad.draw, ctx = draw.ctx;
        var ostyle = ctx.strokeStyle, owidth = ctx.strokeWidth;
        ctx.stroke();
        // ctx.save();
        // ctx.resetTransform();
        // ctx.scale(draw.scale, draw.scale);
        // ctx.translate(screen.width/2, screen.height/2);
        // ctx.translate(-draw.imgRect.x1, -draw.imgRect.y1);
    var diff = 1/draw.getScale();
        ctx.strokeStyle = '#f00';
        ctx.strokeWidth = 2/ctx.scale;
        ctx.strokeRect(shape.rect.x1-diff, shape.rect.y1-diff, shape.rect.width()+diff*2, shape.rect.height()+diff*2);
        //ctx.stroke();
        ctx.strokeStyle = ostyle;
        ctx.strokeWidth = owidth;
        // ctx.restore();
    }
};

function CadDraw(cbox){
    this.util = util;
    cad.dpi = 1;
    this.cbox = cbox;
    this.scale = 1;
    //图形尺寸和起始坐标位置
    this.imgRect = new Rect(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
    //画布在图形中的渲染范围，如果图形的左上角在画布中，则rect.left和rect.top小于0
    this.drawRect = new Rect(0, 0, screen.width*2, screen.height*2);
    //画布的渲染区域，两倍屏幕的高和宽
    this.drawWinRect = new Rect(0, 0, screen.width*2, screen.height*2);
    //可视区域
    this.winRect = new Rect(screen.width/2, screen.height/2, screen.width/2+(cbox?cbox.width():screen.width), screen.height/2+(cbox?cbox.height():screen.height));
    //图形控件
    this.shapes = [];
    this.blockMap = {};
    this.texts = [];
    this.lines = [];
    this.maxHandle = 0;
}
CadDraw.prototype.buildShape = function(obj, parent){
    try{
        var shape = util.buildShape(obj);
        shape.parent = parent;
        if(obj.ents!=null){
            // this.prevLine = null;
            for(var i=0;i<obj.ents.length;i++) {
                var child = this.buildShape(obj.ents[i], shape);
                if(child){
                    if(child.constructor==Text){//文本块，要么归到最近的Block下，要么归到整个图纸
                        // var block = shape, use = shape;
                        // while(block && block.constructor!=Block){
                        //     block = block.parent;
                        // }
                        // while(use && use.constructor!=Use){
                        //     use = use.parent;
                        // }
                        // child.parentUse = use;
                        // ((block && block.shapes)||this.texts).push(child);
                    }
                    else{
                        shape.shapes.push(child);
                    }
                }
            }
            // this.prevLine = null;
        }
        if(shape.etype == 808){
            this.blockMap[obj.infos] = shape;
        }
        else if(shape.constructor==Text){
            var block = parent;
            while(block && block.constructor!=Block){
                block = block.parent;
            }
            ((block && block.shapes)||this.texts).push(shape);
        }
        else if(!parent){
            this.shapes.push(shape);
        }
        return shape;
    }catch(e){
        console.error(e);
    }
}
CadDraw.prototype.buildHvgShape = function(obj, hasPar){
    try{
        var shape = util.buildEmptyShape(obj);
        if(!shape || !shape.fromJSON){
            return null;
        }
        shape.fromJSON(obj);
        if(!shape){
            return;
        }
        if(obj.ents!=null){
            // this.prevLine = null;
            for(var i=0;i<obj.ents.length;i++) {
                var child = this.buildHvgShape(obj.ents[i], true);
                if(child){
                    child.parent = shape;
                    shape.shapes.push(child);
                }
            }
            // this.prevLine = null;
        }
        if(shape.etype == 808){
            this.blockMap[obj.id] = shape;
        }
        else if(!hasPar){
            this.shapes.push(shape);
        }
        if(shape.constructor==Use){
            cad.draw.uses.push(shape);
        }
        return shape;
    }catch(e){
        console.error(e);
    }
}
CadDraw.prototype.init = function(){
    for(var i=0;i<this.shapes.length;i++){
        var shape = this.shapes[i];
        if(shape.init){
            shape.init();
            shape.infos = undefined;
            if(shape.rect){
                this.imgRect.resizeRect(shape.rect);
            }
            if(!isNaN(shape.handle) && shape.handle>this.maxHandle){this.maxHandle=shape.handle;}
        }
    }
}
CadDraw.prototype.initCadBox = function(cbox){
    if(!cbox.is('DIV')){
        console.log('please set arguments[1] as div dom object');
        return;
    }
    if(!window.$){
        console.log('please import jquery');
        return;
    }
    cbox.empty();
    $('.split-box').hide();
    cbox.toggleClass('black', cad.black);
    cbox.toggleClass('color', cad.color);
    cbox[0].oncontextmenu = function(){return false;};
    cbox.css({overflow:'hidden','position': 'relative', border:'1px solid gray'});
    cbox.append('<div class="img-box" style="position:absolute;left:'+(-screen.width/2)+'px;top:'+(-screen.height/2)+'px;width:'+screen.width*2+'px;height:'+screen.height*2+'px;"><div class="img-box2" style="position:relative;"></div></div>');
    cbox.append('<div class="box-info" style="position:absolute;left:6px;bottom:2px;min-width:80px;font-size:12px;"></div>');
    cbox.append('<div class="point-line-x" style="position:absolute;left:0px;top:0px;width:1px;height:'+screen.height+'px;border-left-width:1px;"></div>');
    cbox.append('<div class="point-line-y" style="position:absolute;left:0px;top:0px;height:1px;width:'+screen.width+'px;border-top-width:1px;"></div>');
    cbox.append('<input placeholder="搜索" class="map-search-box" ><div class="map-search-pnl" ></div>');
    cbox.append('<div class="progress-bar"><div class="progress-val"></div></div>');
    $('.map-search-pnl', cbox).bind('mousewheel DOMMouseScroll', function(evt){
        evt = evt.originalEvent||evt;
        var diff = ((evt.wheelDelta||$.event.fix(evt).wheelDelta||-evt.detail)>0?1:-1)*50;
        $(this).scrollTop($(this).scrollTop()-diff);
        return false;
    });
    $('body').unbind('click.srh-input').bind('click.srh-input', function(evt){
        if(!$(evt.target).is('.map-search-box,.map-search-pnl,.map-search-pnl *')){
            $('.map-search-box').blur();
            $('.map-search-pnl').fadeOut();
        }
    });
    $('.map-search-box').bind('keyup paste type',function(){
        var evt = $.event.fix(event),kc=evt.keyCode;
        if(kc==13){//回车触发搜索事件
            $('.map-search-box').trigger('focusitem');
            return;
        }
        var draw = cad.draw;
        draw.searchText(this.value);
    }).bind('focusitem', function(){
        $('.map-search-box').data('last-key', null);
        $('.map-search-pnl>a:first').trigger('focusitem');
    }).click(function(){
        this.setSelectionRange && this.setSelectionRange(0,9999);
        var draw = cad.draw;
        draw.searchText(this.value);
    });
    $('.img-box2', cbox).append('<canvas width="'+screen.width*2+'" height="'+screen.height*2+'" ></canvas>');
    $('.box-info', cbox).attr('title','点击缩放至适合窗口大小').click(function(){
        var draw = cad.draw;
        draw.scale = Math.min(draw.winRect.width()/draw.imgRect.width(), draw.winRect.height()/draw.imgRect.height())*0.95;
        draw.makeCenter(draw.imgRect.center());
    });
    var cv = $('canvas', cbox);
    this.ctx = cv[0].getContext("2d");
    function fillTouchEvt(evt){
      if(evt.pageX === undefined){
        var touche = ((evt.originalEvent||evt).touches||[])[0]||{}
        evt.pageX = touche.pageX;
        evt.pageY = touche.pageY;
      }
    }
		var oldPageX, oldPageY;
    $('.img-box', cbox).bind('mousedown touchstart', function(evt){
        var draw = cad.draw;
        fillTouchEvt(evt);
        if(!cad.spliting && !(evt.ctrlKey||evt.button==2 || draw.selectEvt) && !($(evt.target).is('.shape-select'))){
            this.mousedown = true;
            $(this).css('user-select','none');
            $(this).data('drag-p', {x:evt.pageX, y:evt.pageY});
        }
    }).bind('mousemove touchmove', function(evt){
        if(this.mousedown){
            fillTouchEvt(evt);
						oldPageX = evt.pageX, oldPageY = evt.pageY;
            var p = $(this).data('drag-p');
            $(this).css('left', (-screen.width/2+evt.pageX-p.x)+'px');
            $(this).css('top', (-screen.height/2+evt.pageY-p.y)+'px');
        }
    }).bind('mouseup touchend', function(evt){
        $(this).css('user-select','auto');
        if(this.mousedown){
          fillTouchEvt(evt);
          this.mousedown = false;
          var draw = cad.draw;
          var oleft = -screen.width/2;
          var otop = -screen.height/2;
          var p = $(this).data('drag-p');
          var offsetx = (evt.pageX||oldPageX)-p.x;
          var offsety = (evt.pageY||oldPageY)-p.y;
          if(Math.abs(offsetx)+Math.abs(offsety)<=2){
              return;
          }
          draw.drawRect.x1 -= offsetx/draw.scale;
          draw.drawRect.y1 -= offsety/draw.scale;
          var dw = screen.width*2/draw.scale, dh = screen.height*2/draw.scale;
          draw.drawRect.x2 = draw.drawRect.x1 + dw;
          draw.drawRect.y2 = draw.drawRect.y1 + dh;
          draw.repaint();
          $(this).css({left:oleft+'px',top:otop+'px'});
          $(this).data('drag-p', null);
        }
    });
    $('body').unbind('mousedown.draw mousemove.draw mouseup.draw').bind('mousedown.draw', function(evt){
        var pos = cbox.offset();
        if(evt.pageX-pos.left<0 ||evt.pageY-pos.top<0){
            return;
        }
        var draw = cad.draw;
        if(cad.spliting || evt.ctrlKey || evt.button==2 || draw.selectEvt){//按Ctrl可以定区域缩放
            $('body').css('user-select','none');
            cad.splitStart = cad.draw.point;
            cad.splitStartPoint = {x:evt.pageX, y:evt.pageY};
            if(!cad.splitDom){
                cad.splitDom = $('.split-box').length>0?$('.split-box'):$('<div class=split-box></div>').appendTo('body');
            }
            cad.splitDom.css({left:evt.pageX+'px', top:evt.pageY+'px', width:1, height:1});
        }
    }).bind('mousemove.draw', function(evt){
        if(cad.splitStartPoint && cad.splitDom){
            cad.splitEnd = cad.draw.point;
            var p = cad.splitStartPoint;
            cad.splitDom.css({left:Math.min(evt.pageX,p.x)+'px', top:Math.min(evt.pageY, p.y)+'px', width:Math.abs(evt.pageX-p.x)+'px', height:Math.abs(evt.pageY-p.y)+'px'});
            if(Math.abs(evt.pageX-p.x)+Math.abs(evt.pageY-p.y>10)){
                cad.splitDom.show();
            }
        }
        var draw = cad.draw;
        var pos = cbox.offset();
        var point = {x:evt.pageX-pos.left, y:evt.pageY-pos.top};
        var imgPoint = {x:((point.x+screen.width/2)/draw.scale+draw.drawRect.x1), y:((point.y+screen.height/2)/draw.scale+draw.drawRect.y1)};
        draw.point = imgPoint;
        showCoor(point, imgPoint);
    }).bind('mouseup.draw', function(evt){
        $('body').css('user-select','auto');
        cad.splitDom && cad.splitDom.hide();
        var draw = cad.draw;
        if((cad.spliting || evt.ctrlKey || evt.button==2 || draw.selectEvt) && cad.splitDom){
            cad.splitEnd = cad.draw.point;
            var p = cad.splitStartPoint||{x:0,y:0};
            cad.splitDom.css({left:Math.min(evt.pageX,p.x)+'px', top:Math.min(evt.pageY, p.y)+'px', width:Math.abs(evt.pageX-p.x)+'px', height:Math.abs(evt.pageY-p.y)+'px'});
            if(draw.selectEvt){
                var p1 = cad.splitStart||{x:0,y:0}, p2 = cad.splitEnd||{x:0,y:0}, selRect = new Rect(p1.x, p1.y, p2.x, p2.y);
                var equs = [];
                var map = draw.equMap||{};
                $.each(draw.texts, function(){
                    if(selRect.pointIn(this.x, this.y)){
                        var name = util.transEquName(this.text);
                        if(name){
                            equs.push({id:map[name]||map[this.text]||map[name+'#']||map[this.text+'#']||'',name:name});
                        }
                    }
                });
                draw.selectEvt(equs, p1, p2);
            }
            else if(cad.spliting){
                cad.spliting = false;
                cad.splitDom.show();
                cbox.trigger('saveCad');
            }
            else if(Math.abs(evt.pageX-p.x)+Math.abs(evt.pageY-p.y)>40){//划区域缩放
                var draw = cad.draw;
                var p1 = cad.splitStart, p2 = cad.splitEnd;
              draw.scale = Math.min(draw.winRect.width()/Math.abs(p1.x-p2.x), draw.winRect.height()/Math.abs(p1.y-p2.y));
              draw.makeCenter({x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2});
            }
        }
        cad.splitStart = null;
        cad.splitStartPoint = null;
    });
    $('.scale-big').click(function(){
      var box = $('#img-box'), offset = box.offset();
      mousewheelEvt.call(box, {wheelDelta:120, pageX:parseInt(offset.left + box.width()/2), pageY:parseInt(offset.top + box.height()/2)});
    });
    $('.scale-small').click(function(){
      var box = $('#img-box'), offset = box.offset();
      mousewheelEvt.call(box, {wheelDelta:-120, pageX:parseInt(offset.left + box.width()/2), pageY:parseInt(offset.top + box.height()/2)});
    });
    function showCoor(point, imgPoint){
        var draw = cad.draw;
        $('.box-info', cbox).text('缩放:'+Math.round(draw.scale*100)+'% '+imgPoint.x.format('0.0000')+', '+(-imgPoint.y).format('0.0000'));
        if(cad.debug){
            $('.box-info', cbox).append('　<span style="color:#0a0;">'+Math.round(point.x+screen.width/2)+', '+Math.round(point.y+screen.height/2)+'</span>');
        }
        $('.point-line-x', cbox).css('left', point.x+'px');
        $('.point-line-y', cbox).css('top', point.y+'px');
    }
    function mousewheelEvt(evt){
        var draw = cad.draw;
        var oldscale = draw.scale;
        evt = evt.originalEvent||evt;
        var diff = ((evt.wheelDelta||$.event.fix(evt).wheelDelta||-evt.detail)>0?1:-1)*oldscale;
        diff = diff * (diff>0?draw.options.scaleRate/(1-draw.options.scaleRate):draw.options.scaleRate);
        if(diff<0){
            draw.scale = Math.max(draw.options.minScale,draw.scale+diff);
        }
        else{
            draw.scale = Math.min(draw.options.maxScale,draw.scale+diff);
        }
        var pos = $(this).offset();
        var point = {x:evt.pageX-pos.left, y:evt.pageY-pos.top};
        //鼠标当前点在图形上的坐标
        var imgPoint = {x:((point.x+screen.width/2)/oldscale+draw.drawRect.x1), y:((point.y+screen.height/2)/oldscale+draw.drawRect.y1)};
        var dw = screen.width*2/draw.scale, dh = screen.height*2/draw.scale;
        draw.drawRect.x1 = ((draw.drawRect.x2-imgPoint.x)*imgPoint.x-(imgPoint.x-draw.drawRect.x1)*(dw-imgPoint.x))/(draw.drawRect.x2-draw.drawRect.x1);
        draw.drawRect.y1 = ((draw.drawRect.y2-imgPoint.y)*imgPoint.y-(imgPoint.y-draw.drawRect.y1)*(dh-imgPoint.y))/(draw.drawRect.y2-draw.drawRect.y1);
        draw.drawRect.x2 = draw.drawRect.x1 + dw;
        draw.drawRect.y2 = draw.drawRect.y1 + dh;
        draw.repaint();
        showCoor(point, imgPoint);
        draw.scaleing = false;
    }
    cbox.unbind('mousemove').bind('mousemove', function(evt){
    }).unbind('mousewheel DOMMouseScroll').bind('mousewheel DOMMouseScroll', function(evt){
        if(navigator.userAgent.indexOf('Chrome')>0){//解决Chrome部分浏览器下鼠标滚轮事件被拆分，导致滚动一次触发9次
            this.wheelDelta = this.wheelDelta||0;
            evt = evt.originalEvent||evt;
            this.wheelDelta += (evt.wheelDelta||$.event.fix(evt).wheelDelta||-evt.detail);
            if(Math.abs(this.wheelDelta)<120){
                return;
            }
            this.wheelDelta = this.wheelDelta + (this.wheelDelta>0?-1:1)*120;
        }
        var draw = cad.draw;
        if(draw.scaleing){
            return;
        }
        draw.scaleing = true;
        mousewheelEvt.call(this, evt);
        setTimeout(function(){
            draw.scaleing = false;
        }, 200);
    });
    cv.attr('width',(screen.width*2)).attr('height', (screen.height*2));
    cv.css({left:'0px',top:'0px',position:'absolute'});
    $('.progress-val', cbox).css({width:'10%'});
    $('.progress-val', cbox).animate({width:'25%'}, 500);
    return cv;
}
CadDraw.prototype.repaint = function(){
    var css = '<style id="cad-color-css">';
    for(var key in this.colorMap){
        css += key+this.colorMap[key];
    }
    css+='</style>';
    $('#cad-color-css').remove();
    this.cbox.append(css);
    this.ctx.clearRect(0, 0, screen.width*2, screen.height*2);
    // this.ctx.canvas.width = this.ctx.canvas.width;
    $('div.text,div.box',this.cbox).remove();
    // $('div.box',this.cbox).remove();
    // log('开始遍历')
    this.ctx.resetTransform();
    this.ctx.save();
    this.ctx.scale(this.scale, this.scale);
    this.ctx.translate(-this.drawRect.x1, -this.drawRect.y1);
    this.ctx.lineCap = "square";
    this.time = {line:0, text:0, ellipse:0, arc:0, shadow:0};
    for(var i=0;i<this.shapes.length;i++){
        var shape = this.shapes[i];
        if(!shape.paint){
            continue;
        }
        shape.paint(this.ctx);
        // if(i%10000==0){
        //     console.log(i);
        // }
    }
    this.ctx.restore();
    // log('结束遍历')
}
CadDraw.prototype.isVisible = function(shape){
    var rect = shape.rect;
    if(!rect || shape.hide){
        return false;
    }
    if(shape.parent){//有父元素的，转换为画布坐标
        var trans = this.ctx.getTransform();
        var p1 = trans.transformPoint({x:rect.x1,y:rect.y1});
        var p2 = trans.transformPoint({x:rect.x2,y:rect.y2});
        rect = new Rect(p1.x, p1.y, p2.x, p2.y);
        return this.drawWinRect.overlay(rect);
    }
    else{//第一层的元素，直接使用图像坐标系比较
        return this.drawRect.overlay(rect);
    }
}
CadDraw.prototype.makeCenter = function(p){
    this.drawRect.x1 = p.x-((screen.width+this.winRect.width())/this.scale)/2;
    this.drawRect.y1 = p.y-((screen.height+this.winRect.height())/this.scale)/2;
    var dw = screen.width*2/this.scale, dh = screen.height*2/this.scale;
    this.drawRect.x2 = this.drawRect.x1 + dw;
    this.drawRect.y2 = this.drawRect.y1 + dh;
    this.repaint();
}
CadDraw.prototype.getScale = function(){
    this.scalesMap = this.scalesMap||{};
    var key = this.ctx.getTransform().toString();
    if(this.scalesMap[key]){
        return this.scalesMap[key];
    }
    var t=this.ctx.getTransform();
    var p1=t.transformPoint({x:0,y:0});
    var p2=t.transformPoint({x:1,y:0});
    var scale = Math.sqrt(Math.pow(p2.x-p1.x, 2)+Math.pow(p2.y-p1.y, 2));
    this.scalesMap[key] = scale;
    return scale;
}
CadDraw.prototype.getAngle = function(){
    this.anglesMap = this.anglesMap||{};
    var key = ctx.getTransform().toString();
    if(this.anglesMap[key]){
        return this.anglesMap[key];
    }
    var t=ctx.getTransform();
    var p1=t.transformPoint({x:0,y:0});
    var p2=t.transformPoint({x:1,y:0});
    var y = p2.y-p1.y, x = p2.x-p1.x;
    var angle = Math.atan(y/x);
    if(x<0){
        angle += Math.PI;
    }
    if(angle<0){
        angle += Math.PI*2;
    }
    this.anglesMap[key] = angle;
    return angle;
}
CadDraw.prototype.searchText = function (key){
    var draw = this;
    function filter(key,text){//根据规则判断是否匹配
        if(!key)return {position:0,length:0};
        var txt = text,txtl=txt.toLowerCase();
        var keyl = key.toLowerCase();
        if((pos=txtl.indexOf(keyl))>=0){
            var ary = [txt.substr(pos,key.length)];ary.position=pos;
            return ary;
        }
        return $.pinyin?$.pinyin.filter(txt,key):false;
    }
    function tostr(num,len){
        var str = '00000000000000000000'+num;
        return str.substr(str.length-len);
    }
    function searchBoxItemClick(){//增加选项单击事件
        var target = $('.map-search-box'),th=$(this);
        target.val((th.text()||'').replace(/\([竖斜]\)$/g,''));
        $('.map-search-pnl').hide();
        var shape = th.data('shape');
        draw.scale = 36/shape.textSize;
        draw.makeCenter(shape.rect.center());
        setTimeout(function(){
            if(shape.dom){
                $(shape.dom).fadeOut().delay(200).fadeIn(100).delay(500).fadeOut().delay(200).fadeIn(100);
            }
        }, 300);
        return false;
    }
    key = (key||'').trim();
    var th = $('.map-search-box'),div = $('.map-search-pnl');
    if(th.data('last-key')!=key || div.is(':hidden')){
        th.data('last-key',key);
        if(!key){
            div.empty().hide();return;
        }
        var ary = [];
        $.each(this.texts, function(){
            if(!this.text){
                return;
            }
            var text = this.text, res = '';
            if(res=filter(key,text)){//根据输入的值对内容进行过滤显示
                var idx = "";
                idx = tostr(text.length,3)+tostr(res.position,4)+tostr(res.length,3);
                if(res.length>0){//对匹配出的字串进行着色表示
                    for(var j=0;j<res.length;j++){
                        text = text.replace(res[j],'<span class=key>'+res[j]+'</span>');
                    }
                }
                ary.push({data:this,text:text+(this.vertical?'(竖)':(this.angle360?'(斜)':'')),idx:idx});
            }
        });
        ary.sort(function(o1,o2){//对数组按idx进行排序
            return o1.idx>o2.idx?1:-1;
        });
        div.empty();
        var max = Math.min(50,ary.length);//过滤时最多只显示50项
        for(var i=0;i<max;i++){//转化为HTML文本
            $('<a idx='+ary[i].idx+'>'+ary[i].text+'</a>').appendTo(div).attr('title',ary[i].text.replace(/<.+?>/g,'')).data('shape',ary[i].data).bind('focusitem',searchBoxItemClick).bind('click',function(){$(this).trigger('focusitem')});
        }
        if(max==0){
            div.text('未匹配到设备');
            div.css('color','#ccc').css('line-height','160%');
        }
        div.scrollTop(0).show();
    }
};
CadDraw.prototype.initEquMap = function(equs, rootType, typeMap, types){
    util.initEquInfo(this, equs, rootType, typeMap, types);
    var map = this.equMap;
    for(var i=0;i<this.texts.length;i++){
        var name = this.texts[i].text;
        var name2 = util.transEquName(name);
        var equId = this.texts[i].equId || map[name] || map[name+'#'] || map[name2] || map[name2+'#'];
        if(equId){
            this.texts[i].equId = this.texts[i].equId || equId;
            var equ = this.equObjMap[equId]||{};
            //this.texts[i].text = equ.vcName||name;
            equ.element = this.texts[i];
        }
    }
    $('body').unbind('click.draw').bind('click.draw', function(evt){
        var dom = $(evt.target).closest('.text');
        if(dom.length>0){
            var draw = $('body').data('draw'), map = draw.equMap||{};
            var name = dom.text();
            var name2 = util.transEquName(name);
            var shape = dom.data('shape');
            var equId = (shape&&shape.equId) || map[name] || map[name+'#'] || map[name2] || map[name2+'#'];
            name = name2||name;
            if(/^\d+$/g.test(name)){
                name = name+'#';
            }
            draw.showEquDialog(equId, name, dom);
        }
    });
}
CadDraw.prototype.addEquClass = function(equname, clsName){
    var name = equname, map = this.equMap;
    var name2 = util.transEquName(name);
    var equId = map[name] || map[name+'#'] || map[name2] || map[name2+'#'];
    if(this.equObjMap && equId){
        var equ = this.equObjMap[equId];
        var text = equ && equ.element;
        if(text){
            text.className = (text.className?text.className+' ':'')+clsName;
        }
    }
}
CadDraw.prototype.showEquDialog = function(equId, name, dom){
  if(this.editModel && window.mapTextClickEvt){
    return window.mapTextClickEvt.call(this, equId, name, dom);
  }
    var isQc = (this.equObjMap[equId]||{}).isQc;
    var url = this[(this.editModel?'edit':'view')+(equId?'Exist':'Empty')+(isQc?'Qc':'Equ')+'Url'];
    if(url){
        url += (equId||'');
        var title = (this.editModel?(equId?'编辑':'添加'):'查看')+(isQc?'器材':'设备');
        name = util.transEquName(name)||name;
        if(/^\d+$/g.test(name)){
            name = name+'#';
        }
        var param = isQc?{"po.vcStationId":this.stationId,"po.vcOrgId":this.orgId,"po.vcAzwz":name}:{"po.vcPos":this.stationId,"po.vcOrgId":this.orgId,"po.vcEquUseName":name};
        var win = $.openWin({title:title,href:url,width:$(window).width()-40,height:$(window).height()-50,iframe:true,
                params:param,butParams:[this.editModel?{id:'btnSave',text:'保存',iconCls:'icon-save'}:{id:'btnClose',text:'关闭',iconCls:'icon-close'}]});
        $('#operateWindow-main').css('overflow', 'hidden');
        $('#btnSave').click(function(){
          var frm = $('#operateWindow-main>iframe')[0];
          frm && frm.contentWindow.$('#addForm').submit();
        });
        window.bindEquQcData = window.bindEquQcData||function(equIds){
          $.util.showTip('保存成功！');
          window.updEquAjax && window.updEquAjax(equIds[0]);
          $('#operateWindow').window('close');
        };
        $('#btnClose').click(function(){
          $('#operateWindow').window('close');
        });
    }
}
CadDraw.prototype.createText = function(){
    return new Text();
}
CadDraw.prototype.clear = function(){
    if(this.ctx){
        this.ctx.clearRect(0, 0, screen.width*2, screen.height*2);
        $('div.text,div.box',this.cbox).remove();
    }
}
// CadDraw.prototype.transform = function(x, y){
//     return {
//         x: (x-this.drawRect.x1)*this.scale,
//         y: (y-this.drawRect.y1)*this.scale
//     };
// }
CadDraw.prototype.defaults = {
    minScale:0.001,
    maxScale:1000,
    scaleRate:0.33
};


function SvgDraw(cbox, svg, opts){
    $.extend(this, {cbox:cbox}, SvgDraw.prototype.defaults, opts);
    this.util = util;
    cbox.html(svg);
    $('>svg>title', cbox).remove();
    this.svg = $('>svg', cbox);
    var viewBox = this.svg[0].getAttribute('viewBox');
    var ary = viewBox.split(/\s+/g);
    this.imgRect = new Rect(parseFloat(ary[0]), parseFloat(ary[1]), parseFloat(ary[0])+parseFloat(ary[2]), parseFloat(ary[1])+parseFloat(ary[3]));
    this.winRect = new Rect(0, 0, cbox.width(), cbox.height());
    cbox.data('draw', this);
    this.initEvent();
    this.scale = Math.min(this.winRect.width()/this.imgRect.width(), this.winRect.height()/this.imgRect.height())*95;
    this.makeCenter(this.imgRect.center());
}
SvgDraw.prototype.defaults = {scale:100, scaleing:false, minScale:5, maxScale:5000, scaleRate:0.33};
SvgDraw.prototype.initEvent = function(){
    var cbox = this.cbox;
    $('.split-box').hide();
    cbox[0].oncontextmenu = function(){return false;};
    cbox.append('<div class="box-info" style="position:absolute;left:0px;bottom:0px;line-height:24px;padding-left:4px;font-size:12px;z-index:9999;background-color:#fff;"></div>');
    cbox.append('<div class="point-line-x" style="position:absolute;left:0px;top:0px;width:1px;height:'+screen.height+'px;border-left-width:1px;"></div>');
    cbox.append('<div class="point-line-y" style="position:absolute;left:0px;top:0px;height:1px;width:'+screen.width+'px;border-top-width:1px;"></div>');
    cbox.append('<input placeholder="搜索" class="map-search-box" ><div class="map-search-pnl" ></div>');
    $('.map-search-pnl', cbox).bind('mousewheel DOMMouseScroll', function(evt){
        evt = evt.originalEvent||evt;
        var diff = ((evt.wheelDelta||$.event.fix(evt).wheelDelta||-evt.detail)>0?1:-1)*50;
        $(this).scrollTop($(this).scrollTop()-diff);
        return false;
    });
    cbox.unbind('mousewheel DOMMouseScroll showCoor').bind('mousewheel DOMMouseScroll', function(evt){
        if(navigator.userAgent.indexOf('Chrome')>0){//解决Chrome部分浏览器下鼠标滚轮事件被拆分，导致滚动一次触发9次
            this.wheelDelta = this.wheelDelta||0;
            evt = evt.originalEvent||evt;
            this.wheelDelta += (evt.wheelDelta||$.event.fix(evt).wheelDelta||-evt.detail);
            if(Math.abs(this.wheelDelta)<120){
                return;
            }
            this.wheelDelta = this.wheelDelta + (this.wheelDelta>0?-1:1)*120;
        }
        var draw = $(this).data('draw'), svg = draw.svg;
        if(draw.scaleing){
            return;
        }
        draw.scaleing = true;
        var oldscale = draw.scale;
        evt = evt.originalEvent||evt;
        var diff = ((evt.wheelDelta||$.event.fix(evt).wheelDelta||-evt.detail)>0?1:-1)*oldscale;
        diff = diff * (diff>0?draw.scaleRate/(1-draw.scaleRate):draw.scaleRate);
        if(diff<0){
            draw.scale = Math.max(draw.minScale,draw.scale+diff);
        }
        else{
            draw.scale = Math.min(draw.maxScale,draw.scale+diff);
        }
        var offset = draw.cbox.offset();
        var center = {x:event.pageX - offset.left, y:event.pageY - offset.top};
        var pos = {left:parseInt(center.x-(center.x-parseInt(draw.svg.css('left')))*draw.scale/oldscale)+'px',
                    top:parseInt(center.y-(center.y-parseInt(draw.svg.css('top')))*draw.scale/oldscale)+'px'};
        draw.svg.css(pos);
        draw.svg[0].setAttribute('width', parseInt(draw.imgRect.width()*draw.scale/100));
        draw.svg[0].setAttribute('height', parseInt(draw.imgRect.height()*draw.scale/100));
        draw.scaleing = false;
    }).bind('showCoor', function (event, point, imgPoint){
        var draw = $(this).data('draw'), cbox = draw.cbox;
        $('.box-info', cbox).text('缩放:'+Math.round(draw.scale)+'% '+imgPoint.x.format('0.00')+', '+(imgPoint.y).format('0.00'));
        //$('.box-info', cbox).append('　<span style="color:#0a0;">'+Math.round(point.x+screen.width/2)+', '+Math.round(point.y+screen.height/2)+'</span>');
        // $('.point-line-x', cbox).css('left', point.x+'px');
        // $('.point-line-y', cbox).css('top', point.y+'px');
    });
    $('body').data('draw', this).unbind('mousedown.draw mousemove.draw mouseup.draw').bind('mousedown.draw', function(evt){
        var draw = $(this).data('draw'), svg = draw.svg;
        if(evt.ctrlKey || evt.button==2 || draw.selectEvt){//按Ctrl可以定区域缩放
            $('body').css('user-select','none');
            draw.splitStart = draw.point;
            draw.splitStartPoint = {x:evt.pageX, y:evt.pageY};
            if(!draw.splitDom){
                draw.splitDom = $('.split-box').length>0?$('.split-box'):$('<div class=split-box></div>').appendTo('body');
            }
            draw.splitDom.css({left:evt.pageX+'px', top:evt.pageY+'px', width:1, height:1});
        }
        else{
            draw.draging = true;
            $('body').css('user-select','none');
            svg.data('drag-p', {x:evt.pageX, y:evt.pageY});
            svg.data('drag-start', {x:parseInt(svg.css('left')), y:parseInt(svg.css('top'))});
        }
    }).bind('mousemove.draw', function(evt){
        var draw = $(this).data('draw'), svg = draw.svg;
        if(draw.splitStartPoint && draw.splitDom){
            draw.splitEnd = draw.point;
            var p = draw.splitStartPoint;
            draw.splitDom.css({left:Math.min(evt.pageX,p.x)+'px', top:Math.min(evt.pageY, p.y)+'px', width:Math.abs(evt.pageX-p.x)+'px', height:Math.abs(evt.pageY-p.y)+'px'});
            if(Math.abs(evt.pageX-p.x)+Math.abs(evt.pageY-p.y>10)){
                draw.splitDom.show();
            }
        }
        if(draw.draging){
            var p = svg.data('drag-p');
            var s = svg.data('drag-start');
            svg.css('left', (s.x+evt.pageX-p.x)+'px');
            svg.css('top', (s.y+evt.pageY-p.y)+'px');
        }
        var pos = cbox.offset();
        var point = {x:evt.pageX-pos.left, y:evt.pageY-pos.top};
        var imgPoint = {x:(point.x-parseInt(svg.css('left')))*100/draw.scale, y:(point.y-parseInt(svg.css('top')))*100/draw.scale};
        draw.point = imgPoint;
        draw.cbox.trigger('showCoor', [point, imgPoint]);
    }).bind('mouseup.draw', function(evt){
        var draw = $(this).data('draw'), svg = draw.svg;
        $('body').css('user-select','auto');
        draw.splitDom && draw.splitDom.hide();
        if((evt.ctrlKey || evt.button==2 || draw.selectEvt) && draw.splitDom){
            draw.splitEnd = draw.point;
            var p = draw.splitStartPoint;
            draw.splitDom.css({left:Math.min(evt.pageX,p.x)+'px', top:Math.min(evt.pageY, p.y)+'px', width:Math.abs(evt.pageX-p.x)+'px', height:Math.abs(evt.pageY-p.y)+'px'});
            if(draw.selectEvt){
                var p1 = draw.splitStart, p2 = draw.splitEnd, selRect = new Rect(p1.x, p1.y, p2.x, p2.y);
                var equs = [];
                var map = draw.equMap||{};
                $('text', this.svg).each(function(){
                    var rect = this.getBoundingClientRect();
                    var imgPoint = {x:(rect.left+rect.width/2-parseInt(svg.css('left')))*100/draw.scale, y:(rect.top+rect.height/2-parseInt(svg.css('top')))*100/draw.scale};
                    if(selRect.pointIn(imgPoint.x, imgPoint.y)){
                        var name = util.transEquName($(this).text());
                        if(name){
                            equs.push({id:map[name]||map[$(this).text()]||map[name+'#']||map[$(this).text()+'#']||'',name:name});
                        }
                    }
                });
                draw.selectEvt(equs, p1, p2);
            }
            else if(Math.abs(evt.pageX-p.x)+Math.abs(evt.pageY-p.y)>40){//划区域缩放
                var p1 = draw.splitStart, p2 = draw.splitEnd;
                draw.scale = Math.min(draw.winRect.width()/Math.abs(p1.x-p2.x), draw.winRect.height()/Math.abs(p1.y-p2.y))*100;
                draw.makeCenter({x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2});
            }
        }
        if(draw.draging){
            draw.draging = false;
            var draw = $('body').data('draw');
            var p = svg.data('drag-p');
            var s = svg.data('drag-start');
            svg.css('left', (s.x+evt.pageX-p.x)+'px');
            svg.css('top', (s.y+evt.pageY-p.y)+'px');
            svg.data('drag-p', null);
        }
        draw.splitStart = null;
        draw.splitStartPoint = null;
    });
    $('.box-info', cbox).attr('title','点击缩放至适合窗口大小').click(function(){
        var draw = $('body').data('draw')
        draw.scale = Math.min(draw.winRect.width()/draw.imgRect.width(), draw.winRect.height()/draw.imgRect.height())*95;
        draw.makeCenter(draw.imgRect.center());
    });
    $('.map-search-box').bind('keyup paste type',function(){
        var evt = $.event.fix(event),kc=evt.keyCode;
        if(kc==13){//回车触发搜索事件
            $('.map-search-box').trigger('focusitem');
            return;
        }
        var draw = $('body').data('draw');
        draw.searchText(this.value);
    }).bind('focusitem', function(){
        $('.map-search-box').data('last-key', null);
        $('.map-search-pnl>a:first').trigger('focusitem');
    }).click(function(){
        this.setSelectionRange && this.setSelectionRange(0,9999);
        var draw = $('body').data('draw');
        draw.searchText(this.value);
    });
}
SvgDraw.prototype.makeCenter = function(center){
    this.svg[0].setAttribute('width', parseInt(this.imgRect.width()*this.scale/100));
    this.svg[0].setAttribute('height', parseInt(this.imgRect.height()*this.scale/100));
    this.svg.css({left:(this.winRect.width()/2-center.x*this.scale/100)+'px', top:(this.winRect.height()/2-center.y*this.scale/100)+'px'});
}
SvgDraw.prototype.searchText = function (key){
    var draw = this;
    function filter(key,text){//根据规则判断是否匹配
        if(!key)return {position:0,length:0};
        var txt = text,txtl=txt.toLowerCase();
        var keyl = key.toLowerCase();
        if((pos=txtl.indexOf(keyl))>=0){
            var ary = [txt.substr(pos,key.length)];ary.position=pos;
            return ary;
        }
        return $.pinyin?$.pinyin.filter(txt,key):false;
    }
    function tostr(num,len){
        var str = '00000000000000000000'+num;
        return str.substr(str.length-len);
    }
    function searchBoxItemClick(){//增加选项单击事件
        var target = $('.map-search-box'),th=$(this);
        target.val((th.text()||'').replace(/\([竖斜]\)$/g,''));
        $('.map-search-pnl').hide();
        var shape = th.data('shape');
        var rect = shape.getBoundingClientRect();
        var ww = draw.winRect.width(), wh = draw.winRect.height(), iw = draw.imgRect.width(), ih = draw.imgRect.height();
        var oldscale = draw.scale;
        draw.scale = Math.min(ww*ww/rect.width/iw, wh*wh/rect.height/ih)*oldscale/20;
        draw.makeCenter({x:(rect.left+rect.width/2-parseInt(draw.svg.css('left')))*100/oldscale, y:(rect.top+rect.height/2-parseInt(draw.svg.css('top')))*100/oldscale});
        setTimeout(function(){
            $(shape).fadeOut().delay(200).fadeIn(100).delay(500).fadeOut().delay(200).fadeIn(100);
        }, 300);
        return false;
    }
    key = (key||'').trim();
    var th = $('.map-search-box'),div = $('.map-search-pnl');
    if(th.data('last-key')!=key || div.is(':hidden')){
        th.data('last-key',key);
        if(!key){
            div.empty().hide();return;
        }
        var ary = [];
        $('text', this.svg).each(function(){
            var text = $(this).text();
            if(!text){
                return;
            }
            var res = '';
            if(res=filter(key,text)){//根据输入的值对内容进行过滤显示
                var idx = "";
                idx = tostr(text.length,3)+tostr(res.position,4)+tostr(res.length,3);
                if(res.length>0){//对匹配出的字串进行着色表示
                    for(var j=0;j<res.length;j++){
                        text = text.replace(res[j],'<span class=key>'+res[j]+'</span>');
                    }
                }
                var g = $(this).closest('g');
                var rotate = (g.attr('transform')||'').replace(/.*rotate\((.+?)\).*/g,'$1');
                ary.push({data:this,text:text+(rotate=='-90' || rotate=='270'?'(竖)':(isNaN(rotate)||rotate==''?'':'(斜)')),idx:idx});
            }
        });
        ary.sort(function(o1,o2){//对数组按idx进行排序
            return o1.idx>o2.idx?1:-1;
        });
        div.empty();
        var max = Math.min(50,ary.length);//过滤时最多只显示50项
        for(var i=0;i<max;i++){//转化为HTML文本
            $('<a idx='+ary[i].idx+'>'+ary[i].text+'</a>').appendTo(div).attr('title',ary[i].text.replace(/<.+?>/g,'')).data('shape',ary[i].data).bind('focusitem',searchBoxItemClick).bind('click',function(){$(this).trigger('focusitem')});
        }
        if(max==0){
            div.text('未匹配到设备');
            div.css('color','#ccc').css('line-height','160%');
        }
        div.scrollTop(0).show();
    }
};
SvgDraw.prototype.initEquMap = function(equs, rootType, typeMap, types){
    util.initEquInfo(this, equs, rootType, typeMap, types);
    var map = this.equMap;
    var draw = this;
    $('text', this.svg).each(function(){
        var name = $(this).text();
        var name2 = util.transEquName(name);
        var equId = map[name] || map[name+'#'] || map[name2] || map[name2+'#'];
        if(equId){
            $(this).data('equId', equId);
            var equ = draw.equObjMap[equId]||{};
            $(this).text(equ.vcName||name);
            equ.element = this;
            var cls = this.getAttribute('class');
            this.setAttribute('class', (cls?cls+' ':'')+'equ');
        }
    });
    $('body').unbind('click.draw').bind('click.draw', function(evt){
        var th = $(evt.target).closest('text');
        if(th.length>0){
            var draw = $('body').data('draw'), map = draw.equMap||{};
            var name = th.text();
            var name2 = util.transEquName(name);
            var equId = th.data('equId');
            name = name2||name;
            if(/^\d+$/g.test(name)){
                name = name+'#';
            }
            draw.showEquDialog(equId, name)
        }
    });
}
SvgDraw.prototype.addEquClass = function(equname, clsName){
    var name = equname, map = this.equMap;
    var name2 = util.transEquName(name);
    var equId = map[name] || map[name+'#'] || map[name2] || map[name2+'#'];
    if(this.equObjMap && equId){
        var equ = this.equObjMap[equId];
        var text = equ && equ.element;
        if(text){
            var cls = text.getAttribute('class');
            text.setAttribute('class', (cls?cls+' ':'')+clsName);
        }
    }
}
SvgDraw.prototype.showEquDialog = function(equId, name){
    var isQc = (this.equObjMap[equId]||{}).isQc;
    var url = this[(this.editModel?'edit':'view')+(equId?'Exist':'Empty')+(isQc?'Qc':'Equ')+'Url'];
    if(url){
        url += (equId||'');
        var title = (this.editModel?(equId?'编辑':'添加'):'查看')+(isQc?'器材':'设备');
        name = util.transEquName(name)||name;
        if(/^\d+$/g.test(name)){
            name = name+'#';
        }
        var param = isQc?{"po.vcStationId":this.stationId,"po.vcOrgId":this.orgId,"po.vcAzwz":name}:{"po.vcPos":this.stationId,"po.vcOrgId":this.orgId,"po.vcEquUseName":name};
        $.openWin({title:title,href:url,width:$(window).width()-40,height:$(window).height()-50,iframe:true,
                params:param,butParams:[{id:'btnSave',text:'保存',iconCls:'icon-save'},{id:'btnClose',text:'关闭',iconCls:'icon-close'}]});
        $('#operateWindow-main').css('overflow', 'hidden');
        $(this.editModel?'#btnClose':'#btnSave').hide();
        $('#btnClose').click(function(){
            $('#operateWindow').window('close');
        });
    }
}

function Rect(x1, y1, x2, y2){
    this.x1 = x1;
    this.x2 = x2;
    this.y1 = y1;
    this.y2 = y2;
}
Rect.prototype.clone = function(){
    return new Rect(this.x1, this.y1, this.x2, this.y2); 
};
Rect.prototype.width = function(){
    return this.x2-this.x1; 
};
Rect.prototype.height = function(){
    return this.y2-this.y1; 
};
Rect.prototype.center = function(){
    return {x:(this.x1+this.x2)/2, y:(this.y1+this.y2)/2}; 
};
Rect.prototype.resize = function(x, y){
    this.x1 = Math.min(x, this.x1);
    this.x2 = Math.max(x, this.x2);
    this.y1 = Math.min(y, this.y1);
    this.y2 = Math.max(y, this.y2);
};
Rect.prototype.size = function(){
    return Math.sqrt(Math.pow(this.x2-this.x1, 2)+Math.pow(this.y2-this.y1, 2));
} 
Rect.prototype.resizeRect = function(rect){
    this.x1 = Math.min(rect.x1, this.x1);
    this.x2 = Math.max(rect.x2, this.x2);
    this.y1 = Math.min(rect.y1, this.y1);
    this.y2 = Math.max(rect.y2, this.y2);
};
Rect.prototype.pointIn = function(x, y){
    var p = typeof(x)=='object'?x:{x:x,y:y};
    return ((p.x>this.x1 && p.x<this.x2) && (p.y>this.y1 && p.y<this.y2)) 
};
Rect.prototype.overlay = function(rect){
    if(!rect){
        return false;
    }
    var r1 = this.x1<rect.x1?this:rect;
    var r2 = this.x1<rect.x1?rect:this;
    if(r2.x1>=r1.x2){
        return false;
    }
    if(r2.y2<=r1.y1){
        return false;
    }
    if(r2.y1>=r1.y2){
        return false;
    }
    return true;
};
Rect.prototype.contains = function(rect){
    if(!rect){
        return false;
    }
    if(rect.x1<=this.x1 || rect.x1>=this.x2){
        return false;
    }
    if(rect.y1<=this.y1 || rect.y1>=this.y2){
        return false;
    }
    if(rect.x2<=this.x1 || rect.x2>=this.x2){
        return false;
    }
    if(rect.y2<=this.y1 || rect.y2>=this.y2){
        return false;
    }
    return true;
};

function JsonSvg(ary){
    this.blockMap = {};
    this.shapes = [];
    this.colorMap = {};
    this.buildShape = function(obj, hasPar){
        try{
            var shape = util.buildShape(obj);
            shape.blockMap = this.blockMap;
            shape.colorMap = this.colorMap;
            for(var i=0;obj.ents!=null && i<obj.ents.length;i++) {
                shape.shapes.push(this.buildShape(obj.ents[i], true));
            }
            if(shape.etype == 808){
                this.blockMap[obj.infos] = shape;
            }
            else if(!hasPar){
                this.shapes.push(shape);
            }
            return shape;
        }catch(e){
            console.error(e);
        }
    }
    this.buildSvg = function(){
        try{
            var buff = '';
            this.left = 9999999;
            this.top = 9999999;
            this.right = -9999999;
            this.bottom = -9999999;
            var css = `<style>circle,ellipse,path,polyline{fill:none;stroke:black;stroke-width:1;}
            text{fill:black;}
            g path,g circle,g ellipse,g polyline{stroke-width:inherit}`;
            var scaleMap = {};
            for(var i=0;i<this.shapes.length;i++) {
                var sh = this.shapes[i];
                sh.topShape = true;
                var txt = sh.buildSvgText?sh.buildSvgText():'';
                if(!txt) {
                    continue;
                }
                buff += txt+"\n";
                if(sh.etype==15 && (sh.scale!=100)){
                    scaleMap['.scale'+sh.scale] = '{stroke-width:'+(sh.scale/100)+';}';
                }
                if(sh.transform && sh.transform.isChange()){
                    // console.log(sh.handle, sh.x/cad.dpi, sh.y/cad.dpi, sh.transform.toString(), sh.text)
                }
                if(!isNaN(sh.left) && !isNaN(sh.top) && !isNaN(sh.right) && !isNaN(sh.bottom)){
                    this.left = Math.min(sh.left, this.left);
                    this.top = Math.min(sh.top, this.top);
                    this.right = Math.max(sh.right, this.right);
                    this.bottom = Math.max(sh.bottom, this.bottom);
                }
            }
            var width = parseInt(this.right-this.left);
            var height = parseInt(this.bottom-this.top);
            var head = '<svg viewBox="'+this.left+" "+this.top+" "+width+" "+height+'" width="'+width+'" height="'+height+'" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n';
            var defs = `<defs>`;
            for(var key in this.blockMap){
                var block = this.blockMap[key];
                //if(block.use){
                    defs += block.buildSvgText();
                //}
            }
            defs+='</defs>';
            for(key in scaleMap){
                css += key+scaleMap[key];
            }
            for(key in this.colorMap){
                css += key+this.colorMap[key];
            }
            css+='</style>';
            return head+css+defs+buff+'</svg>';
        }catch(e){
            console.error(e);
        }
    }
    try{
        for(var i=0;i<ary.length;i++){
            this.buildShape(ary[i]);
        }
    }catch(e){
        console.error(e);
    }
}

function Line(){
}
Line.prototype.init = function(){
    try{
        if(this.inited){
            return;
        }
        this.inited = true;
        this.points = [];
        var x = this.x = util.infosNum(this, 0);
        var y = this.y = util.infosNum(this, 1);
        this.rect = new Rect(x, y, x, y);
        for(var i=2;i<this.infos.length;i+=2) {
            var xn =(util.infosNum(this, i));
            var yn = (util.infosNum(this, i+1));
            this.points.push({x:xn, y:yn});
            this.rect.resize(xn, yn);
        }
        var last = Line.lastLine;
        var linked = false;
        if(last){//合并线段
            var tail = this.points[this.points.length-1];
            if(this.x!=tail.x || this.y!=tail.y){//如果自身是首尾相连的，不处理
                if(this.parent==last.parent && this.color==last.color){
                    tail = last.points[last.points.length-1];
                    if(Math.abs(this.x - tail.x)<0.00000001 && Math.abs(this.y - tail.y)<0.00000001){
                        linked = true;
                    }
                }
            }
        }
        if(linked){//两条线段相连
            last.points = last.points.concat(this.points);
            last.rect.resizeRect(this.rect);
            last.size = last.rect.size();
            if(!last.cnt && cad.draw){
                cad.draw.lines.push(last);
            }
            last.cnt = (last.cnt||1)+1;
            this.rect = null;
            this.linkedLine = last;
        }
        else{
            Line.lastLine = this;
            this.size = this.rect.size();
        }
    }catch(e){
        console.error(e);
    }
};
Line.prototype.paint = function(ctx){
    try{
        var scale = cad.draw.getScale();
        if(this.size*scale<1){
            return;
        }
        if(!cad.draw.isVisible(this)){
            return;
        }
        util.paintDebugInfo(this);
        var dash = [];
        for(var i=0;this.dash && i<this.dash.length;i++){
            dash[i] = this.dash[i]*scale;
        }
        ctx.setLineDash(dash);
        ctx.beginPath();
        var oldStroke = ctx.strokeStyle;
        ctx.strokeStyle = util.calcColor(this);
        if(this.lineWeight>1){
            ctx.lineWidth = Math.max(1/Math.abs(scale), (this.lineWeight||1)*cad.draw.scale/100/scale);
        }
        else{
            ctx.lineWidth = 1/Math.abs(scale);
        }
        var p = this;
        ctx.moveTo(p.x, p.y);
        for(var i=0;i<this.points.length;i++) {
            p = this.points[i];
            ctx.lineTo(p.x, p.y);
        }
        //ctx.closePath();
        if(this.shadow){
            ctx.fillStyle = util.calcColor({parent:this.parent});
            ctx.globalCompositeOperation = 'xor';
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        else{
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.strokeStyle = oldStroke;
    }catch(e){
        console.error(e);
    }
};
Line.prototype.toJSON = function(){
    if(!this.rect || this.points.length==0){
        return null;
    }
    var obj = {et:this.etype, h:this.handle, x:this.x, y:this.y, ps:this.points};
    if(this.points.length>1){
        obj.rect = [this.rect.x1, this.rect.y1, this.rect.x2, this.rect.y2];
    }
    if(this.stroke && this.stroke!='#000000' && this.stroke!='#ffffff'){
        obj.c = this.stroke;
    }
    if(this.dash && this.dash.length>0){
        obj.dash = this.dash;
    }
    if(this.lineWeight && this.lineWeight>1){
        obj.lw = this.lineWeight;
    }
    if(this.shadow){
        obj.ht = 1;
    }
    return obj;
}
Line.prototype.fromJSON = function(obj){
    this.etype = obj.et;
    this.handle = obj.h;
    this.x = obj.x;
    this.y = obj.y;
    this.points = obj.ps;
    this.stroke = obj.c;
    this.dash = obj.dash;
    this.lineWeight = obj.lw;
    this.shadow = obj.ht;
    if(obj.rect){
        this.rect = new Rect(obj.rect[0], obj.rect[1], obj.rect[2], obj.rect[3]);
    }
    else{
        var p = this.points[0];
        this.rect = new Rect(Math.min(this.x, p.x), Math.min(this.y, p.y), Math.max(this.x, p.x), Math.max(this.y, p.y));
    }
    this.size = this.rect.size();
    return this;
}
Line.prototype.buildSvgText = function(){
    try{
        var x = this.left = this.right = this.x = util.infosNum(this, 0)*cad.dpi;
        var y = this.top = this.bottom = this.y = util.infosNum(this, 1)*cad.dpi;
        var buff = "<path d=\"M"+this.x+" "+this.y;
        if(this.etype==17) {
            var x2 = (util.infosNum(this, 2)*cad.dpi);
            var y2 = (util.infosNum(this, 3)*cad.dpi);
            if(x2==this.x && y2==this.y){//一个点，就不显示了
                return '';
            }
            buff+=" L"+x2+" "+(y2);
            this.left = Math.min(this.left, x2);
            this.top = Math.min(this.top, y2);
            this.right = Math.max(this.right, x2);
            this.bottom = Math.max(this.bottom, y2);
        }
        else if(this.etype==18) {
            for(var i=2;i<this.infos.length;i+=2) {
                var xn =(util.infosNum(this, i)*cad.dpi);
                var yn = (util.infosNum(this, i+1)*cad.dpi);
                if(xn==x && yn==y){
                    continue;
                }
                x = xn;y = yn;
                buff+=" L"+xn+" "+yn;
                this.left = Math.min(this.left, xn);
                this.top = Math.min(this.top, yn);
                this.right = Math.max(this.right, xn);
                this.bottom = Math.max(this.bottom, yn);
            }
        }
        buff += '"';
        buff += util.buildDebugInfo(this);
        buff += util.strokeInfo(this);
        buff += '/>';
        return buff;
    }catch(e){
        console.error(e);
    }
}

function PolyLine(){
}
PolyLine.prototype.init = function() {
    try{
        this.points = [];
        this.left = this.right = this.x = util.infosNum(this, 0);
        this.top = this.bottom = this.y = util.infosNum(this, 1);
        this.rect = new Rect(this.x, this.y, this.x, this.y);
        this.bulge = util.infosNum(this, 2);
        for(var i=3;i+1<this.infos.length;i+=3){
            var p = {};
            p.x = (util.infosNum(this, i)*cad.dpi);
            p.y = (util.infosNum(this, i+1)*cad.dpi);
            p.bulge = util.infosNum(this, i+2);
            this.points.push(p);
            this.rect.resize(p.x, p.y);
        }
    }catch(e){
        console.error(e);
    }
}
PolyLine.prototype.paint = function(ctx) {
    try{
        var scale = cad.draw.getScale();
        if(this.size*scale<1){
            return;
        }
        if(!cad.draw.isVisible(this)){
            return;
        }
        ctx.beginPath();
        ctx.lineWidth = 1/Math.abs(scale);
        var lp = null;
        var p = lp = this;
        ctx.moveTo(p.x, p.y);
        for(var i=0;i<this.points.length;i++) {
            p = this.points[i];
            if(lp && lp.bulge){
                this.drawArcLine(ctx, lp, p);
            }
            else{
                ctx.lineTo(p.x, p.y);
            }
            lp = p;
        }
        if(p.bulge){
            this.drawArcLine(ctx, p, this);
        }
        ctx.closePath();
        ctx.fillStyle = util.calcColor(this);
        ctx.globalCompositeOperation = 'xor';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }catch(e){
        console.error(e);
    }
}
PolyLine.prototype.toJSON = function(){
    var obj = {et:this.etype, h:this.handle, x:this.x, y:this.y, ps:this.points, rect:[this.rect.x1, this.rect.y1, this.rect.x2, this.rect.y2]};
    if(this.stroke && this.stroke!='#000000' && this.stroke!='#ffffff'){
        obj.c = this.stroke;
    }
    if(this.bulge){
        obj.bulge = this.bulge;
    }
    return obj;
}
PolyLine.prototype.fromJSON = function(obj){
    this.etype = obj.et;
    this.handle = obj.h;
    this.stroke = obj.c;
    this.x = obj.x;
    this.y = obj.y;
    this.bulge = obj.bulge;
    this.points = obj.ps;
    this.rect = new Rect(obj.rect[0], obj.rect[1], obj.rect[2], obj.rect[3]);
    this.size = this.rect.size();
    return this;
}
PolyLine.prototype.buildSvgText = function() {
    try{
        var buff = '';
        return buff;
    }catch(e){
        console.error(e);
    }
}

PolyLine.prototype.drawArcLine = function(ctx, p1, p2){
    var a = Math.atan(p1.bulge)*2;
    var d = Math.abs((p1.x==p2.x)?(p1.y-p2.y):((p1.y==p2.y)?(p1.x-p2.x):(p2.y-p1.y)/Math.sin(Math.atan((p2.y-p1.y)/(p2.x-p1.x)))));
    var r = Math.abs((d / 2) / Math.sin(a));
    if(d==0 || r==0){
        return;
    }
    if(Math.abs(p1.bulge)<0.99){//小于半圆时使用arcTo画弧
        p1.r = r;
        //var rate = r/l;
        //var midp = {x:p1.x+rate*(p2.x-p1.x), y:p1.y+rate*(p2.y-p1.y)}
        var b = Math.atan((p2.y-p1.y)/(p1.x-p2.x));
        var tab = Math.tan(a+b);
        var ta_b = Math.tan(a-b);
        p1.cx = (ta_b*p1.x+tab*p2.x+p2.y-p1.y)/(tab+ta_b);
        p1.cy = p2.y-tab*(p1.cx-p2.x);
        ctx.arcTo(p1.cx, p1.cy, p2.x, p2.y, r);
    }
    else{//大于等于1时，暂时画成半圆
        var p3 = {};
        p3.x = p2.x+(p1.x-p2.x)*r/d;
        p3.y = p2.y+(p1.y-p2.y)*r/d;
        var mat = new DOMMatrix();
        mat = mat.rotate(-(90-Math.abs(a)*180/Math.PI));
        var o1 = mat.transformPoint({x:p3.x-p2.x, y:p3.y-p2.y});
        var o = {x:p2.x+o1.x, y:p2.y+o1.y};
        p1.angle = this.getAngle(p1.x-o.x, p1.y-o.y);
        p2.angle = this.getAngle(p2.x-o.x, p2.y-o.y);
        p1.c = o;
        ctx.arc(o.x, o.y, r, p1.angle, p2.angle, p1.bulge>0);
    }
}

PolyLine.prototype.getAngle =  function(x, y){
    if(x==0){
        return (y>0?1:-1)*Math.PI/2;
    }
    else{
        return x>0?Math.atan(y/x):Math.PI-Math.atan(y/x);
    }
}

function Ellipse(){
}
Ellipse.prototype.init = function(){
    try{
        if(this.inited){
            return;
        }
        this.inited = true;
        if(this.etype==3) {
            this.r = util.infosNum(this, 2)*cad.dpi;
            this.rect = new Rect(this.x - this.r, this.y - this.r, this.x + this.r, this.y + this.r);
            this.size = this.r*2;
        }
        else if(this.etype==12) {
            this.x2 = util.infosNum(this, 2)*cad.dpi;
            this.y2 = util.infosNum(this, 3)*cad.dpi;
            this.ratio = util.infosNum(this, 4);
            this.startangle = util.infosNum(this, 5);
            this.endangle = util.infosNum(this, 6);
            this.angle = -Math.atan2(this.x2, this.y2);
            var tr = Math.sqrt(Math.pow(this.x2, 2) + Math.pow(this.y2, 2));
            this.r = tr;
            this.r2 = tr*this.ratio;
            this.rect = new Rect(this.x - this.r2, this.y - tr, this.x + this.r2, this.y + tr);
            this.size = Math.max(this.r2, this.r)*2;
        }
    }catch(e){
        console.error(e);
    }
}
Ellipse.prototype.paint = function(ctx){
    try{
        var scale = cad.draw.getScale();
        if(this.size*scale<1){
            return;
        }
        if(!cad.draw.isVisible(this)){
            return;
        }
        util.paintDebugInfo(this);
        ctx.beginPath();
        ctx.strokeStyle = util.calcColor(this);
        ctx.lineWidth = 1/scale;
        ctx.ellipse(this.x, this.y, this.r, this.r2||this.r, 0, -(this.startangle||0), -(this.endangle||Math.PI*2), true);
        if(this.shadow){
            ctx.fillStyle = util.calcColor({parent:this.parent});
            ctx.globalCompositeOperation = 'xor';
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        else{
            ctx.stroke();
        }
    }catch(e){
        console.error(e);
    }
}
Ellipse.prototype.toJSON = function(){
    var obj = {et:this.etype, h:this.handle, x:this.x, y:this.y, r:this.r};
    if(this.r2 && this.r2!=this.r){
        obj.r2 = this.r2;
    }
    if(this.stroke && this.stroke!='#000000' && this.stroke!='#ffffff'){
        obj.c = this.stroke;
    }
    if(this.shadow){
        obj.ht = 1;
    }
    if(this.startangle){
        obj.sa = this.startangle;
    }
    if(this.endangle){
        obj.ea = this.endangle;
    }
    return obj;
}
Ellipse.prototype.fromJSON = function(obj){
    this.etype = obj.et;
    this.handle = obj.h;
    this.x = obj.x;
    this.y = obj.y;
    this.r = obj.r;
    this.r2 = obj.r2||obj.r;
    this.stroke = obj.c;
    this.shadow = obj.ht;
    this.startangle = obj.sa;
    this.endangle = obj.ea;
    this.rect = new Rect(this.x - this.r2, this.y - this.r, this.x + this.r2, this.y + this.r);
    this.size = Math.max(this.r2, this.r)*2;
    return this;
}
Ellipse.prototype.buildSvgText = function(){
    try{
        var buff = '';
        if(this.etype==3) {
            var r = Math.round(util.infosNum(this, 2)*cad.dpi);
            buff+='<circle cx="'+this.x+'" cy="'+this.y+'" r="'+r+'"';
            buff += util.buildDebugInfo(this);
            buff += util.strokeInfo(this);
            buff += '/>';
            this.left = (this.x - r);
            this.top = (this.y - r);
            this.right = (this.x + r);
            this.bottom = (this.y + r);
        }
        else if(this.etype==12) {
            var x2 = Math.round(util.infosNum(this, 2)*cad.dpi);
            var y2 = Math.round(util.infosNum(this, 3)*cad.dpi);
            var ratio = util.infosNum(this, 4);
            var angle = -Math.atan2(x2, y2);
            var tr = Math.sqrt(Math.pow(x2, 2) + Math.pow(y2, 2));
            /*
            if(this.infos.length>5) {
                var arcStart = util.infosNum(this, 5);
                var arcEnd = util.infosNum(this, 6);
            }
            */
            var rx = Math.round(tr*ratio);
            var ry = Math.round(tr);
            this.left = (this.x - rx);
            this.top = (this.y - tr);
            this.right = (this.x + rx);
            this.bottom = (this.y + tr);
            buff+="<ellipse cx=\""+this.x+"\" cy=\""+this.y+"\" rx=\""+rx+"\" ry=\""+ry+"\" transform=\"rotate("+parseInt(angle * 180 / Math.PI)+","+this.x+","+this.y+
                ")\"";
            buff += util.buildDebugInfo(this);
            buff += util.strokeInfo(this);
            buff += '/>';
        }
        return buff;
    }catch(e){
        console.error(e);
    }
}

function Arc(){
}
Arc.prototype.init = function() {
    try{
        this.r = util.infosNum(this, 2);
        this.startangle = util.infosNum(this, 3) % (2 * Math.PI);
        this.endangle = util.infosNum(this, 4) % (2 * Math.PI);
        this.calcRect();
        this.size = this.r*2;
    }catch(e){
        console.error(e);
    }
}
Arc.prototype.paint = function(ctx) {
    try{
        var scale = cad.draw.getScale();
        if(this.size*scale<1){
            return;
        }
        if(!cad.draw.isVisible(this)){
            return;
        }
        util.paintDebugInfo(this);
        ctx.beginPath();
        ctx.strokeStyle = util.calcColor(this);
        ctx.lineWidth = 1/scale;
        //Canvas中画圆弧，右侧点是0，下侧点是PI/2，上侧点是3*PI/2，与自然坐标系相反，故要取负数，逆时针画圆弧
        ctx.ellipse(this.x, this.y, this.r, this.r, 0,-this.startangle,  -this.endangle, true);
        // console.log(this.handle, (-this.startangle*360/Math.PI), (-this.endangle*360/Math.PI))
        // ctx.closePath();
        if(this.shadow){
            ctx.fillStyle = util.calcColor({});
            ctx.globalCompositeOperation = 'xor';
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }
        else{
            ctx.stroke();
        }
    }catch(e){
        console.error(e);
    }
}
Arc.prototype.calcRect = function(){
    var step = Math.PI/32;
    var start = -this.startangle, end = -this.endangle;
    var a = start;
    var p = null, rect = null;
    while(true){
        p = {x:this.x+this.r*Math.cos(a), y:this.y+this.r*Math.sin(a)};
        if(rect){
            rect.resize(p.x, p.y);
        }
        else{
            rect = new Rect(p.x, p.y, p.x, p.y);
        }
        if(a<end){
            a = Math.min(end, a+step);
        }
        else{
            break;
        }
    }
    this.rect = rect;
}
Arc.prototype.toJSON = function(){
    var obj = {et:this.etype, h:this.handle, x:this.x, y:this.y, r:this.r, sa:this.startangle, ea:this.endangle, rect:[this.rect.x1, this.rect.y1, this.rect.x2, this.rect.y2]};
    if(this.r2){
        obj.r2 = this.r2;
    }
    if(this.stroke && this.stroke!='#000000' && this.stroke!='#ffffff'){
        obj.c = this.stroke;
    }
    if(this.shadow){
        obj.ht = 1;
    }
    return obj;
}
Arc.prototype.fromJSON = function(obj){
    this.etype = obj.et;
    this.handle = obj.h;
    this.x = obj.x;
    this.y = obj.y;
    this.r = obj.r;
    this.stroke = obj.c;
    this.startangle = obj.sa;
    this.endangle = obj.ea;
    this.shadow = obj.ht;
    this.rect = obj.rect?new Rect(obj.rect[0], obj.rect[1], obj.rect[2], obj.rect[3]):new Rect(this.x - this.r, this.y - this.r, this.x + this.r, this.y + this.r);
    this.size = this.r*2;
    return this;
}
Arc.prototype.buildSvgText = function() {
    try{
        var r = util.infosNum(this, 2) * cad.dpi;
        this.startangle = parseFloat(util.infosNum(this, 3)) % (2 * Math.PI);
        this.endangle = (util.infosNum(this, 4)) % (2 * Math.PI);
        var x1 = this.x + Math.round(r*Math.cos(this.startangle));
        var y1 = this.y - Math.round(r*Math.sin(this.startangle));
        var x2 = this.x + Math.round(r*Math.cos(this.endangle));
        var y2 = this.y - Math.round(r*Math.sin(this.endangle));
        r = Math.round(r);
        var buff = '';
        buff+="<path d=\"M"+x1+" "+y1+" A"+r+" "+r+" 0 ";
        buff+=this.endangle-this.startangle>Math.PI?1:0;
        buff+=" 0 "+x2+" "+y2+"\"";
        buff += util.buildDebugInfo(this);
        buff += util.strokeInfo(this);
        buff += '/>';
        return buff;
    }catch(e){
        console.error(e);
    }
}

function Block(){
}
Block.prototype.setUse = function(){
    this.use = true;
    for(var i=0;i<this.shapes.length;i++) {
        if(this.shapes[i].setUse){
            this.shapes[i].setUse(true);
        }
    }
}
Block.prototype.init = function(draw){
    try{
        if(this.inited){
            return;
        }
        this.inited = true;
        this.use = true;
        if(this.id){
            return;
        }
        this.id = this.infos[0];
        this.rect = new Rect(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER,Number.MIN_SAFE_INTEGER);
        var hasChild = false;
        for(var i=0;i<this.shapes.length;i++) {
            var shape = this.shapes[i];
            shape.parent = this;
            shape.init(draw);
            if(shape.rect){
                this.rect.resizeRect(shape.rect);
                hasChild = true;
            }
            else{//空元素删除，不再处理
                this.shapes.splice(i, 1);
                i--;
            }
        }
        if(!hasChild){
            this.rect = null;
        }
    }catch(e){
        console.error(e);
    }
};
Block.prototype.paint = function(ctx){
    try{
        for(var i=0;i<this.shapes.length;i++) {
            this.shapes[i].parentUse = this.parentUse;
            this.shapes[i].paint(ctx);
        }
    }catch(e){
        console.error(e);
    }
};
Block.prototype.toJSON = function(){
    if(!this.rect){
        return null;
    }
    var obj = {et:this.etype, id:this.id, ents:[], rect:[this.rect.x1, this.rect.y1, this.rect.x2, this.rect.y2]};
    for(var i=0;i<this.shapes.length;i++) {
        var shape = this.shapes[i];
        if(shape.constructor==Text){
            continue;
        }
        obj.ents.push(shape.toJSON());
    }
    return obj;
}
Block.prototype.fromJSON = function(obj){
    this.etype = obj.et;
    this.x = obj.x;
    this.y = obj.y;
    this.id = obj.id;
    this.rect = new Rect(obj.rect[0], obj.rect[1], obj.rect[2], obj.rect[3]);
    this.size = this.rect.size();
    return this;
}
Block.prototype.buildSvgText = function(){
    try{
        var buff = "<g id=\""+this.infos[0]+"\"";
        buff += util.buildDebugInfo(this);
        buff += '>\n';
        buff += util.buidChildShapes(this);
        buff+="</g>";
        return buff;
    }catch(e){
        console.error(e);
    }
}

function Use(){
}
Use.prototype.init = function(draw){
    try{
        if(this.inited){
            return;
        }
        this.inited = true;
        var blockName = this.blockName = (this.infos[5]||'').replace(/[\{\}]/g, "");
        if(!this.block) {
            this.block = (draw || cad.draw).blockMap[blockName];
        }
        if(!this.block) {
            return "";
        }
        this.block.init(draw);
        this.xscale = util.infosNum(this, 2);
        this.yscale = util.infosNum(this, 3);
        this.angle = -util.infosNum(this, 4);
        this.transform = new Matrix((util.infos(this, 6)||'').split(/[\s\|,]+/));
        if(this.xscale==-1){
            this.angle += Math.PI;
            this.xscale = 1;
        }
        this.angle = this.angle%(Math.PI*2);
        var rect = this.block.rect || new Rect(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER,Number.MIN_SAFE_INTEGER);
        if(rect.x1!=Number.MAX_SAFE_INTEGER){
            var p1 = this.transform.calc(rect.x1, rect.y1);
            var p2 = this.transform.calc(rect.x2, rect.y2);
            rect = new Rect(Math.min(p1.x,p2.x), Math.min(p1.y,p2.y), Math.max(p1.x,p2.x), Math.max(p1.y,p2.y));
        }
        for(var i=0;i<this.shapes.length;i++) {
            this.shapes[i].parent = this;
            this.shapes[i].init();
            if(this.shapes[i].rect){
                rect.resizeRect(this.shapes[i].rect);
            }
        }
        for(var i=0;i<this.block.shapes.length;i++) {
            this.block.shapes[i].parentUse = this;
        }
        // if(this.shapes.length>1){
        //     console.log(this.handle, blockName)
        //     for(var i=0;i<this.shapes.length;i++) {
        //         console.log(this.shapes[i].etype, this.shapes[i].infos)
        //     }
        // }
        if(rect.x1!=Number.MAX_SAFE_INTEGER){
            this.rect = rect;
            this.size = rect.size();
        }
    }catch(e){
        console.error(e);
    }
};
Use.prototype.paint = function(ctx){
    try{
        if(!this.block || !this.rect){
            return;
        }
        var scale = cad.draw.getScale();
        if(this.size*scale<1){
            return;
        }
        if(!cad.draw.isVisible(this)){
            return;
        }
        util.paintDebugInfo(this);
        ctx.save();
        // this.transform.scale = 1;
        var matrix = this.matrix || this.transform.toMatrixParam();
        // if(!this.parent){//矩阵叠加运算
            // ctx.translate(-cad.draw.drawRect.x1, -cad.draw.drawRect.y1);
            // var dx = matrix[4]-cad.draw.drawRect.x1, dy = matrix[5]-cad.draw.drawRect.y1;
            // ctx.translate(-dx*(1-cad.draw.scale), -dy*(1-cad.draw.scale));
        // }
        ctx.transform.apply(ctx, matrix);
        // if(!this.parent){
        //     ctx.scale(cad.draw.scale, cad.draw.scale);
        // }
        // ctx.strokeStyle = util.calcColor(this);
        this.block.parentUse = this;
        this.block.paint(ctx);
        ctx.restore();
        for(var i=0;i<this.shapes.length;i++) {
            this.shapes[i].paint(ctx);
        }
    }catch(e){
        console.error(e);
    }
};
Use.prototype.toJSON = function(){
    if(!this.rect){
        return null;
    }
    var obj = {et:this.etype, h:this.handle, bn:this.blockName, ents:[], mat:this.matrix||this.transform.toMatrixParam(), rect:[this.rect.x1, this.rect.y1, this.rect.x2, this.rect.y2]};
    if(this.stroke && this.stroke!='#000000' && this.stroke!='#ffffff'){
        obj.c = this.stroke;
    }
    for(var i=0;i<this.shapes.length;i++) {
        var shape = this.shapes[i];
        if(shape.constructor==Text){
            continue;
        }
        obj.ents.push(shape.toJSON());
    }
    return obj;
}
Use.prototype.fromJSON = function(obj){
    this.etype = obj.et;
    this.handle = obj.h;
    this.blockName = obj.bn;
    this.stroke = obj.c;
    this.matrix = obj.mat;
    this.rect = new Rect(obj.rect[0], obj.rect[1], obj.rect[2], obj.rect[3]);
    this.size = this.rect.size();
    return this;
}
Use.prototype.buildSvgText = function(){
    try{
        var blockName = (this.infos[5]||'').replace(/[\{\}]/g, "");
        var block = this.blockMap[blockName];
        if(!block) {
            return "";
        }
        block.setUse();
        var xscale = util.infosNum(this, 2);
        var yscale = util.infosNum(this, 3);
        var angle = -util.infosNum(this, 4);
        this.transform = new Matrix((util.infos(this, 6)||'').split(/[\s\|,]+/));
        if(xscale==-1){
            angle += Math.PI;
            xscale = 1;
        }
//    left = parseInt(x+block.left*xscale);
//    right = parseInt(x+block.right*xscale);
//    top = parseInt(y+block.top*yscale);
//    bottom = parseInt(y+block.bottom*yscale);
        this.scale = Math.round(100/Math.min(Math.abs(xscale), Math.abs(yscale)));
        var buff = '<g';
        buff += util.buildDebugInfo(this);
        buff += '>';
        //buff+='<circle class="pos" cx="'+this.x+'" cy="'+this.y+'" r="5" fill="red"/>';
        buff += "<use xlink:href=\"#"+block.infos[0]+"\"";
        if(cad.debug){
            buff += ' handle="'+this.handle+'" et="'+this.etype+'"';
        }
        if(this.transform && this.transform.isChange()){
            buff += ' transform="'+this.transform.toTransform()+'"';
        }
        else{
            buff += ' x="0" y="0" transform="';
            if(angle!=0) {
                buff += "rotate("+Math.round(angle * 180 / Math.PI)+","+this.x+","+this.y+")";
            }
            buff += "translate("+this.x+","+this.y+")";
            if(xscale!=1 || yscale!=1){
                buff += "scale("+(xscale==yscale?xscale:(xscale+", "+yscale))+")";
            }
            buff += '"';
        }
        if(this.scale!=100){
            buff += ' class="scale'+this.scale+'"';
        }
        buff += "/>";
        buff += util.buidChildShapes(this);
        buff += '</g>';
        return buff;
    }catch(e){
        console.error(e);
    }
}

function Text(){
}
Text.prototype.init = function(){
    try{
        if(this.inited){
            return;
        }
        this.inited = true;
        this.textSize = util.infosNum(this, 2)*cad.dpi;
        this.text = util.infos(this, 3)
        if(this.etype==101){
            // this.text = util.infos(this, 4).replace(/[\{\}]/g, "");
            if(this.parent){
                this.text = '';
            }
            else{
                // console.log(this.text+'==='+ util.infos(this, 4))
                if(/^[A-Z]+$/.test(this.text)){
                    this.text=util.infos(this, 4);
                }
                this.textAlign = 'bottomleft';
                this.transform = new Matrix((util.infos(this, 7)||'').split(/[\s\|,]+/));
            }
        }
        if(this.etype==202) {
            this.text = util.infos(this, 4);
            this.angle = -util.infosNum(this, 5);
            this.textAlign = 'bottomleft';
            this.transform = new Matrix((util.infos(this, 7)||'').split(/[\s\|,]+/));
        }
        if(this.text.length==0) {
            return;
        }
        var bounds = '';
        if(this.etype==19) {//0 x, 1 y, 2 fontSize, 3 text, 4 align 
            this.textAlign = util.infos(this, 4).toLowerCase();
            this.textWidth = util.infosNum(this, 6)*cad.dpi;
            // this.textHeight = util.infosNum(this, 7)*cad.dpi;
            this.direction = util.infos(this, 8);
            this.transform = new Matrix((util.infos(this, 10)||'').split(/[\s\|,]+/));
            // bounds = util.infos(this, 11).split(/[^-\.\d]+/g);
        }
        else if(this.etype==25){
            this.angle = -util.infosNum(this, 4);
            this.textAlign = util.infos(this, 6).toLowerCase();
            if(this.textAlign=='center' || this.textAlign=='right'){
                this.textAlign = 'left';
            }
            this.valign = util.infos(this, 7).toLowerCase();
            if(this.valign=='baseline'){
                this.textAlign = 'bottom'+this.textAlign;
            }
            this.transform = new Matrix((util.infos(this, 8)||'').split(/[\s\|,]+/));
            // bounds = util.infos(this, 9).split(/[^-\.\d]+/g);
        }
        if(bounds && bounds.length==5){
            this.textWidth = parseFloat(bounds[3])-parseFloat(bounds[1]);
        }
        if(this.parent && (!this.color || this.color== -1)){
            var th = this;
            while(th.parent){
                th = th.parent;
                if(th.constructor==Use){
                    this.blockName = th.blockName;
                    if(!th.color || th.color== -1){
                        this.stroke = th.stroke;
                    }
                    break;
                }
            }
        }
        this.stroke = util.calcColor(this);
        // if(this.stroke && this.stroke!='#000000'){
        //     this.clsName = ' t'+this.stroke.substr(1);
        //     if(cad.draw){
        //         cad.draw.colorMap['.color .t'+this.stroke.substr(1)] = '{color:'+this.stroke+'}';
        //     }
        // }
        this.text = this.text.replace(/[\{\}]/g, "").replace(/\\P/g, "<br>").replace(/\\.+?;/g, "").replace(/\s{2}/g, "　");
        var lineHei = 1.3;
        this.width = this.getTextWidth(this.text);
        if(this.textWidth && this.text.length>1 && this.text.indexOf('<br>')<0 && this.width>this.textWidth+this.textSize/2){//文本需要处理换行
            this.text = this.dealTextBr();
        }
        if(this.text.indexOf('<br>')>=0){
            //处理换行文本
            var ary = this.text.split('<br>');
            this.width = 0;
            for(var i=0;i<ary.length;i++){
                this.width = Math.max(this.width, this.getTextWidth(ary[i]));
            }
            this.lines = ary.length;
            this.height = this.textSize*lineHei*this.lines;
        }
        else{
            this.height = this.textSize;
        }
        this.charWidth = this.width/this.textSize;
        var halfWidth = Math.round(this.width/2);
        var halfHeight = Math.round(this.height/2);
        if(!this.textAlign) {
            this.textAlign = 'topleft';
        }
        this.vertical = false;
        if(this.direction=='TopToBottom'){
            this.vertical = true;
        }
        if(this.transform){
            this.angle = this.transform.getAngle();
            if(Math.abs((this.angle-Math.PI/2+0.05)%Math.PI)<0.1){
                this.vertical = true;//竖向显示
            }
            if(Math.abs((this.angle+0.05)%Math.PI)<0.1){
                this.vertical = false;//正常状态
            }
            else if(!this.vertical){//以一定角度旋转
                this.angle360 = Math.round(this.angle*180/Math.PI);
            }
        }
        if(this.vertical){
            if(this.textAlign.startsWith("middle")) {
                this.left = this.x-halfHeight;
            }
            else if(!this.textAlign.startsWith("top")){//bottom
                this.left = this.x-this.height;
            }
            else{//top
                this.left = this.x;
            }
            if(this.textAlign.endsWith("center")) {
                this.top = this.y-halfWidth;
            }
            else if(this.textAlign.endsWith("right")) {
                this.top = this.y;
            }
            else{//left
                this.top = this.y-this.width;
            }
            this.bottom = this.top+this.width;
            this.right = this.left+this.height;
        }
        else{
            if(this.textAlign.startsWith("middle")) {
                this.top = this.y-halfHeight;
                this.valign = 1;
            }
            else if(!this.textAlign.startsWith("top")){//bottom
                this.top = this.y-this.height;
                this.valign = 0;
            }
            else{
                this.top = this.y;
                this.valign = 2;
            }
            if(this.textAlign.endsWith("center")) {
                this.left = this.x-halfWidth;
                this.align = 1;
            }
            else if(this.textAlign.endsWith("right")) {
                this.left = this.x-this.width;
                this.align = 2;
            }
            else{//left
                this.left = this.x;
                this.align = 0;
            }
            this.bottom = this.top+this.height;
            this.right = this.left+this.width;
        }
        this.rect = new Rect(this.left, this.top, this.right, this.bottom);
        //if(cad.draw){
            //cad.draw.texts.push(this);
        //}
    }catch(e){
        console.error(e);
    }
};
Text.prototype.paint = function(ctx){
    try{
        var scale = cad.draw.getScale();
        var trans = ctx.getTransform();
        var fontSize = Math.round(this.textSize*scale);
        // console.log(trans.toString(), this.parent)
        // if(this.parent && this.parent.etype!=15){
        //     console.log(this, this.parent)
        // }
        this.calcTransform(ctx);
        if(!this.rect){
            return;
        }
        if(this.size*scale<2){
            return;
        }
        if(!cad.draw.isVisible(this)){
            return;
        }
        var bp = trans.transformPoint(this);
        var p = trans.transformPoint({x:this.rect.x1, y:this.rect.y1});
        var p2 = trans.transformPoint({x:this.rect.x2, y:this.rect.y2});
        util.paintDebugInfo(this);
        if(fontSize<3){//显示为矩形占位符
            ctx.fillStyle = util.calcColor(this);
            ctx.fillRect(this.rect.x1, this.rect.y1, this.rect.width(), this.rect.height());
            return;
        }
        var clsName = cad.debug?(this.curClick?' select':''):this.clsName;
        var wrapBuff = '', buff = '', scaleCss = '', wrapStyle = '', buffStyle = '';
        var width = this.charWidth*fontSize+5;
        var height = (this.lines||1)*fontSize*(this.lines?1.3:1);
        // var width = this.vertical?(p2.y-p.y):(p2.x-p.x);
        // var height = this.vertical?(p2.x-p.x):(p2.y-p.y);
        var offsetx = 0;
        // if(this.textAlign && this.textAlign.endsWith("center")) {
        // }
        // else if(this.textAlign && this.textAlign.endsWith("right")) {
        //     offsetx += width*0.125;
        // }
        // else{//left
        //     offsetx -= width*0.125;
        // }
        if(fontSize<12){
            var fscale = Math.round(100*fontSize/12)/100;
            width = width/fscale;
            height = height/fscale;
            offsetx += -Math.round((1-fscale)*(p2.x-p.x)/(fscale*2));
            if(this.vertical){
                offsetx = -offsetx;
            }
            scaleCss += 'translateX('+offsetx+'px)translateY('+Math.round(-(1-fscale)*(p2.y-p.y)/(fscale*2))+'px)scale('+(fscale*0.75)+', '+(fscale)+')';//this.vertical?'translateX':
            fontSize = 12;
        }
        // else{
        //     scaleCss += 'translateX('+offsetx+'px)scale(0.75,1)';//this.vertical?'translateX':
        // }
        if(this.angle360){
            var wrapWidth = Math.ceil(Math.max(bp.x-p.x, p2.x-bp.x)*2);
            var wrapHeight = Math.ceil(Math.max(bp.y-p.y, p2.y-bp.y)*2);
            var wrapLeft = Math.round(bp.x-wrapWidth/2);
            var wrapTop = Math.round(bp.y-wrapHeight/2);
            wrapStyle = 'left:'+wrapLeft+'px;top:'+wrapTop+'px;width:'+wrapWidth+'px;height:'+wrapHeight+'px;transform:rotate('+this.angle360+'deg) scale(0.75,1);';
            wrapBuff = '<div class="text'+(clsName||'')+'" style="'+wrapStyle+'"></div>';
            buff = '<div';
            buffStyle = 'font-size:'+fontSize+'px;position:relative;left:'+Math.round(p.x-bp.x+wrapWidth/2)+'px;top:'+Math.round(p.y-bp.y+wrapHeight/2+fontSize*0.15)+'px;transform:';
        }
        else{
            buff = '<div class="text'+(clsName||'')+'" ';
            buffStyle = 'font-size:'+fontSize+'px;';
            if(this.vertical){
                buffStyle += 'left:'+Math.round((p.x+p2.x-p2.y+p.y)/2)+'px;top:'+Math.round((p.y+p2.y-p2.x+p.x)/2)+'px;transform:rotate(270deg) scale(0.75,1)';
            }
            else{
                var x = p.x;
                if(!this.textAlign || this.textAlign.endsWith('left')){
                    x = x - (p2.x-p.x)*0.125;
                }
                buffStyle += 'left:'+Math.round(x)+'px;top:'+Math.round(p.y+fontSize*0.15)+'px;transform:';
            }
        }
        buffStyle += scaleCss+';width:'+Math.ceil(width)+'px;height:'+Math.ceil(height)+'px';
        if(this.lines){
            buffStyle += ';line-height:'+Math.ceil(Math.max(12,fontSize)*1.3)+'px';
        }
        else{
            buffStyle += ';line-height:'+Math.ceil(Math.max(12,fontSize))+'px';
        }
        if(cad.textDebug){
            $(ctx.canvas).after('<div class=box style="left:'+Math.round(bp.x)+'px;top:'+Math.round(bp.y)+'px;width:3px;height:3px;"></div>');
            $(ctx.canvas).after('<div class=box style="left:'+Math.round(p.x)+'px;top:'+Math.round(p.y)+'px;width:'+Math.ceil(p2.x-p.x)+'px;height:'+Math.ceil(p2.y-p.y)+'px;"></div>');
            buff += ' textalign="'+this.textAlign+'"';
        }
        if(this.textAlign && this.textAlign.endsWith('center')){
            buffStyle += ';text-align:center;';
        }
        buff += util.buildDebugInfo(this);
        buff += ' style="'+buffStyle+'"';
        buff += '>'+this.text+'</div>';
        var dom = $(buff);
        if(wrapBuff){
            $(wrapBuff).insertAfter(ctx.canvas).append(dom).data('node', this);
        }
        else{
            dom.insertAfter(ctx.canvas).data('node', this);
        }
        if(this.equId && this.equId!='none'){
            dom.addClass('equ');
        }
        if(this.className){
            dom.addClass(this.className);
        }
        dom.data('shape', this);
        this.select && dom.addClass('shape-select');
        this.dom = dom[0];
    }catch(e){
        console.error(e);
    }
};
Text.prototype.calcTransform = function(ctx){
    if(this.mat){
        return;
    }
    if(this.parentUse || !ctx){//avg2hvg方法使用
        if(!this.text || !this.rect){
            return;
        }
        var textAngle = this.transform?this.transform.getAngle():0;
        this.mat = new Matrix(1,0,0,1,0,0);
        var shape = this;
        while(shape.parentUse){
            shape = shape.parentUse;
            this.mat.leftJoin(shape.transform||shape.matrix);
        }
        this.p = this.mat.calc(this.x, this.y);
        this.p1 = this.mat.calc(this.rect.x1, this.rect.y1);
        this.p2 = this.mat.calc(this.rect.x2, this.rect.y2);
        this.x = this.p.x;this.y = this.p.y;
        this.rect = new Rect(Math.min(this.p1.x, this.p2.x), Math.min(this.p1.y, this.p2.y), Math.max(this.p1.x, this.p2.x), Math.max(this.p1.y, this.p2.y));
        this.angle = this.mat.getAngle()+textAngle;
        if(Math.abs((this.angle-Math.PI/2+0.05)%Math.PI)<0.1){
            this.vertical = true;//竖向显示
        }
        if(Math.abs((this.angle+0.05)%Math.PI)<0.1){
            this.vertical = false;//正常状态
        }
        else if(!this.vertical){//以一定角度旋转
            this.angle360 = Math.round(this.angle*180/Math.PI);
        }
    }
    else if(this.parent && this.parent.etype==808){
        var trans = ctx.getTransform();
        var draw = cad.draw;
        ctx.save();
        ctx.resetTransform();
        ctx.translate(draw.drawRect.x1, draw.drawRect.y1);
        ctx.scale(1/draw.scale, 1/draw.scale);
        ctx.transform(trans.a, trans.b, trans.c, trans.d, trans.e, trans.f);
        var mat = ctx.getTransform();
        this.mat = new Matrix();
        this.mat.from6param(mat.a, mat.b, mat.c, mat.d, mat.e, mat.f);
        ctx.restore();
        this.p = this.mat.calc(this.x, this.y);
        this.p1 = this.mat.calc(this.rect.x1, this.rect.y1);
        this.p2 = this.mat.calc(this.rect.x2, this.rect.y2);
    }
    else{
        this.mat = true;
    }
}
Text.prototype.toJSON = function(){
    if(!this.text || !this.rect){
        return null;
    }
    var obj = {et:this.etype, h:this.handle, x:this.x, y:this.y, t:this.text, fs:this.textSize,
        rect:[this.rect.x1, this.rect.y1, this.rect.x2, this.rect.y2]};
    if(this.mat && this.mat.calc){//块元素中的文本，要进行坐标变换
        var scale = this.mat.getScale();
        obj.x = this.p.x;
        obj.y = this.p.y;
        obj.rect = [Math.min(this.p1.x, this.p2.x), Math.min(this.p1.y, this.p2.y), Math.max(this.p1.x, this.p2.x), Math.max(this.p1.y, this.p2.y)];
        obj.fs = obj.fs*scale;
    }
    if(this.blockName){
        obj.bn = this.blockName;
    }
    if(this.vertical){
        obj.v = 1;
    }
    if(this.angle360){
        obj.a = this.angle360;
    }
    if(this.lines){
        obj.ls = this.lines;
    }
    if(this.align && this.valign){
        obj.ta = this.align+','+this.valign;
    }
    if(this.stroke && this.stroke!='#000000' && this.stroke!='#ffffff'){
        obj.c = this.stroke;
    }
    if(this.equId){
        obj.ei = this.equId;
    }
    return obj;
}
Text.aligns = 'left,center,right'.split(',');
Text.valigns = 'top,middle,bottom'.split(',');
Text.prototype.fromJSON = function(obj){
    this.etype = obj.et;
    this.handle = obj.h;
    this.x = obj.x;
    this.y = obj.y;
    this.text = obj.t;
    this.textSize = obj.fs;
    this.vertical = obj.v;
    this.angle360 = obj.a;
    this.lines = obj.ls;
    this.blockName = obj.bn;
    this.equId = obj.ei;
    if(obj.ta){
        var ary = (obj.ta+'').split(',');
        this.textAlign = Text.aligns[ary[0]]+Text.valigns[ary[1]];
    }
    this.stroke = obj.c;
    if(this.stroke && this.stroke!='#000000'){
        this.clsName = ' t'+this.stroke.substr(1);
        cad.draw.colorMap['.color .t'+this.stroke.substr(1)] = '{color:'+this.stroke+'}';
    }
    this.rect = new Rect(obj.rect[0], obj.rect[1], obj.rect[2], obj.rect[3]);
    this.size = this.rect.size();
    this.charWidth = (this.vertical?this.rect.y2-this.rect.y1:this.rect.x2-this.rect.x1)/this.textSize;
    cad.draw.texts.push(this);
    return this;
}
Text.prototype.buildSvgText = function(){
    try{
        this.textSize = Math.round(util.infosNum(this, 2)*cad.dpi);
        var halfTextSize = Math.round(this.textSize/2);
        this.text = util.infos(this, 3).replace(/[\{\}]/g, "");
        if(!this.topShape && this.etype==101){
            // this.text = util.infos(this, 4).replace(/[\{\}]/g, "");
            return '';
        }
        var cls = [];
        if(this.etype==202) {
            this.text = util.infos(this, 4).replace(/[\{\}]/g, "");
            this.transform = new Matrix((util.infos(this, 5)||'').split(/[\s\|,]+/));
            this.angle = -util.infosNum(this, 5);
            this.textAlign = 'bottomleft';
            cls.push('attr');
        }
        if(this.text.length==0) {
            return "";
        }
        if(this.etype==19) {//0 x, 1 y, 2 fontSize, 3 text, 4 align 
            this.textAlign = util.infos(this, 4).toLowerCase();
            this.textWidth = Math.round(util.infosNum(this, 6)*cad.dpi);
            // this.textHeight = Math.round(util.infosNum(this, 7)*cad.dpi);
            this.direction = util.infos(this, 8);
            this.xAxis = (util.infos(this, 9)||'').split(',');
            this.transform = new Matrix((util.infos(this, 10)||'').split(/[\s\|,]+/));
        }
        else if(this.etype==25){
            this.angle = -util.infosNum(this, 4);
            this.textAlign = util.infos(this, 6).toLowerCase();
            if(this.textAlign=='center'){
                this.textAlign = 'left';
            }
            // this.textAlign = this.textAlign.replace(/(center)|(middle)/g,function($1){return $1=='center'?'middle':($1=='middle'?'center':$1)});
            this.valign = util.infos(this, 7).toLowerCase();
            // console.log(this.handle, this.text, this.textAlign, this.valign)
            if(this.valign=='baseline'){
                this.textAlign = 'bottom'+this.textAlign;
            }
            this.transform = new Matrix((util.infos(this, 8)||'').split(/[\s\|,]+/));
        }
        var buff = '';
        this.left = this.right = this.x;
        this.top = this.bottom = this.y;
        this.textHeightOffset = Math.round(this.textSize*0.85);
        this.text = this.dealText();
        var width = this.right-this.left;
        var halfWidth = Math.round(width/2);
        var height = this.bottom-this.top;
        var offsetx = 0;
        var offsety = 0;
        if(this.textAlign) {
            if(this.textAlign.startsWith("middle")) {
                offsety -= halfTextSize;
            }
            else if(!this.textAlign.startsWith("top")){
                offsety -= this.textSize;
            }
            if(this.textAlign.endsWith("center")) {
                offsetx -= halfWidth;
            }
            else if(this.textAlign.endsWith("right")) {
                offsetx -= width;
            }
        }
        this.left += offsetx;
        this.right += offsetx;
        this.top += offsety;
        this.bottom += offsety;
        var centerLeft = Math.round((this.left+this.right)/2);
        var centerTop = Math.round((this.bottom+this.top)/2);
        //console.log(this.text, this.textAlign, this.valign)
        //定位点
        buff += "<text offset=\""+offsetx+","+offsety+"\" align=\""+this.textAlign+"\" font-size=\""+this.textSize + "\"";
        buff += util.buildDebugInfo(this);
        if(this.stroke){
            cls.push('t'+this.stroke.substr(1));
            this.colorMap['.color .t'+this.stroke.substr(1)] = '{fill:'+this.stroke+'}';
        }
        var transform = false, vertical = false;
        if(this.transform && this.transform.isChange()){
            if(this.transform.isVertical()){
                vertical = true;
            }
            else{
                transform = true;
                buff += ' transform="'+this.transform.toTransform();
            }
        }
        if(!transform){
            buff += ' x="'+this.x+'" y="'+(this.y+this.textHeightOffset)+'"';
            buff += ' transform="';
            if(offsetx!=0 || offsety!=0){
                buff += 'translate('+(offsetx)+", "+(offsety)+")";
            }
            var rotate = false;
            this.angle = this.angle%(2*Math.PI);
            var angle = Math.abs(this.angle);
            if(Math.abs(angle-Math.PI)<0.01){
                angle = this.angle = 0;
            }
            if(!isNaN(this.angle) && angle>0.01){
                if(Math.abs(angle-Math.PI/2)<0.1 || Math.abs(angle-3*Math.PI/2)<0.1){
                    vertical = true;
                }
                else{
                    rotate = true;
                    buff += "rotate("+(this.angle*180/Math.PI)+","+this.x+","+this.y+")";
                }
            }
            if(this.direction=='TopToBottom' || (this.xAxis && this.xAxis[1]>0.9)){
                vertical = true;
            }
            if(!rotate && vertical) {//竖向文本
                //利用矩阵变换，让中心点绕x,y逆时针转动270度
                var centerLeft2 = centerTop+this.x-this.y;
                var centerTop2 = -centerLeft+this.x+this.y;
                centerLeft=centerLeft2;
                centerTop=centerTop2;
                //buff += "rotate(270,"+(centerLeft=centerLeft2)+","+(centerTop=centerTop2)+")";
                this.left = centerLeft-height/2;
                this.right = centerLeft+height/2;
                this.top = centerTop-width/2;
                this.bottom = centerTop+width/2;
            }
        }
        buff+='" center="'+centerLeft+','+centerTop+'"';
        if(cls.length>0){
            buff += ' class="'+cls.join(' ')+'"';
        }
        buff+=">";
        buff+=this.text;
        buff+="</text>";
        if(!transform && !rotate && vertical) {//竖向文本
            buff = '<g transform="rotate(270,'+this.x+","+this.y+')">'+buff+'</g>'
        }
        if(cad.textDebug){
            buff += "<circle cx=\""+this.x+"\" cy=\""+this.y+"\" r=\"3\" style=\"fill:red;\"/>";
        }
        return buff;
    }catch(e){
        console.error(e);
    }
}

Text.prototype.dealText = function(paint){
    if(!this.text){
        return '';
    }
    var text = this.text.replace(/\s{2}/g, "　");//半角空格替换为全角空格
    if(text.indexOf("\\")>=0) {
        text = text.replace(/\\.+?;/g, "");
    }
    text = text.replace(/\\{/g, "");
    var lineHei = 1.3;
    if(text.indexOf("\\P")>=0) {
        var ary = text.split("\\P");
        var buff = '';
        for(var i=0;i<ary.length;i++) {
            var str = ary[i];
            this.right = Math.max(this.right, this.left+this.getTextWidth(str));
        }
        var width = this.right - this.left;
        for(i=0;i<ary.length;i++) {
            str = ary[i];
            var x = this.x;
            if(this.textAlign) {
                var textWidth = this.getTextWidth(str);
                if(this.textAlign.endsWith("center")) {
                    x += Math.round((width-textWidth)/2);
                }
                else if(this.textAlign.endsWith("right")) {
                    x += (width-textWidth);
                }
            }
            buff += "<tspan x=\""+x+"\" y=\""+(this.y+this.textHeightOffset+Math.round(i*(this.textSize*lineHei)))+"\">"+str+"</tspan>";
        }
        this.bottom = this.top + (i-1)*(this.textSize+2);
        return buff;
    }
    else {
        this.right = this.left+this.getTextWidth(text);
        this.bottom = Math.round(this.top + this.textSize*lineHei);
        return text;
    }
}
Text.prototype.dealTextBr = function(){
    var text = this.text, res = '';
    var wid = 0, lastPos = 0;
    for(var i=0;i<text.length;i++){
        wid += (text.charCodeAt(i)<256?1:2);
        if((wid)*this.textSize/2>this.textWidth){
            res += text.substring(lastPos, i)+(lastPos+1==text.length?'':'<br>');
            lastPos = i
            wid = 0;
        }
    }
    res += text.substring(lastPos);
    return res;
}

Text.prototype.getTextWidth = function(text) {
    var wid = 0;
    for(var i=0;i<text.length;i++){
        wid += (text.charCodeAt(i)<127?1:2);
    }
    wid = wid*this.textSize/2;
    return wid;
}


function Shadow(){
}
Shadow.prototype.init = function() {
    try{
        this.rect = new Rect(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER,Number.MIN_SAFE_INTEGER);
        var idx = 1;
        for(var i=0;i<this.infos.length;i++){
            var shape = null;
            if(this.infos[i]=="LineEdge"){
                shape = util.buildShape({et:17,handle:0,color:this.color,ents:[],infos:this.infos[i+1]+'$^'+this.infos[i+2]+'$^'+this.infos[i+4]+'$^'+this.infos[i+5]});
                i+=5;
            }
            else if(this.infos[i]=="IsPolyline"){
                var infos = [];
                var len = util.infosNum(this, i+1)*3;
                i++;
                while(infos.length<len && !isNaN(this.infos[++i])){
                    infos.push(this.infos[i]);
                }
                shape = util.buildShape({et:303,handle:0,color:this.color,ents:[],infos:infos.join('$^')});
                i--;
            }
            else if(this.infos[i]=="EllipseEdge"){
                var infos = [];
                for(var j=0;j<7;j++){
                    infos.push(this.infos[i+j+1]);
                }
                shape = util.buildShape({et:12,handle:0,color:this.color,ents:[],infos:infos.join('$^')});
                i+=7;
            }
            else if(this.infos[i]=="ArcEdge"){
                var infos = [];
                for(var j=0;j<5;j++){
                    infos.push(this.infos[i+j+1]);
                }
                shape = util.buildShape({et:31,handle:0,color:this.color,ents:[],infos:infos.join('$^')});
                i+=5;
            }
            if(shape){
                shape.shadow = true;
                shape.handle = this.handle+'-'+(idx++);
                this.shapes.push(shape);
            }
        }
        for(var i=0;i<this.shapes.length;i++) {
            var shape = this.shapes[i];
            shape.parent = this;
            shape.init();
            shape.shadow = true;
            shape.infos = undefined;
            if(shape.rect){
                this.rect.resizeRect(shape.rect);
            }
            else{
                this.shapes.splice(i, 1);
                i--;
            }
        }
        if(this.rect.x1==Number.MAX_SAFE_INTEGER){
            this.rect = null;
        }
        else{
            this.size = this.rect.size();
        }
    }catch(e){
        console.error(e);
    }
}
Shadow.prototype.paint = function(ctx) {
    try{
        util.paintDebugInfo(this);
        for(var i=0;i<this.shapes.length;i++) {
            this.shapes[i].paint(ctx);
        }
    }catch(e){
        console.error(e);
    }
}
Shadow.prototype.toJSON = function(){
    if(!this.rect){
        return null;
    }
    var obj = {et:this.etype, h:this.handle, ents:[], rect:[this.rect.x1, this.rect.y1, this.rect.x2, this.rect.y2]};
    if(this.stroke && this.stroke!='#000000' && this.stroke!='#ffffff'){
        obj.c = this.stroke;
    }
    for(var i=0;i<this.shapes.length;i++) {
        var shape = this.shapes[i];
        if(shape.constructor==Text){
            continue;
        }
        var cobj = shape.toJSON();
        if(cobj){
            obj.ents.push(cobj);
        }
    }
    return obj;
}
Shadow.prototype.fromJSON = function(obj){
    this.etype = obj.et;
    this.handle = obj.h;
    this.stroke = obj.c;
    this.rect = new Rect(obj.rect[0], obj.rect[1], obj.rect[2], obj.rect[3]);
    this.size = this.rect.size();
    for(var i=0;this.ents && i<this.ents.length;i++) {
        var shape = util.buildEmptyShape(this.ents[i]).fromJSON(this.ents[i]);
        this.shapes.push(shape);
    }
    return this;
}
Shadow.prototype.buildSvgText = function() {
    try{
        var buff = '<g class="shadow"';
        buff += util.buildDebugInfo(this);
        buff += '>\n';
        for(var i=0;i<this.infos.length;i++){
            var shape = null;
            if(this.infos[i]=="LineEdge"){
                shape = util.buildShape({et:17,handle:0,color:-1,ents:[],infos:this.infos[i+1]+'$^'+this.infos[i+2]+'$^'+this.infos[i+4]+'$^'+this.infos[i+5]});
                i+=5;
            }
            else if(this.infos[i]=="IsPolyline"){
                var infos = [];
                i++;
                while(!isNaN(this.infos[++i])){
                    infos.push(this.infos[i]);
                }
                // shape = util.buildShape({et:303,handle:0,color:-1,ents:[],infos:infos.join('$^')});
                i--;
            }
            else if(this.infos[i]=="EllipseEdge"){
                var infos = [];
                for(var j=0;j<7;j++){
                    infos.push(this.infos[i+j+1]);
                }
                shape = util.buildShape({et:12,handle:0,color:-1,ents:[],infos:infos.join('$^')});
                i+=7;
            }
            else if(this.infos[i]=="ArcEdge" || this.infos[i]=='CoArcEdge'){
                var infos = [];
                for(var j=0;j<5;j++){
                    infos.push(this.infos[i+j+1]);
                }
                shape = util.buildShape({et:31,handle:0,color:-1,ents:[],infos:infos.join('$^')});
                i+=5;
            }
            if(shape){
                shape.shadow = true;
                this.shapes.push(shape);
            }
        }
        buff += util.buidChildShapes(this);
        buff+="</g>";
        return buff;
    }catch(e){
        console.error(e);
    }
};


function Matrix(ary){
    if(arguments.length==6){
        ary = [].slice.call(arguments);
    }
    if(ary.length==6){
        var ary2 = [].concat(ary);
        //ary2[5] = -ary2[5];
        this.from6param(ary2);
    }
    else{
        this.mat = [];
        var idx = 0
        for(var i=0;ary && i<ary.length;i++){//要做镜像反转，第二行数据要 X-1
            if(ary[i]==''){
                continue;
            }
            var row = Math.floor(idx/4), col = idx%4;
            (this.mat[row]=this.mat[row]||[])[col] = parseFloat(ary[i])//*(row==1?-1:1);
            idx++;
        }
        this.mat[0][1] = -this.val(0, 1);
        this.mat[1][0] = -this.val(1, 0);
        this.mat[1][3] = -this.val(1, 3);
    }
    this.x = this.val(0, 3);
    this.y = this.val(1, 3);
}
Matrix.prototype.toString = function(){
    var buff = '{\n';
    for(var i=0;i<this.mat.length;i++){
        for(var j=0;j<this.mat[i].length;j++){
            buff += this.mat[i][j]+',\t';
        }
        buff += '\n';
    }
    buff += '}';
    return buff;
}
Matrix.prototype.isChange = function(){
    return Math.abs(this.val(0, 0)-1)>0.01 || Math.abs(this.val(0, 1))>0.01 || 
        Math.abs(this.val(1, 0))>0.01 || Math.abs(this.val(1, 1)-1)>0.01;
}
Matrix.prototype.isVertical = function(){
    return Math.abs(this.val(0, 0))+Math.abs(this.val(1,1))<0.1 && Math.abs(this.val(0,1)+this.val(1,0))<0.1;
}
Matrix.prototype.toTransform = function(){
    return 'matrix('+this.val(0,0)+','+this.val(1,0)+','+this.val(0,1)+','+this.val(1,1)+','+this.val(0,3)+','+this.val(1,3)+')';
}
Matrix.prototype.toMatrixParam = function(){
    return [this.val(0,0), this.val(1,0), this.val(0,1), this.val(1,1), this.val(0,3), this.val(1,3)];
}
Matrix.prototype.calc = function(left, top){
    var x = this.val(0,0)*left+this.val(0,1)*top+this.val(0,3);
    var y = this.val(1,0)*left+this.val(1,1)*top+this.val(1,3);
    return {x:x, y:y};
}
Matrix.prototype.leftJoin = function(mat){
    if(mat.constructor==Array){
        var mat2 = new Matrix();
        mat2.from6param.apply(mat2, mat);
        mat = mat2;
    }
    var res = [[mat.val(0,0)*this.val(0,0)+mat.val(0,1)*this.val(1,0), 
                mat.val(0,0)*this.val(0,1)+mat.val(0,1)*this.val(1,1), 0, 
                mat.val(0,0)*this.val(0,3)+mat.val(0,1)*this.val(1,3)+mat.val(0,3)], 
               [mat.val(1,0)*this.val(0,0)+mat.val(1,1)*this.val(1,0), 
                mat.val(1,0)*this.val(0,1)+mat.val(1,1)*this.val(1,1), 0, 
                mat.val(1,0)*this.val(0,3)+mat.val(1,1)*this.val(1,3)+mat.val(1,3)], [0, 0, 1, 0], [0, 0, 0, 1]];
    this.mat = res;
}
Matrix.prototype.val = function(i, j){
    return (this.mat[i] && this.mat[i][j])||0;
}
Matrix.prototype.getScale = function(){
    var p1=this.calc(0, 0);
    var p2=this.calc(1, 0);
    var scale = Math.sqrt(Math.pow(p2.x-p1.x, 2)+Math.pow(p2.y-p1.y, 2));
    return scale;
}
Matrix.prototype.getAngle = function(){
    var p1=this.calc(0, 0);
    var p2=this.calc(1, 0);
    var y = p2.y-p1.y, x = p2.x-p1.x;
    var angle = Math.atan(y/x);
    if(x<0){
        angle += Math.PI;
    }
    if(angle<0){
        angle += Math.PI*2;
    }
    return angle;
}
Matrix.prototype.from6param = function(a, b, c, d, e, f){
    if(a && a.constructor==Array && a.length==6){
        b = a[1];c = a[2];d = a[3];e = a[4];f = a[5];
        a = a[0];
    }
    this.mat = [[a, c, 0, e], [b, d, 0, f], [0, 0, 1, 0], [0, 0, 0, 1]];
    return this;
}
/*
resetTransform
transform
scale
translate
rotate
save
restore
*/

function log(info){
    if(cad.showLog){
        console.log(new Date(), info);
    }
}



if(window.module){
    module.exports = cad;
}
else{
    window.draw = cad;
}
