package com.dhan.cadreader.bean;

import androidx.annotation.NonNull;

import java.util.ArrayList;
import java.util.List;

/**
 * @ProjectName: CADReader
 * @Package: com.dhan.cadreader.core
 * @ClassName: CadView
 * @Description:元素实体基类，所有类型元素的属性均集合在此实体对象中
 * @Author: D.Han
 * @CreateDate: 2023/11/10 16:55
 * @UpdateUser:
 * @UpdateDate: 2023/11/10 16:55
 * @UpdateRemark:
 * @Version: 1.0
 */
public class Shape {
    public int et;  //
    public String infos;
    public long handle;
    public int color;
    public ArrayList<Shape> ents = new ArrayList<Shape>();

    public Shape() {
    }

    public Shape(long hd, int et, String inf, int c, ArrayList<Shape> avgs) {
        handle = hd;
        this.et = et;
        infos = inf;
        color = c;

        if (avgs != null) {
            ents = new ArrayList<Shape>();
            for (Shape av : avgs) {
                ents.add(new Shape(av.handle, av.et, av.infos, av.color, av.ents));
            }
        }
    }

    public List<String> infoList;//info中截取的源数据集合
    public double x;  //核心点元素坐标X点
    public double y; //元素坐标Y点
    public double blk_angle;//旋转角度
    public double attr_widthfator;
    public Double[] disrect = {0d, 0d, 0d, 0d};//元素范围(框选元素的矩形范围)
    /**
     * 3 圆
     */
    public double radius;//半径
    /**
     * 12 椭圆
     */
    public double MajorAxisEndPointX;//长轴终点坐标X
    public double MajorAxisEndPointY;//长轴终点坐标Y
    public double MinorToMajorRatio;//短轴与长轴的比例
    /**
     * 15 组合插入点
     */
    public double blk_xscale;//组合X方向放缩比例
    public double blk_yscale;//组合Y方向放缩比例
    public String blk_name;//索引组合模板的名称
    /**
     * 17 直线
     */
    public double endX;  //线段结束坐标X点
    public double endY; //线段结束坐标Y点
    public float[] line_point;//直线的起始结束点的坐标数组
    /**
     * 18 折线
     */
    public ArrayList<Double> linepoints_cad;
    public float[] polyline_array;
    /**
     * 19 文字（多行）
     */

    public int mtext_attachpoint;
    /**
     * 25文字
     */
    public double text_height;//文字高度
    public String textinfo;//文字內容
    public int text_halign;//Left、Middle、TopLeft、
    public int text_valign;//Baseline
    /**
     * 31 圆弧
     */
    public double arc_radius;
    public double arc_startangle;
    public double arc_endangle;
    /**
     * 101、202 属性
     */
    public String attr_name;
    public String attr_val;

    /**
     * 808 放缩
     */
    public double father_xbase ;
    public double father_ybase;

    @NonNull
    @Override
    public String toString() {
        return "handle:" + handle + ";infos:" + infos + ";类型:" + et + ";X坐标:" + x + ";Y坐标:" + y;
    }
}
