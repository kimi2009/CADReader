package com.dhan.cadreader.core;


import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.text.TextPaint;
import android.util.AttributeSet;
import android.util.Log;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.dhan.cadreader.bean.Shape;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;

import kotlin.Pair;

/**
 * @ProjectName: CADReader
 * @Package: com.dhan.cadreader.core
 * @ClassName: CadView
 * @Description:
 * @Author: D.Han
 * @CreateDate: 2023/11/10 16:55
 * @UpdateUser:
 * @UpdateDate: 2023/11/10 16:55
 * @UpdateRemark:
 * @Version: 1.0
 */
public class CadView extends View implements ScaleGestureDetector.OnScaleGestureListener {
    private static final String TAG = CadView.class.getSimpleName();
    private Context context;
    float SCALE_MAX;//最大放大倍数
    float SCALE_MIN;//最小缩小倍数
    private ScaleGestureDetector mScaleGestureDetector = null;

    public CadView(Context context) {
        super(context);
    }

    public CadView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        this.context = context;
        init();//准备工作
        mScaleGestureDetector = new ScaleGestureDetector(context, this);
    }

    public CadView(Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);

    }

    ArrayList<Shape> shapes;

    public void setData(ArrayList<Shape> shapes) {
        this.shapes = shapes;
    }

    private Paint magicPaint;
    private TextPaint textPaint;

    private void init() {
        magicPaint = new Paint();
        magicPaint.setAntiAlias(true);//去锯齿
        magicPaint.setStrokeWidth(1);
        magicPaint.setStyle(Paint.Style.STROKE);
        magicPaint.setColor(Color.parseColor("#FFFFFFFF"));
        textPaint = new TextPaint();
        textPaint.setAntiAlias(true);//去锯齿
        textPaint.setStrokeWidth(0.5f);
        textPaint.setStyle(Paint.Style.STROKE);
        textPaint.setColor(Color.parseColor("#FFFFFFFF"));
        //magicPaint.setTextSize(1);
        initData();
    }

    float maxx;
    float maxy;

    public void initData() {
        if (shapes == null || !(shapes.size() > 0)) {
            return;
        }
        ArrayList xList = new ArrayList<Float>();
        ArrayList yList = new ArrayList<Float>();
        initBoundary(shapes, xList, yList);

        maxx = (float) Collections.max(xList);
        maxy = -(float) Collections.min(yList);//此处由于cad左下角为(0,0),而安卓的原点在左上角，寻找Y的最大值，需要取负

        initScaleValue();
    }

    //递归计算所有图元的坐标值 用于计算边界
    private void initBoundary(ArrayList<Shape> shapeLists, ArrayList<Float> xList, ArrayList<Float> yList) {
        for (Shape shape : shapeLists) {
            xList.add((float) (shape.disrect[0].floatValue()));
            yList.add((float) (shape.disrect[1].floatValue()));
            xList.add((float) (shape.disrect[2].floatValue()));
            yList.add((float) (shape.disrect[3].floatValue()));
        }
    }

    //onMeasure()→onSizeChanged()→onLayout()→onMeasure()→onLayout()→onDraw()


    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);

    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
    }

    private Canvas canvas;

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        this.canvas = canvas;
        drawCadView(canvas, shapes);
    }


    float scalpercent = 0.8f;
    float initScale;
    private int width; //  测量宽度 屏幕的宽度
    private int height; // 测量高度 屏幕的高度
    private float viewLastScal;//View的叠加放缩量

    private void initScaleValue() {
        //采用竖屏模式，宽高互换
        width = getMeasuredWidth();
        height = getMeasuredHeight();

        float scalX = width / maxx;
        float scalY = height / maxy;
        initScale = scalX > scalY ? scalY : scalX;
        SCALE_MIN = initScale;
        SCALE_MAX = initScale * 500; //最大放大50倍
        viewLastScal = initScale;//初始化叠加放缩量

        if (initScale <= 1) {//图像过大，则进行缩小，图像过小，使用0.8倍初始放大量
            scale(initScale, shapes);
        } else {
            scale(initScale * scalpercent, shapes);
        }
        //计算图形向下移动的最优距离
        ArrayList yList = new ArrayList<Float>();
        initBoundaryByscalEnd(shapes, yList);
        float cadViewHeight = -(float) Collections.min(yList);
        float moveY = height / 2 + cadViewHeight / 2; //使图形尽量居中
        //图像放缩到一屏后，整体将图形向下移动到安卓屏幕原点，也就是将图形从第一象限移动到第四象限
        moveView(moveY, shapes);

        viewWidth = width;//首次初始化，view的宽高设置为屏幕的宽高
        viewHeight = height;
    }

    private void initBoundaryByscalEnd(ArrayList<Shape> shapeLists, ArrayList<Float> yList) {
        for (Shape shape : shapeLists) {
            yList.add((float) (shape.disrect[1].floatValue()));
            yList.add((float) (shape.disrect[3].floatValue()));
        }
    }

    private void moveView(float moveHeight, ArrayList<Shape> shapeLists) {
        if (shapeLists == null) {
            return;
        }
        for (Shape shape : shapeLists) {
            shape.y += moveHeight;
            shape.disrect[1] += moveHeight;
            shape.disrect[3] += moveHeight;
            switch (shape.et) {
                case 3://圆只需要调整圆心
                    break;
                case 12://椭圆
                    break;
                case 15://插入点
                    moveView(moveHeight, shape.ents);
                    break;
                case 17:
                    shape.endY += moveHeight;
                    shape.line_point[1] += moveHeight;
                    shape.line_point[3] += moveHeight;
                    break;
                case 18:
                    for (int i = 0; i < shape.polyline_array.length; i++) {
                        if (i % 2 != 0) {
                            shape.polyline_array[i] += moveHeight;
                        }
                    }
                    break;
                case 19://多行文字
                    break;
                case 25://单行文字
                    //无需再处理
                    break;
                case 31://圆弧只需要调整圆心
                    break;
                case 101:
                case 202://组合

                    break;
                case 808://组合
                   /* for (int i = 0; i < shape.ents.size(); i++) {
                        shape.ents.get(i)
                    }*/
                    moveView(moveHeight, shape.ents);
                    break;

            }
        }
    }

    //将图形放缩到屏幕内 递归计算所有图元的坐标值 以及旋转角度
    private void scale(float scal, ArrayList<Shape> shapeLists) {
        if (shapeLists == null) {
            return;
        }
        for (Shape shape : shapeLists) {
            shape.x = shape.x * scal;
            shape.y = shape.y * scal;
            for (int i = 0; i < shape.disrect.length; i++) {
                shape.disrect[i] = shape.disrect[i] * scal;
            }
            switch (shape.et) {
                case 3://圆

                    shape.radius = shape.radius * scal;
                    break;
                case 12://椭圆
                    //椭圆是根据包围的矩形画的，故无需进行特别处理

                    break;
                case 15:
                    scale(scal, shape.ents);
                    break;
                case 17://直线
                    shape.endX = shape.endX * scal;
                    shape.endY = shape.endY * scal;
                    //Log.e(TAG, "******************元素：" + shape.etype);
                    //Log.e(TAG, "shape.x：" + shape.x + ",shape.y：" + shape.y);
                    //Log.e(TAG, "shape.endX:" + shape.endX + ",shape.endY:" + shape.endY);
                    //Log.e(TAG, "******************");
                    for (int i = 0; i < shape.line_point.length; i++) {
                        shape.line_point[i] = shape.line_point[i] * scal;
                    }
                    break;
                case 18://折线
                    for (int i = 0; i < shape.polyline_array.length; i++) {
                        shape.polyline_array[i] = shape.polyline_array[i] * scal;
                    }

                    break;
                case 19://多行文字
                case 25://单行文字
                    // shape.text_height = shape.text_height * scal;
                    shape.attr_widthfator = shape.attr_widthfator * scal;


                    break;
                case 31:
                    shape.arc_radius = shape.arc_radius * scal;
                    break;
                case 101:
                case 202://属性文字

                    break;
                case 808:
                    scale(scal, shape.ents);
                    break;
            }
        }
    }

    double needshow = 2.0;
    float textfactor = 0.5f;

    private void drawCadView(Canvas canvas, ArrayList<Shape> shapeLists) {
        if (shapeLists == null || !(shapeLists.size() > 0)) {
            return;
        }
        for (Shape shape : shapeLists) {
            canvas.save();
            if (shape.disrect[0] + getLeft() >= width || shape.disrect[1] + getTop() >= height || shape.disrect[2] + getLeft() <= 0 || shape.disrect[3] + getTop() <= 0) {
                //Log.e(TAG, "元素隐藏了，省略绘制，提高渲染效率");
                canvas.restore();
                continue;
            }
            if (shape.color != 0) {
                magicPaint.setColor(shape.color);
                textPaint.setColor(shape.color);
            } else {
                magicPaint.setColor(Color.WHITE);
                textPaint.setColor(Color.WHITE);
            }
            switch (shape.et) {
                case 3:
                    magicPaint.setStyle(Paint.Style.STROKE);
                    canvas.drawCircle(new Double(shape.x).floatValue(), new Double(shape.y).floatValue(), new Double(shape.radius).floatValue(), magicPaint);
                    break;
                case 12://椭圆
                    canvas.rotate((float) (shape.blk_angle * 180 / Math.PI));
                    RectF rec = new RectF(shape.disrect[0].floatValue(), shape.disrect[1].floatValue(), shape.disrect[2].floatValue(), shape.disrect[3].floatValue());
                    canvas.drawOval(rec, magicPaint);
                    break;
                case 15://插入点
                    drawCadView(canvas, shape.ents);
                    break;
                case 17:
                    canvas.drawLines(shape.line_point, magicPaint);
                    break;
                case 18:
                    canvas.drawLines(shape.polyline_array, magicPaint);
                    break;
                case 19://多行文字
                    textPaint.setTextAlign(Paint.Align.LEFT);
                    textPaint.setStyle(Paint.Style.FILL_AND_STROKE);
                    textPaint.setTextSize((float) shape.text_height * viewLastScal * textfactor);
                    if (shape.text_height < needshow) return;
                    canvas.translate((float) shape.x, (float) shape.y);
                    // if (shape.mtext_attachpoint == 1) {
                    canvas.translate((float) shape.attr_widthfator, (float) shape.text_height * viewLastScal * textfactor);
                    // }

                    canvas.drawText(shape.textinfo, 0, 0, textPaint);
                    break;
                case 25://单行文字
                    if (shape.text_height < needshow) return;//如果太小，则忽略不显示
                    textPaint.setTextAlign(Paint.Align.LEFT);
                    textPaint.setStyle(Paint.Style.FILL_AND_STROKE);
                    textPaint.setTextSize((float) shape.text_height * viewLastScal * textfactor);

                    //canvas.translate((float) shape.x, (float) shape.y);
                    if (shape.blk_angle != 0) {

                        float angle = (float) (shape.blk_angle * 180 / Math.PI);
                        canvas.translate((float) shape.x, (float) shape.y);
                        canvas.rotate(angle);
                        canvas.drawText(shape.textinfo, 0, 0, textPaint);

                    } else {
                        canvas.drawText(shape.textinfo, (float) shape.x, (float) shape.y, textPaint);
                    }
                    break;
                case 31:
                    RectF oval = new RectF(shape.disrect[0].floatValue(), shape.disrect[1].floatValue(), shape.disrect[2].floatValue(), shape.disrect[3].floatValue());
                    canvas.drawArc(oval, (float) shape.arc_startangle, (float) shape.arc_endangle, false, magicPaint);
                    //Log.e(TAG, shape.handle+"/"+shape.disrect[0].floatValue()+"/"+shape.disrect[1].floatValue()+"/"+shape.disrect[2].floatValue()+"/"+shape.disrect[3].floatValue()+"/"+shape.arc_startangle+"/"+shape.arc_endangle);
                    break;
                case 101:
                case 202:
                    if (shape.text_height < needshow) return;//如果太小，则忽略不显示
                    textPaint.setTextAlign(Paint.Align.LEFT);
                    textPaint.setStyle(Paint.Style.FILL_AND_STROKE);
                    textPaint.setTextSize((float) shape.text_height * viewLastScal * textfactor);

                    //canvas.translate((float) shape.x, (float) shape.y);
                    String test = (shape.et == 101 ? shape.attr_name : shape.attr_val);
                    if (shape.blk_angle != 0) {
                        float angle = (float) (shape.blk_angle * 180 / Math.PI);
                        canvas.translate((float) shape.x, (float) shape.y);
                        canvas.rotate(angle);
                        canvas.drawText(test, 0, 0, textPaint);
                    } else {
                        canvas.drawText(test, (float) shape.x, (float) shape.y, textPaint);
                    }
                    break;

                case 808:
                  /* if (shape.father_xscale != 1) {
                        shape.father_xscale *= viewLastScal;
                    }
                    if (shape.father_yscale != 1) {
                        shape.father_yscale *= viewLastScal;
                    }
                    //canvas.translate();
                    if (shape.father_xscale != 1 || shape.father_yscale != 1) {
                        canvas.scale((float) shape.father_xscale, (float) shape.father_yscale);
                    }*/

                    // Log.e(TAG, "放缩："+shape.father_xscale+"/"+shape.father_yscale);
                    // magicPaint.setStrokeWidth((float)(1/shape.father_xscale));
                    drawCadView(canvas, shape.ents);
                    break;
            }
            //重置画笔..
            // magicPaint.setColor(Color.RED);
            //canvas.drawRect(shape.disrect[0].floatValue(), shape.disrect[1].floatValue(), shape.disrect[2].floatValue(), shape.disrect[3].floatValue(), magicPaint);
            canvas.restore();
        }
    }

    CADUtils cadUtils = new CADUtils();
    float percharwidth = 30f;
    HashMap<Character, Pair<Integer, float[]>> hztxt = cadUtils.getTextStore();

    private void hztxtdraw(Canvas canvas, String textinfo, Float x, Float y, Paint mpaint) {
        canvas.translate(x, y);

        canvas.scale(mpaint.getTextSize() / 30f, mpaint.getTextSize() / 30f);
        canvas.translate(0f, -38f);
        for (int i = 0; i < textinfo.length(); i++) {
            if (hztxt.containsKey(textinfo.charAt(i))) {
                canvas.drawLines(hztxt.get(textinfo.charAt(i)).getSecond(), mpaint);
                if (hztxt.get(textinfo.charAt(i)).getFirst() == 0) {
                    canvas.translate(percharwidth, 0f);
                } else {
                    canvas.translate(hztxt.get(textinfo.charAt(i)).getFirst(), 0f);
                }
            } else {
                canvas.drawRect(3f, 3f, 27f, 27f, mpaint);
                canvas.translate(percharwidth, 0f);
            }
        }
    }

    /**
     * 手势放缩
     *
     * @param scaleGestureDetector
     * @return
     */
    @Override
    public boolean onScale(@NonNull ScaleGestureDetector scaleGestureDetector) {
        float scaleFactor = scaleGestureDetector.getScaleFactor();
        //Log.e(TAG, "scaleFactor：" + scaleFactor);
       /* if (scaleFactor > 0.99 && scaleFactor < 1.03) {
            return true;
        }*/
        //当一次放缩范围过大或过小（超限），则将此次放缩比例置位1，也就是放弃该次放缩手势
        if (viewLastScal * scaleFactor > SCALE_MAX) {//超限，太大了
            //viewLastScal = SCALE_MAX;
            scaleFactor = 1;
            //Toast.makeText(context, "您已放大到最大级别", Toast.LENGTH_SHORT).show();
            //return true;
        } else if (viewLastScal * scaleFactor < SCALE_MIN) {//太小了
            //viewLastScal = SCALE_MIN;
            scaleFactor = 1;
            //Toast.makeText(context, "您已缩小到原始大小", Toast.LENGTH_SHORT).show();
            //return true;
        }
        viewLastScal = viewLastScal * scaleFactor;
        //Log.e(TAG, "-----------------------");
        //Log.e(TAG, "viewLastScal:" + viewLastScal);
        //计算放缩后的图元数据和图元点击区域
        doScaleValue(scaleFactor);
        viewWidth = width * (viewLastScal / initScale);
        viewHeight = height * (viewLastScal / initScale);
        //Log.e(TAG, "viewWidth:" + viewWidth + ",viewHeight:" + viewHeight);
        //在放大的过程中，跟随手指的中心位置，同步计算移动的方向和距离
        //左端距中心位置的x值的放缩量，即是水平方向需要挪动的量，判断边界即可
        //Log.e(TAG, "getLeft：" + getLeft());
        float dx = pivotX * (scaleFactor - 1);//dx>0即放大，需要向左移动dx来保证中心点不变，dx<0即缩小，需要向右移动dx来保证中心点不变
        float dy = pivotY * (scaleFactor - 1);//dy>0即放大，需要向上移动dy来保证中心点不变，dy<0即缩小，需要向下移动dy来保证中心点不变
        // Log.e(TAG, "pivotX：" + pivotX + ",pivotY：" + pivotY);
        int l, r, t, b;
        l = (int) (getLeft() - dx);
        r = (int) (l + viewWidth);
        t = (int) (getTop() - dy);
        b = (int) (t + viewHeight);
        Log.e(TAG, "l-：" + l + ";t-:" + t + ";r-:" + r + ";b-:" + b);
        // 如果你的需求是可以划出边界 此时你要计算可以划出边界的偏移量
        // 最大不能超过自身宽度或者是高度
        if (dx > 0) {//往左滑动
            if (r < width) {
                r = width;
                l = (int) (width - viewWidth);
            }
        } else {
            if (l > 0) {
                l = 0;
                r = (int) viewWidth;
            }
        }
        if (dy > 0) {
            if (b < height) {
                b = height;
                t = (int) (height - viewHeight);
            }
        } else {
            if (t > 0) {
                t = 0;
                b = (int) viewHeight;
            }
        }
        //Log.e(TAG, "放缩：" + "l：" + l + ";t:" + t + ";r:" + r + ";b:" + b);
        //Log.e(TAG, "==============================");
        this.layout(l, t, r, b); // 重置view在layout 中位置
        invalidate();
        return true;
    }

    private void doScaleValue(float scaleFactor) {
        long time0 = System.currentTimeMillis();
        //放缩
        scale(scaleFactor, shapes);
        long time1 = System.currentTimeMillis();
        //Log.e(TAG, "scale耗时：" + (time1 - time0));
        //计算图元的点击区域 和组合的旋转角度
        //doClickZone(shapes);
        long time2 = System.currentTimeMillis();
        //Log.e(TAG, "计算点击区间耗时：" + (time2 - time1));
    }

    private float downX; //点击时的x坐标
    private float downY;  // 点击时的y坐标
    private long currentMS, currentMS1, currentMS2;
    private float pivotX, pivotY;
    private float viewWidth; //  View放缩后的宽度
    private float viewHeight; // View放缩后的高度

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        // 拿到触摸点的个数
        final int pointerCount = event.getPointerCount();
        float x = 0, y = 0;
        float dx = 0;
        float dy = 0;
        if (pointerCount == 1) {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN://单击
                    //Log.e(TAG, "ACTION_DOWN==");
                    downX = event.getRawX(); // 点击触屏时的x坐标 用于离开屏幕时的x坐标作计算
                    downY = event.getRawY(); // 点击触屏时的y坐标 用于离开屏幕时的y坐标作计算
                    //Log.e(TAG, "ACTION_DOWN==" + downX + ";" + downY);
                    currentMS = System.currentTimeMillis();//long currentMS     获取系统时间
                    break;
                case MotionEvent.ACTION_MOVE://拖动
                    currentMS2 = System.currentTimeMillis();
                    if (currentMS2 - currentMS1 < 200) {
                        return true;//解决放缩两指未同时离开屏幕的抖动
                    }
                    //Log.e(TAG, "ACTION_MOVE");
                    dx = event.getRawX() - downX;//event.getRawX()为屏幕坐标，0<event.getRawX()<1920
                    dy = event.getRawY() - downY;
                    // Log.e(TAG, "dx：" + dx + ";dy:" + dy);
                    int l, r, t, b; // 上下左右四点移动后的偏移量
                    //计算偏移量 设置偏移量 = 20 时 为判断点击事件和滑动事件的峰值
                    if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
                        // 偏移量的绝对值大于 3 为 滑动时间 并根据偏移量计算四点移动后的位置
                        l = (int) (getLeft() + dx);
                        r = (int) (l + viewWidth);
                        t = (int) (getTop() + dy);
                        b = (int) (t + viewHeight);
                        //Log.e(TAG, "l-：" + l + ";t-:" + t + ";r-:" + r + ";b-:" + b);
                        // 如果你的需求是可以划出边界 此时你要计算可以划出边界的偏移量
                        // 最大不能超过自身宽度或者是高度
                        if (dx < 0) {//往左滑动
                            if (r < width) {
                                r = width;
                                l = (int) (width - viewWidth);
                            }
                        } else {
                            if (l > 0) {
                                l = 0;
                                r = (int) viewWidth;
                            }
                        }
                        if (dy < 0) {
                            if (b < height) {
                                b = height;
                                t = (int) (height - viewHeight);
                            }
                        } else {
                            if (t > 0) {
                                t = 0;
                                b = (int) viewHeight;
                            }
                        }
                        //Log.e(TAG, "l：" + l + ";t:" + t + ";r:" + r + ";b:" + b);
                        downX = event.getRawX();
                        downY = event.getRawY();
                        this.layout(l, t, r, b); // 重置view在layout 中位置
                        //Log.e(TAG, "滑动事件");
                    }
                    invalidate();
                    break;
                case MotionEvent.ACTION_UP:
                    long moveTime = System.currentTimeMillis() - currentMS;//移动时间
                    //判断是否继续传递信号
                    if (moveTime < 200 && (Math.abs(dx) < 20 || Math.abs(dy) < 20)) {
                        //Log.e(TAG, "单击事件：x:" + event.getX() + ";Y:" + event.getY());


                        return true;
                    }
                    break;
                case MotionEvent.ACTION_CANCEL:
                    break;
            }
        } else if (pointerCount > 1) {//放缩
            // 得到多个触摸点的x与y均值
            for (int i = 0; i < pointerCount; i++) {
                x += event.getX(i);
                y += event.getY(i);
            }
            x = x / pointerCount;
            y = y / pointerCount;//中心点
            //Log.e(TAG, "中心点：x：" + x + ";y:" + y);
            //根据中心点移动view
            pivotX = x;
            pivotY = y;
            currentMS1 = System.currentTimeMillis();
            mScaleGestureDetector.onTouchEvent(event);
        }
        return true;
    }

    @Override
    public boolean onScaleBegin(@NonNull ScaleGestureDetector scaleGestureDetector) {
        return true;
    }

    @Override
    public void onScaleEnd(@NonNull ScaleGestureDetector scaleGestureDetector) {

    }

}
