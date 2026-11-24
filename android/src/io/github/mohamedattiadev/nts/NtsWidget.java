package io.github.mohamedattiadev.nts;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;
import io.github.mohamedattiadev.nts.save.R;

/** 107b: home-screen widget. Each button opens the installed Nts (PWA) at a link it already understands; the data stays in the PWA. */
public class NtsWidget extends AppWidgetProvider {
    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget);
        v.setOnClickPendingIntent(R.id.w_logo, open(c, 0, ""));
        v.setOnClickPendingIntent(R.id.w_new, open(c, 1, "?do=new"));
        v.setOnClickPendingIntent(R.id.w_voice, open(c, 2, "?do=voice"));
        v.setOnClickPendingIntent(R.id.w_find, open(c, 3, "?do=find"));
        v.setOnClickPendingIntent(R.id.w_todo, open(c, 4, "?view=todo"));
        for (int id : ids) m.updateAppWidget(id, v);
    }

    static PendingIntent open(Context c, int code, String q) {
        Intent go = new Intent(Intent.ACTION_VIEW, Uri.parse(SaveActivity.START + q))
            .addCategory(Intent.CATEGORY_BROWSABLE).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(c, code, go, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
