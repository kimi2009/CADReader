/*
 * Copyright (C) 2020 河南辉煌科技股份有限公司
 * All rights reserved 
 *
 * 文件摘要：将CAD格式文件转换为JASON文件
 *
 * 当前版本： 1.0
 * 编写日期： 2020-05-12
 * 设    计： 
 * 编    写： 王泽旭
 * 
 **/
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.IO;

using WW.Cad.IO;
using WW.Cad.Model;
using WW.Cad.Model.Entities;
using WW.Cad.Model.Tables;

namespace DM_CAD2JSON_TOOL
{
    public class ConvertToJson
    {
        #region var
        
        private System.Collections.Generic.List<info> ents = new List<info>();
        private System.Collections.Hashtable blks = new System.Collections.Hashtable();
        private HashSet<String> etypes = new HashSet<string>();

        private HashSet<DxfTextStyle> tstyles = new HashSet<DxfTextStyle>();
        private String[] fontwidths = { "Times New Roman.ttf", "0.9", "SimSun.ttf", "0.8", "romans.ttf", "1.05", "arial.ttf", "0.8", "hztxt.shx", "1.0", "gbcbig.shx", "0.7" };


        #endregion
        public ConvertToJson()
        {
        }

        //CAD 文件转换为 JASON文件
        //返回字符串为JASON文件名 如果为空则不成功
        public string ConvertCAD(string CADFileName)
        {
            String destfn = Path.GetDirectoryName(CADFileName) + "\\" +
                Path.GetFileNameWithoutExtension(CADFileName) + ".avg";

            if (File.Exists(destfn))
            {
                File.Delete(destfn);
            }

            DxfModel model = null;
            try
            {
                string extension = Path.GetExtension(CADFileName);
                if (string.Compare(extension, ".dwg", true) == 0)
                {
                    model = DwgReader.Read(CADFileName);
                }
                else
                {
                    model = DxfReader.Read(CADFileName);
                }

                getinfos(model);
            }
            catch (Exception e)
            {
                Console.Error.WriteLine("Error occurred: " + e.Message);
                return "";
            }


            //File.AppendAllText(destfn, "[");

            //int index = 0;
            //foreach (info Oneinfo in ents)
            //{
            //    if(Oneinfo == null)
            //    {
            //        continue;
            //    }

            //    if (index > 0)
            //    {
            //        File.AppendAllText(destfn, ",");
            //    }

            //    try
            //    {
            //        string Jsonstr = Newtonsoft.Json.JsonConvert.SerializeObject(Oneinfo);
            //        File.AppendAllText(destfn, Jsonstr);//添加至文件
            //    }
            //    catch (Exception e)
            //    {
            //        Console.Error.WriteLine("Error occurred: " + e.Message);
            //        return "";
            //    }

            //    //WriteToJSON(Oneinfo,destfn);

            //    index++;
            //}
            //File.AppendAllText(destfn, "]");

            File.AppendAllText(destfn, Newtonsoft.Json.JsonConvert.SerializeObject(ents));

            if (File.Exists(destfn))
            {
                return destfn;
            }

            return "";
        }


        private void WriteToJSON(info Oneinfo, string fileName)
        {
            if (!File.Exists(fileName))
            {
                return;
            }

            File.AppendAllText(fileName, "{");
            string Jsonstr = Newtonsoft.Json.JsonConvert.SerializeObject(Oneinfo.et);
            File.AppendAllText(fileName, Jsonstr);//添加至文件
            File.AppendAllText(fileName, ",");
            Jsonstr = Newtonsoft.Json.JsonConvert.SerializeObject(Oneinfo.infos);
            File.AppendAllText(fileName, Jsonstr);//添加至文件
            File.AppendAllText(fileName, ",");


            File.AppendAllText(fileName, "\"ents\":[");//添加至文件


            int index = 0;
            foreach (info childinfo in Oneinfo.ents)
            {
                if (childinfo == null)
                {
                    continue;
                }
                if (index > 0)
                {
                    File.AppendAllText(fileName, ",");
                }
                WriteToJSON(childinfo, fileName);
                index++;
            }

            File.AppendAllText(fileName, "],");


            Jsonstr = Newtonsoft.Json.JsonConvert.SerializeObject(Oneinfo.handle);
            File.AppendAllText(fileName, Jsonstr);//添加至文件
            File.AppendAllText(fileName, ",");


            Jsonstr = Newtonsoft.Json.JsonConvert.SerializeObject(Oneinfo.color);
            File.AppendAllText(fileName, Jsonstr);//添加至文件
            File.AppendAllText(fileName, ",");

            File.AppendAllText(fileName, "}");
        }



