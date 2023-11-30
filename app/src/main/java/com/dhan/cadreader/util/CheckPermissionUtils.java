package com.dhan.cadreader.util;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;

import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by Apple on
 */
public final class CheckPermissionUtils {
    private CheckPermissionUtils() {
    }

    //需要申请的权限
    private static String[] permissions = new String[]{
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
    };
    //需要申请的权限
    private static String[] collectionpermissions = new String[]{
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
    };

    //检测权限
    public static String[] checkPermission(Context context, int flag) {
        List<String> data = new ArrayList<>();//存储未申请的权限
        if (flag == 1) {
            for (String permission : permissions) {
                int checkSelfPermission = ContextCompat.checkSelfPermission(context, permission);
                if (checkSelfPermission == PackageManager.PERMISSION_DENIED) {//未申请
                    data.add(permission);
                }
            }
        } else {
            for (String permission : collectionpermissions) {
                int checkSelfPermission = ContextCompat.checkSelfPermission(context, permission);
                if (checkSelfPermission == PackageManager.PERMISSION_DENIED) {//未申请
                    data.add(permission);
                }
            }
        }

        return data.toArray(new String[data.size()]);
    }
}
