package com.lastlight.survivor;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        if (window != null) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            window.addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);
        }
        enableHighRefreshRate();
        configureWebViewPerformance();
        applyImmersiveFullscreen();
    }

    @Override
    public void onResume() {
        super.onResume();
        enableHighRefreshRate();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableHighRefreshRate();
            applyImmersiveFullscreen();
        }
    }

    private void enableHighRefreshRate() {
        try {
            Window window = getWindow();
            if (window == null) {
                return;
            }
            WindowManager.LayoutParams params = window.getAttributes();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Display display = null;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    display = getDisplay();
                }
                if (display == null) {
                    WindowManager wm = (WindowManager) getSystemService(WINDOW_SERVICE);
                    if (wm != null) {
                        display = wm.getDefaultDisplay();
                    }
                }
                if (display != null) {
                    Display.Mode currentMode = display.getMode();
                    Display.Mode[] modes = display.getSupportedModes();
                    Display.Mode bestMode = currentMode;
                    float bestScore = -1f;
                    int targetW = currentMode.getPhysicalWidth();
                    int targetH = currentMode.getPhysicalHeight();
                    for (Display.Mode mode : modes) {
                        if (mode.getPhysicalWidth() != targetW || mode.getPhysicalHeight() != targetH) {
                            continue;
                        }
                        float hz = mode.getRefreshRate();
                        // Prefer >= 90Hz (90Hz / 120Hz) for zero stutter on Android
                        float score = hz >= 89.5f ? hz : hz * 0.5f;
                        if (score > bestScore) {
                            bestScore = score;
                            bestMode = mode;
                        }
                    }
                    if (bestMode != null && params.preferredDisplayModeId != bestMode.getModeId()) {
                        params.preferredDisplayModeId = bestMode.getModeId();
                        params.preferredRefreshRate = bestMode.getRefreshRate();
                        window.setAttributes(params);
                    }
                }
            } else {
                params.preferredRefreshRate = 90.0f;
                window.setAttributes(params);
            }
        } catch (Throwable ignored) {
            // Keep default display refresh rate if OEM restricts mode switching
        }
    }

    private void configureWebViewPerformance() {
        try {
            if (getBridge() == null) {
                return;
            }
            WebView webView = getBridge().getWebView();
            if (webView == null) {
                return;
            }
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            WebSettings settings = webView.getSettings();
            if (settings != null) {
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setDomStorageEnabled(true);
            }
        } catch (Throwable ignored) {
            // Safe fallback if bridge WebView is not yet attached
        }
    }

    private void applyImmersiveFullscreen() {
        Window window = getWindow();
        if (window == null) {
            return;
        }
        WindowCompat.setDecorFitsSystemWindows(window, false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
    }
}