        private void getinfos(DxfModel md)
        {
            ents.Clear();
            blks.Clear();
            foreach (var blk in md.AnonymousBlocks)
            {
                if (blk.Entities.Count == 0) continue;  //没有ents的blk是没有显示意义的，不要了。
                if (blk.Name.Contains("_Space")) continue;
                if (blk.Name.Contains("_SPACE")) continue;

                List<info> tents = new List<info>();
                foreach (var tent in blk.Entities)
                {
                    info ti = getentinfo(tent, blk);
                    if (ti.infos.Length > 0) tents.Add(ti);
                }
                blks.Add(blk.Name, tents);
            }

            //foreach (var b in md.Blocks) {
            //    Console.WriteLine(b);
            //}
            //System.Collections.Hashtable ents = new System.Collections.Hashtable();
            foreach (var blk in md.Blocks)
            {
                if (blk.Entities.Count == 0) continue;  //没有ents的blk是没有显示意义的，不要了。
                if (blk.Name.Contains("*")) continue;
                if (blk.Name.Equals("监理1  竣工图标"))
                {
                    Console.WriteLine(blk.Name);
                }

                //getentinfo(blk.Entities);
                List<info> tents = new List<info>();
                foreach (var tent in blk.Entities)
                {
                    info ti = getentinfo(tent, blk);
                    if (ti.infos.Length > 0) tents.Add(ti);
                }
                //特殊处理块的名称属性
                //bool fname = false;
                //foreach (var tent in blk.Entities)
                //{
                //    if(tent.EntityType == Dx)
                //}
                blks.Add(blk.Name, tents);
            }



            foreach (System.Collections.DictionaryEntry tb in blks)
            {
                info cinfo = new info();
                cinfo.et = 808;
                cinfo.infos = tonoblankstr(tb.Key as String);
                cinfo.ents = tb.Value as List<info>;
                if (cinfo.infos.Length > 0) ents.Add(cinfo);
            }

            //为防止entrys引用尚未初始化的blk，所以需要将blks的输出放到前面
            foreach (var ent in md.Entities)
            {
                info cinfo = getentinfo(ent);
                //cinfo.type = ent.EntityType;
                //cinfo.infos = getentinfo(ent);
                if (cinfo.infos.Length > 0) ents.Add(cinfo);
            }
        }

