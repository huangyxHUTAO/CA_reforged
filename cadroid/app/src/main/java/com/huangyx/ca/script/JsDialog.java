package com.huangyx.ca.script;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.view.View;
import android.view.Window;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.widget.EditText;
import android.widget.TextView;

import com.huangyx.ca.R;

final class JsDialog {
    private JsDialog() {
    }

    static boolean show(View anchor, String message, boolean ask, JsResult result) {
        return show(anchor, message, ask, false, null, result);
    }

    static boolean showPrompt(View anchor, String message, String defaultValue, JsPromptResult result) {
        return show(anchor, message, true, true, defaultValue, result);
    }

    private static boolean show(View anchor, String message, boolean ask, boolean prompt,
                                String defaultValue, final JsResult result) {
        Context context = anchor.getContext();
        if (!(context instanceof Activity)) {
            confirm(result, null);
            return true;
        }

        final Dialog dialog = new Dialog(context);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.js_dialog);
        dialog.setCancelable(false);

        ((TextView) dialog.findViewById(R.id.js_dialog_message)).setText(message);

        final EditText input = (EditText) dialog.findViewById(R.id.js_dialog_input);
        if (prompt) {
            input.setVisibility(View.VISIBLE);
            input.setText(defaultValue == null ? "" : defaultValue);
            input.setSelection(input.getText().length());
        }

        View cancel = dialog.findViewById(R.id.js_dialog_cancel);
        if (ask) {
            cancel.setVisibility(View.VISIBLE);
            cancel.setOnClickListener(v -> {
                dialog.dismiss();
                result.cancel();
            });
        }

        dialog.findViewById(R.id.js_dialog_ok).setOnClickListener(v -> {
            String value = prompt ? input.getText().toString() : null;
            dialog.dismiss();
            confirm(result, value);
        });

        dialog.show();
        return true;
    }

    private static void confirm(JsResult result, String value) {
        if (result instanceof JsPromptResult) {
            ((JsPromptResult) result).confirm(value == null ? "" : value);
        } else {
            result.confirm();
        }
    }
}
