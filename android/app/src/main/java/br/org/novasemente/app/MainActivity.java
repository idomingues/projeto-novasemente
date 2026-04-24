package br.org.novasemente.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ensureDefaultNotificationChannel();
    }

    private void ensureDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }

        String channelId = "default";
        if (manager.getNotificationChannel(channelId) != null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
                channelId,
                "Geral",
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Notificações gerais da app");

        manager.createNotificationChannel(channel);
    }
}
