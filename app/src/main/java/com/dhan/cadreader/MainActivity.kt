package com.dhan.cadreader

import android.app.Activity
import android.app.ProgressDialog
import android.os.Build
import android.os.Bundle
import android.os.Environment
import androidx.annotation.RequiresApi
import androidx.core.app.ActivityCompat
import com.alibaba.fastjson.JSON
import com.alibaba.fastjson.TypeReference
import com.dhan.cadreader.bean.Shape
import com.dhan.cadreader.core.CADUtils
import com.dhan.cadreader.core.CadView
import com.dhan.cadreader.util.AppExecutors
import com.dhan.cadreader.util.CheckPermissionUtils
import java.io.File
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Paths
import java.util.ArrayList


class MainActivity : Activity() {
    var context = this@MainActivity

    @RequiresApi(Build.VERSION_CODES.O)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.main_activity)
        initPermission()
        init()
    }

    private fun initPermission() {
        //检查权限
        val permissions: Array<String> = CheckPermissionUtils.checkPermission(this, 1)
        if (permissions.size == 0) {

        } else {
            //申请权限
            ActivityCompat.requestPermissions(this, permissions, 100)
        }
    }

    lateinit var cadview: CadView
    private fun init() {
        // var jx = findViewById<Button>(R.id.jx)
        cadview = findViewById<CadView>(R.id.cadview)
        /* jx.setOnClickListener {

         }*/
        initDialog()
        jx()
    }

    lateinit var waitingDialog: ProgressDialog
    private fun initDialog() {
        waitingDialog = ProgressDialog(this@MainActivity)
        waitingDialog.setTitle("正在渲染")
        waitingDialog.setMessage("请等待...")
        waitingDialog.isIndeterminate = true
        waitingDialog.setCancelable(false)

    }

    //var srcfile = Environment.getExternalStorageDirectory().absolutePath + "/cablemonitor/data/HYZ/test.avg"
    //var srcfile = Environment.getExternalStorageDirectory().absolutePath + "/cablemonitor/data/HYZ/辉煌演示中心.avg"
     var srcfile = Environment.getExternalStorageDirectory().absolutePath + "/cablemonitor/data/HYZ/南关双线轨道电路及电缆径路图.avg"
    var cacheFile = Environment.getExternalStorageDirectory().absolutePath + "/cablemonitor/data/NGZ/南关双线轨道电路及电缆径路图.avg"
    var shapes: ArrayList<Shape>? = null
    fun jx() {
        waitingDialog.show()

        AppExecutors.getInstance().diskIO().execute {
            shapes = CADUtils().processCadFile(context, srcfile, cacheFile)
            AppExecutors.getInstance().mainThread().execute {
                doNext()
            }
        }
        //LinearLayout groupView = findViewById(R.id.groupView);
    }

    private fun doNext() {
        cadview.setData(shapes)
        cadview.initData()
        cadview.invalidate()
        waitingDialog.dismiss()
    }

    @RequiresApi(Build.VERSION_CODES.O)
    fun jx1() {
        var time1 = System.currentTimeMillis()
        //val stxt = File(srcfile).inputStream().reader()
        val file = File(srcfile)
        val lines = Files.readAllLines(Paths.get(srcfile), StandardCharsets.UTF_8)
        val content = lines.joinToString("") { it }
        var time2 = System.currentTimeMillis()
        println("读取耗时：" + (time2 - time1))
        val list: List<Shape> = JSON.parseObject(content, object : TypeReference<List<Shape>>() {})
        /*var array = JSONArray.parseArray(string)
        var list = ArrayList<avfindo>()
        for (i in array) {
            val avfindo = JSONObject.parseObject(i.toString(), avfindo::class.java)
            list.add(avfindo)
        }*/
        var time3 = System.currentTimeMillis()
        println("fastjson解析耗时：" + (time3 - time2))
    }

}