        private int getcolorinfo(DxfEntity ent)
        {
            WW.Cad.Model.DxfIndexedColorSet cs = WW.Cad.Model.DxfIndexedColorSet.AcadBlackBackgroundIndexedColors;
            //cs = DxfIndexedColorSet.AcadWhiteBackgroundIndexedColors;
            if (ent.DxfColor != null)
            {
                //return String.Format("{0}", ent.DxfColor.Color.ToArgb(WW.Cad.Model.DxfIndexedColorSet.AcadWhiteBackgroundIndexedColors));
                return ent.DxfColor.Color.ToArgb(cs);
            }
            else
            {
                //WW.Cad.Model.Color scolor = Colors.ByLayer;
                //if (ent.Color.ColorType == ColorType.ByLayer)
                //    scolor = ent.Layer.Color;

                //if(scolor == null)
                //    return String.Format("{0}", ent.Color.ToArgb(WW.Cad.Model.DxfIndexedColorSet.AcadWhiteBackgroundIndexedColors));
                //else return String.Format("{0}", scolor.ToArgb(WW.Cad.Model.DxfIndexedColorSet.AcadWhiteBackgroundIndexedColors));
                if (ent.Color.ColorType == ColorType.ByLayer)
                    return ent.Layer.Color.ToArgb(cs);
                else if (ent.Color.ColorType == ColorType.ByBlock)
                    return ent.Layer.Color.ToArgb(cs);
                else return ent.Color.ToArgb(cs);

            }
            //return "";
        }
        private string getLineInfo(DxfEntity ent)
        {
            if (ent.LineType != null)
            {
                DxfLineType lt = ent.LineType;
                short lw = ent.LineWeight;
                string ltName = ent.LineType.Name.ToLower();
                if (ltName=="bylayer" || ltName=="byblock")
                {
                    lt = ent.Layer.LineType;
                }
                if (lw < 0 && lw>-3)
                {
                    lw = ent.Layer.LineWeight;
                }
                if (lw < 0)
                {
                    lw = 1;
                }
                if (ent.EntityType == "LINE")
                {
                    lw = 1;
                }
                string res = "" + lw;
                if (lt.Elements.Count > 0)
                {
                    foreach (var ele in lt.Elements)
                    {
                        res += "," + ele.Length;
                    }
                }
                return res;
            }
            return "";
        }
        private info getentinfo(DxfEntity ent, Object po = null)
        {
            info cinfo = new info();
            cinfo.et = 0;
            cinfo.infos = "";
            cinfo.handle = ent.Handle;
            if (!ent.Visible) return cinfo;
            cinfo.color = getcolorinfo(ent);
            cinfo.line = getLineInfo(ent);
            //float swbfont = 1f;
            //Object v;
            int index = 0;
            if (ent.Handle == 720)
            {
                index = 0;
            }
            if (ent.Handle == 8941)
            {
                Console.WriteLine(1);
            }
            switch (ent.EntityType)
            {
                case "CIRCLE":
                    var c = (ent as DxfCircle);
                    cinfo.et = 3;
                    cinfo.infos = String.Format("{0}$^{1}$^{2}", c.Center.X, -c.Center.Y, c.Radius);
                    break;
                case "ELLIPSE":
                    //sprintf(infobuf, "%f %f %f %f %f", v->basePoint.x, -v->basePoint.y, v->secPoint.x, -v->secPoint.y, v->ratio);
                    var e = ent as DxfEllipse;
                    cinfo.infos = String.Format("{0}$^{1}$^{2}$^{3}$^{4}$^{5}$^{6}", e.Center.X, -e.Center.Y, e.MajorAxisEndPoint.X, -e.MajorAxisEndPoint.Y, e.MinorToMajorRatio, e.StartParameter, e.EndParameter);//DxfEllipse.ParameterToAngle(e.StartParameter, e.MinorToMajorRatio), DxfEllipse.ParameterToAngle(e.EndParameter, e.MinorToMajorRatio));
                    cinfo.et = 12;
                    break;
                case "INSERT":
                    //sprintf(infobuf, "%f %f %f %f %f %s", v->basePoint.x, -v->basePoint.y, v->xscale, v->yscale, v->angle, tonoblankstr(v->name).c_str());
                    var i = ent as DxfInsert;
                    //if (i.Block.Name.Contains("*")) break;

                    cinfo.et = 15;                                                      /*i.InsertionPoint.X*/
                    cinfo.infos = String.Format("{0}$^{1}$^{2}$^{3}$^{4}$^{5}$^{6}", i.BasicBlockInsertionTransformation.M03, -i.BasicBlockInsertionTransformation.M13, i.ScaleFactor.X, i.ScaleFactor.Y, i.Rotation, tonoblankstr(i.Block.Name), i.BasicBlockInsertionTransformation.ToString());
                    if (i.Attributes.Count > 0)
                    {
                        cinfo.ents = new List<info>();
                        foreach (var at in i.Attributes)
                        {
                            info ti = getentinfo(at);
                            if (ti.infos.Length > 0)
                                cinfo.ents.Add(ti);
                        }
                    }
                    //foreach(var at in i.Attributes)
                    //{
                    //    //Console.WriteLine(at);
                    //    cinfo.infos += String.Format(" {0} {1}", tonoblankstr(at.BasicTagString), tonoblankstr(at.Text));
                    //}
                    break;
                case "LINE":
                    //sprintf(infobuf, "%f %f %f %f", v->basePoint.x, -v->basePoint.y, v->secPoint.x, -v->secPoint.y);
                    var l = ent as DxfLine;
                    cinfo.et = 17;
                    cinfo.infos = String.Format("{0}$^{1}$^{2}$^{3}", l.Start.X, -l.Start.Y, l.End.X, -l.End.Y);
                    break;
                case "POLYLINE":
                    if (ent is DxfPolyline2D)
                    {
                        var pl = ent as DxfPolyline2D;
                        cinfo.et = 18;

                        index = 0;
                        foreach (var tp in pl.Vertices)
                        {
                            if (index > 0)
                            {
                                cinfo.infos += "$^";
                            }
                            cinfo.infos += String.Format("{0}$^{1}", tp.X, -tp.Y);
                            index++;
                        }
                    }
                    else if (ent is DxfPolyline2DSpline)
                    {
                        var spl = ent as DxfPolyline2DSpline;
                        cinfo.et = 18;
                        index = 0;
                        foreach (var tp in spl.ControlPoints)
                        {
                            if (index > 0)
                            {
                                cinfo.infos += "$^";
                            }
                            cinfo.infos += String.Format("{0}$^{1}", tp.X, -tp.Y);
                            index++;
                        }
                    }
                    break;
                case "LWPOLYLINE":
                    var p = ent as DxfLwPolyline;
                    cinfo.et = 18;
                    index = 0;
                    foreach (var tp in p.Vertices)
                    {
                        if (index > 0)
                        {
                            cinfo.infos += "$^";
                        }
                        cinfo.infos += String.Format("{0}$^{1}", tp.X, -tp.Y);
                        index++;
                    }
                    if (p.Closed)   //闭合需要补个结束点
                    {
                        if (index > 0)
                        {
                            cinfo.infos += "$^";
                        }
                        cinfo.infos += String.Format("{0}$^{1}", p.Vertices[0].X, -p.Vertices[0].Y);
                        index++;
                    }
                    break;
                case "SPLINE":
                    var pll = ent as DxfSpline;
                    cinfo.et = 18;
                    index = 0;
                    foreach (var tp in pll.ControlPoints)
                    {
                        if (index > 0)
                        {
                            cinfo.infos += "$^";
                        }
                        cinfo.infos += String.Format("{0}$^{1}", tp.X, -tp.Y);
                        index++;
                    }
                    foreach (var tp in pll.FitPoints)
                    {
                        if (index > 0)
                        {
                            cinfo.infos += "$^";
                        }
                        cinfo.infos += String.Format("{0}$^{1}", tp.X, -tp.Y);
                        index++;
                    }
                    break;
                case "SOLID":
                    var so = ent as DxfSolid;
                    cinfo.et = 18;
                    index = 0;
                    foreach (var tp in so.Points)
                    {
                        if (index > 0)
                        {
                            cinfo.infos += "$^";
                        }
                        cinfo.infos += String.Format("{0}$^{1}", tp.X, -tp.Y);
                        index++;
                    }
                    break;
                case "LEADER":
                    var leader = ent as DxfLeader;
                    cinfo.et = 18;
                    index = 0;
                    foreach (var tp in leader.Vertices)
                    {
                        if (index > 0)
                        {
                            cinfo.infos += "$^";
                        }
                        cinfo.infos += String.Format("{0}$^{1}", tp.X, -tp.Y);
                        index++;
                    }
                    Console.WriteLine(ent.Handle);
                    break;
                case "XLINE":   //射线
                    Console.WriteLine(ent.EntityType);
                    break;
                case "MTEXT":
                    //sprintf(infobuf, "%f %f %f %s", v->basePoint.x, -v->basePoint.y, v->height, tonoblankstr(v->text).c_str());
                    var m = ent as DxfMText;
                    cinfo.et = 19;
                    if (m.Text.Trim().Length > 0)
                        cinfo.infos = String.Format("{0}$^{1}$^{2}$^{3}$^{4}$^{5}$^{6}$^{7}$^{8}$^{9}$^{10}", m.InsertionPoint.X, -m.InsertionPoint.Y, m.Height, tonoblankstr(m.Text), m.AttachmentPoint, 0, m.Width, 0, m.DrawingDirection, 0, m.Transform.ToString());
                    //else System.Diagnostics.Debug.WriteLine("null text dxfmtext.");
                    break;
                case "TEXT":
                    //sprintf(infobuf, "%f %f %f %s", v->basePoint.x, -v->basePoint.y, v->height, tonoblankstr(v->text).c_str());
                    var t = ent as DxfText;
                    cinfo.et = 25;
                    if (t.Text.Trim().Length > 0)
                        cinfo.infos = String.Format("{0}$^{1}$^{2}$^{3}$^{4}$^{5}$^{6}$^{7}$^{8}", t.AlignmentPoint1.X, -t.AlignmentPoint1.Y, t.Height, tonoblankstr(t.Text), t.Rotation, t.WidthFactor * getscalebyfont(t.Style), t.HorizontalAlignment, t.VerticalAlignment, t.Transform.ToString());
                    //else System.Diagnostics.Debug.WriteLine("null text dxfmtext.");
                    break;
                case "ATTDEF":
                    var a = ent as DxfAttributeDefinition;
                    if (po == null || (!a.Invisible))
                    {
                        cinfo.et = 101;
                        cinfo.infos = String.Format("{0}$^{1}$^{2}$^{3}$^{4}$^{5}$^{6}$^{7}", a.AlignmentPoint1.X, -a.AlignmentPoint1.Y, a.Height, tonoblankstr(a.BasicTagString), tonoblankstr(a.Text), a.Rotation, a.WidthFactor * getscalebyfont(a.Style), a.Transform.ToString());
                    }
                    break;
                case "HATCH":
                    var h = ent as DxfHatch;
                    cinfo.et = 30;
                    cinfo.infos = String.Format("0$^0$^{0}", h.HatchStyle);
                    if (h.BoundaryPaths.Count > 0)
                    {
                        cinfo.ents = new List<info>();
                        foreach (var at in h.BoundaryPaths)
                        {
                            foreach (var sat in at.BoundaryObjects)
                            {
                                info ti = getentinfo(sat);
                                if (ti.infos.Length > 0)
                                    cinfo.ents.Add(ti);
                            }

                            cinfo.infos += String.Format("$^{0}", at.Edges.Count);
                            foreach (var eds in at.Edges)
                            {
                                if (eds is DxfHatch.BoundaryPath.LineEdge)
                                {
                                    var se = eds as DxfHatch.BoundaryPath.LineEdge;
                                    //for compalite to polyline format add bulge = 0 info.
                                    cinfo.infos += String.Format("$^LineEdge$^{0}$^{1}$^{2}$^{3}$^{4}$^{5}", se.Start.X, -se.Start.Y, 0, se.End.X, -se.End.Y, 0);
                                }
                                else if (eds is DxfHatch.BoundaryPath.ArcEdge)
                                {
                                    var ae = eds as DxfHatch.BoundaryPath.ArcEdge;
                                    if (ae.CounterClockWise) //逆时针
                                        cinfo.infos += String.Format("$^CoArcEdge$^{0}$^{1}$^{2}$^{3}$^{4}", ae.Center.X, -ae.Center.Y, ae.Radius, ae.StartAngle, ae.EndAngle);
                                    else cinfo.infos += String.Format("$^ArcEdge$^{0}$^{1}$^{2}$^{3}$^{4}", ae.Center.X, -ae.Center.Y, ae.Radius, ae.StartAngle, ae.EndAngle);
                                }
                                else if (eds is DxfHatch.BoundaryPath.EllipseEdge)
                                {
                                    var ee = eds as DxfHatch.BoundaryPath.EllipseEdge;
                                    if (ee.CounterClockWise)
                                        cinfo.infos += String.Format("$^CoEllipseEdge$^{0}$^{1}$^{2}$^{3}$^{4}$^{5}$^{6}", ee.Center.X, -ee.Center.Y, ee.MajorAxisEndPoint.X, -ee.MajorAxisEndPoint.Y, ee.MinorToMajorRatio, ee.StartAngle, ee.EndAngle);
                                    else cinfo.infos += String.Format("$^EllipseEdge$^{0}$^{1}$^{2}$^{3}$^{4}$^{5}$^{6}", ee.Center.X, -ee.Center.Y, ee.MajorAxisEndPoint.X, -ee.MajorAxisEndPoint.Y, ee.MinorToMajorRatio, ee.StartAngle, ee.EndAngle);
                                }
                                else
                                {

                                }
                            }

                            if (at.IsPolyline)
                            {
                                cinfo.infos += String.Format("$^IsPolyline$^{0}", at.PolylineData.Vertices.Count);
                                foreach (var tp in at.PolylineData.Vertices)
                                {
                                    cinfo.infos += String.Format("$^{0}$^{1}$^{2}", tp.X, -tp.Y, tp.Bulge);
                                }
                            }
                        }
                    }
                    break;
                case "ARC":
                    var r = ent as DxfArc;
                    cinfo.et = 31;
                    cinfo.infos = String.Format("{0}$^{1}$^{2}$^{3}$^{4}", r.Center.X, -r.Center.Y, r.Radius, r.StartAngle, r.EndAngle);
                    break;
                case "ATTRIB":
                    var ab = ent as DxfAttribute;
                    if (ab.Invisible == false)
                    {
                        cinfo.et = 202;
                        cinfo.infos = String.Format("{0}$^{1}$^{2}$^{3}$^{4}$^{5}$^{6}$^{7}", ab.AlignmentPoint1.X, -ab.AlignmentPoint1.Y, ab.Height, tonoblankstr(ab.BasicTagString), tonoblankstr(ab.Text), ab.Rotation, ab.WidthFactor, ab.Transform.ToString());
                    }
                    break;
                default:
                    Console.WriteLine(ent.EntityType);
                    if (!etypes.Contains(ent.EntityType))
                    {
                        etypes.Add(ent.EntityType);
                        //Console.WriteLine(ent.EntityType);
                    }
                    break;
            }
            //if (cinfo.infos.Length > 0) Console.WriteLine(cinfo.infos);
            cinfo.infos = cinfo.infos.Replace("%%%", "%");
            return cinfo;
        }

