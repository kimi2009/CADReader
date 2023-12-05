package com.dhan.cadreader.core

import android.content.Context
import android.util.Log
import com.dhan.cadreader.bean.Shape
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.io.BufferedInputStream
import java.io.DataInputStream
import java.io.File
import java.lang.Double.max
import java.lang.Double.min

/**
 *
 * @ProjectName:    CADReader
 * @Package:        com.dhan.cadreader.core
 * @ClassName:      CADUtils
 * @Description:    CAD数据转换核心类
 * @Author:         D.Han
 * @CreateDate:     2023/11/9 15:01
 * @UpdateUser:
 * @UpdateDate:     2023/11/9 15:01
 * @UpdateRemark:
 * @Version:        1.0
 */

class CADUtils1 {
    var TAG = "CADUtils输出："
    var combins = HashMap<String, Shape>() //组合对象列表
    var shapes = ArrayList<Shape>() //元素对象列表
    var textStore: HashMap<Char, Pair<Int, FloatArray>> = HashMap<Char, Pair<Int, FloatArray>>()//CAD文字字库
    fun processCadFile(context: Context, srcfile: String, destcafile: String): ArrayList<Shape> {
        /* val destFile = File(destcafile)
         if (destFile.exists())
             destFile.delete()*/
        initTextStore(context)//初始化字库数据
        val stxt = File(srcfile).inputStream().reader()
        val AvgEntityList = Gson().fromJson<ArrayList<Shape>>(stxt, object : TypeToken<ArrayList<Shape>>() {}.type)//解析avg文件中的对象列表

        AvgEntityList.forEach {//先把组合元素遍历出来
            if (it.et == 808) {
                var shape = buildShape( it)
                combins.put(it.infos, shape)
            }
        }
        /*   AvgEntityList.forEach {//第二次遍历808，解决块中块引用覆盖的问题
               if (it.et == 808) {
                   var shape = buildShape(0.0, 0.0, 1.0, 1.0, it)
                   combins.put(it.infos, shape)//map覆盖更新
               }
           }*/
        AvgEntityList.forEach {//整合存储普通元素
            if (it.et != 808) {
                var shape = buildShape( it)
                if (shape != null) {
                    shapes.add(shape)
                }
            }
        }
        return shapes
    }

    /* private fun getTextStore1(): HashMap<Char, Pair<Int, FloatArray>> {
         return textStore;
     }*/

    private fun initTextStore(context: Context) {
        val istream = context.assets.open("hztxt.dat")
        val dsi = DataInputStream(BufferedInputStream(istream))
        while (dsi.available() > 0) {
            val ccode = dsi.readChar()
            var tcwidth = dsi.readInt()
            if (tcwidth == 0) tcwidth = 30
            val fsize = dsi.readInt()
            val fpts = FloatArray(fsize)
            for (i in 0 until fsize) fpts[i] = dsi.readFloat()
            textStore?.put(ccode, Pair(tcwidth, fpts))
        }
        dsi.close()
    }

    val cdpi = 1

