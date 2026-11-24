package io.github.mohamedattiadev.nts;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

/** 96: takes the selected text (PROCESS_TEXT) and opens Nts at ?do=new&text=… — the installed Nts app (PWA) catches the link, saves it and says "Kaydedildi". */
public class SaveActivity extends Activity {
    static final String START = "https://mohamedattiadev.github.io/nts/";

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        CharSequence t = getIntent().getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
        String text = t == null ? "" : t.toString().trim();
        if (text.length() > 20000) text = text.substring(0, 20000);
        if (!text.isEmpty()) {
            Uri u = Uri.parse(START).buildUpon().appendQueryParameter("do", "new").appendQueryParameter("text", text).build();
            Intent go = new Intent(Intent.ACTION_VIEW, u).addCategory(Intent.CATEGORY_BROWSABLE).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { startActivity(go); } catch (ActivityNotFoundException e) { Toast.makeText(this, "Tarayıcı bulunamadı", Toast.LENGTH_SHORT).show(); }
        }
        finish();
    }
}