        private double getscalebyfont(DxfTextStyle ts)
        {
            double swbfont = 1.0;
            //Console.WriteLine(ts.Name + "\t" + ts.FontFamily + "\t" + ts.WidthFactor + "\t" + ts.FontFilename);
            if (!tstyles.Contains(ts))
            {
                System.Diagnostics.Debug.WriteLine(ts.Name + "\t FontFamily: " + ts.FontFamily + "\t" + ts.WidthFactor + "\t FontFilename: " + ts.FontFilename + "\t BigFontFilename: " + ts.BigFontFilename + "\t " + ((ts.TrueTypeFontDescriptor == null) ? "" : ("ttfname: " + ts.TrueTypeFontDescriptor.FontFilename)));
                tstyles.Add(ts);
            }
            String tfname = ts.FontFilename;
            if (ts.BigFontFilename.Length > 0) tfname = ts.BigFontFilename;
            if (ts.TrueTypeFontDescriptor != null)
                tfname = ts.TrueTypeFontDescriptor.FontFilename;
            tfname = tfname.ToLower();
            tfname = tfname.Replace(".shx", "");
            tfname = tfname.Replace(".ttf", "");
            if (ts.TrueTypeFontDescriptor != null) tfname += ".ttf";
            else tfname += ".shx";
            for (int i = 0; i < fontwidths.Length; i += 2)
            {
                if (fontwidths[i].ToLower() == tfname)
                    swbfont = Convert.ToDouble(fontwidths[i + 1]);
            }

            return swbfont;
            //return ts.WidthFactor*swbfont;
        }

        private String tonoblankstr(String src)
        {


            return NoFormat(src);
        }

        //去掉格式
        private string NoFormat(string src)
        {
            /*
            if (src.Contains("--mblankm--"))
                src = src.Replace(" ", "--mblankm--");

            if (src.Contains("{") &&
                src.Contains("}") &&
                src.Contains(";") &&
                src.Contains("\\"))
            {
                int iStart = src.IndexOf(';');
                int iEnd = src.IndexOf('}');

                src = src.Substring(iStart + 1, iEnd - iStart - 1);
            }
            */
            src = src.Trim();

            return src;
        }

    }


    class info
    {
        public int et;
        public String infos;
        public List<info> ents = new List<info>();
        public ulong handle;
        public int color;
        public String line;
    }
}