    val deltl = 5.0   //触摸点到线的最小选定范围值
    private fun buildShape( shapeOrigin: Shape): Shape {
        lateinit var shape: Shape
        shape = Shape()
        shape.handle = shapeOrigin.handle
        shape.et = shapeOrigin.et
        shape.color = shapeOrigin.color
        shape.infos = shapeOrigin.infos

        shape.infoList = shapeOrigin.infos.trim().split(" ")
        /*if (shape.infos.size < 2) {
            return null//infos描述太短不符合有效元素规律，舍弃
        }*/
        if (shape.infoList.size > 2) {

            shape.x = shape.infoList[0].toDouble() * cdpi  //基准位置（3:圆心,12:椭圆中心点,15:组合,17:起始点,18:折线,19:,25:,30:,31:圆心）
            shape.y =  shape.infoList[1].toDouble() * cdpi

        }
        when (shapeOrigin.et) {
            3 -> {//圆
                shape.radius = shape.infoList[2].toDouble() * cdpi  //半径,(半径的放缩倍数以X轴放缩倍数为准，此处认为：对于圆形的x 、y放缩倍数是一致的)
                shape.disrect[0] = shape.x - shape.radius
                shape.disrect[1] = shape.y - shape.radius
                shape.disrect[2] = shape.x + shape.radius
                shape.disrect[3] = shape.y + shape.radius
            }

            12 -> {//椭圆  （通过给定的值，计算出包围椭圆的矩形的坐标）
                shape.MajorAxisEndPointX = shape.infoList[2].toDouble() * cdpi
                shape.MajorAxisEndPointY = shape.infoList[3].toDouble() * cdpi
                shape.MinorToMajorRatio = shape.infoList[4].toDouble()
                //lr  长轴的一半
                val lr = Math.sqrt((shape.MajorAxisEndPointX) * (shape.MajorAxisEndPointX) + (shape.MajorAxisEndPointY) * (shape.MajorAxisEndPointY)) //根据勾股定理计算长轴一半的长度
                shape.blk_angle = Math.atan2(shape.MajorAxisEndPointY, shape.MajorAxisEndPointX)//计算旋转的角度
                //sr 短轴的一半
                val sr = shape.MinorToMajorRatio * lr

                shape.disrect[0] = shape.x - lr
                shape.disrect[1] = shape.y - sr
                shape.disrect[2] = shape.x + lr
                shape.disrect[3] = shape.y + sr
            }

            15 -> {//组合插入点
                Log.e(TAG, ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
                Log.e(TAG, "插入组合:handle${shape.handle}")
                shape.blk_xscale = shape.infoList[2].toDouble()
                shape.blk_yscale = shape.infoList[3].toDouble()
                shape.blk_angle = -shape.infoList[4].toDouble()
                shape.blk_name = shape.infoList[5].replace("--mblankm--", " ")

                shapeOrigin.ents.forEach {
                    shape.ents.add(buildShape( it))
                }


            }

            17 -> {//线

                shape.endX = shape.infoList[2].toDouble() * cdpi
                shape.endY =  shape.infoList[3].toDouble() * cdpi

                shape.line_point = FloatArray(4)
                shape.line_point[0] = shape.x.toFloat() * cdpi
                shape.line_point[1] = shape.y.toFloat() * cdpi
                shape.line_point[2] = shape.endX.toFloat() * cdpi
                shape.line_point[3] = shape.endY.toFloat() * cdpi

                shape.disrect[0] = min(shape.x, shape.endX) - deltl
                shape.disrect[1] = min(shape.y, shape.endY) - deltl
                shape.disrect[2] = max(shape.x, shape.endX) + deltl
                shape.disrect[3] = max(shape.y, shape.endY) + deltl


            }

            18 -> {//折线（多线段）
                shape.linepoints_cad = ArrayList<Double>()
                //初始化边界范围
                shape.disrect[0] = shape.x
                shape.disrect[2] = shape.x
                shape.disrect[1] = shape.y
                shape.disrect[3] = shape.y
                //遍历折线的点的坐标集合并实时计算范围

                //计算放缩后的值
                shape.infoList.forEachIndexed { index, s ->
                        if (index % 2 == 0) {
                            val tv = s.toDouble() * cdpi
                            shape.linepoints_cad.add(tv)
                            shape.disrect[0] = min(tv, shape.disrect[0])
                            shape.disrect[2] = max(tv, shape.disrect[2])
                        } else {
                            val tv = s.toDouble() * cdpi
                            shape.linepoints_cad.add(tv)
                            shape.disrect[1] = min(tv, shape.disrect[1])
                            shape.disrect[3] = max(tv, shape.disrect[3])
                        }
                }




                //需要将cad的连续点数组，转换成android canvas的点线段数组.将cad中[x,y,x1,y1,x2,y2]转换为[x,y,x1,y1,x1,y1,x2,y2]这种格式
                shape.polyline_array = FloatArray((shape.linepoints_cad.size / 2 - 1) * 4) { index ->
                    var gid = index / 4
                    shape.linepoints_cad[gid * 2 + (index % 4)].toFloat()
                }
                //框选范围
                shape.disrect[0] -= deltl
                shape.disrect[1] -= deltl
                shape.disrect[2] += deltl
                shape.disrect[3] += deltl

            }

            19 -> {//多功能文字
                shape.text_height = shape.infoList[2].toDouble() * cdpi * 1.5            //文本高度
                shape.textinfo = shape.infoList[3]
                shape.textinfo = shape.textinfo.replace("--mblankm--", " ")
                //shape.textinfo = shape.textinfo.replace("\\P", "\\r\\n")
                if (shape.textinfo.contains("\\") && shape.textinfo.contains(";")) {
                    val c = appearNumber(shape.textinfo, "\\")
                    for (i in 1..c) {
                        if (shape.textinfo.contains("\\") && shape.textinfo.contains(";")) {
                            val p: String = shape.textinfo.substring(shape.textinfo.indexOf("\\"), shape.textinfo.indexOf(";") + 1)
                            shape.textinfo = shape.textinfo.replace(p, "")
                            shape.textinfo = shape.textinfo.replace("{", "")
                            shape.textinfo = shape.textinfo.replace("}", "")
                        }
                    }
                }
                shape.mtext_attachpoint = shape.infoList[4].tomint()
                shape.attr_widthfator = shape.infoList[5].toDouble()

                shape.disrect[0] = shape.x
                shape.disrect[1] = shape.y
                shape.disrect[2] = shape.x + shape.textinfo.length * shape.text_height * shape.attr_widthfator
                shape.disrect[3] = shape.y + shape.text_height

            }

            25 -> {//单行文字
                // "infos": "-52.9310087018321$^-2327.85486110708$^240.910593737934$^11111$^0$^0.8$^Left$^Baseline$^|1, 0, 0, -52.9310087018321|\n|0, 1, 0, 2327.85486110708|\n|0, 0, 1, 0|\n|0, 0, 0, 1|\n$^Min: 0, 0, max: 835.956473632243, 241.896575927734",
                shape.text_height = shape.infoList[2].toDouble() * cdpi * 1.5    //对于TEXT需要乘以标准字体的默认高度
                shape.textinfo = shape.infoList[3]
                shape.textinfo = shape.textinfo.replace("--mblankm--", " ")//替换字符串中的空格

                shape.blk_angle = -shape.infoList[4].toDouble()
                shape.attr_widthfator = shape.infoList[5].toDouble()
                shape.text_halign = shape.infoList[6].tomint()
                shape.text_valign = shape.infoList[7].tomint()
                // shape.x-= shape.attr_widthfator/2   //向左调整一个字符的宽度
                //文字显示范围
                shape.disrect[0] = shape.x
                shape.disrect[1] = shape.y - shape.text_height
                shape.disrect[2] = shape.x + measureText(shape.textinfo) * (shape.text_height / 30f) * shape.attr_widthfator//计算文字宽度
                shape.disrect[3] = shape.y
            }

            30 -> {//

            }

            31 -> {//圆弧弧线
                shape.arc_radius = shape.infoList[2].toDouble() * cdpi
                var a = shape.infoList[3].toDouble() % (2 * Math.PI)
                var b = shape.infoList[4].toDouble() % (2 * Math.PI)
                shape.arc_startangle = (360 - a * 180 / Math.PI)  //将cad中描述角度的起始点转换为android起始点（3点钟坐标），并将弧度角转角度角
                shape.arc_endangle = -((360 - (a - b) * 180 / Math.PI) % 360)
                //Log.e("hasss",shape.handle.toString()+"/${shape.arc_radius}/${shape.infoList[3]}/${shape.infoList[4]}")
                shape.disrect[0] = shape.x - shape.arc_radius
                shape.disrect[1] = shape.y - shape.arc_radius
                shape.disrect[2] = shape.x + shape.arc_radius
                shape.disrect[3] = shape.y + shape.arc_radius

            }

            101, 202 -> {//属性(组合中的文字)
                if (shapeOrigin.et == 202) {
                    shape.x = shape.infoList[0].toDouble() * cdpi
                    shape.y = shape.infoList[1].toDouble() * cdpi
                }

                shape.text_height = shape.infoList[2].toDouble() * cdpi * 1.0    //文本高度
                shape.attr_name = shape.infoList[3].replace("--mblankm--", " ")
                shape.attr_val = shape.infoList[4].replace("--mblankm--", " ")
                shape.blk_angle = -shape.infoList[5].toDouble()
                shape.attr_widthfator = shape.infoList[6].toDouble()


                shape.disrect[0] = shape.x
                shape.disrect[1] = shape.y - shape.text_height
                shape.disrect[2] = shape.x + measureText(shape.attr_name) * (shape.text_height / 30f) * shape.attr_widthfator//计算文字宽度
                shape.disrect[3] = shape.y
            }

            808 -> {//组合的模板
                Log.e(TAG, "-----------------------------------------")
                shapeOrigin.ents.forEach {
                    var sha = buildShape(it)
                    shape.ents.add(sha)
                    Log.e(TAG, "父类型:${shape.et},info:${shape.infos} ;正在添加==" + sha.toString() + ";ent长度:${shape.ents.size}")
                    shape.disrect[0] = min(sha.disrect[0], shape.disrect[0])
                    shape.disrect[1] = min(sha.disrect[1], shape.disrect[1])
                    shape.disrect[2] = max(sha.disrect[2], shape.disrect[2])
                    shape.disrect[3] = max(sha.disrect[3], shape.disrect[3])
                }
            }
        }
        return shape
    }

    /**
     * public int indexOf(int ch, int fromIndex)
     * 返回在此字符串中第一次出现指定字符处的索引，从指定的索引开始搜索
     *
     * @param srcText
     * @param findText
     * @return
     */
    fun appearNumber(srcText: String, findText: String): Int {
        var count = 0
        var index = 0
        while (srcText.indexOf(findText, index).also { index = it } != -1) {
            index = index + findText.length
            count++
        }
        return count
    }

    fun measureText(tinfo: String): Int {
        var tw = 0
        tinfo.forEach {
            if (textStore.containsKey(it)) tw += textStore[it]!!.first
            else tw += 32
        }
        return tw
    }

    fun String.tomint(): Int {
        when (this) {
            "Left" -> return 1
            "Middle" -> return 2
            "TopLeft" -> return 3
            "Baseline" -> return 4
        }
        return -1
    }
}