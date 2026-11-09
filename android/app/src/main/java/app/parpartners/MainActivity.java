package app.parpartners;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own native plugins (not from npm) are registered here
        registerPlugin(CalendarPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
