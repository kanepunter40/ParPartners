package app.parpartners;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.provider.CalendarContract;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * "Add to calendar": opens the phone's calendar app with a new event filled in, for the player to save.
 * No calendar permission needed, because the calendar app does the saving. Used from src/app/core/calendar.ts.
 */
@CapacitorPlugin(name = "Calendar")
public class CalendarPlugin extends Plugin {

    @PluginMethod
    public void addEvent(PluginCall call) {
        Long begin = call.getLong("begin");
        Long end = call.getLong("end");
        if (begin == null || end == null) {
            call.reject("begin and end are required");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_INSERT)
            .setData(CalendarContract.Events.CONTENT_URI)
            .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, begin)
            .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, end)
            .putExtra(CalendarContract.Events.TITLE, call.getString("title", ""))
            .putExtra(CalendarContract.Events.EVENT_LOCATION, call.getString("location", ""))
            .putExtra(CalendarContract.Events.DESCRIPTION, call.getString("description", ""));
        try {
            getActivity().startActivity(intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (ActivityNotFoundException e) {
            call.reject("No calendar app", "NO_CALENDAR");
        }
    }
}
