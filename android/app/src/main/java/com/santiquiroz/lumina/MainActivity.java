package com.santiquiroz.lumina;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // registerPlugin debe correr antes de super.onCreate: ahí el bridge queda construido.
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceCalendarPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
